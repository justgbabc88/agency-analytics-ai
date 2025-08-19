-- Drop existing RLS policies for attribution_data table
DROP POLICY IF EXISTS "secure_attribution_data_access" ON public.attribution_data;
DROP POLICY IF EXISTS "secure_attribution_data_creation" ON public.attribution_data;
DROP POLICY IF EXISTS "secure_attribution_data_deletion" ON public.attribution_data;
DROP POLICY IF EXISTS "secure_attribution_data_updates" ON public.attribution_data;

-- Create more restrictive RLS policies for attribution_data
-- Only authenticated users who own the project can view attribution data
CREATE POLICY "authenticated_users_view_own_project_attribution" 
ON public.attribution_data 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.agencies a ON p.agency_id = a.id
    WHERE p.id = attribution_data.project_id 
    AND a.user_id = auth.uid()
  )
);

-- Service role and authenticated project owners can insert attribution data
CREATE POLICY "service_and_owners_create_attribution_data" 
ON public.attribution_data 
FOR INSERT 
TO authenticated, service_role
WITH CHECK (
  current_setting('role') = 'service_role' OR 
  (
    auth.uid() IS NOT NULL AND 
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.agencies a ON p.agency_id = a.id
      WHERE p.id = attribution_data.project_id 
      AND a.user_id = auth.uid()
    )
  )
);

-- Only authenticated users who own the project can update attribution data
CREATE POLICY "authenticated_users_update_own_project_attribution" 
ON public.attribution_data 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.agencies a ON p.agency_id = a.id
    WHERE p.id = attribution_data.project_id 
    AND a.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.agencies a ON p.agency_id = a.id
    WHERE p.id = attribution_data.project_id 
    AND a.user_id = auth.uid()
  )
);

-- Only authenticated users who own the project can delete attribution data
CREATE POLICY "authenticated_users_delete_own_project_attribution" 
ON public.attribution_data 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.agencies a ON p.agency_id = a.id
    WHERE p.id = attribution_data.project_id 
    AND a.user_id = auth.uid()
  )
);

-- Explicitly deny all access to anonymous users
CREATE POLICY "deny_anonymous_attribution_access" 
ON public.attribution_data 
AS RESTRICTIVE
FOR ALL 
TO anon
USING (false);

-- Create a security audit trigger for attribution data with contact information
CREATE OR REPLACE FUNCTION public.audit_attribution_contact_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when sensitive attribution data with contact information is accessed or modified
  IF TG_OP IN ('INSERT', 'UPDATE') AND (NEW.contact_email IS NOT NULL OR NEW.contact_phone IS NOT NULL) THEN
    PERFORM public.log_security_event(
      auth.uid(),
      CASE WHEN TG_OP = 'INSERT' THEN 'attribution_contact_data_created' ELSE 'attribution_contact_data_updated' END,
      'attribution_data',
      NEW.id,
      jsonb_build_object(
        'project_id', NEW.project_id,
        'has_email', NEW.contact_email IS NOT NULL,
        'has_phone', NEW.contact_phone IS NOT NULL,
        'attributed_revenue', NEW.attributed_revenue,
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

-- Create trigger for attribution data audit logging
DROP TRIGGER IF EXISTS audit_attribution_contact_data ON public.attribution_data;
CREATE TRIGGER audit_attribution_contact_data
  BEFORE INSERT OR UPDATE ON public.attribution_data
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_attribution_contact_access();