import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface FacebookDataDiagnosticProps {
  projectId: string;
}

interface DiagnosticResult {
  step: string;
  status: 'success' | 'warning' | 'error' | 'info';
  message: string;
  details?: any;
}

export const FacebookDataDiagnostic = ({ projectId }: FacebookDataDiagnosticProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const { toast } = useToast();

  const addResult = (result: DiagnosticResult) => {
    setResults(prev => [...prev, result]);
  };

  const runDiagnostic = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      // Step 1: Check project integration status
      addResult({ step: "1. Checking Project Integration", status: "info", message: "Checking Facebook integration status..." });
      
      const { data: integration, error: integrationError } = await supabase
        .from('project_integrations')
        .select('*')
        .eq('project_id', projectId)
        .eq('platform', 'facebook')
        .maybeSingle();

      if (integrationError) {
        addResult({ step: "1. Project Integration", status: "error", message: `Error: ${integrationError.message}` });
        return;
      }

      if (!integration) {
        addResult({ step: "1. Project Integration", status: "error", message: "No Facebook integration found for this project" });
        return;
      }

      addResult({ 
        step: "1. Project Integration", 
        status: integration.is_connected ? "success" : "warning", 
        message: `Integration ${integration.is_connected ? 'connected' : 'not connected'}. Last sync: ${integration.last_sync || 'Never'}`,
        details: integration
      });

      // Step 2: Check integration data (auth tokens)
      addResult({ step: "2. Checking Authentication Data", status: "info", message: "Checking stored authentication data..." });
      
      const { data: authData, error: authError } = await supabase
        .from('project_integration_data')
        .select('data, synced_at')
        .eq('project_id', projectId)
        .eq('platform', 'facebook')
        .maybeSingle();

      if (authError) {
        addResult({ step: "2. Authentication Data", status: "error", message: `Error: ${authError.message}` });
        return;
      }

      const auth = authData?.data as any;
      if (!auth || !auth.access_token) {
        addResult({ step: "2. Authentication Data", status: "error", message: "No Facebook access token found. Reconnection required." });
      } else {
        // Fix integration status if token exists but integration shows as disconnected
        if (!integration.is_connected && auth.access_token) {
          await supabase
            .from('project_integrations')
            .update({ is_connected: true, last_sync: authData?.synced_at })
            .eq('project_id', projectId)
            .eq('platform', 'facebook');
          
          addResult({ 
            step: "2. Authentication Data", 
            status: "success", 
            message: `✅ Access token found and integration status fixed! Ad account: ${auth.selected_ad_account_id || 'Unknown'}`,
            details: { hasToken: true, adAccount: auth.selected_ad_account_id, permissions: auth.permissions }
          });
        } else {
          addResult({ 
            step: "2. Authentication Data", 
            status: "success", 
            message: `✅ Access token found! Ad account: ${auth.selected_ad_account_id || 'Unknown'}`,
            details: { hasToken: true, adAccount: auth.selected_ad_account_id, permissions: auth.permissions }
          });
        }
      }

      // Step 3: Check daily insights data
      addResult({ step: "3. Checking Daily Insights", status: "info", message: "Checking Facebook daily insights data..." });
      
      const { data: insightsCount, error: insightsError } = await supabase
        .from('facebook_daily_insights')
        .select('id', { count: 'exact' })
        .eq('project_id', projectId);

      if (insightsError) {
        addResult({ step: "3. Daily Insights", status: "error", message: `Error: ${insightsError.message}` });
      } else {
        const count = insightsCount?.length || 0;
        addResult({ 
          step: "3. Daily Insights", 
          status: count > 0 ? "success" : "warning", 
          message: `${count} daily insights records found`,
          details: { count }
        });
      }

      // Step 4: Check recent sync logs
      addResult({ step: "4. Checking Recent Sync Status", status: "info", message: "Checking recent sync attempts..." });
      
      const { data: recentData, error: recentError } = await supabase
        .from('project_integration_data')
        .select('data, synced_at')
        .eq('project_id', projectId)
        .eq('platform', 'facebook')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentError) {
        addResult({ step: "4. Recent Sync Status", status: "error", message: `Error: ${recentError.message}` });
      } else if (recentData) {
        const data = recentData.data as any;
        const meta = data?.meta;
        const rateLimitHit = data?.rate_limit_hit || meta?.rateLimitHit;
        const syncMethod = meta?.syncMethod || data?.sync_method;
        
        // Check sync freshness
        const syncDate = new Date(recentData.synced_at);
        const hoursSinceSync = (Date.now() - syncDate.getTime()) / (1000 * 60 * 60);
        
        let status: 'success' | 'warning' | 'info' = 'info';
        let message = `Last sync: ${recentData.synced_at}. Method: ${syncMethod || 'unknown'}. Rate limit hit: ${rateLimitHit ? 'Yes' : 'No'}`;
        
        if (rateLimitHit) {
          status = 'warning';
          message += '. This explains why no data is showing - Facebook is rate limiting API calls.';
        } else if (hoursSinceSync > 24) {
          status = 'warning';
          message += `. Data is ${Math.round(hoursSinceSync)} hours old.`;
        }
        
        addResult({ 
          step: "4. Recent Sync Status", 
          status, 
          message,
          details: { meta, rateLimitHit, hoursSinceSync: Math.round(hoursSinceSync) }
        });
      }

      // Step 5: Test manual sync
      if ((auth as any)?.access_token) {
        addResult({ step: "5. Testing Manual Sync", status: "info", message: "Attempting manual sync..." });
        
        const { data: syncResult, error: syncError } = await supabase.functions.invoke('facebook-batch-sync', {
          body: { projectId, source: 'diagnostic' }
        });

        if (syncError) {
          // Check if it's a rate limit error specifically
          const errorMessage = syncError.message?.toLowerCase() || '';
          if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
            addResult({ 
              step: "5. Manual Sync Test", 
              status: "warning", 
              message: "⏳ Rate limit detected - this is expected during high usage periods",
              details: { 
                rateLimited: true,
                recommendation: "Wait 1 hour for rate limits to reset, then try again",
                nextRetry: new Date(Date.now() + 3600000).toLocaleTimeString()
              }
            });
          } else {
            addResult({ step: "5. Manual Sync Test", status: "error", message: `Sync failed: ${syncError.message}` });
          }
        } else {
          addResult({ 
            step: "5. Manual Sync Test", 
            status: "success", 
            message: `Sync completed. ${syncResult?.success_count || 0} integrations processed.`,
            details: syncResult
          });
        }
      } else {
        addResult({ step: "5. Manual Sync Test", status: "warning", message: "Skipped - no access token available" });
      }

    } catch (error) {
      console.error('Diagnostic error:', error);
      addResult({ step: "Diagnostic", status: "error", message: `Unexpected error: ${error}` });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    const variants = {
      success: 'default',
      warning: 'secondary',
      error: 'destructive',
      info: 'outline'
    } as const;
    
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Facebook Data Diagnostic
          <Button 
            onClick={runDiagnostic} 
            disabled={isRunning} 
            size="sm" 
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running...' : 'Run Diagnostic'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {results.length === 0 && !isRunning && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Click "Run Diagnostic" to check your Facebook integration status and identify any issues.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-3">
          {results.map((result, index) => (
            <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
              {getStatusIcon(result.status)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{result.step}</span>
                  {getStatusBadge(result.status)}
                </div>
                <p className="text-sm text-muted-foreground">{result.message}</p>
                {result.details && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer text-blue-600">Show details</summary>
                    <pre className="text-xs mt-1 p-2 bg-gray-50 rounded overflow-auto">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};