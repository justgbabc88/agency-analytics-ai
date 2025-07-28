import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('⏰ Calendly sync scheduler activated at:', new Date().toISOString());

    // Setup daily background sync cron job
    const { data: cronData, error: cronError } = await supabaseClient
      .rpc('setup_calendly_sync_cron');

    if (cronError) {
      console.error('❌ Failed to setup cron job:', cronError);
    } else {
      console.log('✅ Cron job setup completed:', cronData);
    }

    // Trigger immediate background sync
    const { data: syncData, error: syncError } = await supabaseClient.functions.invoke('calendly-background-sync');

    if (syncError) {
      console.error('❌ Failed to trigger background sync:', syncError);
    } else {
      console.log('✅ Background sync triggered:', syncData);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Calendly sync scheduler setup completed',
        cronSetup: cronData,
        backgroundSync: syncData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Sync scheduler error:', error);
    return new Response(
      JSON.stringify({ error: 'Scheduler setup failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})