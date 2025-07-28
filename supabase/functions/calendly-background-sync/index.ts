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

    console.log('🔄 Daily background sync started at:', new Date().toISOString());

    // Get all connected Calendly integrations
    const { data: integrations, error: integrationsError } = await supabaseClient
      .from('project_integrations')
      .select('project_id, platform, last_sync')
      .eq('platform', 'calendly')
      .eq('is_connected', true);

    if (integrationsError || !integrations?.length) {
      console.log('📊 No connected Calendly integrations found for background sync');
      return new Response(
        JSON.stringify({ message: 'No integrations to sync', count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Background sync processing ${integrations.length} integration(s)`);

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const integration of integrations) {
      try {
        console.log(`🔄 Background sync for project: ${integration.project_id}`);

        // Determine sync window based on last successful sync
        const now = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);

        let syncStartDate = sevenDaysAgo;

        // If we have a recent last_sync, use a smaller window
        if (integration.last_sync) {
          const lastSync = new Date(integration.last_sync);
          const timeSinceLastSync = now.getTime() - lastSync.getTime();
          const hoursSinceLastSync = timeSinceLastSync / (1000 * 60 * 60);

          if (hoursSinceLastSync < 48) {
            // Recent sync: just check last 2 days for gaps
            syncStartDate = new Date();
            syncStartDate.setDate(now.getDate() - 2);
          }
        }

        console.log(`⏰ Background sync window: ${syncStartDate.toISOString()} to ${now.toISOString()}`);

        // Call incremental sync for this project
        const { data: syncResult, error: syncError } = await supabaseClient.functions.invoke('calendly-incremental-sync', {
          body: { 
            project_id: integration.project_id,
            incremental: true,
            days_back: Math.ceil((now.getTime() - syncStartDate.getTime()) / (1000 * 60 * 60 * 24))
          }
        });

        if (syncError) {
          console.error(`❌ Background sync failed for project ${integration.project_id}:`, syncError);
          errorCount++;
          results.push({
            project_id: integration.project_id,
            status: 'error',
            error: syncError.message
          });
        } else {
          console.log(`✅ Background sync completed for project ${integration.project_id}`);
          successCount++;
          results.push({
            project_id: integration.project_id,
            status: 'success',
            result: syncResult
          });
        }

        // Rate limiting between projects
        if (integrations.indexOf(integration) < integrations.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        console.error(`❌ Background sync error for project ${integration.project_id}:`, error);
        errorCount++;
        results.push({
          project_id: integration.project_id,
          status: 'error',
          error: error.message
        });
      }
    }

    const summary = {
      success: true,
      message: 'Daily background sync completed',
      stats: {
        totalProjects: integrations.length,
        successfulProjects: successCount,
        failedProjects: errorCount,
        completedAt: new Date().toISOString()
      },
      results
    };

    console.log('📈 Background sync summary:', summary.stats);

    return new Response(
      JSON.stringify(summary),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Background sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Background sync failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})