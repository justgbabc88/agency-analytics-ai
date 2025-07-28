import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HealthCheckOptions {
  project_id?: string;
  platform?: string;
  user_timezone?: string;
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

    const body = await req.json() as HealthCheckOptions;
    const { project_id, platform, user_timezone = 'UTC' } = body;

    console.log('🏥 Health monitor triggered:', { project_id, platform, user_timezone });

    // Get all project integrations or specific one
    let query = supabaseClient
      .from('project_integrations')
      .select('*')
      .eq('is_connected', true);

    if (project_id) {
      query = query.eq('project_id', project_id);
    }
    if (platform) {
      query = query.eq('platform', platform);
    }

    const { data: integrations, error: integrationsError } = await query;

    if (integrationsError) {
      console.error('❌ Failed to fetch integrations:', integrationsError);
      throw integrationsError;
    }

    console.log(`🔍 Checking health for ${integrations?.length || 0} integrations`);

    const healthResults = [];

    for (const integration of integrations || []) {
      const startTime = Date.now();
      
      try {
        console.log(`🔍 Checking ${integration.platform} for project ${integration.project_id}`);
        
        // Check sync health based on platform
        const healthCheck = await performPlatformHealthCheck(
          supabaseClient, 
          integration, 
          user_timezone
        );
        
        const syncDuration = Date.now() - startTime;
        
        // Record health metrics
        await recordHealthMetrics(supabaseClient, integration, healthCheck, syncDuration);
        
        // Check alert thresholds
        await checkAlertThresholds(supabaseClient, integration, healthCheck);
        
        // Update integration health status
        await supabaseClient
          .from('project_integrations')
          .update({
            last_health_check: new Date().toISOString(),
            sync_health_score: healthCheck.healthScore,
            data_quality_score: healthCheck.dataQuality
          })
          .eq('id', integration.id);

        healthResults.push({
          project_id: integration.project_id,
          platform: integration.platform,
          status: 'healthy',
          health_score: healthCheck.healthScore,
          data_quality: healthCheck.dataQuality,
          metrics: healthCheck.metrics,
          sync_duration: syncDuration
        });

        console.log(`✅ Health check completed for ${integration.platform}: ${healthCheck.healthScore}%`);

      } catch (error) {
        console.error(`❌ Health check failed for ${integration.platform}:`, error);
        
        // Record failure metric
        await recordHealthMetrics(supabaseClient, integration, {
          healthScore: 0,
          dataQuality: 0,
          metrics: { error: error.message }
        }, Date.now() - startTime);

        healthResults.push({
          project_id: integration.project_id,
          platform: integration.platform,
          status: 'unhealthy',
          health_score: 0,
          error: error.message
        });
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const response = {
      success: true,
      message: 'Health monitoring completed',
      timestamp: new Date().toISOString(),
      timezone: user_timezone,
      results: healthResults,
      summary: {
        total_checked: healthResults.length,
        healthy: healthResults.filter(r => r.status === 'healthy').length,
        unhealthy: healthResults.filter(r => r.status === 'unhealthy').length,
        average_health_score: healthResults.reduce((acc, r) => acc + (r.health_score || 0), 0) / healthResults.length
      }
    };

    console.log('📊 Health monitoring summary:', response.summary);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Health monitoring error:', error);
    return new Response(
      JSON.stringify({ error: 'Health monitoring failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function performPlatformHealthCheck(
  supabaseClient: any, 
  integration: any, 
  userTimezone: string
) {
  const { platform, project_id } = integration;
  
  // Calculate timezone-aware date ranges
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let healthScore = 100;
  let dataQuality = 100;
  const metrics: any = {};

  try {
    switch (platform) {
      case 'calendly':
        return await checkCalendlyHealth(supabaseClient, project_id, userTimezone, yesterday, lastWeek);
      
      case 'facebook':
        return await checkFacebookHealth(supabaseClient, project_id, userTimezone, yesterday, lastWeek);
      
      case 'ghl':
        return await checkGHLHealth(supabaseClient, project_id, userTimezone, yesterday, lastWeek);
      
      default:
        return { healthScore: 50, dataQuality: 50, metrics: { error: 'Unknown platform' } };
    }
  } catch (error) {
    console.error(`❌ Platform health check failed for ${platform}:`, error);
    return { healthScore: 0, dataQuality: 0, metrics: { error: error.message } };
  }
}

async function checkCalendlyHealth(
  supabaseClient: any, 
  projectId: string, 
  userTimezone: string, 
  yesterday: Date, 
  lastWeek: Date
) {
  let healthScore = 100;
  let dataQuality = 100;
  const metrics: any = {};

  // Check recent sync logs
  const { data: syncLogs } = await supabaseClient
    .from('calendly_sync_logs')
    .select('*')
    .eq('project_id', projectId)
    .gte('created_at', yesterday.toISOString())
    .order('created_at', { ascending: false });

  metrics.recent_syncs = syncLogs?.length || 0;
  
  if (syncLogs && syncLogs.length > 0) {
    const failedSyncs = syncLogs.filter(log => log.sync_status === 'failed').length;
    const successRate = ((syncLogs.length - failedSyncs) / syncLogs.length) * 100;
    metrics.success_rate = successRate;
    
    if (successRate < 90) healthScore -= 20;
    if (successRate < 70) healthScore -= 30;
  } else {
    // No recent syncs is concerning
    healthScore -= 40;
    metrics.warning = 'No recent sync activity';
  }

  // Check data freshness
  const { data: recentEvents } = await supabaseClient
    .from('calendly_events')
    .select('created_at, updated_at, status')
    .eq('project_id', projectId)
    .gte('created_at', yesterday.toISOString());

  metrics.recent_events = recentEvents?.length || 0;
  
  // Check for stale data
  const { data: staleEvents } = await supabaseClient
    .from('calendly_events')
    .select('count')
    .eq('project_id', projectId)
    .eq('status', 'active')
    .lt('scheduled_at', yesterday.toISOString());

  if (staleEvents && staleEvents.length > 0) {
    dataQuality -= 20;
    metrics.stale_events = staleEvents.length;
  }

  return { healthScore: Math.max(0, healthScore), dataQuality: Math.max(0, dataQuality), metrics };
}

async function checkFacebookHealth(
  supabaseClient: any, 
  projectId: string, 
  userTimezone: string, 
  yesterday: Date, 
  lastWeek: Date
) {
  let healthScore = 100;
  let dataQuality = 100;
  const metrics: any = {};

  // Check integration data freshness
  const { data: integrationData } = await supabaseClient
    .from('project_integration_data')
    .select('*')
    .eq('project_id', projectId)
    .eq('platform', 'facebook')
    .gte('synced_at', yesterday.toISOString())
    .order('synced_at', { ascending: false });

  metrics.recent_data_syncs = integrationData?.length || 0;
  
  if (!integrationData || integrationData.length === 0) {
    healthScore -= 50;
    metrics.warning = 'No recent Facebook data syncs';
  }

  return { healthScore: Math.max(0, healthScore), dataQuality: Math.max(0, dataQuality), metrics };
}

async function checkGHLHealth(
  supabaseClient: any, 
  projectId: string, 
  userTimezone: string, 
  yesterday: Date, 
  lastWeek: Date
) {
  let healthScore = 100;
  let dataQuality = 100;
  const metrics: any = {};

  // Check form submissions
  const { data: recentSubmissions } = await supabaseClient
    .from('ghl_form_submissions')
    .select('*')
    .eq('project_id', projectId)
    .gte('submitted_at', yesterday.toISOString());

  metrics.recent_submissions = recentSubmissions?.length || 0;
  
  // For GHL, no recent submissions might be normal, so less penalty
  if (recentSubmissions && recentSubmissions.length === 0) {
    const { data: historicalSubmissions } = await supabaseClient
      .from('ghl_form_submissions')
      .select('count')
      .eq('project_id', projectId)
      .gte('submitted_at', lastWeek.toISOString());
    
    if (!historicalSubmissions || historicalSubmissions.length === 0) {
      healthScore -= 30;
      metrics.warning = 'No GHL form activity';
    }
  }

  return { healthScore: Math.max(0, healthScore), dataQuality: Math.max(0, dataQuality), metrics };
}

async function recordHealthMetrics(
  supabaseClient: any,
  integration: any,
  healthCheck: any,
  syncDuration: number
) {
  const { project_id, platform } = integration;
  
  // Record multiple metrics
  const metricsToRecord = [
    { type: 'health_score', value: healthCheck.healthScore },
    { type: 'data_quality', value: healthCheck.dataQuality },
    { type: 'sync_duration', value: syncDuration }
  ];

  for (const metric of metricsToRecord) {
    await supabaseClient.rpc('record_sync_metric', {
      p_project_id: project_id,
      p_platform: platform,
      p_metric_type: metric.type,
      p_metric_value: metric.value,
      p_metadata: { ...healthCheck.metrics, check_timestamp: new Date().toISOString() }
    });
  }
}

async function checkAlertThresholds(
  supabaseClient: any,
  integration: any,
  healthCheck: any
) {
  const { project_id, platform } = integration;
  
  // Check health score threshold
  await supabaseClient.rpc('check_alert_thresholds', {
    p_project_id: project_id,
    p_platform: platform,
    p_metric_type: 'health_score',
    p_metric_value: healthCheck.healthScore
  });

  // Check data quality threshold
  await supabaseClient.rpc('check_alert_thresholds', {
    p_project_id: project_id,
    p_platform: platform,
    p_metric_type: 'data_quality',
    p_metric_value: healthCheck.dataQuality
  });
}