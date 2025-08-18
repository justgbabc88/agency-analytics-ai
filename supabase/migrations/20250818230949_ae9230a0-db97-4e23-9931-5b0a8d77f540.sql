-- Comprehensive Security Hardening Migration (Fixed)
-- Addresses remaining critical security vulnerabilities

-- 1. Fix function search paths for security
ALTER FUNCTION public.setup_ghl_sync_cron() SET search_path = 'public';
ALTER FUNCTION public.setup_calendly_sync_cron() SET search_path = 'public';
ALTER FUNCTION public.get_project_daily_metrics(uuid, date, date) SET search_path = 'public';
ALTER FUNCTION public.aggregate_project_daily_metrics(uuid, date) SET search_path = 'public';
ALTER FUNCTION public.log_calendly_sync(uuid, text, text, integer, integer, integer, integer, text, timestamp with time zone, timestamp with time zone) SET search_path = 'public';
ALTER FUNCTION public.record_sync_metric(uuid, text, text, numeric, jsonb) SET search_path = 'public';
ALTER FUNCTION public.check_alert_thresholds(uuid, text, text, numeric) SET search_path = 'public';
ALTER FUNCTION public.setup_unified_integration_sync_cron() SET search_path = 'public';
ALTER FUNCTION public.user_owns_project(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_user_agency_id() SET search_path = 'public';
ALTER FUNCTION public.handle_new_user_profile() SET search_path = 'public';
ALTER FUNCTION public.handle_updated_at() SET search_path = 'public';

-- 2. Create audit log table for enhanced security monitoring
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  severity text DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only allow reading your own audit logs
CREATE POLICY "Users can view their own audit logs" ON public.security_audit_logs
FOR SELECT USING (user_id = auth.uid());

-- Only system can insert audit logs
CREATE POLICY "System can insert audit logs" ON public.security_audit_logs
FOR INSERT WITH CHECK (current_setting('role') = 'service_role');

-- 3. Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid,
  p_action text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}',
  p_severity text DEFAULT 'info'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.security_audit_logs (
    user_id, action, resource_type, resource_id, details, severity
  ) VALUES (
    p_user_id, p_action, p_resource_type, p_resource_id, p_details, p_severity
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- 4. Strengthen RLS policies for sensitive data

-- Enhanced attribution data policy
DROP POLICY IF EXISTS "Only authenticated users can create attribution data" ON public.attribution_data;
CREATE POLICY "Secure attribution data access" ON public.attribution_data
FOR ALL USING (
  auth.uid() IS NOT NULL AND
  project_id IN (
    SELECT p.id FROM public.projects p 
    JOIN public.agencies a ON p.agency_id = a.id 
    WHERE a.user_id = auth.uid()
  )
) WITH CHECK (
  auth.uid() IS NOT NULL AND
  project_id IN (
    SELECT p.id FROM public.projects p 
    JOIN public.agencies a ON p.agency_id = a.id 
    WHERE a.user_id = auth.uid()
  )
);

-- Enhanced form submissions policy
DROP POLICY IF EXISTS "Service functions can create form submissions" ON public.ghl_form_submissions;
CREATE POLICY "Secure form submissions access" ON public.ghl_form_submissions
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  project_id IN (
    SELECT p.id FROM public.projects p 
    JOIN public.agencies a ON p.agency_id = a.id 
    WHERE a.user_id = auth.uid()
  )
);

CREATE POLICY "Service only form submission inserts" ON public.ghl_form_submissions
FOR INSERT WITH CHECK (current_setting('role') = 'service_role');

-- Enhanced tracking events policy - more restrictive
DROP POLICY IF EXISTS "Public can create anonymous tracking events" ON public.tracking_events;
DROP POLICY IF EXISTS "Service functions can create tracking events with contact info" ON public.tracking_events;

