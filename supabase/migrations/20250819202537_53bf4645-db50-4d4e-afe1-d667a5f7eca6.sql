-- CRITICAL SECURITY FIX: Clients Table RLS Policy Consolidation
-- This fixes 7 conflicting policies that could expose customer contact information

-- =============================================================================
-- CLIENTS TABLE SECURITY CLEANUP
-- Remove all 7 conflicting policies and replace with 3 secure, clear policies
-- =============================================================================

-- Drop all existing conflicting policies on clients table
DROP POLICY IF EXISTS "Authenticated users can access their agency clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create clients for their agencies" ON public.clients;
DROP POLICY IF EXISTS "Users can create clients in their agency" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their agency clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their agency's clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their agency clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their agency's clients" ON public.clients;

-- Create 3 clean, secure policies for clients table
-- Policy 1: Secure client viewing (protects email/phone from unauthorized access)
CREATE POLICY "secure_client_access" ON public.clients
FOR SELECT 
TO authenticated
USING (
  -- Only authenticated users can view clients from their own agency
  agency_id IN (
    SELECT a.id FROM agencies a
    WHERE a.user_id = auth.uid()
  )
);

-- Policy 2: Secure client creation (ensures clients are created in user's agency only)
CREATE POLICY "secure_client_creation" ON public.clients
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Users can only create clients in their own agency
  agency_id IN (
    SELECT a.id FROM agencies a
    WHERE a.user_id = auth.uid()
  )
);

-- Policy 3: Secure client management (update/delete protection)
CREATE POLICY "secure_client_management" ON public.clients
FOR UPDATE, DELETE 
TO authenticated
USING (
  -- Users can only modify/delete clients from their own agency
  agency_id IN (
    SELECT a.id FROM agencies a
    WHERE a.user_id = auth.uid()
  )
);

-- Add comment for security documentation
COMMENT ON TABLE public.clients IS 'Client contact information protected by RLS policies. Only agency owners can access their clients'' email and phone data.';