-- Phase 1: Critical Security Fixes - Contact Data Protection and RLS Policy Cleanup

-- Step 1: Remove conflicting RLS policies on tracking_events table
DROP POLICY IF EXISTS "Anonymous tracking only" ON tracking_events;
DROP POLICY IF EXISTS "Authenticated tracking access" ON tracking_events;
DROP POLICY IF EXISTS "Service role tracking with contact info" ON tracking_events;
DROP POLICY IF EXISTS "Users can insert tracking events for their projects" ON tracking_events;

-- Step 2: Create secure, consolidated RLS policies for tracking_events
-- Allow anonymous tracking without contact info
CREATE POLICY "Allow anonymous tracking without contact info" ON tracking_events
FOR INSERT 
WITH CHECK (
  -- Allow anonymous users to track basic events without contact information
  (auth.uid() IS NULL AND contact_email IS NULL AND contact_phone IS NULL AND contact_name IS NULL AND form_data IS NULL)
);

-- Allow authenticated users to track events with contact info for their projects  
CREATE POLICY "Allow authenticated tracking with contact info" ON tracking_events
FOR INSERT 
WITH CHECK (
  -- Allow authenticated users to insert tracking events for their projects
  (auth.uid() IS NOT NULL AND project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  ))
);

-- Allow service role for edge functions (with rate limiting in code)
CREATE POLICY "Allow service role tracking" ON tracking_events
FOR INSERT 
WITH CHECK (
  current_setting('role') = 'service_role'
);

-- Step 3: Enable RLS on rate_limits table if not already enabled
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Step 4: Add security logging trigger for contact information access
CREATE OR REPLACE FUNCTION audit_contact_data_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when contact information is being stored
  IF TG_OP = 'INSERT' AND (NEW.contact_email IS NOT NULL OR NEW.contact_phone IS NOT NULL OR NEW.contact_name IS NOT NULL) THEN
    PERFORM log_security_event(
      NULL, -- No user_id for anonymous tracking
      'contact_data_stored',
      'tracking_events',
      NEW.id,
      jsonb_build_object(
        'project_id', NEW.project_id,
        'has_email', NEW.contact_email IS NOT NULL,
        'has_phone', NEW.contact_phone IS NOT NULL,
        'has_name', NEW.contact_name IS NOT NULL,
        'event_type', NEW.event_type
      ),
      'warning'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS audit_contact_data_trigger ON tracking_events;
CREATE TRIGGER audit_contact_data_trigger
  AFTER INSERT ON tracking_events
  FOR EACH ROW
  EXECUTE FUNCTION audit_contact_data_access();