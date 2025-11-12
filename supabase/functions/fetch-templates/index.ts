import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppNumber {
  id: string;
  phone_number_id: string;
  waba_id: string;
  access_token: string;
}

interface TemplateComponent {
  type: string;
  format?: string;
  text?: string;
  buttons?: any[];
  example?: any;
}

interface Template {
  name: string;
  status: string;
  language: string;
  components: TemplateComponent[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { whatsappNumberId } = await req.json();

    if (!whatsappNumberId) {
      throw new Error('whatsappNumberId é obrigatório');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar dados do número WhatsApp
    const { data: whatsappNumber, error: fetchError } = await supabase
      .from('whatsapp_numbers')
      .select('*')
      .eq('id', whatsappNumberId)
      .single();

    if (fetchError || !whatsappNumber) {
      throw new Error('Número WhatsApp não encontrado');
    }

    const account = whatsappNumber as WhatsAppNumber;
    console.log(`Buscando templates para conta ${account.waba_id}`);

    // Buscar templates da API da Meta
    let allTemplates: Template[] = [];
    let after: string | null = null;

    do {
      const params = new URLSearchParams({
        fields: 'name,status,language,components',
        status: 'APPROVED',
        limit: '50',
      });

      if (after) {
        params.append('after', after);
      }

      const url = `https://graph.facebook.com/v21.0/${account.waba_id}/message_templates?${params}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro ao buscar templates:', errorData);
        throw new Error(`Erro da API Meta: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const templates = (data.data || []).filter((t: Template) => t.status === 'APPROVED');
      allTemplates = allTemplates.concat(templates);

      after = data.paging?.cursors?.after || null;
    } while (after);

    console.log(`Total de ${allTemplates.length} templates aprovados encontrados`);

    // Analisar e salvar templates
    const savedTemplates = [];

    for (const tpl of allTemplates) {
      const structure = analyzeTemplate(tpl);

      // Verificar se template já existe
      const { data: existing } = await supabase
        .from('templates')
        .select('id')
        .eq('whatsapp_number_id', whatsappNumberId)
        .eq('name', tpl.name)
        .maybeSingle();

      if (existing) {
        // Atualizar
        const { error: updateError } = await supabase
          .from('templates')
          .update({
            language: tpl.language,
            status: tpl.status,
            structure,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error(`Erro ao atualizar template ${tpl.name}:`, updateError);
        } else {
          savedTemplates.push({ ...existing, updated: true });
        }
      } else {
        // Inserir novo
        const { data: inserted, error: insertError } = await supabase
          .from('templates')
          .insert({
            whatsapp_number_id: whatsappNumberId,
            name: tpl.name,
            language: tpl.language,
            status: tpl.status,
            structure,
            is_active: true,
          })
          .select()
          .single();

        if (insertError) {
          console.error(`Erro ao inserir template ${tpl.name}:`, insertError);
        } else {
          savedTemplates.push({ ...inserted, updated: false });
        }
      }
    }

    console.log(`${savedTemplates.length} templates salvos/atualizados`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: savedTemplates.length,
        templates: savedTemplates 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function analyzeTemplate(tpl: Template) {
  const structure: any = {
    name: tpl.name,
    language: tpl.language,
    body: { text: null, vars: [] },
    header: { format: null, text: null, vars: [] },
    buttons: [],
  };

  (tpl.components || []).forEach((c) => {
    const type = (c.type || '').toLowerCase();

    if (type === 'body') {
      const text = c.text || '';
      const vars = extractVariables(text);
      structure.body.text = text;
      structure.body.vars = vars;
    } else if (type === 'header') {
      const format = (c.format || '').toUpperCase();
      structure.header.format = format;

      if (format === 'TEXT') {
        const text = c.text || '';
        const vars = extractVariables(text);
        structure.header.text = text;
        structure.header.vars = vars;
      } else {
        structure.header.text = c.text || null;
        structure.header.vars = c.example ? [1] : [];
      }
    } else if (type === 'buttons') {
      (c.buttons || []).forEach((b: any, idx: number) => {
        const btype = (b.type || '').toUpperCase();
        const rec: any = {
          index: idx,
          type: btype,
          text: b.text || null,
          hasVars: false,
          vars: [],
          urlPattern: null,
        };

        if (btype === 'URL') {
          const url = b.url || '';
          const vars = extractVariables(url);
          rec.hasVars = vars.length > 0;
          rec.vars = vars;
          rec.urlPattern = url;
        }

        structure.buttons.push(rec);
      });
    }
  });

  return structure;
}

function extractVariables(text: string): number[] {
  const matches = text.match(/{{\d+}}/g) || [];
  const vars = matches.map((m) => Number(m.replace(/[{}]/g, '')));
  return Array.from(new Set(vars)).sort((a, b) => a - b);
}
