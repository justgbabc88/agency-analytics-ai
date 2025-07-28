-- Fix security issues

-- 1. Fix function search path for setup_calendly_sync_cron
CREATE OR REPLACE FUNCTION setup_calendly_sync_cron()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Enable pg_cron extension if not already enabled
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  
  -- Remove existing cron job if it exists
  PERFORM cron.unschedule('calendly-daily-background-sync');
  
  -- Schedule daily background sync at 2 AM UTC
  PERFORM cron.schedule(
    'calendly-daily-background-sync',
    '0 2 * * *',
    $inner$
    SELECT net.http_post(
      url := 'https://iqxvtfupjjxjkbajgcve.supabase.co/functions/v1/calendly-background-sync',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeHZ0ZnVwamp4amtiYWpnY3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NzQ1NjAsImV4cCI6MjA2NDA1MDU2MH0.s6i26AHN5hRYrXegN8M3tBy4ypKj-MQaVt-ZBZtKDa0"}'::jsonb,
      body := '{"scheduled": true}'::jsonb
    );
    $inner$
  );
  
  RETURN 'Calendly daily background sync scheduled successfully at 2 AM UTC';
END;
$$;

-- Create function to log sync operations with proper security
CREATE OR REPLACE FUNCTION log_calendly_sync(
  p_project_id UUID,
  p_sync_type TEXT,
  p_sync_status TEXT,
  p_events_processed INTEGER DEFAULT 0,
  p_events_created INTEGER DEFAULT 0,
  p_events_updated INTEGER DEFAULT 0,
  p_sync_duration_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_sync_range_start TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_sync_range_end TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO calendly_sync_logs (
    project_id, sync_type, sync_status, events_processed, 
    events_created, events_updated, sync_duration_ms, error_message,
    sync_range_start, sync_range_end
  ) VALUES (
    p_project_id, p_sync_type, p_sync_status, p_events_processed,
    p_events_created, p_events_updated, p_sync_duration_ms, p_error_message,
    p_sync_range_start, p_sync_range_end
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Create view for sync health monitoring with proper security
CREATE OR REPLACE VIEW calendly_sync_health 
WITH (security_invoker = true) AS
SELECT 
  pi.project_id,
  p.name as project_name,
  pi.last_sync,
  pi.sync_health_score,
  pi.last_sync_duration_ms,
  pi.total_events_synced,
  pi.consecutive_sync_failures,
  CASE 
    WHEN pi.last_sync IS NULL THEN 'never_synced'
    WHEN pi.last_sync < now() - interval '24 hours' THEN 'stale'
    WHEN pi.consecutive_sync_failures > 2 THEN 'unhealthy'
    WHEN pi.sync_health_score < 80 THEN 'degraded'
    ELSE 'healthy'
  END as health_status,
  (
    SELECT COUNT(*) 
    FROM calendly_sync_logs csl 
    WHERE csl.project_id = pi.project_id 
    AND csl.created_at > now() - interval '7 days'
    AND csl.sync_status = 'failed'
  ) as recent_failures,
  (
    SELECT csl.created_at 
    FROM calendly_sync_logs csl 
    WHERE csl.project_id = pi.project_id 
    ORDER BY csl.created_at DESC 
    LIMIT 1
  ) as last_activity
FROM project_integrations pi
JOIN projects p ON pi.project_id = p.id
WHERE pi.platform = 'calendly' AND pi.is_connected = true;