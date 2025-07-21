-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule Facebook batch sync to run every hour
SELECT cron.schedule(
  'facebook-batch-sync',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url := 'https://iqxvtfupjjxjkbajgcve.supabase.co/functions/v1/facebook-batch-sync',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeHZ0ZnVwamp4amtiYWpnY3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NzQ1NjAsImV4cCI6MjA2NDA1MDU2MH0.s6i26AHN5hRYrXegN8M3tBy4ypKj-MQaVt-ZBZtKDa0"}'::jsonb,
        body := '{"source": "cron_job"}'::jsonb
    ) as request_id;
  $$
);