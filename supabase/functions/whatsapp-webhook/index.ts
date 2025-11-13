import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // GET - Verificação do webhook
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const verifyToken = Deno.env.get('WEBHOOK_VERIFY_TOKEN') || 'lovable_whatsapp_2025';

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('Webhook verificado com sucesso');
      return new Response(challenge, { status: 200 });
    }

    return new Response('Forbidden', { status: 403 });
  }

  // POST - Receber eventos
  try {
    const body = await req.json();
    console.log('Webhook recebido:', JSON.stringify(body, null, 2));

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Salvar evento bruto
    await supabase.from('webhook_events').insert({
      event_type: 'webhook_received',
      raw: body,
    });

    // Processar entries
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages') {
          const value = change.value;

          // Processar status de mensagens
          if (value.statuses) {
            for (const status of value.statuses) {
              await processMessageStatus(supabase, status);
            }
          }

          // Processar mensagens recebidas
          if (value.messages) {
            for (const message of value.messages) {
              await processInboundMessage(supabase, message, value.metadata);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no webhook:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processMessageStatus(supabase: any, status: any) {
  const messageId = status.id;
  const newStatus = status.status; // sent, delivered, read, failed
  const timestamp = new Date(parseInt(status.timestamp) * 1000).toISOString();

  console.log(`Status da mensagem ${messageId}: ${newStatus}`);

  // Atualizar na tabela messages
  const { error: updateError } = await supabase
    .from('messages')
    .update({ status: newStatus })
    .eq('message_id', messageId);

  if (updateError) {
    console.error('Erro ao atualizar status:', updateError);
  }

  // Atualizar contadores na campanha
  const { data: campaignItem } = await supabase
    .from('campaign_items')
    .select('campaign_id')
    .eq('message_id', messageId)
    .maybeSingle();

  if (campaignItem) {
    const field = newStatus === 'delivered' ? 'delivered' : newStatus === 'read' ? 'read' : null;

    if (field) {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select(field)
        .eq('id', campaignItem.campaign_id)
        .single();

      if (campaign) {
        await supabase
          .from('campaigns')
          .update({ [field]: (campaign[field] || 0) + 1 })
          .eq('id', campaignItem.campaign_id);
      }
    }

    // Atualizar status no campaign_item
    await supabase
      .from('campaign_items')
      .update({ status: newStatus })
      .eq('message_id', messageId);
  }
}

async function processInboundMessage(supabase: any, message: any, metadata: any) {
  const from = message.from;
  const messageId = message.id;
  const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();

  console.log(`Mensagem recebida de ${from}`);

  // Buscar whatsapp_number pelo phone_number_id
  const { data: whatsappNumber } = await supabase
    .from('whatsapp_numbers')
    .select('id')
    .eq('phone_number_id', metadata.phone_number_id)
    .maybeSingle();

  if (!whatsappNumber) {
    console.error(`Número WhatsApp não encontrado: ${metadata.phone_number_id}`);
    return;
  }

  // 🚀 DETECÇÃO DE OPT-OUT AUTOMÁTICO
  const messageText = extractMessageText(message);
  const isOptOut = detectOptOut(messageText);
  
  if (isOptOut) {
    console.log(`🛑 OPT-OUT DETECTADO de ${from}: "${messageText}"`);
    
    // Marcar contato como opt-out
    await supabase
      .from('contacts')
      .upsert({
        msisdn: from,
        opt_out: true,
        opt_out_reason: `Respondeu: ${messageText}`,
        opt_out_date: timestamp,
        name: metadata.profile?.name || null,
      }, {
        onConflict: 'msisdn'
      });
  }

  // Salvar mensagem
  await supabase.from('messages').insert({
    whatsapp_number_id: whatsappNumber.id,
    direction: 'inbound',
    msisdn: from,
    message_id: messageId,
    status: 'received',
    content: message,
    phone_id: metadata.phone_number_id,
  });

  // Atualizar ou criar contato
  const { data: existingContact } = await supabase
    .from('contacts')
    .select('id')
    .eq('msisdn', from)
    .maybeSingle();

  if (!existingContact && !isOptOut) {
    await supabase.from('contacts').insert({
      msisdn: from,
      name: metadata.profile?.name || null,
    });
  }

  // 🤖 CHATBOT COM IA: Verificar se deve responder automaticamente
  if (!isOptOut) {
    const { data: chatbotConfig } = await supabase
      .from('chatbot_config')
      .select('*')
      .eq('whatsapp_number_id', whatsappNumber.id)
      .eq('is_enabled', true)
      .maybeSingle();

    if (chatbotConfig) {
      console.log('🤖 Chatbot ativo, processando resposta...');
      
      // Aguardar delay configurado
      setTimeout(async () => {
        try {
          const { data: replyData, error: replyError } = await supabase.functions.invoke('chatbot-reply', {
            body: {
              messageData: message,
              whatsappNumberId: whatsappNumber.id,
            },
          });

          if (replyError) {
            console.error('Erro ao gerar resposta do chatbot:', replyError);
            return;
          }

          if (replyData?.reply) {
            // Enviar resposta via API da Meta
            const url = `https://graph.facebook.com/v21.0/${metadata.phone_number_id}/messages`;
            const { data: wNumber } = await supabase
              .from('whatsapp_numbers')
              .select('access_token')
              .eq('id', whatsappNumber.id)
              .single();

            if (wNumber) {
              await fetch(url, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${wNumber.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messaging_product: 'whatsapp',
                  to: from,
                  type: 'text',
                  text: { body: replyData.reply },
                }),
              });

              console.log('✅ Chatbot respondeu com sucesso');
            }
          }
        } catch (error) {
          console.error('Erro no chatbot:', error);
        }
      }, (chatbotConfig.auto_reply_delay_seconds || 5) * 1000);
    }
  }
}

// Extrair texto da mensagem
function extractMessageText(message: any): string {
  if (message.text?.body) return message.text.body;
  if (message.button?.text) return message.button.text;
  if (message.interactive?.button_reply?.title) return message.interactive.button_reply.title;
  return '';
}

// Detectar palavras de opt-out (português, inglês, espanhol)
function detectOptOut(text: string): boolean {
  if (!text) return false;
  
  const normalized = text.toLowerCase().trim();
  const optOutKeywords = [
    'stop', 'parar', 'pare', 'cancelar', 'cancel', 'unsubscribe', 
    'descadastrar', 'remover', 'remove', 'sair', 'exit', 'quit',
    'basta', 'chega', 'não quero', 'nao quero', 'no mas', 'no more',
    'opt out', 'opt-out', 'optout'
  ];
  
  return optOutKeywords.some(keyword => normalized.includes(keyword));
}
