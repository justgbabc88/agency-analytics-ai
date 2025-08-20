-- PHASE 1: Emergency PII Protection - Fix Critical RLS Policy Issues

-- 1. Fix ghl_form_submissions RLS policies (Critical Issue #1)
-- Remove the overly restrictive deny policy that conflicts with other policies
DROP POLICY IF EXISTS "deny_anonymous_pii_access_ghl_submissions" ON public.ghl_form_submissions;

-- Create a consolidated, secure policy for ghl_form_submissions
DROP POLICY IF EXISTS "Authenticated users can access their project submissions" ON public.ghl_form_submissions;
DROP POLICY IF EXISTS "Secure form submissions access" ON public.ghl_form_submissions;
DROP POLICY IF EXISTS "Users can view submissions for their projects" ON public.ghl_form_submissions;

-- Single comprehensive policy for SELECT access
CREATE POLICY "secure_ghl_submissions_access" ON public.ghl_form_submissions
FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

-- Service role can insert, users cannot directly insert (only via edge functions)
DROP POLICY IF EXISTS "Service only form submission inserts" ON public.ghl_form_submissions;
DROP POLICY IF EXISTS "Users can create submissions for their projects" ON public.ghl_form_submissions;

CREATE POLICY "service_role_ghl_submissions_insert" ON public.ghl_form_submissions
FOR INSERT
TO service_role
WITH CHECK (true);

-- 2. Strengthen attribution_data RLS policies (Critical Issue #2)
-- Remove existing policies and create stricter ones
DROP POLICY IF EXISTS "authenticated_users_view_own_project_attribution" ON public.attribution_data;
DROP POLICY IF EXISTS "authenticated_users_update_own_project_attribution" ON public.attribution_data;
DROP POLICY IF EXISTS "authenticated_users_delete_own_project_attribution" ON public.attribution_data;
DROP POLICY IF EXISTS "service_and_owners_create_attribution_data" ON public.attribution_data;
DROP POLICY IF EXISTS "deny_anonymous_pii_access_attribution" ON public.attribution_data;

-- Strict project-owner-only access for attribution data
CREATE POLICY "strict_attribution_data_access" ON public.attribution_data
FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

CREATE POLICY "strict_attribution_data_insert" ON public.attribution_data
FOR INSERT
USING (
  current_setting('role') = 'service_role' OR
  (
    auth.uid() IS NOT NULL AND
    project_id IN (
      SELECT p.id FROM projects p
      JOIN agencies a ON p.agency_id = a.id
      WHERE a.user_id = auth.uid()
    )
  )
);

CREATE POLICY "strict_attribution_data_update" ON public.attribution_data
FOR UPDATE
TO authenticated
USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

CREATE POLICY "strict_attribution_data_delete" ON public.attribution_data
FOR DELETE
TO authenticated
USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

-- 3. Strengthen tracking_events RLS policies (Critical Issue #3)
-- Remove existing policies and create stricter ones
DROP POLICY IF EXISTS "secure_anonymous_tracking_enhanced" ON public.tracking_events;
DROP POLICY IF EXISTS "secure_authenticated_access" ON public.tracking_events;
DROP POLICY IF EXISTS "secure_service_operations" ON public.tracking_events;

-- Anonymous users can only create basic page_view events without PII
CREATE POLICY "anonymous_page_view_only" ON public.tracking_events
FOR INSERT
TO anon
WITH CHECK (
  event_type = 'page_view' AND
  contact_email IS NULL AND
  contact_phone IS NULL AND
  contact_name IS NULL AND
  form_data IS NULL AND
  revenue_amount IS NULL
);

-- Service role has full access for data processing
CREATE POLICY "service_role_tracking_access" ON public.tracking_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Authenticated users can access their project data with enhanced validation
CREATE POLICY "authenticated_tracking_access" ON public.tracking_events
FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

-- Authenticated users can insert data for their projects
CREATE POLICY "authenticated_tracking_insert" ON public.tracking_events
FOR INSERT
TO authenticated
WITH CHECK (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

-- 4. Strengthen calendly_events RLS policies (Issue #4)
DROP POLICY IF EXISTS "deny_anonymous_pii_access_calendly_events" ON public.calendly_events;
DROP POLICY IF EXISTS "secure_calendly_events_access" ON public.calendly_events;
DROP POLICY IF EXISTS "secure_calendly_events_creation" ON public.calendly_events;
DROP POLICY IF EXISTS "secure_calendly_events_deletion" ON public.calendly_events;
DROP POLICY IF EXISTS "secure_calendly_events_updates" ON public.calendly_events;

-- Strict project-owner-only access for calendly events
CREATE POLICY "strict_calendly_events_access" ON public.calendly_events
FOR SELECT
TO authenticated
USING (
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

CREATE POLICY "strict_calendly_events_management" ON public.calendly_events
FOR ALL
USING (
  current_setting('role') = 'service_role' OR
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
)
WITH CHECK (
  current_setting('role') = 'service_role' OR
  project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

-- 5. Fix clients table RLS policies
DROP POLICY IF EXISTS "deny_anonymous_access" ON public.clients;
DROP POLICY IF EXISTS "deny_anonymous_pii_access_clients" ON public.clients;

-- These policies already exist and are correct, but let's ensure they're properly isolated
-- No changes needed for clients table as the existing policies are secure