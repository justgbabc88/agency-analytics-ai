import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { event_type, page_url, project_id, session_id, contact_email, contact_phone, contact_name, custom_data } = await req.json()
    
    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'
    
    console.log('Processing tracking event:', { event_type, project_id, clientIP })

    // Check rate limit (100 requests per hour per IP)
    const { data: rateLimitOk } = await supabaseClient.rpc('check_rate_limit', {
      p_identifier: clientIP,
      p_endpoint: 'track-event',
      p_max_requests: 100,
      p_window_minutes: 60
    })

    if (!rateLimitOk) {
      console.log('Rate limit exceeded for IP:', clientIP)
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded' }), 
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate required fields
    if (!event_type || !page_url || !project_id || !session_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Enhanced validation using new validation function
    const { error: validationError } = await supabaseClient.rpc('validate_tracking_event_data', {
      p_event_type: event_type,
      p_page_url: page_url,
      p_contact_email: contact_email,
      p_contact_phone: contact_phone,
      p_revenue_amount: null // This function doesn't handle revenue
    })

    if (validationError) {
      console.error('Enhanced validation failed:', validationError)
      return new Response(
        JSON.stringify({ error: 'Invalid tracking data format' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check for suspicious activity patterns
    await supabaseClient.rpc('detect_suspicious_tracking_activity', {
      p_session_id: session_id,
      p_project_id: project_id,
      p_client_ip: clientIP !== 'unknown' ? clientIP : null
    })

    // Check if this is anonymous tracking (no contact info)
    const hasContactInfo = contact_email || contact_phone || contact_name
    
    // Log security event if contact info is being stored
    if (hasContactInfo) {
      await supabaseClient.rpc('log_security_event', {
        p_user_id: null,
        p_action: 'contact_data_tracked',
        p_resource_type: 'tracking_events',
        p_resource_id: null,
        p_details: {
          has_email: !!contact_email,
          has_phone: !!contact_phone,
          has_name: !!contact_name,
          client_ip: clientIP,
          user_agent: userAgent,
          page_url: page_url
        },
        p_severity: 'warning'
      })
    }

    // Insert tracking event
    const { data, error } = await supabaseClient
      .from('tracking_events')
      .insert([{
        event_type,
        page_url,
        project_id,
        session_id,
        contact_email,
        contact_phone,
        contact_name,
        custom_data: custom_data || {},
        event_timestamp: new Date().toISOString()
      }])
      .select()

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to store tracking event' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Tracking event stored successfully:', data)

    return new Response(
      JSON.stringify({ success: true, event_id: data[0]?.id }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in secure-track-event:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})