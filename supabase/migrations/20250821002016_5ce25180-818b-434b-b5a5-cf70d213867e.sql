-- Fix Function Search Path Security Issues

-- Fix audit_pii_access_enhanced function
CREATE OR REPLACE FUNCTION audit_pii_access_enhanced()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Fix anonymize_expired_pii function
CREATE OR REPLACE FUNCTION anonymize_expired_pii()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Anonymize old tracking events (90 days)
  UPDATE tracking_events 
  SET 
    contact_email = NULL,
    contact_phone = NULL,
    contact_name = NULL,
    form_data = NULL
  WHERE 
    created_at < now() - interval '90 days'
    AND (contact_email IS NOT NULL OR contact_phone IS NOT NULL OR contact_name IS NOT NULL);

  -- Anonymize old attribution data (90 days)
  UPDATE attribution_data 
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
$$;

-- Fix enhanced_tracking_rate_limit function
CREATE OR REPLACE FUNCTION enhanced_tracking_rate_limit(
  p_identifier text, 
  p_project_id uuid,
  p_max_requests integer DEFAULT 50,
  p_window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count integer;
  window_start_time timestamp with time zone;
BEGIN
  -- Validate project exists
  IF NOT EXISTS (SELECT 1 FROM projects WHERE id = p_project_id) THEN
    -- Invalid project
    PERFORM log_security_event(
      NULL,
      'invalid_project_access_attempt',
      'tracking_security',
      p_project_id,
      jsonb_build_object(
        'identifier', p_identifier,
        'project_id', p_project_id,
        'timestamp', now()
      ),
      'warning'
    );
    RETURN false;
  END IF;

  window_start_time := date_trunc('minute', now()) - 
    (extract(minute from now())::integer % p_window_minutes) * interval '1 minute';
  
  -- Clean old entries
  DELETE FROM rate_limits 
  WHERE window_start < now() - (p_window_minutes::text || ' minutes')::interval;
  
  -- Check current count for this project specifically
  SELECT requests_count INTO current_count
  FROM rate_limits
  WHERE identifier = p_identifier 
    AND endpoint = format('tracking_project_%s', p_project_id)
    AND window_start = window_start_time;
  
  IF current_count IS NULL THEN
    -- First request in window
    INSERT INTO rate_limits (identifier, endpoint, window_start, requests_count)
    VALUES (p_identifier, format('tracking_project_%s', p_project_id), window_start_time, 1);
    RETURN true;
  ELSIF current_count < p_max_requests THEN
    -- Increment count
    UPDATE rate_limits 
    SET requests_count = requests_count + 1
    WHERE identifier = p_identifier 
      AND endpoint = format('tracking_project_%s', p_project_id)
      AND window_start = window_start_time;
    RETURN true;
  ELSE
    -- Rate limit exceeded - log security incident
    PERFORM log_security_event(
      NULL,
      'tracking_rate_limit_exceeded',
      'security_incident',
      p_project_id,
      jsonb_build_object(
        'identifier', p_identifier,
        'project_id', p_project_id,
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
$$;