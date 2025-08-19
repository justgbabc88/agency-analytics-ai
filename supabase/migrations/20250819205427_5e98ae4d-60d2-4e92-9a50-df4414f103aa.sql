-- Drop existing RLS policies for clients table
DROP POLICY IF EXISTS "secure_client_access" ON public.clients;
DROP POLICY IF EXISTS "secure_client_creation" ON public.clients;
DROP POLICY IF EXISTS "secure_client_deletion" ON public.clients;
DROP POLICY IF EXISTS "secure_client_updates" ON public.clients;

-- Create restrictive RLS policies with stronger security
-- Only authenticated users who own the agency can view clients
CREATE POLICY "authenticated_users_view_own_agency_clients" 
ON public.clients 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agencies a 
    WHERE a.id = clients.agency_id 
    AND a.user_id = auth.uid()
  )
);

-- Only authenticated users can insert clients for their own agency
CREATE POLICY "authenticated_users_create_own_agency_clients" 
ON public.clients 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agencies a 
    WHERE a.id = clients.agency_id 
    AND a.user_id = auth.uid()
  )
);

-- Only authenticated users can update clients for their own agency
CREATE POLICY "authenticated_users_update_own_agency_clients" 
ON public.clients 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agencies a 
    WHERE a.id = clients.agency_id 
    AND a.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agencies a 
    WHERE a.id = clients.agency_id 
    AND a.user_id = auth.uid()
  )
);

-- Only authenticated users can delete clients for their own agency
CREATE POLICY "authenticated_users_delete_own_agency_clients" 
ON public.clients 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.agencies a 
    WHERE a.id = clients.agency_id 
    AND a.user_id = auth.uid()
  )
);

-- Explicitly deny all access to anonymous users
CREATE POLICY "deny_anonymous_access" 
ON public.clients 
AS RESTRICTIVE
FOR ALL 
TO anon
USING (false);

-- Add a security audit trigger to log access to sensitive client data
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
$$ LANGUAGE plpgsql SECURITY DEFINER;