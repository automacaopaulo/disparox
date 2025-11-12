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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Iniciando atualização de quality ratings...');

    // Buscar todos os números WhatsApp ativos
    const { data: numbers, error: fetchError } = await supabase
      .from('whatsapp_numbers')
      .select('*')
      .eq('is_active', true);

    if (fetchError) {
      throw new Error(`Erro ao buscar números: ${fetchError.message}`);
    }

    if (!numbers || numbers.length === 0) {
      console.log('Nenhum número ativo encontrado');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum número ativo', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updated = 0;
    let errors = 0;

    // Atualizar quality rating de cada número
    for (const number of numbers) {
      try {
        const url = `https://graph.facebook.com/v21.0/${number.phone_number_id}?fields=quality_rating`;
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${number.access_token}` },
        });

        if (!response.ok) {
          console.error(`Erro ao buscar quality rating para ${number.phone_number_id}`);
          errors++;
          continue;
        }

        const data = await response.json();
        const qualityRating = data.quality_rating || 'UNKNOWN';

        // Atualizar no banco
        const { error: updateError } = await supabase
          .from('whatsapp_numbers')
          .update({ 
            quality_rating: qualityRating,
            updated_at: new Date().toISOString()
          })
          .eq('id', number.id);

        if (updateError) {
          console.error(`Erro ao atualizar quality rating para ${number.id}: ${updateError.message}`);
          errors++;
        } else {
          console.log(`✓ Quality rating atualizado para ${number.display_name || number.phone_number_id}: ${qualityRating}`);
          updated++;
        }

      } catch (error) {
        console.error(`Erro ao processar número ${number.id}:`, error);
        errors++;
      }
    }

    console.log(`Atualização concluída: ${updated} atualizados, ${errors} erros`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated, 
        errors,
        total: numbers.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no update-quality-rating:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
