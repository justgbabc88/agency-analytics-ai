-- Fix the aggregation function to handle duplicate landing page names properly
CREATE OR REPLACE FUNCTION public.aggregate_project_daily_metrics(
  p_project_id UUID,
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete existing records for this date/project first to avoid conflicts
  DELETE FROM public.project_daily_metrics 
  WHERE project_id = p_project_id AND date = target_date;
  
  -- Insert fresh aggregated data
  INSERT INTO public.project_daily_metrics (
    project_id, 
    date, 
    landing_page_name, 
    landing_page_url,
    total_page_views, 
    unique_visitors
  )
  SELECT 
    te.project_id,
    target_date,
    COALESCE(te.event_name, 'Unknown Page') as landing_page_name,
    -- Extract clean URL without query params for grouping
    SPLIT_PART(te.page_url, '?', 1) as landing_page_url,
    COUNT(*) as total_page_views,
    COUNT(DISTINCT te.session_id) as unique_visitors
  FROM public.tracking_events te
  WHERE te.project_id = p_project_id
    AND DATE(te.created_at) = target_date
    AND te.event_type = 'page_view'
  GROUP BY 
    te.project_id, 
    COALESCE(te.event_name, 'Unknown Page'), 
    SPLIT_PART(te.page_url, '?', 1);
END;
$$;