import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RateLimitStatus {
  isRateLimited: boolean;
  usagePercentage: number;
  nextResetTime: Date | null;
  lastSyncTime: Date | null;
  recommendedWaitTime: number;
}

interface FacebookRateLimitMonitorProps {
  projectId: string;
}

export const FacebookRateLimitMonitor = ({ projectId }: FacebookRateLimitMonitorProps) => {
  const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus>({
    isRateLimited: false,
    usagePercentage: 0,
    nextResetTime: null,
    lastSyncTime: null,
    recommendedWaitTime: 0
  });

  useEffect(() => {
    checkRateLimitStatus();
    
    // Check status every 5 minutes
    const interval = setInterval(checkRateLimitStatus, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [projectId]);

  const checkRateLimitStatus = async () => {
    try {
      // Check recent sync health metrics for rate limit events
      const { data: recentMetrics } = await supabase
        .from('sync_health_metrics')
        .select('*')
        .eq('project_id', projectId)
        .eq('platform', 'facebook')
        .eq('metric_type', 'rate_limit_hit')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      // Check last successful sync
      const { data: lastSync } = await supabase
        .from('project_integrations')
        .select('last_sync')
        .eq('project_id', projectId)
        .eq('platform', 'facebook')
        .maybeSingle();

      const recentRateLimit = recentMetrics && recentMetrics.length > 0;
      const lastSyncTime = lastSync?.last_sync ? new Date(lastSync.last_sync) : null;
      const timeSinceLastRateLimit = recentRateLimit 
        ? Date.now() - new Date(recentMetrics[0].created_at).getTime()
        : Infinity;

      // Rate limits typically reset after 1 hour
      const isCurrentlyRateLimited = timeSinceLastRateLimit < 60 * 60 * 1000;
      const nextResetTime = recentRateLimit 
        ? new Date(new Date(recentMetrics[0].created_at).getTime() + 60 * 60 * 1000)
        : null;

      // Estimate usage based on sync frequency
      const timeSinceLastSync = lastSyncTime ? Date.now() - lastSyncTime.getTime() : Infinity;
      const estimatedUsage = isCurrentlyRateLimited ? 95 : Math.max(0, 80 - (timeSinceLastSync / (60 * 60 * 1000)) * 20);

      setRateLimitStatus({
        isRateLimited: isCurrentlyRateLimited,
        usagePercentage: estimatedUsage,
        nextResetTime,
        lastSyncTime,
        recommendedWaitTime: isCurrentlyRateLimited ? Math.max(0, 60 - (timeSinceLastRateLimit / (60 * 1000))) : 0
      });

    } catch (error) {
      console.error('Error checking rate limit status:', error);
    }
  };

  const getStatusColor = () => {
    if (rateLimitStatus.isRateLimited) return "destructive";
    if (rateLimitStatus.usagePercentage > 80) return "secondary";
    return "default";
  };

  const getStatusIcon = () => {
    if (rateLimitStatus.isRateLimited) return <AlertTriangle className="h-4 w-4" />;
    if (rateLimitStatus.usagePercentage > 80) return <Clock className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusMessage = () => {
    if (rateLimitStatus.isRateLimited) {
      return `Rate limited - wait ${Math.ceil(rateLimitStatus.recommendedWaitTime)} minutes`;
    }
    if (rateLimitStatus.usagePercentage > 80) {
      return "Approaching rate limit - sync cautiously";
    }
    return "Ready for sync";
  };

  const formatTimeAgo = (date: Date | null) => {
    if (!date) return "Never";
    const minutes = Math.floor((Date.now() - date.getTime()) / (60 * 1000));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {getStatusIcon()}
          Facebook API Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge variant={getStatusColor()}>
            {getStatusMessage()}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">API Usage</span>
            <span>{Math.round(rateLimitStatus.usagePercentage)}%</span>
          </div>
          <Progress value={rateLimitStatus.usagePercentage} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground block">Last Sync</span>
            <span className="font-medium">{formatTimeAgo(rateLimitStatus.lastSyncTime)}</span>
          </div>
          
          {rateLimitStatus.nextResetTime && (
            <div>
              <span className="text-muted-foreground block">Reset Time</span>
              <span className="font-medium">{rateLimitStatus.nextResetTime.toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {rateLimitStatus.isRateLimited && (
          <div className="mt-3 p-3 bg-destructive/10 rounded-lg">
            <p className="text-xs text-muted-foreground">
              Facebook API limits reached. Rate limits typically reset every hour. 
              Manual syncs will automatically retry with smart delays.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};