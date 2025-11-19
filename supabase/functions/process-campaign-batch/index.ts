import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 🚀 SISTEMA DE ALTA PERFORMANCE - Até 810 msg/s
const MAX_RATE_LIMIT = 810; // Limite do Meta WhatsApp
const BATCH_SIZE = 100; // Processar 100 por vez
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 5000, 10000];
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const RETRYABLE_ERRORS = [
  '1', '2', '4', '10', '80007', '131000', '131005', '131008', '131009',
  '132000', '132001', '132007', '132015', '132016', '132068',
  '133004', '133005', '133006', '368', '131047', '131048', '133016',
];

function sanitizeTextParam(value: any): string {
  let s = (value ?? 'N/A').toString();
  s = s.replace(/[\r\n\t]/g, ' ');
  s = s.replace(/ {2,}/g, ' ');
  s = s.trim();
  if (s.length > 1024) s = s.slice(0, 1024);
  if (!s) s = 'N/A';
  return s;
}

function sanitizeUrlParam(value: any): string {
  let s = (value ?? '').toString();
  s = s.replace(/[\r\n\t]/g, '');
  s = s.trim();
  if (s) s = encodeURIComponent(s);
  return s || 'default';
}

async function sendMessage(
  supabase: any,
  item: any,
  campaign: any,
  template: any,
  whatsappNumber: any,
  retryCount = 0
): Promise<{ success: boolean; errorCode?: string; errorMessage?: string }> {
  try {
    // Verificar opt-out
    const { data: contact } = await supabase
      .from('contacts')
      .select('opt_out, last_message_sent_at')
      .eq('msisdn', item.msisdn)
      .maybeSingle();

    if (contact?.opt_out) {
      return {
        success: false,
        errorCode: 'OPT_OUT',
        errorMessage: 'Contato solicitou não receber mensagens',
      };
    }

    // Validar janela 24h
    if (contact?.last_message_sent_at) {
      const lastMessageTime = new Date(contact.last_message_sent_at).getTime();
      const now = Date.now();
      if (now - lastMessageTime > TWENTY_FOUR_HOURS_MS) {
        return {
          success: false,
          errorCode: '24H_WINDOW',
          errorMessage: 'Fora da janela de 24 horas',
        };
      }
    }

    // Construir componentes
    const components: any[] = [];
    const structure = template.structure || {};
    const params = item.params || {};

    // HEADER
    if (structure.header?.format) {
      if (structure.header.format === 'TEXT' && structure.header.parameters?.length > 0) {
        const headerParams = structure.header.parameters.map((p: any) => ({
          type: 'text',
          text: sanitizeTextParam(params[`header_${p.name}`] || params[p.name]),
        }));
        components.push({ type: 'header', parameters: headerParams });
      } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(structure.header.format)) {
        const mediaUrl = params.header_media || params.media_url;
        if (mediaUrl) {
          const mediaType = structure.header.format.toLowerCase();
          components.push({
            type: 'header',
            parameters: [{ type: mediaType, [mediaType]: { link: mediaUrl } }],
          });
        }
      }
    }

    // BODY
    if (structure.body?.parameters?.length > 0) {
      const bodyParams = structure.body.parameters.map((p: any) => ({
        type: 'text',
        text: sanitizeTextParam(params[`body_${p.name}`] || params[p.name]),
      }));
      components.push({ type: 'body', parameters: bodyParams });
    }

    // BUTTONS
    if (structure.buttons?.length > 0) {
      structure.buttons.forEach((btn: any, idx: number) => {
        if (btn.type === 'URL' && btn.url?.includes('{{')) {
          const urlParam = params[`button_${idx}`] || params[`url_${idx}`];
          if (urlParam) {
            components.push({
              type: 'button',
              sub_type: 'url',
              index: String(idx),
              parameters: [{ type: 'text', text: sanitizeUrlParam(urlParam) }],
            });
          }
        }
      });
    }

    // Enviar mensagem
    const url = `https://graph.facebook.com/v21.0/${whatsappNumber.phone_number_id}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappNumber.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: item.msisdn,
        type: 'template',
        template: {
          name: template.name,
          language: { code: template.language || 'pt_BR' },
          components,
        },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorCode = result.error?.code?.toString() || 'UNKNOWN';
      const errorMessage = result.error?.message || 'Erro desconhecido';

      if (RETRYABLE_ERRORS.includes(errorCode) && retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[retryCount]));
        return sendMessage(supabase, item, campaign, template, whatsappNumber, retryCount + 1);
      }

      return { success: false, errorCode, errorMessage };
    }

    // Atualizar contato
    await supabase
      .from('contacts')
      .upsert({
        msisdn: item.msisdn,
        last_message_sent_at: new Date().toISOString(),
      }, { onConflict: 'msisdn' });

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      errorCode: 'NETWORK_ERROR',
      errorMessage: error.message,
    };
  }
}

// 🎯 Função para processar com controle de taxa preciso
async function processWithRateLimit(
  items: any[],
  messagesPerSecond: number,
  processor: (item: any) => Promise<any>
) {
  const delayMs = 1000 / messagesPerSecond;
  const results = [];
  
  for (const item of items) {
    const startTime = Date.now();
    const result = await processor(item);
    results.push(result);
    
    const elapsed = Date.now() - startTime;
    const remainingDelay = Math.max(0, delayMs - elapsed);
    if (remainingDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingDelay));
    }
  }
  
  return results;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, batchNumber } = await req.json();

    if (!campaignId) {
      throw new Error('campaignId é obrigatório');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const startTime = Date.now();
    console.log(`📦 Batch ${batchNumber} iniciado às ${new Date().toISOString()}`);

    // Buscar campanha
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*, whatsapp_numbers(*)')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campanha não encontrada');
    }

    const configuredRate = Math.min(campaign.processing_rate || 80, MAX_RATE_LIMIT);
    console.log(`⚡ Taxa: ${configuredRate} msg/s`);

    // Buscar template
    const { data: template } = await supabase
      .from('templates')
      .select('*')
      .eq('name', campaign.template_name)
      .eq('whatsapp_number_id', campaign.whatsapp_number_id)
      .maybeSingle();

    if (!template) {
      throw new Error('Template não encontrado');
    }

    // Buscar próximo batch
    const { data: items, error: itemsError } = await supabase
      .from('campaign_items')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (itemsError) {
      throw new Error(`Erro ao buscar items: ${itemsError.message}`);
    }

    if (!items || items.length === 0) {
      console.log('✅ Campanha finalizada');
      await supabase
        .from('campaigns')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId);

      return new Response(
        JSON.stringify({ success: true, message: 'Campanha finalizada', itemsProcessed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Processando ${items.length} items do batch ${batchNumber}`);

    let sent = 0;
    let failed = 0;
    const errorSummary: Record<string, number> = {};

    // Processar com controle de taxa
    await processWithRateLimit(items, configuredRate, async (item) => {
      const result = await sendMessage(supabase, item, campaign, template, campaign.whatsapp_numbers);

      if (result.success) {
        await supabase
          .from('campaign_items')
          .update({
            status: 'sent',
            message_id: `msg_${Date.now()}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        sent++;
      } else {
        await supabase
          .from('campaign_items')
          .update({
            status: 'failed',
            error_code: result.errorCode,
            error_message: result.errorMessage,
            retry_count: (item.retry_count || 0) + 1,
            last_error_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        failed++;

        if (result.errorCode) {
          errorSummary[result.errorCode] = (errorSummary[result.errorCode] || 0) + 1;
        }
      }
    });

    // Atualizar estatísticas
    const { data: stats } = await supabase
      .from('campaign_items')
      .select('status')
      .eq('campaign_id', campaignId);

    const sentCount = stats?.filter(s => s.status === 'sent').length || 0;
    const failedCount = stats?.filter(s => s.status === 'failed').length || 0;

    await supabase
      .from('campaigns')
      .update({
        sent: sentCount,
        failed: failedCount,
        error_summary: errorSummary,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const actualRate = items.length / elapsedSeconds;
    console.log(`✅ Batch ${batchNumber}: ${sent} enviados, ${failed} falhas (${actualRate.toFixed(2)} msg/s)`);

    // Verificar se há mais items
    const { count: pendingCount } = await supabase
      .from('campaign_items')
      .select('*', { count: 'exact', head: true })
      .eq('campaign_id', campaignId)
      .eq('status', 'pending');

    if (pendingCount && pendingCount > 0) {
      console.log(`🔄 ${pendingCount} restantes`);
      
      setTimeout(async () => {
        try {
          await fetch(`${supabaseUrl}/functions/v1/process-campaign-batch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              campaignId,
              batchNumber: (batchNumber || 0) + 1,
            }),
          });
        } catch (error) {
          console.error('Erro ao chamar próximo batch:', error);
        }
      }, 100);
    }

    return new Response(
      JSON.stringify({
        success: true,
        itemsProcessed: items.length,
        sent,
        failed,
        pendingRemaining: pendingCount || 0,
        actualRate: actualRate.toFixed(2),
        configuredRate,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
