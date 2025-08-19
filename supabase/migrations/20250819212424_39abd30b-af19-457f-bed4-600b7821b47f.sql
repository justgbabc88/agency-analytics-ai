-- Phase 1: Critical Data Protection - Strengthen RLS Policies for PII Tables

-- 1. Add explicit deny policies for anonymous access to sensitive PII tables
CREATE POLICY "deny_anonymous_pii_access_attribution" ON public.attribution_data
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "deny_anonymous_pii_access_ghl_submissions" ON public.ghl_form_submissions  
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "deny_anonymous_pii_access_calendly_events" ON public.calendly_events
  AS RESTRICTIVE FOR ALL TO anon USING (false);

CREATE POLICY "deny_anonymous_pii_access_clients" ON public.clients
  AS RESTRICTIVE FOR ALL TO anon USING (false);

-- 2. Enhanced audit logging function for PII access
CREATE OR REPLACE FUNCTION public.log_pii_access_attempt(
  p_table_name text,
  p_operation text,
  p_record_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_additional_context jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log PII access attempts with enhanced context
  PERFORM public.log_security_event(
    COALESCE(p_user_id, auth.uid()),
    format('pii_%s_%s', p_operation, p_table_name),
    'sensitive_data',
    p_record_id,
    jsonb_build_object(
      'table_name', p_table_name,
      'operation', p_operation,
      'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent',
      'ip_address', current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
      'timestamp', now(),
      'context', p_additional_context
    ),
    'warning'
  );
END;
$$;

-- 3. Create triggers to audit PII access on sensitive tables
CREATE OR REPLACE FUNCTION public.audit_pii_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all operations on PII-containing tables
  IF TG_OP = 'SELECT' THEN
    PERFORM public.log_pii_access_attempt(
      TG_TABLE_NAME,
      'access',
      COALESCE(NEW.id, OLD.id),
      auth.uid(),
      jsonb_build_object('operation_type', TG_OP)
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.log_pii_access_attempt(
      TG_TABLE_NAME,
      'create',
      NEW.id,
      auth.uid(),
      jsonb_build_object('operation_type', TG_OP)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_pii_access_attempt(
      TG_TABLE_NAME,
      'update',
      NEW.id,
      auth.uid(),
      jsonb_build_object('operation_type', TG_OP)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_pii_access_attempt(
      TG_TABLE_NAME,
      'delete',
      OLD.id,
      auth.uid(),
      jsonb_build_object('operation_type', TG_OP)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 4. Apply PII audit triggers to sensitive tables
CREATE TRIGGER audit_attribution_pii_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.attribution_data
  FOR EACH ROW EXECUTE FUNCTION public.audit_pii_access();

CREATE TRIGGER audit_ghl_submissions_pii_access  
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.ghl_form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_pii_access();

CREATE TRIGGER audit_calendly_events_pii_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.calendly_events  
  FOR EACH ROW EXECUTE FUNCTION public.audit_pii_access();

CREATE TRIGGER audit_clients_pii_access
  AFTER SELECT OR INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_pii_access();

-- 5. Enhanced rate limiting for sensitive operations
CREATE OR REPLACE FUNCTION public.check_enhanced_rate_limit(
  p_identifier text,
  p_operation text,
  p_max_requests integer DEFAULT 10,
  p_window_minutes integer DEFAULT 60
) RETURNS boolean
LANGUAGE plpgsql  
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count integer;
  window_start_time timestamp with time zone;
BEGIN
  -- More restrictive rate limiting for PII operations
  window_start_time := date_trunc('hour', now()) + 
    (extract(minute from now())::integer / p_window_minutes) * 
    (p_window_minutes::text || ' minutes')::interval;
  
  -- Get current count for this operation type
  SELECT requests_count INTO current_count
  FROM public.rate_limits
  WHERE identifier = p_identifier 
    AND endpoint = p_operation
    AND window_start = window_start_time;
  
  IF current_count IS NULL THEN
    -- First request in window
    INSERT INTO public.rate_limits (identifier, endpoint, window_start, requests_count)
    VALUES (p_identifier, p_operation, window_start_time, 1);
    RETURN true;
  ELSIF current_count < p_max_requests THEN
    -- Increment count
    UPDATE public.rate_limits 
    SET requests_count = requests_count + 1
    WHERE identifier = p_identifier 
      AND endpoint = p_operation
      AND window_start = window_start_time;
    RETURN true;
  ELSE
    -- Rate limit exceeded - log security event
    PERFORM public.log_security_event(
      auth.uid(), 'enhanced_rate_limit_exceeded', 'security_system', NULL,
      jsonb_build_object(
        'identifier', p_identifier, 
        'operation', p_operation, 
        'count', current_count,
        'limit', p_max_requests
      ),
      'critical'
    );
    RETURN false;
  END IF;
END;
$$;