import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 🚀 RATE LIMIT PROFISSIONAL - 80 msg/s por número
const RATE_LIMIT_PER_NUMBER = 80;
const BATCH_DELAY_MS = 1000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 5000, 15000]; // Backoff exponencial: 2s, 5s, 15s

// Códigos de erro que devem ser retentados
const RETRYABLE_ERRORS = [
  '1', '2', '4', '10', // Rate limits básicos
  '80007', // Rate limit
  '131000', '131005', '131008', '131009', // Limites de tier e parâmetros
  '132000', '132001', '132007', // Limites de envio
  '132015', '132016', // Template pausado/desabilitado
  '132068', // Taxa de spam excedida
  '133004', '133005', '133006', // Erros de template
  '368', // Temporariamente indisponível
  '131047', '131048', // Rate limit templates
  '133016', // Template pausado por baixa qualidade
];

// 🔒 24-HOUR WINDOW - Tempo desde última mensagem
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

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

    console.log(`🚀 Iniciando campanha ${campaignId} com rate limit de ${RATE_LIMIT_PER_NUMBER} msg/s`);

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

    console.log(`📊 ${items?.length || 0} items para processar`);

    const rate = campaign.processing_rate || RATE_LIMIT_PER_NUMBER;
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const errorSummary: Record<string, number> = {};

    // Processar em lotes com rate limit
    for (let i = 0; i < (items?.length || 0); i += rate) {
      const batch = items!.slice(i, i + rate);

      await Promise.all(
        batch.map(async (item) => {
          try {
            // 🚫 VERIFICAR OPT-OUT
            const { data: contact } = await supabase
              .from('contacts')
              .select('opt_out, last_message_sent_at')
              .eq('msisdn', item.msisdn)
              .maybeSingle();

            if (contact?.opt_out) {
              console.log(`🚫 Opt-out detectado: ${item.msisdn}`);
              await supabase
                .from('campaign_items')
                .update({
                  status: 'failed',
                  error_code: 'OPT_OUT',
                  error_message: 'Contato solicitou não receber mensagens',
                })
                .eq('id', item.id);
              skipped += 1;
              return;
            }

            // ⏰ VALIDAR JANELA 24H
            if (contact?.last_message_sent_at) {
              const lastMessageTime = new Date(contact.last_message_sent_at).getTime();
              const now = Date.now();
              const timeSinceLastMessage = now - lastMessageTime;

              // Se passou mais de 24h, precisa usar template
              const needsTemplate = timeSinceLastMessage > TWENTY_FOUR_HOURS_MS;
              
              if (!needsTemplate && campaign.template_name) {
                console.log(`⏰ Dentro da janela 24h: ${item.msisdn}`);
              }
            }

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

            console.log(`📋 Template: ${campaign.template_name}`);
            console.log(`📊 Params recebidos:`, JSON.stringify(params));
            console.log(`🔧 Structure vars:`, JSON.stringify({
              body: structure.body?.vars,
              header: structure.header?.vars
            }));

            // BODY
            if (structure.body?.vars?.length > 0) {
              const bodyParams = structure.body.vars.map((v: any) => {
                const varIndex = typeof v === 'number' ? v : (v.index || v);
                const paramValue = params[`body_${varIndex}`];
                console.log(`  body_${varIndex}: "${paramValue}"`);
                return {
                  type: 'text',
                  text: sanitizeTextParam(paramValue || 'N/A'),
                };
              });
              components.push({ type: 'body', parameters: bodyParams });
            }

            // HEADER
            if (structure.header?.format === 'TEXT' && structure.header.vars?.length > 0) {
              const headerParams = structure.header.vars.map((v: any) => {
                const varIndex = typeof v === 'number' ? v : (v.index || v);
                const paramValue = params[`header_${varIndex}`];
                console.log(`  header_${varIndex}: "${paramValue}"`);
                return {
                  type: 'text',
                  text: sanitizeTextParam(paramValue || 'N/A'),
                };
              });
              components.push({ type: 'header', parameters: headerParams });
            }

            // 🔍 VALIDAR PARÂMETROS OBRIGATÓRIOS DE BOTÕES ANTES DE MONTAR
            let missingButtonParams = false;
            if (structure.buttons?.length > 0) {
              for (const btn of structure.buttons) {
                if (btn.type === 'URL' && btn.hasVars && btn.vars?.length > 0) {
                  for (const v of btn.vars) {
                    const paramValue = params[`button_${btn.index}_${v.index}`];
                    if (!paramValue || paramValue.trim() === '') {
                      console.log(`❌ Parâmetro obrigatório button_${btn.index}_${v.index} está vazio`);
                      missingButtonParams = true;
                      break;
                    }
                  }
                  if (missingButtonParams) break;
                }
              }
            }

            // Se faltar parâmetro obrigatório de botão, marcar como falha SEM tentar enviar
            if (missingButtonParams) {
              await supabase
                .from('campaign_items')
                .update({
                  status: 'failed',
                  error_code: 'MISSING_BUTTON_PARAM',
                  error_message: 'Parâmetro obrigatório de botão está vazio no CSV',
                })
                .eq('id', item.id);
              failed += 1;
              return; // Pula este item
            }

            // BUTTONS - adicionar componente de botões
            if (structure.buttons?.length > 0) {
              structure.buttons.forEach((btn: any, idx: number) => {
                if (btn.type === 'URL' && btn.hasVars && btn.vars?.length > 0) {
                  const buttonParams = btn.vars.map((v: any) => ({
                    type: 'text',
                    text: sanitizeUrlVar(params[`button_${idx}_${v.index}`]),
                  }));

                  components.push({
                    type: 'button',
                    sub_type: 'url',
                    index: idx.toString(),
                    parameters: buttonParams,
                  });
                }
              });
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

            // 🔄 ENVIAR COM RETRY E BACKOFF EXPONENCIAL
            let success = false;
            let lastError: any = null;
            
            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
              try {
                const url = `https://graph.facebook.com/v24.0/${whatsappNumber.phone_number_id}/messages`;
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
                  lastError = responseData;

                  // Verificar se é erro retentável
                  if (RETRYABLE_ERRORS.includes(errorCode) && attempt < MAX_RETRIES) {
                    console.log(`⚠️ Erro retentável ${errorCode}, tentativa ${attempt + 1}/${MAX_RETRIES}`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
                    continue;
                  }

                  // Erro definitivo
                  errorSummary[errorCode] = (errorSummary[errorCode] || 0) + 1;

                  await supabase
                    .from('campaign_items')
                    .update({
                      status: 'failed',
                      error_code: errorCode,
                      error_message: responseData.error?.message,
                      fbtrace_id: responseData.error?.fbtrace_id,
                      retry_count: attempt,
                      last_error_at: new Date().toISOString(),
                    })
                    .eq('id', item.id);

                  failed += 1;

                  // Se template pausado, desativar
                  if (isPausedError(responseData.error)) {
                    console.log(`⏸️ Template ${campaign.template_name} pausado, desativando...`);
                    await supabase
                      .from('templates')
                      .update({ is_active: false })
                      .eq('id', template.id);
                  }
                  
                  break;
                } else {
                  // ✅ Sucesso
                  await supabase
                    .from('campaign_items')
                    .update({
                      status: 'sent',
                      message_id: responseData.messages?.[0]?.id,
                      retry_count: attempt,
                    })
                    .eq('id', item.id);

                  // Atualizar timestamp do contato (janela 24h)
                  await supabase
                    .from('contacts')
                    .upsert({
                      msisdn: sanitizedTo,
                      last_message_sent_at: new Date().toISOString(),
                    }, {
                      onConflict: 'msisdn',
                    });

                  sent += 1;
                  success = true;
                  break;
                }
              } catch (fetchError) {
                lastError = fetchError;
                if (attempt < MAX_RETRIES) {
                  console.log(`🔄 Erro de rede, tentativa ${attempt + 1}/${MAX_RETRIES}`);
                  await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
                }
              }
            }

            // Se falhou após todas as tentativas
            if (!success && lastError) {
              throw lastError;
            }

          } catch (error) {
            console.error(`❌ Erro no item ${item.id}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            await supabase
              .from('campaign_items')
              .update({
                status: 'failed',
                error_message: errorMessage,
                last_error_at: new Date().toISOString(),
              })
              .eq('id', item.id);

            failed += 1;
          }
        })
      );

      // Delay entre lotes com jitter para evitar rate limit
      if (i + rate < (items?.length || 0)) {
        const jitter = Math.random() * 500; // 0-500ms de jitter
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS + jitter));
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

    console.log(`✅ Campanha finalizada: ${sent} enviados, ${failed} falhas, ${skipped} opt-out`);

    return new Response(
      JSON.stringify({ success: true, sent, failed, skipped, errorSummary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// 📝 Sanitizar parâmetros de TEXTO (body/header) - Preserva quebras de linha
function sanitizeTextParam(value: any): string {
  let s = (value ?? 'N/A').toString();

  // Normalizar quebras de linha: \r\n, \r, \u000b (CHAR(11) do Excel) -> \n
  s = s.replace(/\r\n/g, '\n');
  s = s.replace(/\r/g, '\n');
  s = s.replace(/\u000b/g, '\n');
  
  // Tabs -> espaço simples
  s = s.replace(/\t/g, ' ');

  // Limpar espaços excessivos (máximo 4 espaços consecutivos, API permite até 4)
  s = s.replace(/ {5,}/g, '    ');
  
  // Trim cada linha individualmente, mas mantém as quebras
  s = s.split('\n')
    .map((line: string) => line.trim())
    .join('\n')
    .trim();

  if (s.length > 1024) s = s.slice(0, 1024);
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

// 🔗 Sanitizar parâmetros de URL (botões) - REMOVE quebras de linha
function sanitizeUrlVar(value: any): string {
  let s = (value ?? '').toString();
  // Remover espaços e quebras de linha
  s = s.replace(/[\r\n\t\s]/g, '');
  s = s.trim();
  // Encode para URL
  if (s) s = encodeURIComponent(s);
  if (!s) s = 'default';
  return s;
}

function isPausedError(error: any): boolean {
  const code = error?.code;
  const subcode = error?.error_subcode;
  const msg = (error?.message || '').toLowerCase();
  const details = (error?.error_data?.details || '').toLowerCase();

  // Códigos específicos de template pausado
  if (code === 132015 || code === 132016) return true; // Template pausado/desabilitado
  if (code === 133016) return true; // Template pausado por qualidade
  if (code === 470 && (details.includes('paused') || msg.includes('paused'))) return true;
  if (msg.includes('paused') || details.includes('paused')) return true;
  if (msg.includes('disabled') || details.includes('disabled')) return true;
  if (subcode === 2018265 || subcode === 2018028) return true;

  return false;
}