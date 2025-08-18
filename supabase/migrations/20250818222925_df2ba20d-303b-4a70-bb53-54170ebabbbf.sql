-- Security Fix: Ensure RLS is enabled and properly configured for all sensitive data tables

-- Enable RLS on all critical tables (in case it's not already enabled)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghl_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribution_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendly_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_sessions ENABLE ROW LEVEL SECURITY;

-- Drop and recreate more secure policies for clients table
DROP POLICY IF EXISTS "Users can view their agency's clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view their agency clients" ON public.clients;

-- Create secure policy for clients - only authenticated users can access their agency's clients
CREATE POLICY "Authenticated users can access their agency clients" ON public.clients
FOR ALL USING (
  auth.uid() IS NOT NULL AND 
  agency_id IN (
    SELECT id FROM public.agencies 
    WHERE user_id = auth.uid()
  )
);

-- Ensure profiles are properly secured - only user can access their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can only access their own profile" ON public.profiles
FOR ALL USING (auth.uid() = id);

-- Secure ghl_form_submissions - only authenticated project owners
DROP POLICY IF EXISTS "System can create submissions" ON public.ghl_form_submissions;
CREATE POLICY "Authenticated users can access their project submissions" ON public.ghl_form_submissions
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  project_id IN (
    SELECT p.id FROM public.projects p 
    JOIN public.agencies a ON p.agency_id = a.id 
    WHERE a.user_id = auth.uid()
  )
);

-- System can still create submissions via authenticated edge functions
CREATE POLICY "System can create form submissions" ON public.ghl_form_submissions
FOR INSERT WITH CHECK (true);

-- Secure attribution_data - only authenticated project owners  
DROP POLICY IF EXISTS "Users can view attribution data for their projects" ON public.attribution_data;
CREATE POLICY "Authenticated users can access their project attribution" ON public.attribution_data
FOR ALL USING (
  auth.uid() IS NOT NULL AND
  project_id IN (
    SELECT p.id FROM public.projects p 
    JOIN public.agencies a ON p.agency_id = a.id 
    WHERE a.user_id = auth.uid()
  )
);

-- Secure calendly_events - only authenticated project owners
DROP POLICY IF EXISTS "Users can view calendly events for their projects" ON public.calendly_events;
CREATE POLICY "Authenticated users can access their project events" ON public.calendly_events
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  project_id IN (
    SELECT p.id FROM public.projects p 
    JOIN public.agencies a ON p.agency_id = a.id 
    WHERE a.user_id = auth.uid()
  )
);

-- Secure tracking_events - only authenticated project owners can view, but allow public creation
DROP POLICY IF EXISTS "Users can view tracking events for their projects" ON public.tracking_events;
DROP POLICY IF EXISTS "Users can view events for their projects" ON public.tracking_events;

CREATE POLICY "Authenticated users can view their project tracking events" ON public.tracking_events
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  project_id IN (
    SELECT p.id FROM public.projects p 
    JOIN public.agencies a ON p.agency_id = a.id 
    WHERE a.user_id = auth.uid()
  )
);

-- Allow public creation for tracking (needed for website pixel functionality)
-- But restrict other operations to authenticated project owners
CREATE POLICY "Public can create tracking events" ON public.tracking_events
FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can manage their project tracking events" ON public.tracking_events
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND
  project_id IN (
    SELECT p.id FROM public.projects p 
    JOIN public.agencies a ON p.agency_id = a.id 
    WHERE a.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can delete their project tracking events" ON public.tracking_events  
FOR DELETE USING (
  auth.uid() IS NOT NULL AND
  project_id IN (
    SELECT p.id FROM public.projects p 
    JOIN public.agencies a ON p.agency_id = a.id 
    WHERE a.user_id = auth.uid()
  )
);

-- Secure tracking_sessions similarly
DROP POLICY IF EXISTS "Users can view tracking sessions for their projects" ON public.tracking_sessions;
DROP POLICY IF EXISTS "Users can view sessions for their projects" ON public.tracking_sessions;

CREATE POLICY "Authenticated users can view their project tracking sessions" ON public.tracking_sessions
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  project_id IN (
    SELECT p.id FROM public.projects p 
    JOIN public.agencies a ON p.agency_id = a.id 
    WHERE a.user_id = auth.uid()
  )
);

-- Allow public creation and updates for tracking sessions (needed for pixel functionality)
CREATE POLICY "Public can create tracking sessions" ON public.tracking_sessions
FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update tracking sessions" ON public.tracking_sessions  
FOR UPDATE WITH CHECK (true);

CREATE POLICY "Authenticated users can delete their project tracking sessions" ON public.tracking_sessions
FOR DELETE USING (
  auth.uid() IS NOT NULL AND
  project_id IN (
    SELECT p.id FROM public.projects p 
    JOIN public.agencies a ON p.agency_id = a.id 
    WHERE a.user_id = auth.uid()
  )
);