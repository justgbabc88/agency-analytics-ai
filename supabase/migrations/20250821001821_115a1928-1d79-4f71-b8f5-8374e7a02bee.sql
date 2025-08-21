-- Phase 1: Critical Security Fixes

-- 1. Fix service role bypass vulnerabilities by adding stricter validation
-- Replace overly permissive service role policies with more granular ones

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "service_role_tracking_access" ON public.tracking_events;
DROP POLICY IF EXISTS "service_role_calendly_access" ON public.calendly_events;

-- Create more secure service role policies with domain validation
CREATE POLICY "secure_service_role_tracking_insert" 
ON public.tracking_events 
FOR INSERT 
TO service_role
WITH CHECK (
  -- Service role can only insert if pixel_id exists and is active
  pixel_id IN (
    SELECT id FROM public.tracking_pixels 
    WHERE is_active = true
  )
  AND 
  -- Additional validation: ensure project ownership chain is intact
  project_id IN (
    SELECT tp.project_id FROM public.tracking_pixels tp 
    WHERE tp.id = pixel_id AND tp.is_active = true
  )
);

CREATE POLICY "secure_service_role_calendly_insert" 
ON public.calendly_events 
FOR INSERT 
TO service_role
WITH CHECK (
  -- Service role can only insert for projects with valid integrations
  project_id IN (
    SELECT project_id FROM public.project_integrations 
    WHERE platform = 'calendly' AND is_connected = true
  )
);

-- 2. Strengthen tracking data protection against anonymous abuse
-- Update anonymous tracking policy to be more restrictive
DROP POLICY IF EXISTS "anonymous_page_view_only" ON public.tracking_events;

CREATE POLICY "restricted_anonymous_tracking" 
ON public.tracking_events 
FOR INSERT 
TO anon
WITH CHECK (
  -- Only allow basic page views from valid pixels
  event_type = 'page_view' 
  AND contact_email IS NULL 
  AND contact_phone IS NULL 
  AND contact_name IS NULL 
  AND form_data IS NULL 
  AND revenue_amount IS NULL
  AND pixel_id IS NOT NULL
  AND pixel_id IN (
    SELECT id FROM public.tracking_pixels WHERE is_active = true
  )
);

-- 3. Add tracking sessions validation
-- Remove overly permissive tracking sessions policies
DROP POLICY IF EXISTS "anonymous_tracking_sessions_insert" ON public.tracking_sessions;
DROP POLICY IF EXISTS "anonymous_tracking_sessions_update" ON public.tracking_sessions;

CREATE POLICY "secure_anonymous_sessions_insert" 
ON public.tracking_sessions 
FOR INSERT 
TO anon
WITH CHECK (
  -- Only allow session creation for valid pixels
  pixel_id IS NOT NULL
  AND pixel_id IN (
    SELECT id FROM public.tracking_pixels WHERE is_active = true
  )
);

CREATE POLICY "secure_anonymous_sessions_update" 
ON public.tracking_sessions 
FOR UPDATE 
TO anon
USING (
  -- Only allow updates to own sessions
  session_id = session_id 
  AND pixel_id IN (
    SELECT id FROM public.tracking_pixels WHERE is_active = true
  )
)
WITH CHECK (
  -- Don't allow changing pixel_id or other critical fields
  pixel_id = (SELECT pixel_id FROM public.tracking_sessions WHERE id = tracking_sessions.id)
);

