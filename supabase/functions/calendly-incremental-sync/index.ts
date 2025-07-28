import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncOptions {
  project_id?: string;
  incremental?: boolean;
  deep_sync?: boolean;
  days_back?: number;
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

    const body = await req.json() as SyncOptions;
    const { project_id, incremental = true, deep_sync = false, days_back = 7 } = body;

    console.log('🔧 Calendly incremental sync triggered:', { 
      project_id, 
      incremental, 
      deep_sync, 
      days_back 
    });

    // Get connected Calendly integrations
    let query = supabaseClient
      .from('project_integrations')
      .select('project_id, platform, last_sync')
      .eq('platform', 'calendly')
      .eq('is_connected', true);

    if (project_id) {
      query = query.eq('project_id', project_id);
    }

    const { data: integrations, error: integrationsError } = await query;

    if (integrationsError || !integrations?.length) {
      console.error('❌ No connected Calendly integrations found:', integrationsError);
      return new Response(
        JSON.stringify({ error: 'No connected integrations found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${integrations.length} connected integration(s)`);

    let totalProcessed = 0;
    let totalErrors = 0;

    for (const integration of integrations) {
      try {
        console.log(`🔄 Processing project: ${integration.project_id}`);
        
        // Add rate limiting delay between projects (2 seconds minimum)
        if (integration !== integrations[0]) {
          console.log('⏱️ Adding 2 second delay between projects for rate limiting...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Determine sync strategy based on last_sync timestamp
        let syncStartDate: Date;
        
        if (deep_sync) {
          // Deep sync: go back 90 days for complete refresh
          syncStartDate = new Date();
          syncStartDate.setDate(syncStartDate.getDate() - 90);
          console.log(`🗄️ Deep sync mode: syncing from ${syncStartDate.toISOString()}`);
        } else if (incremental && integration.last_sync) {
          // Incremental sync: start from last successful sync
          syncStartDate = new Date(integration.last_sync);
          syncStartDate.setHours(syncStartDate.getHours() - 1); // 1 hour overlap for safety
          console.log(`⚡ Incremental sync: syncing from ${syncStartDate.toISOString()}`);
        } else {
          // Default: sync recent data
          syncStartDate = new Date();
          syncStartDate.setDate(syncStartDate.getDate() - days_back);
          console.log(`📅 Default sync: syncing last ${days_back} days from ${syncStartDate.toISOString()}`);
        }

        // Call the main sync function with targeted date range - prioritizing recent events
        const { data: syncResult, error: syncError } = await supabaseClient.functions.invoke('calendly-sync-gaps', {
          body: { 
            specificProjectId: integration.project_id,
            triggerReason: incremental ? 'incremental_sync_priority' : 'manual_sync',
            startDate: syncStartDate.toISOString(),
            endDate: new Date().toISOString()
          }
        });

        if (syncError) {
          console.error(`❌ Sync failed for project ${integration.project_id}:`, syncError);
          totalErrors++;
        } else {
          console.log(`✅ Sync completed for project ${integration.project_id}:`, syncResult);
          totalProcessed++;

          // Update last_sync timestamp for successful incremental syncs
          if (incremental) {
            await supabaseClient
              .from('project_integrations')
              .update({ last_sync: new Date().toISOString() })
              .eq('project_id', integration.project_id)
              .eq('platform', 'calendly');
          }
        }

        // Rate limiting: wait between projects
        if (integrations.indexOf(integration) < integrations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`❌ Error processing project ${integration.project_id}:`, error);
        totalErrors++;
      }
    }

    const response = {
      success: true,
      message: 'Incremental sync completed',
      stats: {
        projectsProcessed: totalProcessed,
        projectsWithErrors: totalErrors,
        totalProjects: integrations.length,
        syncMode: deep_sync ? 'deep' : incremental ? 'incremental' : 'default'
      }
    };

    console.log('📈 Incremental sync summary:', response.stats);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Incremental sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Incremental sync failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})