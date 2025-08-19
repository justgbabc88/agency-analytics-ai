-- Phase 1: Critical Data Protection - Strengthen RLS Policies for PII Tables (Corrected)

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
      'timestamp', now(),
      'context', p_additional_context
    ),
    'warning'
  );
END;
$$;

-- 3. Create triggers to audit PII modifications (INSERT, UPDATE, DELETE only)
CREATE OR REPLACE FUNCTION public.audit_pii_modifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
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

-- 4. Apply PII audit triggers to sensitive tables (excluding SELECT)
CREATE TRIGGER audit_attribution_pii_modifications
  AFTER INSERT OR UPDATE OR DELETE ON public.attribution_data
  FOR EACH ROW EXECUTE FUNCTION public.audit_pii_modifications();

CREATE TRIGGER audit_ghl_submissions_pii_modifications
  AFTER INSERT OR UPDATE OR DELETE ON public.ghl_form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_pii_modifications();

CREATE TRIGGER audit_calendly_events_pii_modifications
  AFTER INSERT OR UPDATE OR DELETE ON public.calendly_events  
  FOR EACH ROW EXECUTE FUNCTION public.audit_pii_modifications();

CREATE TRIGGER audit_clients_pii_modifications
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.audit_pii_modifications();