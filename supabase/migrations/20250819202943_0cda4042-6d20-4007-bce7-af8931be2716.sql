-- CRITICAL SECURITY FIX: Calendly Events Table RLS Policy Consolidation
-- This fixes conflicting policies that could expose customer contact information (emails/names)

-- =============================================================================
-- CALENDLY_EVENTS TABLE SECURITY CLEANUP  
-- Remove conflicting policies and replace with secure, clear policies
-- =============================================================================

-- Drop all existing conflicting policies on calendly_events table
DROP POLICY IF EXISTS "Authenticated users can access their project events" ON public.calendly_events;
DROP POLICY IF EXISTS "Service functions can manage calendly events" ON public.calendly_events;
DROP POLICY IF EXISTS "Service functions can update calendly events" ON public.calendly_events;
DROP POLICY IF EXISTS "Users can delete their project calendly events" ON public.calendly_events;
DROP POLICY IF EXISTS "Users can update their project calendly events" ON public.calendly_events;
DROP POLICY IF EXISTS "Users can view their project calendly events" ON public.calendly_events;

-- Create 4 clean, secure policies for calendly_events table
-- Policy 1: Secure event viewing (protects invitee_email/invitee_name from unauthorized access)
CREATE POLICY "secure_calendly_events_access" ON public.calendly_events
FOR SELECT 
TO authenticated
USING (
  -- Only authenticated users can view events from projects they own
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

-- Policy 2: Secure event creation (service role and authorized users only)
CREATE POLICY "secure_calendly_events_creation" ON public.calendly_events
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Service role can create events OR users can create events for their projects
  (current_setting('role') = 'service_role') OR
  (project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  ))
);

-- Policy 3: Secure event updates (protects contact info from unauthorized modification)
CREATE POLICY "secure_calendly_events_updates" ON public.calendly_events
FOR UPDATE 
TO authenticated
USING (
  -- Service role can update events OR users can update events for their projects
  (current_setting('role') = 'service_role') OR
  (project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  ))
);

-- Policy 4: Secure event deletion (prevents unauthorized event removal)
CREATE POLICY "secure_calendly_events_deletion" ON public.calendly_events
FOR DELETE 
TO authenticated
USING (
  -- Only users can delete events from their own projects
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

-- Add security documentation comment
COMMENT ON TABLE public.calendly_events IS 'Customer contact information (invitee_email, invitee_name) protected by RLS policies. Only project owners can access their calendly events data.';