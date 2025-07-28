-- Create function to setup Calendly sync cron job
CREATE OR REPLACE FUNCTION setup_calendly_sync_cron()
RETURNS TEXT AS $$
BEGIN
  -- Enable pg_cron extension if not already enabled
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  
  -- Remove existing cron job if it exists
  PERFORM cron.unschedule('calendly-daily-background-sync');
  
  -- Schedule daily background sync at 2 AM UTC
  PERFORM cron.schedule(
    'calendly-daily-background-sync',
    '0 2 * * *', -- Every day at 2:00 AM UTC
    $$
    SELECT net.http_post(
      url := 'https://iqxvtfupjjxjkbajgcve.supabase.co/functions/v1/calendly-background-sync',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxeHZ0ZnVwamp4amtiYWpnY3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NzQ1NjAsImV4cCI6MjA2NDA1MDU2MH0.s6i26AHN5hRYrXegN8M3tBy4ypKj-MQaVt-ZBZtKDa0"}'::jsonb,
      body := '{"scheduled": true}'::jsonb
    );
    $$
  );
  
  RETURN 'Calendly daily background sync scheduled successfully at 2 AM UTC';
END;
$$ LANGUAGE plpgsql;

-- Create table to track sync performance and gaps
CREATE TABLE IF NOT EXISTS calendly_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  sync_type TEXT NOT NULL, -- 'manual', 'incremental', 'background', 'webhook'
  sync_status TEXT NOT NULL, -- 'started', 'completed', 'failed'
  events_processed INTEGER DEFAULT 0,
  events_created INTEGER DEFAULT 0,
  events_updated INTEGER DEFAULT 0,
  sync_duration_ms INTEGER,
  error_message TEXT,
  sync_range_start TIMESTAMP WITH TIME ZONE,
  sync_range_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on sync logs
ALTER TABLE calendly_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for sync logs
CREATE POLICY "Users can view sync logs for their projects" ON calendly_sync_logs
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN agencies a ON p.agency_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendly_sync_logs_project_created 
  ON calendly_sync_logs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendly_sync_logs_sync_type 
  ON calendly_sync_logs(sync_type, created_at DESC);

-- Create function to log sync operations
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
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql;

-- Add sync metadata columns to project_integrations
ALTER TABLE project_integrations 
ADD COLUMN IF NOT EXISTS sync_health_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS last_sync_duration_ms INTEGER,
ADD COLUMN IF NOT EXISTS total_events_synced INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS consecutive_sync_failures INTEGER DEFAULT 0;

-- Create view for sync health monitoring
CREATE OR REPLACE VIEW calendly_sync_health AS
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