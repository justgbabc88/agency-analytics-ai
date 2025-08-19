
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TrackingData {
  pixelId: string
  sessionId: string
  eventType: string
  eventName?: string
  pageUrl: string
  referrerUrl?: string
  utm?: {
    source?: string
    medium?: string
    campaign?: string
    term?: string
    content?: string
  }
  clickIds?: {
    fbclid?: string
    gclid?: string
    ttclid?: string
  }
  deviceInfo?: {
    userAgent?: string
    deviceType?: string
    browser?: string
    os?: string
  }
  formData?: any
  contactInfo?: {
    email?: string
    phone?: string
    name?: string
  }
  revenue?: {
    amount?: number
    currency?: string
  }
  customData?: any
}

const hashIP = async (ip: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(ip)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const trackingData: TrackingData = await req.json()
    console.log('Received tracking data:', trackingData)

    // Verify pixel exists and is active
    const { data: pixel, error: pixelError } = await supabase
      .from('tracking_pixels')
      .select('project_id, domains, is_active')
      .eq('pixel_id', trackingData.pixelId)
      .eq('is_active', true)
      .single()

    if (pixelError || !pixel) {
      console.error('Invalid or inactive pixel:', trackingData.pixelId)
      return new Response(
        JSON.stringify({ error: 'Invalid pixel ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get client IP for hashing
    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown'
    const ipHash = clientIP !== 'unknown' ? await hashIP(clientIP) : null

    // Check if session exists, if not create it
    let { data: session, error: sessionError } = await supabase
      .from('tracking_sessions')
      .select('*')
      .eq('session_id', trackingData.sessionId)
      .single()

    if (sessionError || !session) {
      // Create new session
      const { data: newSession, error: createSessionError } = await supabase
        .from('tracking_sessions')
        .insert({
          session_id: trackingData.sessionId,
          project_id: pixel.project_id,
          utm_source: trackingData.utm?.source,
          utm_medium: trackingData.utm?.medium,
          utm_campaign: trackingData.utm?.campaign,
          utm_term: trackingData.utm?.term,
          utm_content: trackingData.utm?.content,
          referrer_url: trackingData.referrerUrl,
          landing_page_url: trackingData.pageUrl,
          ip_hash: ipHash,
          user_agent: trackingData.deviceInfo?.userAgent,
          device_type: trackingData.deviceInfo?.deviceType,
          browser: trackingData.deviceInfo?.browser,
          operating_system: trackingData.deviceInfo?.os,
          click_id_facebook: trackingData.clickIds?.fbclid,
          click_id_google: trackingData.clickIds?.gclid,
          click_id_tiktok: trackingData.clickIds?.ttclid,
        })
        .select()
        .single()

      if (createSessionError) {
        console.error('Error creating session:', createSessionError)
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      session = newSession
    } else {
      // Update existing session activity
      await supabase
        .from('tracking_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('session_id', trackingData.sessionId)
    }

    // Create tracking event
    const { data: event, error: eventError } = await supabase
      .from('tracking_events')
      .insert({
        session_id: trackingData.sessionId,
        project_id: pixel.project_id,
        event_type: trackingData.eventType,
        event_name: trackingData.eventName,
        page_url: trackingData.pageUrl,
        form_data: trackingData.formData,
        revenue_amount: trackingData.revenue?.amount,
        currency: trackingData.revenue?.currency || 'USD',
        contact_email: trackingData.contactInfo?.email,
        contact_phone: trackingData.contactInfo?.phone,
        contact_name: trackingData.contactInfo?.name,
        custom_data: trackingData.customData,
      })
      .select()
      .single()

    if (eventError) {
      console.error('Error creating event:', eventError)
      return new Response(
        JSON.stringify({ error: 'Failed to create event' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If this is a conversion event with revenue, create attribution record using secure function
    if (trackingData.revenue?.amount && trackingData.revenue.amount > 0) {
      const { error: attributionError } = await supabase
        .rpc('secure_attribution_with_contact', {
          p_project_id: pixel.project_id,
          p_session_id: trackingData.sessionId,
          p_event_id: event.id,
          p_contact_email: trackingData.contactInfo?.email,
          p_contact_phone: trackingData.contactInfo?.phone,
          p_attributed_revenue: trackingData.revenue.amount,
          p_attribution_model: 'first_touch',
          p_utm_source: session.utm_source,
          p_utm_campaign: session.utm_campaign,
          p_utm_medium: session.utm_medium,
        })

      if (attributionError) {
        console.error('Error creating attribution:', attributionError)
      }
    }

    console.log('Successfully tracked event:', event.id)

    return new Response(
      JSON.stringify({ success: true, eventId: event.id }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error processing tracking request:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
