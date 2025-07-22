-- First, let's see the current view definition
SELECT pg_get_viewdef('public.project_daily_metrics'::regclass) as view_definition;