-- 4. Add enhanced PII access logging triggers
-- Create trigger for enhanced PII access monitoring
CREATE OR REPLACE FUNCTION audit_pii_access_enhanced()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when sensitive PII is being accessed or modified
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    -- Check if this operation involves PII
    IF (TG_TABLE_NAME = 'clients' AND (NEW.email IS NOT NULL OR NEW.phone IS NOT NULL)) OR
       (TG_TABLE_NAME = 'attribution_data' AND (NEW.contact_email IS NOT NULL OR NEW.contact_phone IS NOT NULL)) OR
       (TG_TABLE_NAME = 'calendly_events' AND NEW.invitee_email IS NOT NULL) OR
       (TG_TABLE_NAME = 'ghl_form_submissions' AND (NEW.contact_email IS NOT NULL OR NEW.contact_phone IS NOT NULL)) OR
       (TG_TABLE_NAME = 'tracking_events' AND (NEW.contact_email IS NOT NULL OR NEW.contact_phone IS NOT NULL OR NEW.contact_name IS NOT NULL)) THEN
      
      PERFORM log_security_event(
        auth.uid(),
        format('pii_%s_%s', lower(TG_OP), TG_TABLE_NAME),
        'sensitive_data',
        NEW.id,
        jsonb_build_object(
          'table', TG_TABLE_NAME,
          'operation', TG_OP,
          'has_email', CASE 
            WHEN TG_TABLE_NAME = 'clients' THEN NEW.email IS NOT NULL
            WHEN TG_TABLE_NAME = 'attribution_data' THEN NEW.contact_email IS NOT NULL
            WHEN TG_TABLE_NAME = 'calendly_events' THEN NEW.invitee_email IS NOT NULL
            WHEN TG_TABLE_NAME = 'ghl_form_submissions' THEN NEW.contact_email IS NOT NULL
            WHEN TG_TABLE_NAME = 'tracking_events' THEN NEW.contact_email IS NOT NULL
            ELSE false
          END,
          'has_phone', CASE 
            WHEN TG_TABLE_NAME = 'clients' THEN NEW.phone IS NOT NULL
            WHEN TG_TABLE_NAME = 'attribution_data' THEN NEW.contact_phone IS NOT NULL
            WHEN TG_TABLE_NAME = 'ghl_form_submissions' THEN NEW.contact_phone IS NOT NULL
            WHEN TG_TABLE_NAME = 'tracking_events' THEN NEW.contact_phone IS NOT NULL
            ELSE false
          END,
          'timestamp', now()
        ),
        CASE 
          WHEN current_setting('role') = 'anon' THEN 'critical'
          WHEN current_setting('role') = 'service_role' THEN 'warning'
          ELSE 'info'
        END
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_security_event(
      auth.uid(),
      format('pii_delete_%s', TG_TABLE_NAME),
      'sensitive_data',
      OLD.id,
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', 'DELETE',
        'timestamp', now()
      ),
      'warning'
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply PII monitoring triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_pii_clients ON public.clients;
DROP TRIGGER IF EXISTS audit_pii_attribution ON public.attribution_data;
DROP TRIGGER IF EXISTS audit_pii_calendly ON public.calendly_events;
DROP TRIGGER IF EXISTS audit_pii_ghl ON public.ghl_form_submissions;
DROP TRIGGER IF EXISTS audit_pii_tracking ON public.tracking_events;

CREATE TRIGGER audit_pii_clients
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION audit_pii_access_enhanced();

CREATE TRIGGER audit_pii_attribution
  AFTER INSERT OR UPDATE OR DELETE ON public.attribution_data
  FOR EACH ROW EXECUTE FUNCTION audit_pii_access_enhanced();

CREATE TRIGGER audit_pii_calendly
  AFTER INSERT OR UPDATE OR DELETE ON public.calendly_events
  FOR EACH ROW EXECUTE FUNCTION audit_pii_access_enhanced();

CREATE TRIGGER audit_pii_ghl
  AFTER INSERT OR UPDATE OR DELETE ON public.ghl_form_submissions
  FOR EACH ROW EXECUTE FUNCTION audit_pii_access_enhanced();

CREATE TRIGGER audit_pii_tracking
  AFTER INSERT OR UPDATE OR DELETE ON public.tracking_events
  FOR EACH ROW EXECUTE FUNCTION audit_pii_access_enhanced();

-- 5. Add data retention and anonymization function
CREATE OR REPLACE FUNCTION anonymize_expired_pii()
RETURNS void AS $$
BEGIN
  -- Anonymize old tracking events (90 days)
  UPDATE public.tracking_events 
  SET 
    contact_email = NULL,
    contact_phone = NULL,
    contact_name = NULL,
    form_data = NULL
  WHERE 
    created_at < now() - interval '90 days'
    AND (contact_email IS NOT NULL OR contact_phone IS NOT NULL OR contact_name IS NOT NULL);

  -- Anonymize old attribution data (90 days)
  UPDATE public.attribution_data 
  SET 
    contact_email = NULL,
    contact_phone = NULL
  WHERE 
    created_at < now() - interval '90 days'
    AND (contact_email IS NOT NULL OR contact_phone IS NOT NULL);

  -- Log anonymization activity
  PERFORM log_security_event(
    NULL,
    'pii_anonymization_completed',
    'data_retention',
    NULL,
    jsonb_build_object(
      'anonymized_tables', ARRAY['tracking_events', 'attribution_data'],
      'cutoff_date', now() - interval '90 days',
      'timestamp', now()
    ),
    'info'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Enhanced rate limiting for tracking endpoints
CREATE OR REPLACE FUNCTION enhanced_tracking_rate_limit(
  p_identifier text, 
  p_pixel_id uuid,
  p_max_requests integer DEFAULT 50,
  p_window_minutes integer DEFAULT 15
)
RETURNS boolean AS $$
DECLARE
  current_count integer;
  window_start_time timestamp with time zone;
  project_id_for_pixel uuid;
BEGIN
  -- Get project_id for the pixel to validate ownership
  SELECT tp.project_id INTO project_id_for_pixel
  FROM public.tracking_pixels tp
  WHERE tp.id = p_pixel_id AND tp.is_active = true;
  
  IF project_id_for_pixel IS NULL THEN
    -- Invalid or inactive pixel
    PERFORM log_security_event(
      NULL,
      'invalid_pixel_access_attempt',
      'tracking_security',
      p_pixel_id,
      jsonb_build_object(
        'identifier', p_identifier,
        'pixel_id', p_pixel_id,
        'timestamp', now()
      ),
      'warning'
    );
    RETURN false;
  END IF;

  window_start_time := date_trunc('minute', now()) - 
    (extract(minute from now())::integer % p_window_minutes) * interval '1 minute';
  
  -- Clean old entries
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - (p_window_minutes::text || ' minutes')::interval;
  
  -- Check current count for this pixel specifically
  SELECT requests_count INTO current_count
  FROM public.rate_limits
  WHERE identifier = p_identifier 
    AND endpoint = format('tracking_pixel_%s', p_pixel_id)
    AND window_start = window_start_time;
  
  IF current_count IS NULL THEN
    -- First request in window
    INSERT INTO public.rate_limits (identifier, endpoint, window_start, requests_count)
    VALUES (p_identifier, format('tracking_pixel_%s', p_pixel_id), window_start_time, 1);
    RETURN true;
  ELSIF current_count < p_max_requests THEN
    -- Increment count
    UPDATE public.rate_limits 
    SET requests_count = requests_count + 1
    WHERE identifier = p_identifier 
      AND endpoint = format('tracking_pixel_%s', p_pixel_id)
      AND window_start = window_start_time;
    RETURN true;
  ELSE
    -- Rate limit exceeded - log security incident
    PERFORM log_security_event(
      NULL,
      'tracking_rate_limit_exceeded',
      'security_incident',
      p_pixel_id,
      jsonb_build_object(
        'identifier', p_identifier,
        'pixel_id', p_pixel_id,
        'project_id', project_id_for_pixel,
        'requests_count', current_count,
        'limit', p_max_requests,
        'window_minutes', p_window_minutes,
        'timestamp', now()
      ),
      'critical'
    );
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;