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
    const { executionId, nodeId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar execução
    const { data: execution } = await supabase
      .from('flow_executions')
      .select('*, flows(*), contacts(*)')
      .eq('id', executionId)
      .single();

    if (!execution) throw new Error('Execução não encontrada');

    const flow = execution.flows;
    const contact = execution.contacts;
    const nodes = flow.nodes;
    const edges = flow.edges;

    // Encontrar node atual
    const currentNode = nodes.find((n: any) => n.id === nodeId);
    if (!currentNode) throw new Error('Node não encontrado');

    console.log(`Executando node ${nodeId} tipo ${currentNode.type}`);

    // Executar node baseado no tipo
    switch (currentNode.type) {
      case 'sendMessage': {
        // Enviar mensagem via template
        const { data: whatsappNumber } = await supabase
          .from('whatsapp_numbers')
          .select('*')
          .eq('id', flow.whatsapp_number_id)
          .single();

        if (!whatsappNumber) throw new Error('Número WhatsApp não encontrado');

        const templateName = currentNode.data.templateName;
        const parameters = currentNode.data.parameters || {};

        // Chamar send-template-message
        await supabase.functions.invoke('send-template-message', {
          body: {
            whatsappNumberId: whatsappNumber.id,
            to: contact.msisdn,
            templateName,
            parameters,
          },
        });

        console.log(`Mensagem enviada para ${contact.msisdn}`);
        break;
      }

      case 'delay': {
        const delaySeconds = currentNode.data.delaySeconds || 60;
        console.log(`Delay de ${delaySeconds}s`);
        
        // Agendar próximo node
        const nextEdge = edges.find((e: any) => e.source === nodeId);
        if (nextEdge) {
          setTimeout(async () => {
            await supabase.functions.invoke('execute-flow-node', {
              body: {
                executionId: execution.id,
                nodeId: nextEdge.target,
              },
            });
          }, delaySeconds * 1000);
        }
        return new Response(JSON.stringify({ scheduled: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'condition': {
        // Avaliar condição
        const condition = currentNode.data.condition;
        const field = currentNode.data.field;
        const value = currentNode.data.value;

        let result = false;
        const contactValue = (contact as any)[field];

        switch (condition) {
          case 'equals':
            result = contactValue === value;
            break;
          case 'contains':
            result = contactValue && contactValue.includes(value);
            break;
          case 'exists':
            result = !!contactValue;
            break;
        }

        console.log(`Condição avaliada: ${result}`);

        // Seguir caminho correto
        const nextEdge = edges.find((e: any) => 
          e.source === nodeId && 
          e.sourceHandle === (result ? 'true' : 'false')
        );

        if (nextEdge) {
          await supabase.functions.invoke('execute-flow-node', {
            body: {
              executionId: execution.id,
              nodeId: nextEdge.target,
            },
          });
        }
        return new Response(JSON.stringify({ result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'end': {
        // Finalizar flow
        await supabase
          .from('flow_executions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', execution.id);

        console.log('Flow finalizado');
        return new Response(JSON.stringify({ completed: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Atualizar execução
    await supabase
      .from('flow_executions')
      .update({
        current_node_id: nodeId,
      })
      .eq('id', execution.id);

    // Próximo node
    const nextEdge = edges.find((e: any) => e.source === nodeId);
    if (nextEdge && currentNode.type !== 'delay' && currentNode.type !== 'condition') {
      await supabase.functions.invoke('execute-flow-node', {
        body: {
          executionId: execution.id,
          nodeId: nextEdge.target,
        },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro executando node:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});