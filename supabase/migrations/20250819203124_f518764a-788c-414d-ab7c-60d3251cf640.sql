-- CRITICAL SECURITY FIX: Attribution Data Table RLS Policy Consolidation
-- This fixes policies that could expose customer contact information (emails/phone numbers)

-- =============================================================================
-- ATTRIBUTION_DATA TABLE SECURITY CLEANUP  
-- Remove overlapping policies and replace with secure, clear policies
-- =============================================================================

-- Drop all existing conflicting policies on attribution_data table
DROP POLICY IF EXISTS "Authenticated project owners can delete attribution data" ON public.attribution_data;
DROP POLICY IF EXISTS "Authenticated project owners can update attribution data" ON public.attribution_data;
DROP POLICY IF EXISTS "Authenticated project owners can view attribution data" ON public.attribution_data;
DROP POLICY IF EXISTS "Service role can insert attribution data" ON public.attribution_data;
DROP POLICY IF EXISTS "Users can delete attribution for their projects" ON public.attribution_data;
DROP POLICY IF EXISTS "Users can update attribution data for their projects" ON public.attribution_data;
DROP POLICY IF EXISTS "Users can update attribution for their projects" ON public.attribution_data;
DROP POLICY IF EXISTS "Users can view attribution for their projects" ON public.attribution_data;

-- Create 4 clean, secure policies for attribution_data table
-- Policy 1: Secure attribution viewing (protects contact_email/contact_phone from unauthorized access)
CREATE POLICY "secure_attribution_data_access" ON public.attribution_data
FOR SELECT 
TO authenticated
USING (
  -- Only authenticated users can view attribution data from projects they own
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

-- Policy 2: Secure attribution creation (service role only for contact data)
CREATE POLICY "secure_attribution_data_creation" ON public.attribution_data
FOR INSERT 
TO service_role
WITH CHECK (
  -- Only service role can create attribution data with contact information
  -- This prevents anonymous users from inserting fake contact data
  true
);

-- Policy 3: Secure attribution updates (authenticated project owners only)
CREATE POLICY "secure_attribution_data_updates" ON public.attribution_data
FOR UPDATE 
TO authenticated
USING (
  -- Only authenticated users can update attribution data for their projects
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

-- Policy 4: Secure attribution deletion (authenticated project owners only)
CREATE POLICY "secure_attribution_data_deletion" ON public.attribution_data
FOR DELETE 
TO authenticated
USING (
  -- Only authenticated users can delete attribution data from their projects
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

-- Add security documentation comment
COMMENT ON TABLE public.attribution_data IS 'SENSITIVE: Customer contact information (contact_email, contact_phone) protected by strict RLS policies. Only service role can insert and only project owners can access their attribution data.';

-- Add column comments for security awareness
COMMENT ON COLUMN public.attribution_data.contact_email IS 'SENSITIVE: Customer email address - restricted access only';
COMMENT ON COLUMN public.attribution_data.contact_phone IS 'SENSITIVE: Customer phone number - restricted access only';