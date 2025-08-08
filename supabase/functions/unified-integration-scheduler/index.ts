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

    console.log('⏰ Unified integration scheduler activated at:', new Date().toISOString());

    // Setup cron job for unified scheduling
    const { data: cronData, error: cronError } = await supabaseClient
      .rpc('setup_unified_integration_sync_cron');

    if (cronError) {
      console.error('❌ Failed to setup unified cron job:', cronError);
    } else {
      console.log('✅ Unified cron job setup completed:', cronData);
    }

    // Get all projects with any active integrations
    const { data: integrations, error: integrationsError } = await supabaseClient
      .from('project_integrations')
      .select('project_id, platform')
      .eq('is_connected', true);

    if (integrationsError) {
      console.error('❌ Failed to fetch integrations:', integrationsError);
      throw integrationsError;
    }

    console.log(`🔄 Found ${integrations?.length || 0} active integrations across all projects`);

    // Group integrations by project to minimize redundant syncs
    const projectIntegrations = new Map<string, string[]>();
    for (const integration of integrations || []) {
      const platforms = projectIntegrations.get(integration.project_id) || [];
      platforms.push(integration.platform);
      projectIntegrations.set(integration.project_id, platforms);
    }

    console.log(`📊 Processing ${projectIntegrations.size} unique projects`);

    const syncResults = [];
    
    // Process each project with all its platforms
    for (const [projectId, platforms] of projectIntegrations) {
      try {
        console.log(`📊 Syncing project ${projectId} with platforms: ${platforms.join(', ')}`);
        
        // Sync each platform for this project
        for (const platform of platforms) {
          try {
            console.log(`🔄 Syncing ${platform} for project: ${projectId}`);
            
            let syncData, syncError;
            
            if (platform === 'calendly') {
              // Use Calendly-specific incremental sync
              const result = await supabaseClient.functions.invoke(
                'calendly-incremental-sync',
                {
                  body: {
                    project_id: projectId,
                    incremental: true
                  }
                }
              );
              syncData = result.data;
              syncError = result.error;
            } else if (platform === 'facebook') {
              // Use Facebook batch sync
              const result = await supabaseClient.functions.invoke(
                'facebook-batch-sync',
                {
                  body: { 
                    source: 'scheduled_sync',
                    projectId: projectId
                  }
                }
              );
              syncData = result.data;
              syncError = result.error;
            } else {
              // Use generic integration sync for other platforms
              const result = await supabaseClient.functions.invoke(
                'integration-sync',
                {
                  body: {
                    projectId: projectId,
                    platform: platform,
                    syncType: 'both'
                  }
                }
              );
              syncData = result.data;
              syncError = result.error;
            }

            if (syncError) {
              console.error(`❌ Sync failed for ${platform} in project ${projectId}:`, syncError);
              syncResults.push({
                projectId,
                platform,
                success: false,
                error: syncError.message
              });
            } else {
              console.log(`✅ Sync completed for ${platform} in project ${projectId}`);
              syncResults.push({
                projectId,
                platform,
                success: true,
                data: syncData
              });
            }
          } catch (error) {
            console.error(`❌ Exception during ${platform} sync for project ${projectId}:`, error);
            syncResults.push({
              projectId,
              platform,
              success: false,
              error: error.message
            });
          }
          
          // Add a small delay between platform syncs to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Add delay between projects
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Exception during project ${projectId} sync:`, error);
        for (const platform of platforms) {
          syncResults.push({
            projectId,
            platform,
            success: false,
            error: error.message
          });
        }
      }
    }

    // Calculate summary stats
    const successCount = syncResults.filter(r => r.success).length;
    const errorCount = syncResults.filter(r => !r.success).length;
    
    console.log(`📊 Unified sync completed: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Unified integration sync completed',
        cronSetup: cronData,
        syncResults: syncResults,
        totalProjects: projectIntegrations.size,
        totalIntegrations: integrations?.length || 0,
        successCount,
        errorCount
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Unified integration scheduler error:', error);
    return new Response(
      JSON.stringify({ error: 'Unified scheduler setup failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})