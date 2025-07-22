-- Drop the problematic daily metrics table and recreate as a view
DROP TABLE IF EXISTS project_daily_metrics CASCADE;

-- Create a view that dynamically aggregates the data
CREATE VIEW project_daily_metrics AS
SELECT 
  gen_random_uuid() as id,
  te.project_id,
  DATE(te.created_at) as date,
  COALESCE(te.event_name, 'Unknown Page') as landing_page_name,
  SPLIT_PART(te.page_url, '?', 1) as landing_page_url,
  COUNT(*) as total_page_views,
  COUNT(DISTINCT te.session_id) as unique_visitors,
  MIN(te.created_at) as created_at,
  MAX(te.created_at) as updated_at
FROM tracking_events te
WHERE te.event_type = 'page_view'
  AND te.created_at >= CURRENT_DATE - INTERVAL '30 days'  -- Keep last 30 days for performance
GROUP BY 
  te.project_id, 
  DATE(te.created_at),
  COALESCE(te.event_name, 'Unknown Page'), 
  SPLIT_PART(te.page_url, '?', 1);

-- Enable RLS on the view (this applies to the underlying table's RLS)
-- Views automatically inherit RLS from the underlying tables

-- Update the existing function to work with the view
CREATE OR REPLACE FUNCTION public.get_project_daily_metrics(
  p_project_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  date DATE,
  landing_page_name TEXT,
  landing_page_url TEXT,
  total_page_views INTEGER,
  unique_visitors INTEGER
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dm.date,
    dm.landing_page_name,
    dm.landing_page_url,
    dm.total_page_views::INTEGER,
    dm.unique_visitors::INTEGER
  FROM project_daily_metrics dm
  WHERE dm.project_id = p_project_id
    AND dm.date >= p_start_date
    AND dm.date <= p_end_date
  ORDER BY dm.date DESC, dm.total_page_views DESC;
END;
$$;