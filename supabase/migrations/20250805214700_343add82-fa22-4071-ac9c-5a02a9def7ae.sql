CREATE OR REPLACE FUNCTION public.setup_ghl_sync_cron()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Enable pg_cron extension if not already enabled
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  
  -- Remove existing cron job if it exists
  PERFORM cron.unschedule('ghl-hourly-sync');
  
  -- Schedule hourly GHL sync at minute 0 of every hour
  PERFORM cron.schedule(
    'ghl-hourly-sync',
    '0 * * * *',
    $inner$
    SELECT net.http_post(
      url := 'https://iqxvtfupjjxjkbajgcve.supabase.co/functions/v1/ghl-sync-scheduler',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeHZ0ZnVwamp4amtiYWpnY3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NzQ1NjAsImV4cCI6MjA2NDA1MDU2MH0.s6i26AHN5hRYrXegN8M3tBy4ypKj-MQaVt-ZBZtKDa0"}'::jsonb,
      body := '{"scheduled": true}'::jsonb
    );
    $inner$
  );
  
  RETURN 'GHL hourly sync scheduled successfully at minute 0 of every hour';
END;
$function$