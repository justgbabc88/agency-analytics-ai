import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Eye, 
  Lock, 
  Database,
  Activity,
  Users,
  Clock,
  FileText
} from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { useSecureApiKeys } from '@/hooks/useSecureApiKeys';
import { SecurityMetricsDashboard } from './SecurityMetricsDashboard';
import { SecurityAlertCenter } from './SecurityAlertCenter';
import { SecurityWarningBanner } from './SecurityWarningBanner';
import { supabase } from '@/integrations/supabase/client';

interface SecurityMetrics {
  totalEvents: number;
  criticalAlerts: number;
  riskScore: number;
  lastAudit: string;
  encryptedKeys: number;
  activeMonitoring: boolean;
}

interface RecentSecurityEvent {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export const SecurityDashboard = () => {
  const { user } = useAuth();
  const { alerts, securityEvents, clearAlert } = useSecurityMonitoring();
  const { apiKeys, loading: keysLoading } = useSecureApiKeys();
  
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalEvents: 0,
    criticalAlerts: 0,
    riskScore: 0,
    lastAudit: 'Never',
    encryptedKeys: 0,
    activeMonitoring: true
  });
  const [recentEvents, setRecentEvents] = useState<RecentSecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSecurityMetrics = async () => {
    if (!user) return;

    try {
      // Load security audit logs
      const { data: auditLogs } = await supabase
        .from('security_audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (auditLogs) {
        const criticalEvents = auditLogs.filter(log => log.severity === 'critical');
        const lastAuditTime = auditLogs.length > 0 ? new Date(auditLogs[0].created_at!) : null;
        
        // Calculate risk score based on recent critical events
        const recentCritical = criticalEvents.filter(event => {
          const eventTime = new Date(event.created_at!);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return eventTime > dayAgo;
        });

        const riskScore = Math.min(100, recentCritical.length * 20);

        setMetrics({
          totalEvents: auditLogs.length,
          criticalAlerts: criticalEvents.length,
          riskScore,
          lastAudit: lastAuditTime ? lastAuditTime.toLocaleDateString() : 'Never',
          encryptedKeys: Object.keys(apiKeys).length,
          activeMonitoring: true
        });

        // Convert to recent events format
        const events: RecentSecurityEvent[] = auditLogs.slice(0, 10).map(log => ({
          id: log.id,
          type: log.action,
          severity: log.severity as 'low' | 'medium' | 'high' | 'critical',
          message: `${log.resource_type}: ${log.action}`,
          timestamp: new Date(log.created_at!),
          resolved: false
        }));

        setRecentEvents(events);
      }
    } catch (error) {
      console.error('Failed to load security metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSecurityMetrics();
    setRefreshing(false);
  };

  useEffect(() => {
    loadSecurityMetrics();
  }, [user, apiKeys]);

  const getRiskLevel = (score: number): { level: string; color: string; icon: React.ReactNode } => {
    if (score >= 80) return { 
      level: 'Critical', 
      color: 'bg-red-500', 
      icon: <AlertTriangle className="h-4 w-4" />
    };
    if (score >= 60) return { 
      level: 'High', 
      color: 'bg-orange-500', 
      icon: <AlertTriangle className="h-4 w-4" />
    };
    if (score >= 30) return { 
      level: 'Medium', 
      color: 'bg-yellow-500', 
      icon: <Eye className="h-4 w-4" />
    };
    return { 
      level: 'Low', 
      color: 'bg-green-500', 
      icon: <Shield className="h-4 w-4" />
    };
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  if (loading && !user) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Please log in to view security dashboard</p>
        </CardContent>
      </Card>
    );
  }

  const risk = getRiskLevel(metrics.riskScore);

  return (
    <div className="space-y-6">
      {/* Security Warning Banner */}
      <SecurityWarningBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
          <p className="text-muted-foreground">Monitor and manage your security posture</p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Security Metrics Dashboard */}
      <div className="mb-6">
        <SecurityMetricsDashboard />
      </div>

      {/* Security Alert Center */}
      <div className="mb-6">
        <SecurityAlertCenter />
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Active Security Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <Alert key={alert.id} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{alert.details}</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => clearAlert(alert.id)}
                  >
                    Dismiss
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Detailed Tabs */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Recent Events</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              {recentEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No recent security events
                </p>
              ) : (
                <div className="space-y-3">
                  {recentEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getSeverityColor(event.severity)}`} />
                        <div>
                          <p className="font-medium">{event.message}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.timestamp.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={event.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {event.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityEvents.slice(0, 20).map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium">{event.details}</p>
                      <p className="text-sm text-muted-foreground">
                        {event.timestamp.toLocaleString()} • {event.type}
                      </p>
                    </div>
                    <Badge variant={event.severity === 'high' ? 'destructive' : 'secondary'}>
                      {event.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Security Recommendations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Shield className="h-4 w-4 mt-1 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700">API Keys Encrypted</p>
                    <p className="text-sm text-muted-foreground">
                      Your API keys are properly encrypted and stored securely.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Lock className="h-4 w-4 mt-1 text-green-500" />
                  <div>
                    <p className="font-medium text-green-700">RLS Policies Active</p>
                    <p className="text-sm text-muted-foreground">
                      Row-level security policies are protecting your data.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Activity className="h-4 w-4 mt-1 text-blue-500" />
                  <div>
                    <p className="font-medium text-blue-700">Regular Key Rotation</p>
                    <p className="text-sm text-muted-foreground">
                      Consider rotating API keys every 90 days for enhanced security.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Security Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <span className="text-sm">Database security enabled</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <span className="text-sm">API key encryption active</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <span className="text-sm">Audit logging enabled</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-yellow-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <span className="text-sm">Enable leaked password protection</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};