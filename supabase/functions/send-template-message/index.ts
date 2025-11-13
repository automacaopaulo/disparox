import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LIMITS = {
  bodyParam: 1024, // Aumentado para 1024
  titleText: 60,
  buttonText: 20,
};

const URL_SHORTENER_BLOCKLIST = [
  'bit.ly', 'tinyurl.com', 'cutt.ly', 'goo.gl', 'ow.ly', 't.co', 'is.gd', 'buff.ly'
];

function isBlockedShortener(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    return URL_SHORTENER_BLOCKLIST.includes(hostname);
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { whatsappNumberId, to, templateName, parameters = {}, headerMedia } = payload;

    if (!whatsappNumberId || !to || !templateName) {
      throw new Error('Campos obrigatórios: whatsappNumberId, to, templateName');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar número WhatsApp
    const { data: whatsappNumber, error: fetchError } = await supabase
      .from('whatsapp_numbers')
      .select('*')
      .eq('id', whatsappNumberId)
      .single();

    if (fetchError || !whatsappNumber) {
      throw new Error('Número WhatsApp não encontrado');
    }

    // Buscar template
    const { data: template } = await supabase
      .from('templates')
      .select('*')
      .eq('whatsapp_number_id', whatsappNumberId)
      .eq('name', templateName)
      .maybeSingle();

    if (!template) {
      throw new Error(`Template ${templateName} não encontrado`);
    }

    const structure = template.structure;
    const components: any[] = [];

    // HEADER
    if (structure.header?.format) {
      if (structure.header.format === 'TEXT' && structure.header.vars.length > 0) {
        const params = structure.header.vars.map((v: any) => {
          const varIndex = typeof v === 'number' ? v : v.index;
          const varType = typeof v === 'object' ? v.type : 'text';
          const value = parameters[`header_${varIndex}`] || 'N/A';
          return buildParameter(varType, value);
        });
        components.push({ type: 'header', parameters: params });
      } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(structure.header.format)) {
        if (headerMedia) {
          const mediaType = structure.header.format.toLowerCase();
          const param = { type: mediaType, [mediaType]: { link: headerMedia } };
          components.push({ type: 'header', parameters: [param] });
        }
      }
    }

    // BODY
    if (structure.body?.vars.length > 0) {
      const params = structure.body.vars.map((v: any) => {
        const varIndex = typeof v === 'number' ? v : v.index;
        const varType = typeof v === 'object' ? v.type : 'text';
        const value = parameters[`body_${varIndex}`] || 'N/A';
        return buildParameter(varType, value);
      });
      components.push({ type: 'body', parameters: params });
    }

    // BUTTONS
    for (const btn of structure.buttons || []) {
      if (btn.type === 'URL' && btn.hasVars) {
        const btnParams = btn.vars.map((v: any) => {
          const varIndex = typeof v === 'number' ? v : v.index;
          const value = parameters[`button_${btn.index}_${varIndex}`] || '';
          const sanitized = sanitizeUrlVar(value);
          
          // Verificar se é encurtador bloqueado
          if (sanitized && sanitized !== 'default' && isBlockedShortener(sanitized)) {
            console.warn(`URL shortener bloqueado: ${sanitized}`);
            return { type: 'text', text: 'default' };
          }
          
          return { type: 'text', text: sanitized };
        });

        const hasEmpty = btnParams.some((p: any) => !p.text || p.text === 'default');
        const omitIfEmpty = parameters[`button_${btn.index}_omitIfEmpty`] === true;
        
        if (hasEmpty && omitIfEmpty) {
          console.log(`BUTTON[${btn.index}] omitido por falta de variável (omitIfEmpty=true)`);
        } else if (!hasEmpty) {
          components.push({
            type: 'button',
            sub_type: 'url',
            index: String(btn.index),
            parameters: btnParams,
          });
        }
      }
    }

    // Sanitizar número
    const sanitizedTo = normalizeMsisdn(to);

    // Montar payload final
    const data = {
      messaging_product: 'whatsapp',
      to: sanitizedTo,
      type: 'template',
      template: {
        name: templateName,
        language: { code: template.language || 'pt_BR' },
        components,
      },
    };

    console.log('Enviando mensagem:', JSON.stringify(data, null, 2));

    // Enviar via API da Meta
    const url = `https://graph.facebook.com/v21.0/${whatsappNumber.phone_number_id}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappNumber.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Erro da API Meta:', responseData);

      // Salvar erro no banco
      await supabase.from('messages').insert({
        whatsapp_number_id: whatsappNumberId,
        direction: 'outbound',
        msisdn: sanitizedTo,
        template_name: templateName,
        status: 'failed',
        error_code: responseData.error?.code?.toString(),
        error_message: responseData.error?.message,
        fbtrace_id: responseData.error?.fbtrace_id,
      });

      throw new Error(`Erro Meta: ${responseData.error?.message || 'Desconhecido'}`);
    }

    // Salvar sucesso no banco
    await supabase.from('messages').insert({
      whatsapp_number_id: whatsappNumberId,
      direction: 'outbound',
      msisdn: sanitizedTo,
      template_name: templateName,
      message_id: responseData.messages?.[0]?.id,
      status: 'sent',
      phone_id: whatsappNumber.phone_number_id,
    });

    console.log('Mensagem enviada com sucesso:', responseData);

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no envio:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Funções de sanitização e construção de parâmetros
function buildParameter(type: string, value: any): any {
  switch (type) {
    case 'currency':
      // Formato: { type: "currency", currency: { fallback_value: "R$ 10,00", code: "BRL", amount_1000: 10000 } }
      const amount = parseFloat(String(value).replace(/[^\d.-]/g, '')) || 0;
      return {
        type: 'currency',
        currency: {
          fallback_value: sanitizeTextParam(value),
          code: 'BRL',
          amount_1000: Math.round(amount * 1000),
        },
      };
    
    case 'date_time':
      // Formato: { type: "date_time", date_time: { fallback_value: "01/01/2024" } }
      return {
        type: 'date_time',
        date_time: {
          fallback_value: sanitizeTextParam(value),
        },
      };
    
    case 'text':
    default:
      return { type: 'text', text: sanitizeTextParam(value) };
  }
}

// 📝 Sanitizar parâmetros de TEXTO (body/header) - PRESERVA quebras de linha
function sanitizeTextParam(value: any): string {
  let s = (value ?? 'N/A').toString();

  // Normalizar quebras de linha
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Excel CHAR(11) / vertical tab -> também vira quebra de linha
  s = s.replace(/\u000b/g, '\n');

  // Tabs em espaço
  s = s.replace(/\t/g, ' ');

  // Limpar espaços excessivos em cada linha, mantendo as linhas
  s = s
    .split('\n')
    .map((line: string) => line.replace(/ {2,}/g, ' ').trimEnd())
    .join('\n')
    .trim();

  if (s.length > LIMITS.bodyParam) s = s.slice(0, LIMITS.bodyParam);
  if (!s) s = 'N/A';
  return s;
}

// 🔗 Sanitizar parâmetros de URL (botões) - REMOVE quebras de linha
function sanitizeUrlVar(value: any): string {
  let s = (value ?? '').toString();
  s = s.replace(/[\r\n\t]/g, '');
  s = s.trim();
  if (s) s = encodeURIComponent(s);
  if (!s) s = 'default';
  return s;
}

function normalizeMsisdn(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) throw new Error('MSISDN vazio');
  
  // Validação E.164 robusta
  if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) {
    return digits; // Brasil
  }
  
  if (digits.length >= 10 && digits.length <= 11) {
    return '55' + digits; // Brasil sem DDI
  }
  
  // Suporte a outros países (DDI internacional)
  if (digits.length >= 8 && digits.length <= 15) {
    return digits;
  }
  
  throw new Error('MSISDN inválido: deve ter entre 8 e 15 dígitos');
}
