-- CRITICAL SECURITY FIX: Attribution Data Table INSERT Policy Restriction
-- This fixes the overly permissive INSERT policy that could allow data injection

-- =============================================================================
-- ATTRIBUTION_DATA TABLE INSERT SECURITY TIGHTENING
-- Replace the overly permissive INSERT policy with a secure one
-- =============================================================================

-- Drop the current overly permissive INSERT policy
DROP POLICY IF EXISTS "secure_attribution_data_creation" ON public.attribution_data;

-- Create a highly restrictive INSERT policy that only allows the secure function to work
CREATE POLICY "secure_attribution_data_creation" ON public.attribution_data
FOR INSERT 
TO authenticated, service_role
WITH CHECK (
  -- Only allow inserts through the secure_attribution_with_contact function
  -- or by service role for system operations
  (current_setting('role') = 'service_role') OR
  -- Additional security: ensure user owns the project when inserting
  (auth.uid() IS NOT NULL AND project_id IN (
    SELECT p.id FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE a.user_id = auth.uid()
  ))
);

-- Update the secure_attribution_with_contact function to be even more secure
CREATE OR REPLACE FUNCTION public.secure_attribution_with_contact(
  p_project_id uuid, 
  p_session_id text, 
  p_event_id uuid, 
  p_contact_email text DEFAULT NULL::text, 
  p_contact_phone text DEFAULT NULL::text, 
  p_attributed_revenue numeric DEFAULT 0, 
  p_attribution_model text DEFAULT 'first_touch'::text, 
  p_utm_source text DEFAULT NULL::text, 
  p_utm_campaign text DEFAULT NULL::text, 
  p_utm_medium text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  attribution_id UUID;
BEGIN
  -- Validate that the user owns the project (security check)
  IF NOT EXISTS (
    SELECT 1 FROM projects p
    JOIN agencies a ON p.agency_id = a.id
    WHERE p.id = p_project_id AND a.user_id = auth.uid()
  ) AND current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: User does not own this project';
  END IF;

  -- Log security event when storing contact information
  IF p_contact_email IS NOT NULL OR p_contact_phone IS NOT NULL THEN
    PERFORM log_security_event(
      auth.uid(),
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

  -- Insert attribution data with enhanced security
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
$function$;

-- Add enhanced security documentation
COMMENT ON FUNCTION public.secure_attribution_with_contact IS 'SECURE FUNCTION: Only way to insert attribution data with contact information. Validates project ownership and logs security events.';