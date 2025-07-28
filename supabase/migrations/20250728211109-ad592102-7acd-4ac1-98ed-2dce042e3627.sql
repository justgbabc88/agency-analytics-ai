-- Create sync monitoring and alerting tables

-- Sync health metrics table
CREATE TABLE public.sync_health_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  platform TEXT NOT NULL,
  metric_type TEXT NOT NULL, -- 'sync_duration', 'error_rate', 'data_quality', 'api_latency'
  metric_value NUMERIC NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Alert configurations table
CREATE TABLE public.alert_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  platform TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- 'sync_failure', 'data_quality', 'performance', 'connectivity'
  threshold_value NUMERIC NOT NULL,
  threshold_operator TEXT NOT NULL DEFAULT 'greater_than', -- 'greater_than', 'less_than', 'equals'
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_channels JSONB DEFAULT '[]', -- ['email', 'webhook', 'dashboard']
  cooldown_minutes INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Alert incidents table
CREATE TABLE public.alert_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_config_id UUID NOT NULL,
  project_id UUID NOT NULL,
  platform TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'resolved', 'suppressed'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enhanced project integrations table for timezone handling
ALTER TABLE public.project_integrations 
ADD COLUMN IF NOT EXISTS user_timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS sync_preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS data_quality_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS last_health_check TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX idx_sync_health_metrics_project_platform ON public.sync_health_metrics(project_id, platform);
CREATE INDEX idx_sync_health_metrics_timestamp ON public.sync_health_metrics(timestamp);
CREATE INDEX idx_alert_configurations_project ON public.alert_configurations(project_id);
CREATE INDEX idx_alert_incidents_status ON public.alert_incidents(status);
CREATE INDEX idx_alert_incidents_project_platform ON public.alert_incidents(project_id, platform);

-- Enable RLS
ALTER TABLE public.sync_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sync_health_metrics
CREATE POLICY "Users can view metrics for their projects" 
ON public.sync_health_metrics 
FOR SELECT 
USING (project_id IN (
  SELECT p.id FROM projects p 
  JOIN agencies a ON p.agency_id = a.id 
  WHERE a.user_id = auth.uid()
));

CREATE POLICY "System can insert metrics" 
ON public.sync_health_metrics 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for alert_configurations
CREATE POLICY "Users can manage alerts for their projects" 
ON public.alert_configurations 
FOR ALL 
USING (project_id IN (
  SELECT p.id FROM projects p 
  JOIN agencies a ON p.agency_id = a.id 
  WHERE a.user_id = auth.uid()
));

-- RLS Policies for alert_incidents
CREATE POLICY "Users can view incidents for their projects" 
ON public.alert_incidents 
FOR SELECT 
USING (project_id IN (
  SELECT p.id FROM projects p 
  JOIN agencies a ON p.agency_id = a.id 
  WHERE a.user_id = auth.uid()
));

CREATE POLICY "System can manage incidents" 
ON public.alert_incidents 
FOR ALL 
WITH CHECK (true);

-- Database functions for monitoring
CREATE OR REPLACE FUNCTION public.record_sync_metric(
  p_project_id UUID,
  p_platform TEXT,
  p_metric_type TEXT,
  p_metric_value NUMERIC,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  metric_id UUID;
BEGIN
  INSERT INTO sync_health_metrics (
    project_id, platform, metric_type, metric_value, metadata
  ) VALUES (
    p_project_id, p_platform, p_metric_type, p_metric_value, p_metadata
  ) RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_alert_thresholds(
  p_project_id UUID,
  p_platform TEXT,
  p_metric_type TEXT,
  p_metric_value NUMERIC
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  alert_config RECORD;
  should_trigger BOOLEAN;
BEGIN
  -- Check all relevant alert configurations
  FOR alert_config IN 
    SELECT * FROM alert_configurations 
    WHERE project_id = p_project_id 
    AND platform = p_platform 
    AND is_enabled = true
  LOOP
    should_trigger := false;
    
    -- Check threshold conditions
    CASE alert_config.threshold_operator
      WHEN 'greater_than' THEN
        should_trigger := p_metric_value > alert_config.threshold_value;
      WHEN 'less_than' THEN
        should_trigger := p_metric_value < alert_config.threshold_value;
      WHEN 'equals' THEN
        should_trigger := p_metric_value = alert_config.threshold_value;
    END CASE;
    
    -- Trigger alert if threshold met and no recent incident
    IF should_trigger THEN
      INSERT INTO alert_incidents (
        alert_config_id, project_id, platform, incident_type, 
        title, description, severity, metadata
      ) VALUES (
        alert_config.id, p_project_id, p_platform, alert_config.alert_type,
        format('%s Alert: %s', initcap(p_platform), alert_config.alert_type),
        format('Metric %s value %s triggered threshold %s %s', 
               p_metric_type, p_metric_value, alert_config.threshold_operator, alert_config.threshold_value),
        'medium',
        jsonb_build_object('metric_type', p_metric_type, 'metric_value', p_metric_value)
      );
    END IF;
  END LOOP;
END;
$$;