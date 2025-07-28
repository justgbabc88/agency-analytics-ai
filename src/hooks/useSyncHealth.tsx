import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjects } from './useProjects';
import { useUserProfile } from './useUserProfile';

interface SyncHealthMetric {
  id: string;
  project_id: string;
  platform: string;
  metric_type: string;
  metric_value: number;
  timestamp: string;
  metadata: any;
}

interface AlertConfiguration {
  id: string;
  project_id: string;
  platform: string;
  alert_type: string;
  threshold_value: number;
  threshold_operator: string;
  is_enabled: boolean;
  notification_channels: string[];
  cooldown_minutes: number;
}

interface AlertIncident {
  id: string;
  alert_config_id: string;
  project_id: string;
  platform: string;
  incident_type: string;
  severity: string;
  title: string;
  description: string;
  triggered_at: string;
  resolved_at?: string;
  status: string;
  metadata: any;
}

export const useSyncHealth = (projectId?: string) => {
  const { projects, selectedProjectId } = useProjects();
  const { getUserTimezone } = useUserProfile();
  const queryClient = useQueryClient();
  
  const currentProject = projects.find(p => p.id === selectedProjectId);
  const currentProjectId = projectId || selectedProjectId;

  // Fetch health metrics
  const { 
    data: healthMetrics, 
    isLoading: metricsLoading,
    refetch: refetchMetrics 
  } = useQuery({
    queryKey: ['syncHealthMetrics', currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) return [];
      
      const { data, error } = await supabase
        .from('sync_health_metrics')
        .select('*')
        .eq('project_id', currentProjectId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as SyncHealthMetric[];
    },
    enabled: !!currentProjectId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch alert configurations
  const { 
    data: alertConfigs, 
    isLoading: configsLoading,
    refetch: refetchConfigs
  } = useQuery({
    queryKey: ['alertConfigurations', currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) return [];
      
      const { data, error } = await supabase
        .from('alert_configurations')
        .select('*')
        .eq('project_id', currentProjectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AlertConfiguration[];
    },
    enabled: !!currentProjectId,
  });

  // Fetch active incidents
  const { 
    data: activeIncidents, 
    isLoading: incidentsLoading,
    refetch: refetchIncidents 
  } = useQuery({
    queryKey: ['alertIncidents', currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) return [];
      
      const { data, error } = await supabase
        .from('alert_incidents')
        .select('*')
        .eq('project_id', currentProjectId)
        .eq('status', 'active')
        .order('triggered_at', { ascending: false });

      if (error) throw error;
      return data as AlertIncident[];
    },
    enabled: !!currentProjectId,
    refetchInterval: 15000, // Refetch every 15 seconds for incidents
  });

  // Trigger health check
  const { mutate: triggerHealthCheck, isPending: isCheckingHealth } = useMutation({
    mutationFn: async ({ 
      project_id, 
      platform 
    }: { 
      project_id?: string; 
      platform?: string; 
    }) => {
      const { data, error } = await supabase.functions.invoke('sync-health-monitor', {
        body: {
          project_id: project_id || currentProjectId,
          platform,
          user_timezone: getUserTimezone()
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Refetch all related data
      refetchMetrics();
      refetchIncidents();
      queryClient.invalidateQueries({ queryKey: ['projectIntegrations'] });
    },
  });

  // Create/update alert configuration
  const { mutate: saveAlertConfig, isPending: isSavingAlert } = useMutation({
    mutationFn: async (config: Partial<AlertConfiguration>) => {
      if (config.id) {
        // Update existing
        const { data, error } = await supabase
          .from('alert_configurations')
          .update(config)
          .eq('id', config.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('alert_configurations')
          .insert({
            ...config,
            project_id: currentProjectId,
            alert_type: config.alert_type || 'sync_failure',
            platform: config.platform || 'calendly',
            threshold_value: config.threshold_value || 80
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      refetchConfigs();
    },
  });

  // Resolve incident
  const { mutate: resolveIncident, isPending: isResolvingIncident } = useMutation({
    mutationFn: async (incidentId: string) => {
      const { data, error } = await supabase
        .from('alert_incidents')
        .update({ 
          status: 'resolved', 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', incidentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchIncidents();
    },
  });

  // Calculate health summary
  const healthSummary = healthMetrics?.reduce((acc, metric) => {
    if (!acc[metric.platform]) {
      acc[metric.platform] = {
        platform: metric.platform,
        latest_health_score: 0,
        latest_data_quality: 0,
        avg_sync_duration: 0,
        last_check: metric.timestamp,
        status: 'unknown'
      };
    }

    const platformData = acc[metric.platform];
    
    // Update with latest values
    if (new Date(metric.timestamp) > new Date(platformData.last_check)) {
      platformData.last_check = metric.timestamp;
      
      if (metric.metric_type === 'health_score') {
        platformData.latest_health_score = metric.metric_value;
      } else if (metric.metric_type === 'data_quality') {
        platformData.latest_data_quality = metric.metric_value;
      }
    }

    // Calculate status
    if (platformData.latest_health_score > 80) {
      platformData.status = 'healthy';
    } else if (platformData.latest_health_score > 50) {
      platformData.status = 'warning';
    } else {
      platformData.status = 'critical';
    }

    return acc;
  }, {} as Record<string, any>) || {};

  return {
    // Data
    healthMetrics,
    alertConfigs,
    activeIncidents,
    healthSummary: Object.values(healthSummary),
    
    // Loading states
    isLoading: metricsLoading || configsLoading || incidentsLoading,
    isCheckingHealth,
    isSavingAlert,
    isResolvingIncident,
    
    // Actions
    triggerHealthCheck,
    saveAlertConfig,
    resolveIncident,
    refetchAll: () => {
      refetchMetrics();
      refetchConfigs();
      refetchIncidents();
    }
  };
};