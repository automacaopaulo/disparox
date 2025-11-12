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
    const { campaignId, errorCodes, newTemplateName } = await req.json();

    if (!campaignId) {
      throw new Error('Campos obrigatórios: campaignId');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Reprocessando falhas da campanha ${campaignId}`);

    // Buscar campanha
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campanha não encontrada');
    }

    // Construir query para buscar itens falhados
    let query = supabase
      .from('campaign_items')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'failed');

    // Filtrar por códigos de erro específicos se fornecido
    if (errorCodes && errorCodes.length > 0) {
      query = query.in('error_code', errorCodes);
    }

    const { data: failedItems, error: itemsError } = await query;

    if (itemsError) {
      throw new Error(`Erro ao buscar itens falhados: ${itemsError.message}`);
    }

    if (!failedItems || failedItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum item falhado encontrado', reprocessed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Encontrados ${failedItems.length} itens para reprocessar`);

    // Resetar status dos itens para 'pending'
    const itemIds = failedItems.map(item => item.id);
    
    const { error: updateError } = await supabase
      .from('campaign_items')
      .update({ 
        status: 'pending',
        error_code: null,
        error_message: null,
        fbtrace_id: null,
        retry_count: 0
      })
      .in('id', itemIds);

    if (updateError) {
      throw new Error(`Erro ao resetar itens: ${updateError.message}`);
    }

    // Se novo template foi fornecido, atualizar campanha
    if (newTemplateName) {
      await supabase
        .from('campaigns')
        .update({ 
          template_name: newTemplateName,
          status: 'pending'
        })
        .eq('id', campaignId);
    } else {
      await supabase
        .from('campaigns')
        .update({ status: 'pending' })
        .eq('id', campaignId);
    }

    // Chamar process-campaign novamente
    const processResult = await supabase.functions.invoke('process-campaign', {
      body: { campaignId },
    });

    if (processResult.error) {
      console.error('Erro ao invocar process-campaign:', processResult.error);
      throw new Error(`Erro ao processar campanha: ${processResult.error.message}`);
    }

    console.log(`✓ Reprocessamento iniciado para ${failedItems.length} itens`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        reprocessed: failedItems.length,
        newTemplate: newTemplateName || campaign.template_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no reprocess-campaign-failures:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
