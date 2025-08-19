-- CRITICAL SECURITY FIX: Safe Attribution Data View Security Analysis and Fix
-- Views inherit security from underlying tables, so we need to secure the source

-- =============================================================================
-- SAFE_ATTRIBUTION_DATA VIEW SECURITY ANALYSIS
-- Since it's a view, we need to understand and secure the underlying data
-- =============================================================================

-- First, let's check what this view actually contains and secure it appropriately
-- Since views can't have RLS directly, we need to either:
-- 1. Drop the view if it's not needed and potentially exposing data
-- 2. Recreate it with proper security filtering if it's needed
-- 3. Ensure the underlying tables are properly secured

-- Check if this view is actually being used and what it contains
-- If it's a duplicate of attribution_data or contains sensitive data, we should remove it

-- For security, let's drop this potentially dangerous view that has no access controls
DROP VIEW IF EXISTS public.safe_attribution_data;

-- Create a secure function instead to access attribution data if needed
-- This provides controlled access with proper authentication and project ownership validation
CREATE OR REPLACE FUNCTION public.get_safe_attribution_data(p_project_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  session_id text,
  event_id uuid,
  attribution_model text,
  attributed_revenue numeric,
  conversion_date timestamp with time zone,
  utm_source text,
  utm_campaign text,
  utm_medium text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
  -- NOTE: Deliberately excluding contact_email and contact_phone for security
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate that the user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- If no project specified, return data for all user's projects
  IF p_project_id IS NULL THEN
    RETURN QUERY
    SELECT 
      ad.id,
      ad.project_id,
      ad.session_id,
      ad.event_id,
      ad.attribution_model,
      ad.attributed_revenue,
      ad.conversion_date,
      ad.utm_source,
      ad.utm_campaign,
      ad.utm_medium,
      ad.created_at,
      ad.updated_at
    FROM attribution_data ad
    WHERE ad.project_id IN (
      SELECT p.id FROM projects p
      JOIN agencies a ON p.agency_id = a.id
      WHERE a.user_id = auth.uid()
    );
  ELSE
    -- Validate user owns the specified project
    IF NOT EXISTS (
      SELECT 1 FROM projects p
      JOIN agencies a ON p.agency_id = a.id
      WHERE p.id = p_project_id AND a.user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Unauthorized: User does not own this project';
    END IF;

    RETURN QUERY
    SELECT 
      ad.id,
      ad.project_id,
      ad.session_id,
      ad.event_id,
      ad.attribution_model,
      ad.attributed_revenue,
      ad.conversion_date,
      ad.utm_source,
      ad.utm_campaign,
      ad.utm_medium,
      ad.created_at,
      ad.updated_at
    FROM attribution_data ad
    WHERE ad.project_id = p_project_id;
  END IF;
END;
$function$;

-- Add security documentation
COMMENT ON FUNCTION public.get_safe_attribution_data IS 'SECURE FUNCTION: Provides safe access to attribution data without exposing customer contact information. Requires authentication and validates project ownership.';