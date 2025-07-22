-- Drop and recreate the view without SECURITY DEFINER
DROP VIEW IF EXISTS public.project_daily_metrics;

-- Recreate the view with proper security (SECURITY INVOKER is the default and recommended)
CREATE VIEW public.project_daily_metrics AS
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

-- Enable RLS on the view (inherits from tracking_events RLS policies)
ALTER VIEW public.project_daily_metrics SET (security_invoker = on);