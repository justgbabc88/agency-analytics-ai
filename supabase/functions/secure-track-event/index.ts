import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TrackingData {
  pixelId: string;
  sessionId: string;
  eventType: string;
  pageUrl: string;
  eventName?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  referrerUrl?: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  operatingSystem?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactName?: string;
  formData?: any;
  revenueAmount?: number;
  currency?: string;
  customData?: any;
  timestamp?: string;
}

async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    const trackingData: TrackingData = await req.json();
    console.log('Received enhanced tracking data:', JSON.stringify(trackingData, null, 2));

    // Get client IP for rate limiting and security logging
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const hashedIP = await hashIP(clientIP);

    // Validate tracking pixel exists and get project_id
    const { data: pixelData, error: pixelError } = await supabaseAnon
      .from('tracking_pixels')
      .select('id, project_id, is_active')
      .eq('pixel_id', trackingData.pixelId)
      .single();

    if (pixelError || !pixelData || !pixelData.is_active) {
      console.error('Invalid or inactive pixel:', trackingData.pixelId);
      
      // Log security incident for invalid pixel access
      await supabaseService.rpc('log_security_event', {
        p_user_id: null,
        p_action: 'invalid_pixel_access',
        p_resource_type: 'tracking_pixels',
        p_resource_id: null,
        p_details: {
          pixel_id: trackingData.pixelId,
          client_ip: hashedIP,
          user_agent: req.headers.get('user-agent'),
          timestamp: new Date().toISOString()
        },
        p_severity: 'warning'
      });

      return new Response(
        JSON.stringify({ error: 'Invalid pixel configuration' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const projectId = pixelData.project_id;

    // Enhanced rate limiting using new function
    const { data: rateLimitCheck, error: rateLimitError } = await supabaseService.rpc(
      'enhanced_tracking_rate_limit',
      {
        p_identifier: hashedIP,
        p_project_id: projectId,
        p_max_requests: 100,
        p_window_minutes: 15
      }
    );

    if (rateLimitError || !rateLimitCheck) {
      console.error('Rate limit exceeded or error:', rateLimitError);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Enhanced data validation using existing function
    const hasContactData = !!(trackingData.contactEmail || trackingData.contactPhone || trackingData.contactName);
    const hasRevenueData = !!(trackingData.revenueAmount && trackingData.revenueAmount > 0);

    const { data: validationResult, error: validationError } = await supabaseService.rpc(
      'validate_tracking_event_data',
      {
        p_event_type: trackingData.eventType,
        p_page_url: trackingData.pageUrl,
        p_contact_email: trackingData.contactEmail || null,
        p_contact_phone: trackingData.contactPhone || null,
        p_revenue_amount: trackingData.revenueAmount || null
      }
    );

    if (validationError) {
      console.error('Data validation failed:', validationError);
      return new Response(
        JSON.stringify({ error: 'Invalid tracking data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check for suspicious activity patterns
    await supabaseService.rpc('detect_suspicious_tracking_activity', {
      p_session_id: trackingData.sessionId,
      p_project_id: projectId,
      p_client_ip: clientIP
    });

    // Check for existing session
    let sessionExists = false;
    const { data: existingSession } = await supabaseAnon
      .from('tracking_sessions')
      .select('id')
      .eq('session_id', trackingData.sessionId)
      .eq('project_id', projectId)
      .single();

    if (!existingSession) {
      // Create new session with enhanced security validation
      const sessionData = {
        session_id: trackingData.sessionId,
        project_id: projectId,
        utm_source: trackingData.utmSource,
        utm_medium: trackingData.utmMedium,
        utm_campaign: trackingData.utmCampaign,
        utm_term: trackingData.utmTerm,
        utm_content: trackingData.utmContent,
        referrer_url: trackingData.referrerUrl,
        landing_page_url: trackingData.pageUrl,
        ip_hash: hashedIP,
        user_agent: trackingData.userAgent,
        device_type: trackingData.deviceType,
        browser: trackingData.browser,
        operating_system: trackingData.operatingSystem,
        first_visit_at: new Date(trackingData.timestamp || Date.now()),
        last_activity_at: new Date(trackingData.timestamp || Date.now())
      };

      const { error: sessionError } = await supabaseAnon
        .from('tracking_sessions')
        .insert(sessionData);

      if (sessionError) {
        console.error('Error creating session:', sessionError);
      }
    } else {
      // Update existing session activity
      const { error: updateError } = await supabaseAnon
        .from('tracking_sessions')
        .update({ 
          last_activity_at: new Date(trackingData.timestamp || Date.now())
        })
        .eq('session_id', trackingData.sessionId)
        .eq('project_id', projectId);

      if (updateError) {
        console.error('Error updating session:', updateError);
      }
    }

    // Prepare event data
    const eventData = {
      session_id: trackingData.sessionId,
      project_id: projectId,
      event_type: trackingData.eventType,
      event_name: trackingData.eventName,
      page_url: trackingData.pageUrl,
      contact_email: trackingData.contactEmail,
      contact_phone: trackingData.contactPhone,
      contact_name: trackingData.contactName,
      form_data: trackingData.formData,
      revenue_amount: trackingData.revenueAmount,
      currency: trackingData.currency || 'USD',
      custom_data: trackingData.customData,
      event_timestamp: new Date(trackingData.timestamp || Date.now())
    };

    // Use service role client if contact information or form data is present
    // This ensures proper PII handling and logging
    const clientToUse = hasContactData || trackingData.formData ? supabaseService : supabaseAnon;
    
    const { data: eventResult, error: eventError } = await clientToUse
      .from('tracking_events')
      .insert(eventData)
      .select()
      .single();

    if (eventError) {
      console.error('Error creating tracking event:', eventError);
      return new Response(
        JSON.stringify({ error: 'Failed to record event' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle revenue attribution with enhanced security
    if (hasRevenueData && eventResult) {
      const { error: attributionError } = await supabaseService.rpc(
        'secure_attribution_with_contact',
        {
          p_project_id: projectId,
          p_session_id: trackingData.sessionId,
          p_event_id: eventResult.id,
          p_contact_email: trackingData.contactEmail || null,
          p_contact_phone: trackingData.contactPhone || null,
          p_attributed_revenue: trackingData.revenueAmount,
          p_attribution_model: 'first_touch',
          p_utm_source: trackingData.utmSource || null,
          p_utm_campaign: trackingData.utmCampaign || null,
          p_utm_medium: trackingData.utmMedium || null
        }
      );

      if (attributionError) {
        console.error('Error creating attribution:', attributionError);
      }
    }

    console.log('✅ Enhanced secure tracking event recorded successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        eventId: eventResult.id,
        securityEnhanced: true 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Tracking error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});