-- Only allow anonymous tracking (no contact info at all)
CREATE POLICY "Anonymous tracking only" ON public.tracking_events
FOR INSERT WITH CHECK (
  contact_email IS NULL AND 
  contact_phone IS NULL AND 
  contact_name IS NULL AND
  form_data IS NULL
);

-- Authenticated users can create tracking events
CREATE POLICY "Authenticated tracking access" ON public.tracking_events
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  project_id IN (
    SELECT p.id FROM public.projects p 
    JOIN public.agencies a ON p.agency_id = a.id 
    WHERE a.user_id = auth.uid()
  )
);

-- Service role can create tracking events with contact info
CREATE POLICY "Service role tracking with contact info" ON public.tracking_events
FOR INSERT WITH CHECK (current_setting('role') = 'service_role');

-- 5. Create rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP address or user ID
  endpoint text NOT NULL,
  requests_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(identifier, endpoint, window_start)
);

-- Enable RLS on rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only system can manage rate limits
CREATE POLICY "System manages rate limits" ON public.rate_limits
FOR ALL USING (current_setting('role') = 'service_role');

-- 6. Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests integer DEFAULT 100,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_count integer;
  window_start_time timestamp with time zone;
BEGIN
  window_start_time := date_trunc('hour', now()) + (extract(minute from now())::integer / p_window_minutes) * (p_window_minutes::text || ' minutes')::interval;
  
  -- Clean old entries
  DELETE FROM public.rate_limits 
  WHERE window_start < now() - (p_window_minutes::text || ' minutes')::interval;
  
  -- Check current count
  SELECT requests_count INTO current_count
  FROM public.rate_limits
  WHERE identifier = p_identifier 
    AND endpoint = p_endpoint 
    AND window_start = window_start_time;
  
  IF current_count IS NULL THEN
    -- First request in window
    INSERT INTO public.rate_limits (identifier, endpoint, window_start, requests_count)
    VALUES (p_identifier, p_endpoint, window_start_time, 1);
    RETURN true;
  ELSIF current_count < p_max_requests THEN
    -- Increment count
    UPDATE public.rate_limits 
    SET requests_count = requests_count + 1
    WHERE identifier = p_identifier 
      AND endpoint = p_endpoint 
      AND window_start = window_start_time;
    RETURN true;
  ELSE
    -- Rate limit exceeded
    PERFORM public.log_security_event(
      NULL, 'rate_limit_exceeded', 'api_endpoint', NULL,
      jsonb_build_object('identifier', p_identifier, 'endpoint', p_endpoint, 'count', current_count),
      'warning'
    );
    RETURN false;
  END IF;
END;
$$;

-- 7. Create trigger for audit logging of sensitive data access
CREATE OR REPLACE FUNCTION public.audit_sensitive_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log when contact information is being stored
  IF TG_OP = 'INSERT' AND (NEW.contact_email IS NOT NULL OR NEW.contact_phone IS NOT NULL OR NEW.contact_name IS NOT NULL) THEN
    PERFORM public.log_security_event(
      auth.uid(),
      'contact_data_stored',
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object(
        'has_email', NEW.contact_email IS NOT NULL,
        'has_phone', NEW.contact_phone IS NOT NULL,
        'has_name', NEW.contact_name IS NOT NULL
      ),
      'warning'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit trigger to sensitive tables
DROP TRIGGER IF EXISTS audit_tracking_events_trigger ON public.tracking_events;
CREATE TRIGGER audit_tracking_events_trigger
  AFTER INSERT ON public.tracking_events
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_data_access();

DROP TRIGGER IF EXISTS audit_ghl_form_submissions_trigger ON public.ghl_form_submissions;
CREATE TRIGGER audit_ghl_form_submissions_trigger
  AFTER INSERT ON public.ghl_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_data_access();

DROP TRIGGER IF EXISTS audit_calendly_events_trigger ON public.calendly_events;
CREATE TRIGGER audit_calendly_events_trigger
  AFTER INSERT ON public.calendly_events
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_data_access();