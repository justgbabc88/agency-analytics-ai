-- Create a completely new table with the aggregated data to bypass issues
DROP TABLE IF EXISTS project_daily_metrics_new;

CREATE TABLE project_daily_metrics_new (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  date DATE NOT NULL,
  landing_page_name TEXT NOT NULL,
  landing_page_url TEXT NOT NULL,
  total_page_views INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, date, landing_page_name)
);

-- Enable RLS on new table
ALTER TABLE project_daily_metrics_new ENABLE ROW LEVEL SECURITY;

-- Create policy for user access
CREATE POLICY "Users can view their project daily metrics" 
ON project_daily_metrics_new 
FOR SELECT 
USING (user_owns_project(project_id));

-- Populate with fresh data
INSERT INTO project_daily_metrics_new (
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

-- Drop old table and rename new one
DROP TABLE project_daily_metrics;
ALTER TABLE project_daily_metrics_new RENAME TO project_daily_metrics;