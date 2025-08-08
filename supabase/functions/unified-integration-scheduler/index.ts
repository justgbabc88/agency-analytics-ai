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

    // Refresh expired Zoho tokens before starting syncs
    await refreshExpiredZohoTokens(supabaseClient);

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

async function refreshExpiredZohoTokens(supabase: any) {
  console.log('🔄 Checking for expired Zoho tokens...')
  
  try {
    // Find integrations that need token refresh (expire within next hour)
    const { data: expiredIntegrations, error } = await supabase
      .from('project_integration_data')
      .select('project_id, data, id')
      .eq('platform', 'zoho_crm')
      .not('data', 'is', null)
    
    if (error) {
      console.error('Error fetching Zoho integrations:', error)
      return
    }
    
    if (!expiredIntegrations?.length) {
      console.log('No Zoho integrations found')
      return
    }
    
    console.log(`Found ${expiredIntegrations.length} Zoho integrations to check`)
    
    for (const integration of expiredIntegrations) {
      const data = integration.data
      
      if (!data?.access_token || !data?.refresh_token || !data?.connected_at) {
        console.log(`Skipping integration ${integration.project_id} - missing required tokens`)
        continue
      }
      
      // Calculate if token expires within the next hour
      const connectedAt = new Date(data.connected_at)
      const expiresIn = data.expires_in || 3600 // Default 1 hour
      const expiresAt = new Date(connectedAt.getTime() + (expiresIn * 1000))
      const oneHourFromNow = new Date(Date.now() + (60 * 60 * 1000))
      
      if (expiresAt > oneHourFromNow) {
        console.log(`Token for project ${integration.project_id} is still valid until ${expiresAt}`)
        continue
      }
      
      console.log(`🔄 Refreshing token for project ${integration.project_id}`)
      
      try {
        // Refresh the token
        const refreshResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            refresh_token: data.refresh_token,
            client_id: Deno.env.get('ZOHO_CLIENT_ID') || '',
            client_secret: Deno.env.get('ZOHO_CLIENT_SECRET') || '',
            grant_type: 'refresh_token'
          })
        })
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          
          // Update the stored token
          const updatedData = {
            ...data,
            access_token: refreshData.access_token,
            connected_at: new Date().toISOString(),
            expires_in: refreshData.expires_in || 3600,
            last_token_refresh: new Date().toISOString()
          }
          
          await supabase
            .from('project_integration_data')
            .update({ 
              data: updatedData,
              synced_at: new Date().toISOString()
            })
            .eq('id', integration.id)
          
          console.log(`✅ Successfully refreshed token for project ${integration.project_id}`)
        } else {
          const errorText = await refreshResponse.text()
          console.error(`❌ Failed to refresh token for project ${integration.project_id}:`, errorText)
          
          // Mark integration as needing reconnection
          await supabase
            .from('project_integrations')
            .update({ 
              is_connected: false,
              sync_health_score: 0
            })
            .eq('project_id', integration.project_id)
            .eq('platform', 'zoho_crm')
        }
      } catch (refreshError) {
        console.error(`❌ Error refreshing token for project ${integration.project_id}:`, refreshError)
      }
    }
  } catch (error) {
    console.error('Error in refreshExpiredZohoTokens:', error)
  }
}