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

    console.log('⏰ GHL sync scheduler activated at:', new Date().toISOString());

    // Setup hourly background sync cron job
    const { data: cronData, error: cronError } = await supabaseClient
      .rpc('setup_ghl_sync_cron');

    if (cronError) {
      console.error('❌ Failed to setup GHL cron job:', cronError);
    } else {
      console.log('✅ GHL cron job setup completed:', cronData);
    }

    // Get all projects with active GHL integrations
    const { data: integrations, error: integrationsError } = await supabaseClient
      .from('project_integrations')
      .select('project_id')
      .eq('platform', 'ghl')
      .eq('is_connected', true);

    if (integrationsError) {
      console.error('❌ Failed to fetch GHL integrations:', integrationsError);
      throw integrationsError;
    }

    console.log(`🔄 Found ${integrations?.length || 0} projects with active GHL integrations`);

    // Trigger sync for each project
    const syncResults = [];
    for (const integration of integrations || []) {
      try {
        console.log(`📊 Syncing GHL data for project: ${integration.project_id}`);
        
        const { data: syncData, error: syncError } = await supabaseClient.functions.invoke(
          'integration-sync',
          {
            body: {
              projectId: integration.project_id,
              platform: 'ghl',
              syncType: 'both'
            }
          }
        );

        if (syncError) {
          console.error(`❌ Sync failed for project ${integration.project_id}:`, syncError);
          syncResults.push({
            projectId: integration.project_id,
            success: false,
            error: syncError.message
          });
        } else {
          console.log(`✅ Sync completed for project ${integration.project_id}:`, syncData);
          syncResults.push({
            projectId: integration.project_id,
            success: true,
            data: syncData
          });
        }
      } catch (error) {
        console.error(`❌ Exception during sync for project ${integration.project_id}:`, error);
        syncResults.push({
          projectId: integration.project_id,
          success: false,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'GHL sync scheduler completed',
        cronSetup: cronData,
        syncResults: syncResults,
        totalProjects: integrations?.length || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ GHL sync scheduler error:', error);
    return new Response(
      JSON.stringify({ error: 'GHL scheduler setup failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})