-- Run aggregation for the past 7 days for all projects
DO $$
DECLARE
  project_record RECORD;
  date_record DATE;
BEGIN
  -- Get all projects
  FOR project_record IN SELECT id FROM projects LOOP
    -- Aggregate for each of the past 7 days
    FOR date_record IN SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval)::date LOOP
      PERFORM aggregate_project_daily_metrics(project_record.id, date_record);
    END LOOP;
  END LOOP;
END $$;

-- Create a function to automatically run daily aggregation for all projects
CREATE OR REPLACE FUNCTION public.run_daily_aggregation_for_all_projects(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  project_record RECORD;
BEGIN
  -- Loop through all projects and run aggregation
  FOR project_record IN SELECT id FROM projects LOOP
    PERFORM aggregate_project_daily_metrics(project_record.id, target_date);
  END LOOP;
END;
$$;