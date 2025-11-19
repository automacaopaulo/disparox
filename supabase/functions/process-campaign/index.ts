import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 🚀 FUNÇÃO SIMPLIFICADA - Apenas inicia o processamento em batches
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

    // Verificar se campanha existe
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, status, total_items')
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

    console.log(`🚀 Iniciando processamento da campanha ${campaignId} com ${campaign.total_items} items`);
    console.log(`📦 Sistema de batches: 50 items por batch, 20 msg/s`);

    // Chamar a primeira função de batch
    const batchResponse = await fetch(`${supabaseUrl}/functions/v1/process-campaign-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        campaignId,
        batchNumber: 1,
      }),
    });

    if (!batchResponse.ok) {
      const errorText = await batchResponse.text();
      console.error('Erro ao iniciar batch:', errorText);
      throw new Error('Erro ao iniciar processamento em batch');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Processamento iniciado em modo batch',
        campaignId,
        totalItems: campaign.total_items,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Erro ao iniciar campanha:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
