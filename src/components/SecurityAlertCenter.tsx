import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, X, CheckCircle, Info, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SecurityAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  action: string;
  resource_type: string;
  details: any;
  created_at: string;
}

export const SecurityAlertCenter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['security-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_audit_logs')
        .select('*')
        .in('severity', ['warning', 'critical'])
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching security alerts:', error);
        throw error;
      }

      return (data || []) as SecurityAlert[];
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
    toast({
      title: "Alert Dismissed",
      description: "Security alert has been acknowledged",
    });
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getAlertBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive' as const;
      case 'warning':
        return 'destructive' as const;
      default:
        return 'secondary' as const;
    }
  };

  const formatAlertMessage = (alert: SecurityAlert) => {
    const { action, details } = alert;
    
    switch (action) {
      case 'pii_create_tracking_events':
        return `PII data stored in tracking event (${details?.risk_level || 'unknown'} risk)`;
      case 'pii_create_calendly_events':
        return `Calendar booking with contact information recorded`;
      case 'pii_create_ghl_form_submissions':
        return `Form submission with contact details captured`;
      case 'suspicious_tracking_activity':
        return `Suspicious tracking patterns detected (${details?.suspicious_patterns || 0} patterns)`;
      case 'rate_limit_exceeded':
        return `Rate limit exceeded for endpoint: ${details?.endpoint || 'unknown'}`;
      case 'contact_data_tracked':
        return `Contact information tracked from ${details?.page_url || 'unknown page'}`;
      default:
        return `Security event: ${action.replace(/_/g, ' ')}`;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - alertTime.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Please log in to view security alerts.</p>
        </CardContent>
      </Card>
    );
  }

  const activeAlerts = alerts?.filter(alert => !dismissedAlerts.has(alert.id)) || [];
  const criticalCount = activeAlerts.filter(alert => alert.severity === 'critical').length;
  const warningCount = activeAlerts.filter(alert => alert.severity === 'warning').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Security Alert Center
          {activeAlerts.length > 0 && (
            <div className="flex gap-2 ml-auto">
              {criticalCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {criticalCount} Critical
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {warningCount} Warnings
                </Badge>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading security alerts...</span>
          </div>
        ) : activeAlerts.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span>No active security alerts</span>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getAlertIcon(alert.severity)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getAlertBadgeVariant(alert.severity)} className="text-xs">
                      {alert.severity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {getTimeAgo(alert.created_at)}
                    </span>
                  </div>
                  
                  <p className="text-sm font-medium mb-1">
                    {formatAlertMessage(alert)}
                  </p>
                  
                  <p className="text-xs text-muted-foreground">
                    Resource: {alert.resource_type}
                  </p>
                  
                  {alert.details && alert.details.client_ip && (
                    <p className="text-xs text-muted-foreground">
                      IP: {alert.details.client_ip}
                    </p>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dismissAlert(alert.id)}
                  className="flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};