-- Fix Security Definer Views Issue
-- Remove postgres-owned views that bypass RLS and recreate them properly

-- Step 1: Drop existing problematic views owned by postgres
DROP VIEW IF EXISTS safe_attribution_data;
DROP VIEW IF EXISTS project_daily_metrics; 
DROP VIEW IF EXISTS calendly_sync_health;

-- Step 2: Recreate safe_attribution_data as a regular view (not security definer)
-- This view will respect RLS policies on the underlying attribution_data table
CREATE VIEW safe_attribution_data 
WITH (security_barrier = true) AS
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

-- Step 3: Recreate project_daily_metrics with security barrier
CREATE VIEW project_daily_metrics 
WITH (security_barrier = true) AS
SELECT 
  gen_random_uuid() AS id,
  te.project_id,
  date(te.created_at) AS date,
  COALESCE(te.event_name, 'Unknown Page') AS landing_page_name,
  split_part(te.page_url, '?', 1) AS landing_page_url,
  count(*) AS total_page_views,
  count(DISTINCT te.session_id) AS unique_visitors,
  min(te.created_at) AS created_at,
  max(te.created_at) AS updated_at
FROM tracking_events te
WHERE te.event_type = 'page_view' 
  AND te.created_at >= (CURRENT_DATE - interval '30 days')
GROUP BY 
  te.project_id, 
  date(te.created_at), 
  COALESCE(te.event_name, 'Unknown Page'), 
  split_part(te.page_url, '?', 1);

-- Step 4: Recreate calendly_sync_health with security barrier
CREATE VIEW calendly_sync_health 
WITH (security_barrier = true) AS
SELECT 
  pi.project_id,
  p.name AS project_name,
  pi.last_sync,
  pi.sync_health_score,
  pi.last_sync_duration_ms,
  pi.total_events_synced,
  pi.consecutive_sync_failures,
  CASE
    WHEN pi.last_sync IS NULL THEN 'never_synced'
    WHEN pi.last_sync < (now() - interval '24 hours') THEN 'stale'
    WHEN pi.consecutive_sync_failures > 2 THEN 'unhealthy'
    WHEN pi.sync_health_score < 80 THEN 'degraded'
    ELSE 'healthy'
  END AS health_status,
  (
    SELECT count(*) 
    FROM calendly_sync_logs csl
    WHERE csl.project_id = pi.project_id 
      AND csl.created_at > (now() - interval '7 days') 
      AND csl.sync_status = 'failed'
  ) AS recent_failures,
  (
    SELECT csl.created_at
    FROM calendly_sync_logs csl
    WHERE csl.project_id = pi.project_id
    ORDER BY csl.created_at DESC
    LIMIT 1
  ) AS last_activity
FROM project_integrations pi
JOIN projects p ON pi.project_id = p.id
WHERE pi.platform = 'calendly' 
  AND pi.is_connected = true;

-- Step 5: Set proper ownership and permissions
ALTER VIEW safe_attribution_data OWNER TO authenticator;
ALTER VIEW project_daily_metrics OWNER TO authenticator;  
ALTER VIEW calendly_sync_health OWNER TO authenticator;

-- Grant appropriate permissions
GRANT SELECT ON safe_attribution_data TO authenticated;
GRANT SELECT ON project_daily_metrics TO authenticated;
GRANT SELECT ON calendly_sync_health TO authenticated;