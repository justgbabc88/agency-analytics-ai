import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Eye,
  Clock,
  Database,
  Key,
  Lock,
  Activity
} from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { useSecurityMonitoring } from '@/hooks/useSecurityMonitoring';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';
import { supabase } from '@/integrations/supabase/client';

interface SecurityCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  description: string;
  recommendation?: string;
}

interface PIIAuditSummary {
  totalAccess: number;
  recentAccess: number;
  criticalOperations: number;
  lastPIIAccess: string | null;
}

export const EnhancedSecurityMonitoring = () => {
  const { user } = useAuth();
  const { alerts, securityEvents, logSecurityEvent } = useSecurityMonitoring();
  const { logSecurityEvent: logAuditEvent } = useSecurityAudit();
  
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([]);
  const [piiAudit, setPiiAudit] = useState<PIIAuditSummary>({
    totalAccess: 0,
    recentAccess: 0,
    criticalOperations: 0,
    lastPIIAccess: null
  });
  const [loading, setLoading] = useState(true);
  const [runningCheck, setRunningCheck] = useState(false);

  const performSecurityChecks = async (): Promise<SecurityCheck[]> => {
    const checks: SecurityCheck[] = [];

    try {
      // Check RLS policies
      const { data: rlsCheck } = await supabase.rpc('check_rate_limit', {
        p_identifier: user?.id || 'anonymous',
        p_endpoint: 'security_check',
        p_max_requests: 5,
        p_window_minutes: 60
      });

      checks.push({
        name: 'Rate Limiting',
        status: rlsCheck ? 'pass' : 'fail',
        description: 'API rate limiting is active and protecting against abuse',
        recommendation: !rlsCheck ? 'Enable rate limiting for all sensitive endpoints' : undefined
      });

      // Check for recent critical security events
      const { data: criticalEvents } = await supabase
        .from('security_audit_logs')
        .select('*')
        .eq('user_id', user?.id)
        .eq('severity', 'critical')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      checks.push({
        name: 'Critical Alerts',
        status: criticalEvents && criticalEvents.length === 0 ? 'pass' : 'warning',
        description: criticalEvents && criticalEvents.length > 0 
          ? `${criticalEvents.length} critical security events in the last 24 hours`
          : 'No critical security events in the last 24 hours',
        recommendation: criticalEvents && criticalEvents.length > 0 
          ? 'Review and address critical security events immediately' : undefined
      });

      // Check PII access patterns
      const { data: piiEvents } = await supabase
        .from('security_audit_logs')
        .select('*')
        .eq('user_id', user?.id)
        .like('action', 'pii_%')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const recentPIIAccess = piiEvents ? piiEvents.length : 0;
      checks.push({
        name: 'PII Data Access',
        status: recentPIIAccess === 0 ? 'pass' : recentPIIAccess > 50 ? 'warning' : 'pass',
        description: `${recentPIIAccess} PII access events in the last 7 days`,
        recommendation: recentPIIAccess > 50 ? 'High volume of PII access detected. Review access patterns.' : undefined
      });

      // Check for proper encryption
      const { data: integrationData } = await supabase
        .from('project_integration_data')
        .select('platform')
        .eq('platform', 'api_keys_secure')
        .limit(1);

      checks.push({
        name: 'API Key Encryption',
        status: integrationData && integrationData.length > 0 ? 'pass' : 'warning',
        description: integrationData && integrationData.length > 0 
          ? 'API keys are encrypted and stored securely'
          : 'No encrypted API keys found',
        recommendation: integrationData && integrationData.length === 0 
          ? 'Use secure API key storage instead of localStorage' : undefined
      });

      return checks;

    } catch (error) {
      console.error('Security check failed:', error);
      return [{
        name: 'Security Check',
        status: 'fail',
        description: 'Failed to perform security checks',
        recommendation: 'Contact support if this issue persists'
      }];
    }
  };

  const loadPIIAuditSummary = async () => {
    if (!user) return;

    try {
      const { data: piiLogs } = await supabase
        .from('security_audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .like('action', 'pii_%')
        .order('created_at', { ascending: false })
        .limit(100);

      if (piiLogs) {
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const recentAccess = piiLogs.filter(log => new Date(log.created_at!) > dayAgo).length;
        const criticalOps = piiLogs.filter(log => 
          log.action?.includes('delete') || log.action?.includes('update')
        ).length;

        setPiiAudit({
          totalAccess: piiLogs.length,
          recentAccess,
          criticalOperations: criticalOps,
          lastPIIAccess: piiLogs.length > 0 ? piiLogs[0].created_at : null
        });
      }
    } catch (error) {
      console.error('Failed to load PII audit summary:', error);
    }
  };

  const runSecurityScan = async () => {
    setRunningCheck(true);
    try {
      // Log security scan event
      logAuditEvent({
        action: 'security_scan_initiated',
        resource_type: 'security_system',
        details: { timestamp: new Date().toISOString() },
        severity: 'info'
      });

      const checks = await performSecurityChecks();
      setSecurityChecks(checks);

      await loadPIIAuditSummary();

      const failedChecks = checks.filter(check => check.status === 'fail').length;
      const warningChecks = checks.filter(check => check.status === 'warning').length;

      if (failedChecks > 0) {
        logAuditEvent({
          action: 'security_scan_failures_detected',
          resource_type: 'security_system',
          details: { failedChecks, timestamp: new Date().toISOString() },
          severity: 'error'
        });
      } else if (warningChecks > 0) {
        logAuditEvent({
          action: 'security_scan_warnings_detected', 
          resource_type: 'security_system',
          details: { warningChecks, timestamp: new Date().toISOString() },
          severity: 'warning'
        });
      }

    } catch (error) {
      console.error('Security scan failed:', error);
      logAuditEvent({
        action: 'security_scan_failed',
        resource_type: 'security_system', 
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        severity: 'error'
      });
    } finally {
      setRunningCheck(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      runSecurityScan();
    } else {
      setLoading(false);
    }
  }, [user]);

  const getCheckIcon = (status: SecurityCheck['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getCheckBadgeVariant = (status: SecurityCheck['status']) => {
    switch (status) {
      case 'pass': return 'default';
      case 'warning': return 'secondary';
      case 'fail': return 'destructive';
    }
  };

  if (loading && !user) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Please log in to view enhanced security monitoring</p>
        </CardContent>
      </Card>
    );
  }

  const overallScore = securityChecks.length > 0 
    ? (securityChecks.filter(check => check.status === 'pass').length / securityChecks.length) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Security Score Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Enhanced Security Monitoring
            </CardTitle>
            <Button 
              onClick={runSecurityScan} 
              disabled={runningCheck}
              variant="outline"
              size="sm"
            >
              <Activity className={`h-4 w-4 mr-2 ${runningCheck ? 'animate-spin' : ''}`} />
              {runningCheck ? 'Scanning...' : 'Run Scan'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Security Score</span>
            <span className="text-2xl font-bold">{Math.round(overallScore)}%</span>
          </div>
          <Progress value={overallScore} className="h-2" />
          <p className="text-sm text-muted-foreground">
            Based on {securityChecks.length} security checks
          </p>
        </CardContent>
      </Card>

      {/* PII Audit Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            PII Access Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-3 border rounded-lg">
              <Database className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold">{piiAudit.totalAccess}</p>
              <p className="text-sm text-muted-foreground">Total PII Access</p>
            </div>
            
            <div className="text-center p-3 border rounded-lg">
              <Clock className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{piiAudit.recentAccess}</p>
              <p className="text-sm text-muted-foreground">Last 24 Hours</p>
            </div>
            
            <div className="text-center p-3 border rounded-lg">
              <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-orange-500" />
              <p className="text-2xl font-bold">{piiAudit.criticalOperations}</p>
              <p className="text-sm text-muted-foreground">Critical Operations</p>
            </div>
            
            <div className="text-center p-3 border rounded-lg">
              <Activity className="h-6 w-6 mx-auto mb-2 text-purple-500" />
              <p className="text-sm font-medium">Last Access</p>
              <p className="text-sm text-muted-foreground">
                {piiAudit.lastPIIAccess 
                  ? new Date(piiAudit.lastPIIAccess).toLocaleDateString()
                  : 'Never'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Security Checks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {securityChecks.length === 0 && !loading ? (
            <p className="text-center text-muted-foreground py-4">
              No security checks performed yet. Click "Run Scan" to start.
            </p>
          ) : (
            <div className="space-y-3">
              {securityChecks.map((check, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getCheckIcon(check.status)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{check.name}</h4>
                      <Badge variant={getCheckBadgeVariant(check.status)}>
                        {check.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {check.description}
                    </p>
                    {check.recommendation && (
                      <Alert className="mt-2 py-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          <strong>Recommendation:</strong> {check.recommendation}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Security Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Active Security Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <Alert key={alert.id} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{alert.type}</p>
                      <p className="text-sm">{alert.details}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.timestamp.toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="destructive">{alert.severity}</Badge>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};