-- Security Fix: Prevent Anonymous Access to Customer Contact Information in Attribution Data

-- Step 1: Remove existing problematic RLS policies for attribution_data
DROP POLICY IF EXISTS "Authenticated users can access their project attribution" ON attribution_data;
DROP POLICY IF EXISTS "Secure attribution data access" ON attribution_data;
DROP POLICY IF EXISTS "Users can create attribution for their projects" ON attribution_data;

-- Step 2: Create new secure RLS policies for attribution_data
-- Only authenticated users who own the project can access attribution data
CREATE POLICY "Authenticated project owners can view attribution data" 
ON attribution_data FOR SELECT 
TO authenticated
USING (
  project_id IN (
    SELECT p.id FROM projects p 
    JOIN agencies a ON p.agency_id = a.id 
    WHERE a.user_id = auth.uid()
  )
);

-- Only service role can insert attribution data (via secure edge functions)
CREATE POLICY "Service role can insert attribution data" 
ON attribution_data FOR INSERT 
TO service_role
WITH CHECK (true);

-- Only authenticated project owners can update their attribution data
CREATE POLICY "Authenticated project owners can update attribution data" 
ON attribution_data FOR UPDATE 
TO authenticated
USING (
  project_id IN (
    SELECT p.id FROM projects p 
    JOIN agencies a ON p.agency_id = a.id 
    WHERE a.user_id = auth.uid()
  )
);

-- Only authenticated project owners can delete their attribution data
CREATE POLICY "Authenticated project owners can delete attribution data" 
ON attribution_data FOR DELETE 
TO authenticated
USING (
  project_id IN (
    SELECT p.id FROM projects p 
    JOIN agencies a ON p.agency_id = a.id 
    WHERE a.user_id = auth.uid()
  )
);

-- Step 3: Create security function to validate contact data insertion
CREATE OR REPLACE FUNCTION secure_attribution_with_contact(
  p_project_id UUID,
  p_session_id TEXT,
  p_event_id UUID,
  p_contact_email TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_attributed_revenue NUMERIC DEFAULT 0,
  p_attribution_model TEXT DEFAULT 'first_touch',
  p_utm_source TEXT DEFAULT NULL,
  p_utm_campaign TEXT DEFAULT NULL,
  p_utm_medium TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attribution_id UUID;
BEGIN
  -- Log security event when storing contact information
  IF p_contact_email IS NOT NULL OR p_contact_phone IS NOT NULL THEN
    PERFORM log_security_event(
      NULL, -- No user_id for anonymous tracking
      'attribution_with_contact_stored',
      'attribution_data',
      NULL,
      jsonb_build_object(
        'project_id', p_project_id,
        'has_email', p_contact_email IS NOT NULL,
        'has_phone', p_contact_phone IS NOT NULL,
        'revenue_amount', p_attributed_revenue
      ),
      'warning'
    );
  END IF;

  -- Insert attribution data
  INSERT INTO attribution_data (
    project_id,
    session_id,
    event_id,
    contact_email,
    contact_phone,
    attributed_revenue,
    attribution_model,
    utm_source,
    utm_campaign,
    utm_medium
  ) VALUES (
    p_project_id,
    p_session_id,
    p_event_id,
    p_contact_email,
    p_contact_phone,
    p_attributed_revenue,
    p_attribution_model,
    p_utm_source,
    p_utm_campaign,
    p_utm_medium
  ) RETURNING id INTO attribution_id;

  RETURN attribution_id;
END;
$$;

-- Step 4: Add trigger to audit sensitive data access on attribution_data
DROP TRIGGER IF EXISTS audit_attribution_contact_access ON attribution_data;
CREATE TRIGGER audit_attribution_contact_access
  AFTER INSERT OR UPDATE ON attribution_data
  FOR EACH ROW
  EXECUTE FUNCTION audit_sensitive_data_access();

-- Step 5: Create view for safe attribution access (without contact info for non-owners)
CREATE OR REPLACE VIEW safe_attribution_data AS
SELECT 
  id,
  project_id,
  session_id,
  event_id,
  attributed_revenue,
  attribution_model,
  conversion_date,
  created_at,
  updated_at,
  utm_source,
  utm_campaign,
  utm_medium,
  -- Only show contact info to project owners
  CASE 
    WHEN project_id IN (
      SELECT p.id FROM projects p 
      JOIN agencies a ON p.agency_id = a.id 
      WHERE a.user_id = auth.uid()
    ) THEN contact_email 
    ELSE NULL 
  END AS contact_email,
  CASE 
    WHEN project_id IN (
      SELECT p.id FROM projects p 
      JOIN agencies a ON p.agency_id = a.id 
      WHERE a.user_id = auth.uid()
    ) THEN contact_phone 
    ELSE NULL 
  END AS contact_phone
FROM attribution_data;

-- Enable RLS on the view
ALTER VIEW safe_attribution_data OWNER TO postgres;
GRANT SELECT ON safe_attribution_data TO authenticated, anon;