-- Fix Security Definer View Issue
-- Remove the problematic view and create a regular view with proper RLS

-- Remove the security definer view
DROP VIEW IF EXISTS safe_attribution_data;

-- Create a regular view without security definer properties
-- The RLS policies on the underlying table will handle security
CREATE VIEW safe_attribution_data AS
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
  contact_email,
  contact_phone
FROM attribution_data;

-- Grant proper permissions
GRANT SELECT ON safe_attribution_data TO authenticated;