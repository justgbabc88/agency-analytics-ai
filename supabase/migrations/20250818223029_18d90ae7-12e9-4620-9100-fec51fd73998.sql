-- Additional Security Hardening: Remove public access to sensitive contact data

-- Remove public INSERT access from tables containing contact information
-- But keep necessary webhook functionality with more secure policies

-- Secure attribution_data - remove public insert, only allow authenticated users
DROP POLICY IF EXISTS "Allow public tracking event creation" ON public.attribution_data;
DROP POLICY IF EXISTS "Users can insert attribution data for their projects" ON public.attribution_data;

CREATE POLICY "Only authenticated users can create attribution data" ON public.attribution_data
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  project_id IN (
    SELECT p.id FROM public.projects p 
    JOIN public.agencies a ON p.agency_id = a.id 
    WHERE a.user_id = auth.uid()
  )
);

-- Secure calendly_events - remove system policies, only allow service functions
DROP POLICY IF EXISTS "Service can create calendly events" ON public.calendly_events;
DROP POLICY IF EXISTS "System can insert calendly events" ON public.calendly_events;
DROP POLICY IF EXISTS "System can update calendly events" ON public.calendly_events;

-- Only allow service functions to create/update calendly events
CREATE POLICY "Service functions can manage calendly events" ON public.calendly_events
FOR INSERT WITH CHECK (
  -- Allow edge functions but not public access
  current_setting('role') = 'service_role' OR 
  (auth.uid() IS NOT NULL AND project_id IN (
    SELECT p.id FROM public.projects p 
    JOIN public.agencies a ON p.agency_id = a.id 
    WHERE a.user_id = auth.uid()
  ))
);

CREATE POLICY "Service functions can update calendly events" ON public.calendly_events
FOR UPDATE USING (
  current_setting('role') = 'service_role' OR
  (auth.uid() IS NOT NULL AND project_id IN (
    SELECT p.id FROM public.projects p 
    JOIN public.agencies a ON p.agency_id = a.id 
    WHERE a.user_id = auth.uid()
  ))
);

-- Secure ghl_form_submissions - remove public insert
DROP POLICY IF EXISTS "System can create form submissions" ON public.ghl_form_submissions;

CREATE POLICY "Service functions can create form submissions" ON public.ghl_form_submissions
FOR INSERT WITH CHECK (
  -- Only allow edge functions, not public access
  current_setting('role') = 'service_role'
);

-- Secure tracking_events - be more selective about what can be inserted publicly
DROP POLICY IF EXISTS "Public can create tracking events" ON public.tracking_events;
DROP POLICY IF EXISTS "Allow public tracking event creation" ON public.tracking_events;

-- Allow public creation only for anonymous tracking data (no contact info)
CREATE POLICY "Public can create anonymous tracking events" ON public.tracking_events
FOR INSERT WITH CHECK (
  -- Only allow if no contact information is provided
  (contact_email IS NULL AND contact_phone IS NULL AND contact_name IS NULL) OR
  -- Or if it's from an authenticated user
  (auth.uid() IS NOT NULL AND project_id IN (
    SELECT p.id FROM public.projects p 
    JOIN public.agencies a ON p.agency_id = a.id 
    WHERE a.user_id = auth.uid()
  ))
);

-- Allow service functions to create tracking events with contact info
CREATE POLICY "Service functions can create tracking events with contact info" ON public.tracking_events
FOR INSERT WITH CHECK (
  current_setting('role') = 'service_role'
);

-- Ensure tracking_sessions are secure but functional for pixels
-- These don't contain direct contact info so can remain public for basic session tracking
-- but we should still restrict sensitive operations

-- Add additional security to prevent data exposure
-- Create a more secure policy for clients table access
DROP POLICY IF EXISTS "Authenticated users can access their agency clients" ON public.clients;

CREATE POLICY "Authenticated users can access their agency clients" ON public.clients
FOR ALL USING (
  auth.uid() IS NOT NULL AND 
  agency_id IN (
    SELECT a.id FROM public.agencies a 
    WHERE a.user_id = auth.uid()
  )
);