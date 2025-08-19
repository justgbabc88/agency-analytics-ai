-- Fix the search_path security issue for the audit function
DROP FUNCTION IF EXISTS public.audit_client_data_access();

CREATE OR REPLACE FUNCTION public.audit_client_data_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when sensitive client information is accessed or modified
  IF TG_OP = 'SELECT' AND (NEW.email IS NOT NULL OR NEW.phone IS NOT NULL) THEN
    PERFORM public.log_security_event(
      auth.uid(),
      'client_sensitive_data_accessed',
      'clients',
      NEW.id,
      jsonb_build_object(
        'client_name', NEW.name,
        'has_email', NEW.email IS NOT NULL,
        'has_phone', NEW.phone IS NOT NULL
      ),
      'info'
    );
  END IF;
  
  IF TG_OP IN ('INSERT', 'UPDATE') AND (NEW.email IS NOT NULL OR NEW.phone IS NOT NULL) THEN
    PERFORM public.log_security_event(
      auth.uid(),
      CASE WHEN TG_OP = 'INSERT' THEN 'client_sensitive_data_created' ELSE 'client_sensitive_data_updated' END,
      'clients',
      NEW.id,
      jsonb_build_object(
        'client_name', NEW.name,
        'has_email', NEW.email IS NOT NULL,
        'has_phone', NEW.phone IS NOT NULL,
        'operation', TG_OP
      ),
      'warning'
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public';