-- Drop the unique constraint temporarily to clean up duplicates
ALTER TABLE project_daily_metrics DROP CONSTRAINT IF EXISTS project_daily_metrics_project_id_date_landing_page_name_key;

-- Delete all records using service role
DELETE FROM project_daily_metrics;

-- Re-add the unique constraint
ALTER TABLE project_daily_metrics ADD CONSTRAINT project_daily_metrics_project_id_date_landing_page_name_key 
UNIQUE (project_id, date, landing_page_name);

-- Now run the rebuild with clean slate
INSERT INTO project_daily_metrics (
  project_id, 
  date, 
  landing_page_name, 
  landing_page_url,
  total_page_views, 
  unique_visitors
)
SELECT 
  te.project_id,
  DATE(te.created_at) as date,
  COALESCE(te.event_name, 'Unknown Page') as landing_page_name,
  SPLIT_PART(te.page_url, '?', 1) as landing_page_url,
  COUNT(*) as total_page_views,
  COUNT(DISTINCT te.session_id) as unique_visitors
FROM tracking_events te
WHERE te.event_type = 'page_view'
  AND te.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY 
  te.project_id, 
  DATE(te.created_at),
  COALESCE(te.event_name, 'Unknown Page'), 
  SPLIT_PART(te.page_url, '?', 1)
HAVING COUNT(*) > 0;