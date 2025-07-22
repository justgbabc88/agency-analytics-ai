-- Fix function search path security warnings
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
  -- Insert or update daily metrics
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
    te.event_name as landing_page_name,
    -- Extract clean URL without query params for grouping
    SPLIT_PART(te.page_url, '?', 1) as landing_page_url,
    COUNT(*) as total_page_views,
    COUNT(DISTINCT te.session_id) as unique_visitors
  FROM public.tracking_events te
  WHERE te.project_id = p_project_id
    AND DATE(te.created_at) = target_date
    AND te.event_type = 'page_view'
  GROUP BY te.project_id, te.event_name, SPLIT_PART(te.page_url, '?', 1)
  ON CONFLICT (project_id, date, landing_page_name) 
  DO UPDATE SET
    total_page_views = EXCLUDED.total_page_views,
    unique_visitors = EXCLUDED.unique_visitors,
    updated_at = now();
END;
$$;

-- Fix the second function as well
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
    dm.total_page_views,
    dm.unique_visitors
  FROM public.project_daily_metrics dm
  WHERE dm.project_id = p_project_id
    AND dm.date >= p_start_date
    AND dm.date <= p_end_date
  ORDER BY dm.date DESC, dm.total_page_views DESC;
END;
$$;