-- Clean up and rebuild all daily metrics data
-- First, clear existing data
DELETE FROM project_daily_metrics;

-- Create a new version of the aggregation function that handles all the work in one transaction
CREATE OR REPLACE FUNCTION public.rebuild_all_daily_metrics()
RETURNS TEXT
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  project_record RECORD;
  date_record DATE;
  result_text TEXT := '';
  record_count INT := 0;
BEGIN
  -- Clear all existing data first
  DELETE FROM project_daily_metrics;
  
  -- Get all projects
  FOR project_record IN SELECT id, name FROM projects LOOP
    result_text := result_text || 'Processing project: ' || project_record.name || E'\n';
    
    -- Aggregate for each of the past 7 days
    FOR date_record IN SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval)::date LOOP
      
      -- Direct insert with aggregation (bypassing the problematic function)
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
        date_record,
        COALESCE(te.event_name, 'Unknown Page') as landing_page_name,
        SPLIT_PART(te.page_url, '?', 1) as landing_page_url,
        COUNT(*) as total_page_views,
        COUNT(DISTINCT te.session_id) as unique_visitors
      FROM tracking_events te
      WHERE te.project_id = project_record.id
        AND DATE(te.created_at) = date_record
        AND te.event_type = 'page_view'
      GROUP BY 
        te.project_id, 
        COALESCE(te.event_name, 'Unknown Page'), 
        SPLIT_PART(te.page_url, '?', 1)
      HAVING COUNT(*) > 0; -- Only insert if there's actual data
      
      GET DIAGNOSTICS record_count = ROW_COUNT;
      IF record_count > 0 THEN
        result_text := result_text || '  - ' || date_record || ': ' || record_count || ' page records' || E'\n';
      END IF;
      
    END LOOP;
  END LOOP;
  
  RETURN result_text || 'Rebuild completed successfully!';
END;
$$;

-- Execute the rebuild
SELECT rebuild_all_daily_metrics();