import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TimezoneSyncOptions {
  project_id: string;
  platform: string;
  user_timezone: string;
  date_range?: {
    start: string;
    end: string;
  };
  sync_type?: 'full' | 'incremental' | 'status_refresh';
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

    const body = await req.json() as TimezoneSyncOptions;
    const { 
      project_id, 
      platform, 
      user_timezone, 
      date_range,
      sync_type = 'incremental' 
    } = body;

    console.log('🕐 Timezone sync handler triggered:', { 
      project_id, 
      platform, 
      user_timezone, 
      sync_type 
    });

    // Validate timezone
    const validatedTimezone = validateAndNormalizeTimezone(user_timezone);
    console.log(`🌍 Using timezone: ${validatedTimezone}`);

    // Update project integration with timezone info
    await supabaseClient
      .from('project_integrations')
      .update({ 
        user_timezone: validatedTimezone,
        sync_preferences: {
          last_timezone_sync: new Date().toISOString(),
          sync_type: sync_type
        }
      })
      .eq('project_id', project_id)
      .eq('platform', platform);

    // Calculate timezone-aware date ranges
    const dateRanges = calculateTimezoneDateRanges(validatedTimezone, date_range);
    console.log('📅 Calculated date ranges:', dateRanges);

    // Route to appropriate sync function with timezone context
    let syncResult;
    
    switch (platform) {
      case 'calendly':
        syncResult = await syncCalendlyWithTimezone(
          supabaseClient, 
          project_id, 
          validatedTimezone, 
          dateRanges, 
          sync_type
        );
        break;
        
      case 'facebook':
        syncResult = await syncFacebookWithTimezone(
          supabaseClient, 
          project_id, 
          validatedTimezone, 
          dateRanges, 
          sync_type
        );
        break;
        
      case 'ghl':
        syncResult = await syncGHLWithTimezone(
          supabaseClient, 
          project_id, 
          validatedTimezone, 
          dateRanges, 
          sync_type
        );
        break;
        
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    const response = {
      success: true,
      message: 'Timezone-aware sync completed',
      platform,
      project_id,
      timezone: validatedTimezone,
      sync_type,
      date_ranges: dateRanges,
      result: syncResult
    };

    console.log('✅ Timezone sync completed:', response);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Timezone sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Timezone sync failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function validateAndNormalizeTimezone(timezone: string): string {
  const fallbackTimezone = 'UTC';
  
  if (!timezone) {
    console.warn('⚠️ No timezone provided, using UTC');
    return fallbackTimezone;
  }

  // List of common timezone formats to normalize
  const timezoneMap: { [key: string]: string } = {
    'EST': 'America/New_York',
    'PST': 'America/Los_Angeles',
    'CST': 'America/Chicago',
    'MST': 'America/Denver',
    'GMT': 'UTC',
    'BST': 'Europe/London',
    'CET': 'Europe/Paris',
  };

  // Check if it's a mapped timezone
  if (timezoneMap[timezone.toUpperCase()]) {
    return timezoneMap[timezone.toUpperCase()];
  }

  // Validate timezone by trying to create a date with it
  try {
    const testDate = new Date();
    new Intl.DateTimeFormat('en', { timeZone: timezone }).format(testDate);
    return timezone;
  } catch (error) {
    console.warn(`⚠️ Invalid timezone '${timezone}', falling back to ${fallbackTimezone}`);
    return fallbackTimezone;
  }
}

function calculateTimezoneDateRanges(
  timezone: string, 
  providedRange?: { start: string; end: string }
) {
  const now = new Date();
  
  // If specific range provided, use it
  if (providedRange) {
    return {
      start: providedRange.start,
      end: providedRange.end,
      timezone,
      calculated_at: now.toISOString()
    };
  }

  // Calculate timezone-aware "today" and ranges
  const formatter = new Intl.DateTimeFormat('en-CA', { 
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const todayInTimezone = formatter.format(now);
  const yesterdayInTimezone = formatter.format(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const weekAgoInTimezone = formatter.format(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));

  // Convert back to ISO strings for database queries
  const startOfTodayInTimezone = new Date(`${todayInTimezone}T00:00:00`);
  const endOfTodayInTimezone = new Date(`${todayInTimezone}T23:59:59`);
  
  return {
    today: {
      start: startOfTodayInTimezone.toISOString(),
      end: endOfTodayInTimezone.toISOString()
    },
    yesterday: {
      start: new Date(`${yesterdayInTimezone}T00:00:00`).toISOString(),
      end: new Date(`${yesterdayInTimezone}T23:59:59`).toISOString()
    },
    last_week: {
      start: new Date(`${weekAgoInTimezone}T00:00:00`).toISOString(),
      end: endOfTodayInTimezone.toISOString()
    },
    timezone,
    calculated_at: now.toISOString()
  };
}

async function syncCalendlyWithTimezone(
  supabaseClient: any,
  projectId: string,
  timezone: string,
  dateRanges: any,
  syncType: string
) {
  console.log('📅 Starting Calendly timezone sync...');
  
  // Choose appropriate sync based on type
  let functionName = 'calendly-sync-gaps';
  let payload: any = {
    specificProjectId: projectId,
    userTimezone: timezone,
    triggerReason: `timezone_sync_${syncType}`
  };

  switch (syncType) {
    case 'full':
      payload.startDate = dateRanges.last_week.start;
      payload.endDate = dateRanges.today.end;
      break;
      
    case 'incremental':
      functionName = 'calendly-incremental-sync';
      payload = {
        project_id: projectId,
        incremental: true,
        user_timezone: timezone
      };
      break;
      
    case 'status_refresh':
      functionName = 'calendly-status-refresh';
      payload = {
        project_id: projectId,
        user_timezone: timezone
      };
      break;
  }

  const { data, error } = await supabaseClient.functions.invoke(functionName, {
    body: payload
  });

  if (error) {
    console.error(`❌ Calendly ${syncType} sync failed:`, error);
    throw error;
  }

  console.log(`✅ Calendly ${syncType} sync completed:`, data);
  return data;
}

async function syncFacebookWithTimezone(
  supabaseClient: any,
  projectId: string,
  timezone: string,
  dateRanges: any,
  syncType: string
) {
  console.log('📘 Starting Facebook timezone sync...');
  
  // Facebook sync with timezone context
  const { data, error } = await supabaseClient.functions.invoke('facebook-force-sync', {
    body: {
      project_id: projectId,
      user_timezone: timezone,
      date_range: dateRanges.today,
      sync_type: syncType
    }
  });

  if (error) {
    console.error('❌ Facebook timezone sync failed:', error);
    throw error;
  }

  console.log('✅ Facebook timezone sync completed:', data);
  return data;
}

async function syncGHLWithTimezone(
  supabaseClient: any,
  projectId: string,
  timezone: string,
  dateRanges: any,
  syncType: string
) {
  console.log('🟢 Starting GHL timezone sync...');
  
  // GHL sync with timezone context
  const { data, error } = await supabaseClient.functions.invoke('ghl-bulk-sync', {
    body: {
      project_id: projectId,
      user_timezone: timezone,
      date_range: dateRanges.today,
      sync_type: syncType
    }
  });

  if (error) {
    console.error('❌ GHL timezone sync failed:', error);
    throw error;
  }

  console.log('✅ GHL timezone sync completed:', data);
  return data;
}