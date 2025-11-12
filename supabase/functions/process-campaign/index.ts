import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId } = await req.json();

    if (!campaignId) {
      throw new Error('campaignId é obrigatório');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar campanha
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campanha não encontrada');
    }

    // Atualizar status para processing
    await supabase
      .from('campaigns')
      .update({ status: 'processing' })
      .eq('id', campaignId);

    console.log(`Iniciando processamento da campanha ${campaignId}`);

    // Buscar items pending
    const { data: items, error: itemsError } = await supabase
      .from('campaign_items')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (itemsError) {
      throw new Error(`Erro ao buscar items: ${itemsError.message}`);
    }

    console.log(`${items?.length || 0} items para processar`);

    const rate = campaign.processing_rate || 40;
    const delayBetweenBatches = 1000; // 1 segundo
    let sent = 0;
    let failed = 0;
    const errorSummary: Record<string, number> = {};

    // Processar em lotes
    for (let i = 0; i < (items?.length || 0); i += rate) {
      const batch = items!.slice(i, i + rate);

      await Promise.all(
        batch.map(async (item) => {
          try {
            // Buscar template
            const { data: template } = await supabase
              .from('templates')
              .select('*')
              .eq('whatsapp_number_id', campaign.whatsapp_number_id)
              .eq('name', campaign.template_name)
              .eq('is_active', true)
              .maybeSingle();

            if (!template) {
              throw new Error('Template não encontrado ou inativo');
            }

            // Buscar número WhatsApp
            const { data: whatsappNumber } = await supabase
              .from('whatsapp_numbers')
              .select('*')
              .eq('id', campaign.whatsapp_number_id)
              .single();

            if (!whatsappNumber) {
              throw new Error('Número WhatsApp não encontrado');
            }

            // Montar componentes do template
            const structure = template.structure;
            const params = item.params || {};
            const components: any[] = [];

            // BODY
            if (structure.body?.vars?.length > 0) {
              const bodyParams = structure.body.vars.map((n: number) => ({
                type: 'text',
                text: sanitizeParam(params[`body_${n}`] || 'N/A'),
              }));
              components.push({ type: 'body', parameters: bodyParams });
            }

            // HEADER
            if (structure.header?.format === 'TEXT' && structure.header.vars?.length > 0) {
              const headerParams = structure.header.vars.map((n: number) => ({
                type: 'text',
                text: sanitizeParam(params[`header_${n}`] || 'N/A'),
              }));
              components.push({ type: 'header', parameters: headerParams });
            }

            // Sanitizar número
            const sanitizedTo = normalizeMsisdn(item.msisdn);

            const data = {
              messaging_product: 'whatsapp',
              to: sanitizedTo,
              type: 'template',
              template: {
                name: campaign.template_name,
                language: { code: template.language || 'pt_BR' },
                components,
              },
            };

            // Enviar
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
              const errorCode = responseData.error?.code?.toString() || 'unknown';
              errorSummary[errorCode] = (errorSummary[errorCode] || 0) + 1;

              await supabase
                .from('campaign_items')
                .update({
                  status: 'failed',
                  error_code: errorCode,
                  error_message: responseData.error?.message,
                  fbtrace_id: responseData.error?.fbtrace_id,
                })
                .eq('id', item.id);

              failed += 1;

              // Se template pausado, desativar
              if (isPausedError(responseData.error)) {
                console.log(`Template ${campaign.template_name} pausado, desativando...`);
                await supabase
                  .from('templates')
                  .update({ is_active: false })
                  .eq('id', template.id);
              }
            } else {
              await supabase
                .from('campaign_items')
                .update({
                  status: 'sent',
                  message_id: responseData.messages?.[0]?.id,
                })
                .eq('id', item.id);

              sent += 1;
            }
          } catch (error) {
            console.error(`Erro no item ${item.id}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            await supabase
              .from('campaign_items')
              .update({
                status: 'failed',
                error_message: errorMessage,
              })
              .eq('id', item.id);

            failed += 1;
          }
        })
      );

      // Delay entre lotes
      if (i + rate < (items?.length || 0)) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
      }
    }

    // Atualizar campanha
    await supabase
      .from('campaigns')
      .update({
        status: 'completed',
        sent: campaign.sent + sent,
        failed: campaign.failed + failed,
        error_summary: errorSummary,
      })
      .eq('id', campaignId);

    console.log(`Campanha finalizada: ${sent} enviados, ${failed} falhas`);

    return new Response(
      JSON.stringify({ success: true, sent, failed, errorSummary }),
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

function sanitizeParam(value: any): string {
  let s = (value ?? 'N/A').toString();
  s = s.replace(/[\r\n\t]/g, ' ');
  s = s.replace(/ {2,}/g, ' ');
  s = s.trim();
  if (s.length > 1000) s = s.slice(0, 999) + '…';
  if (!s) s = 'N/A';
  return s;
}

function normalizeMsisdn(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) throw new Error('MSISDN vazio');
  if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) return digits;
  if (digits.length >= 10 && digits.length <= 11) return '55' + digits;
  return digits;
}

function isPausedError(error: any): boolean {
  const code = error?.code;
  const subcode = error?.error_subcode;
  const msg = (error?.message || '').toLowerCase();
  const details = (error?.error_data?.details || '').toLowerCase();

  if (code === 132015) return true;
  if (code === 470 && (details.includes('paused') || msg.includes('paused'))) return true;
  if (msg.includes('paused') || details.includes('paused')) return true;
  if (subcode === 2018265 || subcode === 2018028) return true;

  return false;
}
