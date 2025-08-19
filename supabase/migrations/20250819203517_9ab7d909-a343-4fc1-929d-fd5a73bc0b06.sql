-- CRITICAL SECURITY FIX: Safe Attribution Data Table RLS Implementation
-- This fixes the missing RLS protection that exposes customer contact information

-- =============================================================================
-- SAFE_ATTRIBUTION_DATA TABLE SECURITY IMPLEMENTATION
-- Enable RLS and create secure policies to protect customer contact data
-- =============================================================================

-- Enable Row Level Security on safe_attribution_data table
ALTER TABLE public.safe_attribution_data ENABLE ROW LEVEL SECURITY;

-- Create secure policies for safe_attribution_data table
-- Policy 1: Secure attribution viewing (protects contact_email/contact_phone from unauthorized access)
CREATE POLICY "secure_safe_attribution_data_access" ON public.safe_attribution_data
FOR SELECT 
TO authenticated
USING (
  -- Only authenticated users can view safe attribution data from projects they own
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

-- Policy 2: Secure attribution creation (service role and authenticated project owners only)
CREATE POLICY "secure_safe_attribution_data_creation" ON public.safe_attribution_data
FOR INSERT 
TO authenticated, service_role
WITH CHECK (
  -- Service role can create OR authenticated users can create for their projects
  (current_setting('role') = 'service_role') OR
  (auth.uid() IS NOT NULL AND project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  ))
);

-- Policy 3: Secure attribution updates (authenticated project owners only)
CREATE POLICY "secure_safe_attribution_data_updates" ON public.safe_attribution_data
FOR UPDATE 
TO authenticated
USING (
  -- Only authenticated users can update safe attribution data for their projects
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

-- Policy 4: Secure attribution deletion (authenticated project owners only)
CREATE POLICY "secure_safe_attribution_data_deletion" ON public.safe_attribution_data
FOR DELETE 
TO authenticated
USING (
  -- Only authenticated users can delete safe attribution data from their projects
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

-- Add security documentation comments
COMMENT ON TABLE public.safe_attribution_data IS 'SENSITIVE: Customer contact information (contact_email, contact_phone) fully protected by RLS policies. Only authenticated project owners can access their safe attribution data.';

-- Add column comments for security awareness
COMMENT ON COLUMN public.safe_attribution_data.contact_email IS 'SENSITIVE: Customer email address - restricted access only to project owners';
COMMENT ON COLUMN public.safe_attribution_data.contact_phone IS 'SENSITIVE: Customer phone number - restricted access only to project owners';