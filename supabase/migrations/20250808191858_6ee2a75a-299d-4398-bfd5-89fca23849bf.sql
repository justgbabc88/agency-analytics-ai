-- Enable required extensions for cron scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to setup unified integration sync cron job
CREATE OR REPLACE FUNCTION setup_unified_integration_sync_cron()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_name text := 'unified-integration-sync-hourly';
  cron_schedule text := '0 * * * *'; -- Every hour at minute 0
  function_url text;
  result text;
BEGIN
  -- Get the function URL
  function_url := 'https://iqxvtfupjjxjkbajgcve.supabase.co/functions/v1/unified-integration-scheduler';
  
  -- Unschedule existing job if it exists
  PERFORM cron.unschedule(job_name);
  
  -- Schedule the new job
  PERFORM cron.schedule(
    job_name,
    cron_schedule,
    format(
      'SELECT net.http_post(url:=%L, headers:=%L::jsonb, body:=%L::jsonb) as request_id;',
      function_url,
      '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeHZ0ZnVwamp4amtiYWpnY3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NzQ1NjAsImV4cCI6MjA2NDA1MDU2MH0.s6i26AHN5hRYrXegN8M3tBy4ypKj-MQaVt-ZBZtKDa0"}',
      '{"scheduled": true}'
    )
  );
  
  result := format('Unified integration sync cron job scheduled: %s with schedule %s', job_name, cron_schedule);
  
  RETURN result;
END;
$$;