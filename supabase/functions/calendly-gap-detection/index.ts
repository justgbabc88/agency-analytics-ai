import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GapDetectionRequest {
  triggerReason?: string;
  eventTypeUri?: string;
  recentEventId?: string;
  projectId?: string;
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

    const body: GapDetectionRequest = await req.json();
    const { triggerReason, eventTypeUri, recentEventId, projectId } = body;

    console.log('🔍 Gap detection started:', { 
      triggerReason, 
      eventTypeUri, 
      recentEventId, 
      projectId,
      timestamp: new Date().toISOString()
    });

    // Get connected projects
    let projectsQuery = supabaseClient
      .from('project_integrations')
      .select('project_id, last_sync')
      .eq('platform', 'calendly')
      .eq('is_connected', true);

    if (projectId) {
      projectsQuery = projectsQuery.eq('project_id', projectId);
    }

    const { data: projects, error: projectsError } = await projectsQuery;

    if (projectsError || !projects?.length) {
      console.log('📊 No connected projects found for gap detection');
      return new Response(
        JSON.stringify({ message: 'No projects to analyze', gaps: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const detectedGaps = [];
    const dataValidationResults = [];

    for (const project of projects) {
      try {
        console.log(`🔍 Analyzing gaps for project: ${project.project_id}`);

        // 1. COMPREHENSIVE STATUS VALIDATION
        const { data: statusInconsistencies, error: statusError } = await supabaseClient
          .from('calendly_events')
          .select('id, calendly_event_id, status, scheduled_at, created_at')
          .eq('project_id', project.project_id)
          .in('status', ['canceled', 'cancelled']) // Check for status inconsistencies
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        if (statusInconsistencies?.length) {
          console.log(`⚠️ Found ${statusInconsistencies.length} events with inconsistent status naming`);
          
          // Normalize status inconsistencies
          for (const event of statusInconsistencies) {
            if (event.status === 'canceled') {
              await supabaseClient
                .from('calendly_events')
                .update({ status: 'cancelled', updated_at: new Date().toISOString() })
                .eq('id', event.id);
            }
          }
        }

        // 2. TIMELINE GAP DETECTION
        const { data: recentEvents, error: eventsError } = await supabaseClient
          .from('calendly_events')
          .select('created_at, scheduled_at, status')
          .eq('project_id', project.project_id)
          .gte('created_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: true });

        if (recentEvents?.length) {
          // Detect date gaps in event creation timeline
          const gaps = detectTimelineGaps(recentEvents);
          if (gaps.length > 0) {
            detectedGaps.push({
              project_id: project.project_id,
              gap_type: 'timeline',
              gaps: gaps,
              recommendation: 'incremental_sync'
            });
          }
        }

        // 3. DATA CONSISTENCY VALIDATION
        const { data: duplicateEvents, error: duplicateError } = await supabaseClient
          .from('calendly_events')
          .select('calendly_event_id, count(*)')
          .eq('project_id', project.project_id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .group('calendly_event_id')
          .having('count(*)', 'gt', 1);

        if (duplicateEvents?.length) {
          console.log(`🔄 Found ${duplicateEvents.length} duplicate events in project ${project.project_id}`);
          
          // Clean up duplicates, keeping the most recent record
          for (const duplicate of duplicateEvents) {
            const { data: duplicateRecords } = await supabaseClient
              .from('calendly_events')
              .select('id, updated_at')
              .eq('project_id', project.project_id)
              .eq('calendly_event_id', duplicate.calendly_event_id)
              .order('updated_at', { ascending: false });

            if (duplicateRecords?.length > 1) {
              // Keep the first (most recent), delete the rest
              const toDelete = duplicateRecords.slice(1);
              for (const record of toDelete) {
                await supabaseClient
                  .from('calendly_events')
                  .delete()
                  .eq('id', record.id);
              }
            }
          }
        }

        // 4. SYNC CHECKPOINT TRACKING
        const lastSyncAge = project.last_sync 
          ? Date.now() - new Date(project.last_sync).getTime()
          : null;
        
        if (!project.last_sync || lastSyncAge > 24 * 60 * 60 * 1000) {
          detectedGaps.push({
            project_id: project.project_id,
            gap_type: 'stale_sync',
            last_sync_age_hours: lastSyncAge ? Math.floor(lastSyncAge / (1000 * 60 * 60)) : null,
            recommendation: 'full_sync'
          });
        }

        // 5. EVENT STATUS COMPLETENESS CHECK
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const { data: pastActiveEvents, error: pastActiveError } = await supabaseClient
          .from('calendly_events')
          .select('id, calendly_event_id, scheduled_at, status')
          .eq('project_id', project.project_id)
          .eq('status', 'active')
          .lt('scheduled_at', yesterday.toISOString());

        if (pastActiveEvents?.length) {
          console.log(`⚠️ Found ${pastActiveEvents.length} past events still marked as 'active'`);
          detectedGaps.push({
            project_id: project.project_id,
            gap_type: 'status_outdated',
            outdated_events: pastActiveEvents.length,
            recommendation: 'status_refresh'
          });
        }

        dataValidationResults.push({
          project_id: project.project_id,
          total_events: recentEvents?.length || 0,
          status_fixes: statusInconsistencies?.length || 0,
          duplicates_cleaned: duplicateEvents?.length || 0,
          outdated_statuses: pastActiveEvents?.length || 0
        });

      } catch (error) {
        console.error(`❌ Gap detection error for project ${project.project_id}:`, error);
      }
    }

    // TRIGGER CORRECTIVE ACTIONS
    let correctiveActions = 0;
    for (const gap of detectedGaps) {
      try {
        if (gap.recommendation === 'incremental_sync') {
          await supabaseClient.functions.invoke('calendly-incremental-sync', {
            body: { 
              project_id: gap.project_id,
              incremental: true,
              days_back: 7
            }
          });
          correctiveActions++;
        } else if (gap.recommendation === 'status_refresh') {
          await supabaseClient.functions.invoke('calendly-status-refresh', {
            body: { 
              project_id: gap.project_id
            }
          });
          correctiveActions++;
        }
      } catch (error) {
        console.error(`❌ Failed to trigger corrective action for gap:`, error);
      }
    }

    const response = {
      success: true,
      message: 'Gap detection completed',
      analysis: {
        projects_analyzed: projects.length,
        gaps_detected: detectedGaps.length,
        corrective_actions_triggered: correctiveActions,
        data_validation: dataValidationResults
      },
      gaps: detectedGaps,
      timestamp: new Date().toISOString()
    };

    console.log('📊 Gap detection summary:', response.analysis);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Gap detection error:', error);
    return new Response(
      JSON.stringify({ error: 'Gap detection failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to detect timeline gaps
function detectTimelineGaps(events: any[]): any[] {
  const gaps = [];
  const sortedEvents = events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  for (let i = 1; i < sortedEvents.length; i++) {
    const prevTime = new Date(sortedEvents[i-1].created_at).getTime();
    const currentTime = new Date(sortedEvents[i].created_at).getTime();
    const gapHours = (currentTime - prevTime) / (1000 * 60 * 60);
    
    // Flag gaps longer than 6 hours during business hours
    if (gapHours > 6) {
      gaps.push({
        start_time: sortedEvents[i-1].created_at,
        end_time: sortedEvents[i].created_at,
        gap_duration_hours: Math.round(gapHours * 10) / 10,
        severity: gapHours > 24 ? 'high' : 'medium'
      });
    }
  }
  
  return gaps;
}
