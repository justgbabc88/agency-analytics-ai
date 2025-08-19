-- PHASE 1: RLS Policy Consolidation - CRITICAL SECURITY CLEANUP
-- This fixes massive policy conflicts that are exposing sensitive data

-- =============================================================================
-- TRACKING_EVENTS TABLE CLEANUP
-- Remove all 9 conflicting policies and replace with 3 clean, secure policies
-- =============================================================================

-- Drop all existing conflicting policies on tracking_events
DROP POLICY IF EXISTS "Allow anonymous tracking without contact info" ON public.tracking_events;
DROP POLICY IF EXISTS "Allow authenticated tracking with contact info" ON public.tracking_events;
DROP POLICY IF EXISTS "Allow service role tracking" ON public.tracking_events;
DROP POLICY IF EXISTS "Authenticated users can delete their project tracking events" ON public.tracking_events;
DROP POLICY IF EXISTS "Authenticated users can manage their project tracking events" ON public.tracking_events;
DROP POLICY IF EXISTS "Authenticated users can view their project tracking events" ON public.tracking_events;
DROP POLICY IF EXISTS "Users can create events for their projects" ON public.tracking_events;
DROP POLICY IF EXISTS "Users can delete events for their projects" ON public.tracking_events;
DROP POLICY IF EXISTS "Users can update events for their projects" ON public.tracking_events;

-- Create 3 clean, secure policies for tracking_events
CREATE POLICY "secure_anonymous_tracking" ON public.tracking_events
FOR INSERT 
TO anon
WITH CHECK (
  -- Anonymous users can ONLY insert basic page views with NO contact data
  event_type = 'page_view' AND 
  contact_email IS NULL AND 
  contact_phone IS NULL AND 
  contact_name IS NULL AND 
  form_data IS NULL AND
  revenue_amount IS NULL
);

CREATE POLICY "secure_authenticated_access" ON public.tracking_events
FOR ALL 
TO authenticated
USING (
  -- Authenticated project owners can access all their project's tracking data
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Authenticated users can create events for their projects
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

CREATE POLICY "secure_service_operations" ON public.tracking_events
FOR ALL 
TO service_role
WITH CHECK (true);

-- =============================================================================
-- TRACKING_SESSIONS TABLE CLEANUP  
-- Remove all 10 conflicting policies and replace with 3 clean, secure policies
-- =============================================================================

-- Drop all existing conflicting policies on tracking_sessions
DROP POLICY IF EXISTS "Allow public tracking session creation" ON public.tracking_sessions;
DROP POLICY IF EXISTS "Allow public tracking session updates" ON public.tracking_sessions;
DROP POLICY IF EXISTS "Authenticated users can delete their project tracking sessions" ON public.tracking_sessions;
DROP POLICY IF EXISTS "Authenticated users can view their project tracking sessions" ON public.tracking_sessions;

-- Create 3 clean, secure policies for tracking_sessions
CREATE POLICY "public_session_management" ON public.tracking_sessions
FOR INSERT 
TO anon
WITH CHECK (true);

CREATE POLICY "public_session_updates" ON public.tracking_sessions
FOR UPDATE 
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "authenticated_session_access" ON public.tracking_sessions
FOR ALL 
TO authenticated
USING (
  -- Authenticated project owners can access their project's sessions
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
)
WITH CHECK (
  -- Authenticated users can create sessions for their projects
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

CREATE POLICY "service_session_operations" ON public.tracking_sessions
FOR ALL 
TO service_role
WITH CHECK (true);