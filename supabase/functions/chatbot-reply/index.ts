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
    const { messageData, whatsappNumberId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar config do chatbot
    const { data: config } = await supabase
      .from('chatbot_config')
      .select('*')
      .eq('whatsapp_number_id', whatsappNumberId)
      .eq('is_enabled', true)
      .single();

    if (!config) {
      return new Response(JSON.stringify({ message: 'Chatbot não habilitado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar horário comercial
    if (config.business_hours_only) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      
      if (currentTime < config.business_hours_start || currentTime > config.business_hours_end) {
        return new Response(JSON.stringify({ 
          reply: config.out_of_hours_message,
          skipAI: true 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Buscar contato
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('msisdn', messageData.from)
      .single();

    if (!contact) {
      console.error('Contato não encontrado');
      return new Response(JSON.stringify({ error: 'Contact not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar ou criar conversa
    let { data: conversation } = await supabase
      .from('chatbot_conversations')
      .select('*')
      .eq('contact_id', contact.id)
      .eq('whatsapp_number_id', whatsappNumberId)
      .eq('is_active', true)
      .single();

    if (!conversation) {
      const { data: newConv } = await supabase
        .from('chatbot_conversations')
        .insert({
          contact_id: contact.id,
          whatsapp_number_id: whatsappNumberId,
          messages: [],
        })
        .select()
        .single();
      conversation = newConv;
    }

    // Adicionar mensagem do usuário
    const userMessage = {
      role: 'user',
      content: messageData.text?.body || messageData.button?.text || 'Mensagem sem texto',
      timestamp: new Date().toISOString(),
    };

    const conversationMessages = [...(conversation?.messages || []), userMessage];

    // Chamar Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: config.system_prompt },
          ...conversationMessages.slice(-10), // últimas 10 mensagens
        ],
        max_tokens: config.max_tokens,
        temperature: config.temperature,
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', await aiResponse.text());
      throw new Error('Failed to get AI response');
    }

    const aiData = await aiResponse.json();
    const assistantMessage = {
      role: 'assistant',
      content: aiData.choices[0].message.content,
      timestamp: new Date().toISOString(),
    };

    // Atualizar conversa
    await supabase
      .from('chatbot_conversations')
      .update({
        messages: [...conversationMessages, assistantMessage],
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversation!.id);

    console.log('Chatbot reply generated:', assistantMessage.content);

    return new Response(JSON.stringify({ 
      reply: assistantMessage.content,
      conversationId: conversation!.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Chatbot error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});