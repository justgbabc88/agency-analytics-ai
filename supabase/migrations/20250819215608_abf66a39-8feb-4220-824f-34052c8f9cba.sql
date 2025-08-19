-- Security Fixes Migration - Phase 1: Critical Data Protection

-- 1. Add enhanced data validation function
CREATE OR REPLACE FUNCTION validate_tracking_event_data(
  p_event_type text,
  p_page_url text,
  p_contact_email text DEFAULT NULL,
  p_contact_phone text DEFAULT NULL,
  p_revenue_amount numeric DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate event type
  IF p_event_type NOT IN ('page_view', 'form_submission', 'purchase', 'webinar_registration', 'call_booking', 'custom_event') THEN
    RAISE EXCEPTION 'Invalid event type: %', p_event_type;
  END IF;
  
  -- Validate URL format
  IF p_page_url IS NULL OR p_page_url = '' OR length(p_page_url) > 2048 THEN
    RAISE EXCEPTION 'Invalid page URL';
  END IF;
  
  -- Validate email format if provided
  IF p_contact_email IS NOT NULL AND p_contact_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Validate phone format if provided (basic validation)
  IF p_contact_phone IS NOT NULL AND length(p_contact_phone) > 20 THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;
  
  -- Validate revenue amount
  IF p_revenue_amount IS NOT NULL AND (p_revenue_amount < 0 OR p_revenue_amount > 1000000) THEN
    RAISE EXCEPTION 'Invalid revenue amount';
  END IF;
  
  RETURN true;
END;
$$;

-- 2. Add enhanced PII access logging function
CREATE OR REPLACE FUNCTION log_enhanced_pii_access(
  p_operation text,
  p_table_name text,
  p_record_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_has_email boolean DEFAULT false,
  p_has_phone boolean DEFAULT false,
  p_has_name boolean DEFAULT false,
  p_client_ip inet DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log detailed PII access with enhanced context
  PERFORM log_security_event(
    COALESCE(p_user_id, auth.uid()),
    format('pii_%s_%s', p_operation, p_table_name),
    'sensitive_data',
    p_record_id,
    jsonb_build_object(
      'table_name', p_table_name,
      'operation', p_operation,
      'has_email', p_has_email,
      'has_phone', p_has_phone,
      'has_name', p_has_name,
      'client_ip', p_client_ip,
      'timestamp', now(),
      'risk_level', CASE 
        WHEN p_has_email AND p_has_phone THEN 'high'
        WHEN p_has_email OR p_has_phone THEN 'medium'
        ELSE 'low'
      END
    ),
    CASE 
      WHEN p_has_email AND p_has_phone THEN 'critical'
      WHEN p_has_email OR p_has_phone THEN 'warning'
      ELSE 'info'
    END
  );
END;
$$;

-- 3. Add suspicious activity detection function
CREATE OR REPLACE FUNCTION detect_suspicious_tracking_activity(
  p_session_id text,
  p_project_id uuid,
  p_client_ip inet DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_count integer;
  recent_events integer;
  suspicious_patterns integer := 0;
BEGIN
  -- Check for excessive events in short timeframe
  SELECT COUNT(*) INTO recent_events
  FROM tracking_events 
  WHERE session_id = p_session_id 
    AND created_at > now() - interval '1 minute';
    
  IF recent_events > 10 THEN
    suspicious_patterns := suspicious_patterns + 1;
  END IF;
  
  -- Check for suspicious event patterns (rapid form submissions)
  SELECT COUNT(*) INTO event_count
  FROM tracking_events 
  WHERE session_id = p_session_id 
    AND event_type = 'form_submission'
    AND created_at > now() - interval '5 minutes';
    
  IF event_count > 3 THEN
    suspicious_patterns := suspicious_patterns + 1;
  END IF;
  
  -- Log if suspicious activity detected
  IF suspicious_patterns > 0 THEN
    PERFORM log_security_event(
      NULL,
      'suspicious_tracking_activity',
      'tracking_sessions',
      NULL,
      jsonb_build_object(
        'session_id', p_session_id,
        'project_id', p_project_id,
        'client_ip', p_client_ip,
        'recent_events', recent_events,
        'suspicious_patterns', suspicious_patterns,
        'timestamp', now()
      ),
      'warning'
    );
  END IF;
END;
$$;

-- 4. Create more restrictive anonymous tracking policy
DROP POLICY IF EXISTS "secure_anonymous_tracking" ON public.tracking_events;
CREATE POLICY "secure_anonymous_tracking_enhanced" 
ON public.tracking_events 
FOR INSERT 
WITH CHECK (
  -- Only allow page_view events for anonymous users
  event_type = 'page_view' AND
  -- No contact information allowed
  contact_email IS NULL AND 
  contact_phone IS NULL AND 
  contact_name IS NULL AND
  -- No form data allowed
  form_data IS NULL AND
  -- No revenue data allowed
  revenue_amount IS NULL AND
  -- Validate the data
  validate_tracking_event_data(event_type, page_url, contact_email, contact_phone, revenue_amount)
);

-- 5. Add enhanced audit trigger for all PII tables
CREATE OR REPLACE FUNCTION enhanced_pii_audit_trigger() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Log PII data creation
    PERFORM log_enhanced_pii_access(
      'create',
      TG_TABLE_NAME,
      NEW.id,
      auth.uid(),
      CASE 
        WHEN TG_TABLE_NAME = 'tracking_events' THEN NEW.contact_email IS NOT NULL
        WHEN TG_TABLE_NAME = 'calendly_events' THEN NEW.invitee_email IS NOT NULL
        WHEN TG_TABLE_NAME = 'ghl_form_submissions' THEN NEW.contact_email IS NOT NULL
        WHEN TG_TABLE_NAME = 'attribution_data' THEN NEW.contact_email IS NOT NULL
        WHEN TG_TABLE_NAME = 'clients' THEN NEW.email IS NOT NULL
        ELSE false
      END,
      CASE 
        WHEN TG_TABLE_NAME = 'tracking_events' THEN NEW.contact_phone IS NOT NULL
        WHEN TG_TABLE_NAME = 'calendly_events' THEN false
        WHEN TG_TABLE_NAME = 'ghl_form_submissions' THEN NEW.contact_phone IS NOT NULL
        WHEN TG_TABLE_NAME = 'attribution_data' THEN NEW.contact_phone IS NOT NULL
        WHEN TG_TABLE_NAME = 'clients' THEN NEW.phone IS NOT NULL
        ELSE false
      END,
      CASE 
        WHEN TG_TABLE_NAME = 'tracking_events' THEN NEW.contact_name IS NOT NULL
        WHEN TG_TABLE_NAME = 'calendly_events' THEN NEW.invitee_name IS NOT NULL
        WHEN TG_TABLE_NAME = 'ghl_form_submissions' THEN NEW.contact_name IS NOT NULL
        WHEN TG_TABLE_NAME = 'attribution_data' THEN false
        WHEN TG_TABLE_NAME = 'clients' THEN NEW.name IS NOT NULL
        ELSE false
      END,
      inet(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', '0.0.0.0'))
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log PII data updates
    PERFORM log_enhanced_pii_access(
      'update',
      TG_TABLE_NAME,
      NEW.id,
      auth.uid(),
      CASE 
        WHEN TG_TABLE_NAME = 'tracking_events' THEN NEW.contact_email IS NOT NULL
        WHEN TG_TABLE_NAME = 'calendly_events' THEN NEW.invitee_email IS NOT NULL
        WHEN TG_TABLE_NAME = 'ghl_form_submissions' THEN NEW.contact_email IS NOT NULL
        WHEN TG_TABLE_NAME = 'attribution_data' THEN NEW.contact_email IS NOT NULL
        WHEN TG_TABLE_NAME = 'clients' THEN NEW.email IS NOT NULL
        ELSE false
      END,
      CASE 
        WHEN TG_TABLE_NAME = 'tracking_events' THEN NEW.contact_phone IS NOT NULL
        WHEN TG_TABLE_NAME = 'calendly_events' THEN false
        WHEN TG_TABLE_NAME = 'ghl_form_submissions' THEN NEW.contact_phone IS NOT NULL
        WHEN TG_TABLE_NAME = 'attribution_data' THEN NEW.contact_phone IS NOT NULL
        WHEN TG_TABLE_NAME = 'clients' THEN NEW.phone IS NOT NULL
        ELSE false
      END,
      CASE 
        WHEN TG_TABLE_NAME = 'tracking_events' THEN NEW.contact_name IS NOT NULL
        WHEN TG_TABLE_NAME = 'calendly_events' THEN NEW.invitee_name IS NOT NULL
        WHEN TG_TABLE_NAME = 'ghl_form_submissions' THEN NEW.contact_name IS NOT NULL
        WHEN TG_TABLE_NAME = 'attribution_data' THEN false
        WHEN TG_TABLE_NAME = 'clients' THEN NEW.name IS NOT NULL
        ELSE false
      END,
      inet(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', '0.0.0.0'))
    );
    RETURN NEW;
  ELSIF TG_OP = 'SELECT' THEN
    -- Log PII data access (only for explicit SELECT operations on sensitive tables)
    PERFORM log_enhanced_pii_access(
      'read',
      TG_TABLE_NAME,
      OLD.id,
      auth.uid(),
      false, -- Don't log specific PII fields for SELECT to avoid noise
      false,
      false,
      inet(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', '0.0.0.0'))
    );
    RETURN OLD;
  ELSIF TG_OP = 'DELETE' THEN
    -- Log PII data deletion
    PERFORM log_enhanced_pii_access(
      'delete',
      TG_TABLE_NAME,
      OLD.id,
      auth.uid(),
      false,
      false,
      false,
      inet(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', '0.0.0.0'))
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- 6. Apply enhanced PII audit triggers to sensitive tables
DROP TRIGGER IF EXISTS enhanced_pii_audit_tracking_events ON public.tracking_events;
CREATE TRIGGER enhanced_pii_audit_tracking_events
  AFTER INSERT OR UPDATE OR DELETE ON public.tracking_events
  FOR EACH ROW EXECUTE FUNCTION enhanced_pii_audit_trigger();

DROP TRIGGER IF EXISTS enhanced_pii_audit_calendly_events ON public.calendly_events;
CREATE TRIGGER enhanced_pii_audit_calendly_events
  AFTER INSERT OR UPDATE OR DELETE ON public.calendly_events
  FOR EACH ROW EXECUTE FUNCTION enhanced_pii_audit_trigger();

DROP TRIGGER IF EXISTS enhanced_pii_audit_ghl_submissions ON public.ghl_form_submissions;
CREATE TRIGGER enhanced_pii_audit_ghl_submissions
  AFTER INSERT OR UPDATE OR DELETE ON public.ghl_form_submissions
  FOR EACH ROW EXECUTE FUNCTION enhanced_pii_audit_trigger();

DROP TRIGGER IF EXISTS enhanced_pii_audit_attribution ON public.attribution_data;
CREATE TRIGGER enhanced_pii_audit_attribution
  AFTER INSERT OR UPDATE OR DELETE ON public.attribution_data
  FOR EACH ROW EXECUTE FUNCTION enhanced_pii_audit_trigger();

DROP TRIGGER IF EXISTS enhanced_pii_audit_clients ON public.clients;
CREATE TRIGGER enhanced_pii_audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION enhanced_pii_audit_trigger();

-- 7. Add function to get security metrics for dashboard
CREATE OR REPLACE FUNCTION get_security_metrics()
RETURNS TABLE(
  total_pii_records bigint,
  recent_pii_access bigint,
  critical_events bigint,
  failed_login_attempts bigint,
  suspicious_activity bigint,
  last_security_scan timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total PII records across all tables
    (SELECT COUNT(*) FROM tracking_events WHERE contact_email IS NOT NULL OR contact_phone IS NOT NULL) +
    (SELECT COUNT(*) FROM calendly_events WHERE invitee_email IS NOT NULL) +
    (SELECT COUNT(*) FROM ghl_form_submissions WHERE contact_email IS NOT NULL OR contact_phone IS NOT NULL) +
    (SELECT COUNT(*) FROM attribution_data WHERE contact_email IS NOT NULL OR contact_phone IS NOT NULL) +
    (SELECT COUNT(*) FROM clients WHERE email IS NOT NULL OR phone IS NOT NULL) AS total_pii_records,
    
    -- Recent PII access in last 24 hours
    (SELECT COUNT(*) FROM security_audit_logs 
     WHERE action LIKE 'pii_%' AND created_at > now() - interval '24 hours') AS recent_pii_access,
    
    -- Critical security events in last 7 days
    (SELECT COUNT(*) FROM security_audit_logs 
     WHERE severity = 'critical' AND created_at > now() - interval '7 days') AS critical_events,
    
    -- Failed login attempts (would be populated by auth triggers)
    (SELECT COUNT(*) FROM security_audit_logs 
     WHERE action = 'failed_login' AND created_at > now() - interval '24 hours') AS failed_login_attempts,
    
    -- Suspicious activity in last 24 hours
    (SELECT COUNT(*) FROM security_audit_logs 
     WHERE action LIKE '%suspicious%' AND created_at > now() - interval '24 hours') AS suspicious_activity,
    
    -- Last security scan (mock for now)
    now() - interval '1 hour' AS last_security_scan;
END;
$$;