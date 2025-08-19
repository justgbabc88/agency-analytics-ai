import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, Eye, Users, Clock, AlertCircle } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SecurityMetrics {
  total_pii_records: number;
  recent_pii_access: number;
  critical_events: number;
  failed_login_attempts: number;
  suspicious_activity: number;
  last_security_scan: string;
}

export const SecurityMetricsDashboard = () => {
  const { user } = useAuth();

  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['security-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_security_metrics');
      
      if (error) {
        console.error('Error fetching security metrics:', error);
        throw error;
      }
      
      return data?.[0] as SecurityMetrics;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getRiskLevel = (criticalEvents: number, suspiciousActivity: number) => {
    const totalRiskEvents = criticalEvents + suspiciousActivity;
    if (totalRiskEvents > 10) return { level: 'High', color: 'destructive' as const };
    if (totalRiskEvents > 5) return { level: 'Medium', color: 'destructive' as const };
    return { level: 'Low', color: 'secondary' as const };
  };

  const getDataProtectionScore = (piiRecords: number, recentAccess: number) => {
    // Calculate a simple protection score based on PII records vs access frequency
    if (piiRecords === 0) return { score: 100, status: 'Excellent' };
    
    const accessRatio = recentAccess / piiRecords;
    if (accessRatio > 0.1) return { score: 60, status: 'Needs Attention' };
    if (accessRatio > 0.05) return { score: 80, status: 'Good' };
    return { score: 95, status: 'Excellent' };
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Please log in to view security metrics.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading security metrics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-4 h-4" />
            <span>Failed to load security metrics</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const riskLevel = getRiskLevel(metrics.critical_events, metrics.suspicious_activity);
  const dataProtection = getDataProtectionScore(metrics.total_pii_records, metrics.recent_pii_access);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Overall Risk Level */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security Risk Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant={riskLevel.color} className="text-sm">
              {riskLevel.level}
            </Badge>
            <span className="text-2xl font-bold">
              {metrics.critical_events + metrics.suspicious_activity}
            </span>
            <span className="text-sm text-muted-foreground">events</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Critical + suspicious events (7 days)
          </p>
        </CardContent>
      </Card>

      {/* PII Data Protection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4" />
            Data Protection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{dataProtection.score}%</span>
            <Badge 
              variant={dataProtection.score > 90 ? 'secondary' : dataProtection.score > 70 ? 'destructive' : 'destructive'}
              className="text-xs"
            >
              {dataProtection.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {metrics.total_pii_records.toLocaleString()} PII records protected
          </p>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Recent PII Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{metrics.recent_pii_access}</span>
            <Badge variant={metrics.recent_pii_access > 100 ? 'destructive' : 'secondary'} className="text-xs">
              24h
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Access attempts in last 24 hours
          </p>
        </CardContent>
      </Card>

      {/* Failed Login Attempts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Failed Logins
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{metrics.failed_login_attempts}</span>
            <Badge variant={metrics.failed_login_attempts > 10 ? 'destructive' : 'secondary'} className="text-xs">
              24h
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Failed authentication attempts
          </p>
        </CardContent>
      </Card>

      {/* Suspicious Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Suspicious Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{metrics.suspicious_activity}</span>
            <Badge variant={metrics.suspicious_activity > 5 ? 'destructive' : 'secondary'} className="text-xs">
              24h
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Anomalous patterns detected
          </p>
        </CardContent>
      </Card>

      {/* Last Security Scan */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Last Security Scan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {new Date(metrics.last_security_scan).toLocaleTimeString()}
            </span>
            <Badge variant="secondary" className="text-xs">
              Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Continuous monitoring enabled
          </p>
        </CardContent>
      </Card>
    </div>
  );
};