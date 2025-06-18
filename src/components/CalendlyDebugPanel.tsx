
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug, Database, Calendar, Webhook, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCalendlyData } from "@/hooks/useCalendlyData";

interface CalendlyDebugPanelProps {
  projectId?: string;
}

export const CalendlyDebugPanel = ({ projectId }: CalendlyDebugPanelProps) => {
  const [debugging, setDebugging] = useState(false);
  const [debugResults, setDebugResults] = useState<any>(null);
  const { calendlyEvents, refetch } = useCalendlyData(projectId);
  const { toast } = useToast();

  const runComprehensiveDebug = async () => {
    if (!projectId) return;

    setDebugging(true);
    setDebugResults(null);
    
    try {
      console.log('🔍 Starting comprehensive Calendly debug...');
      
      // Step 1: Check integration status
      const { data: integration } = await supabase
        .from('project_integrations')
        .select('*')
        .eq('project_id', projectId)
        .eq('platform', 'calendly')
        .maybeSingle();

      // Step 2: Check event mappings
      const { data: mappings } = await supabase
        .from('calendly_event_mappings')
        .select('*')
        .eq('project_id', projectId);

      // Step 3: Check recent events in database
      const { data: recentEvents } = await supabase
        .from('calendly_events')
        .select('*')
        .eq('project_id', projectId)
        .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      // Step 4: Test API access
      let apiTestResult = null;
      try {
        const { data: apiTest, error: apiError } = await supabase.functions.invoke('calendly-oauth', {
          body: { action: 'get_access_token', projectId }
        });
        apiTestResult = { success: !apiError, data: apiTest, error: apiError };
      } catch (error) {
        apiTestResult = { success: false, error: error.message };
      }

      // Step 5: Run debug sync
      const { data: syncResult, error: syncError } = await supabase.functions.invoke('calendly-sync-gaps', {
        body: { 
          triggerReason: 'comprehensive_debug',
          projectId,
          debugMode: true
        }
      });

      const results = {
        timestamp: new Date().toISOString(),
        integration: integration || null,
        mappings: mappings || [],
        recentDbEvents: recentEvents || [],
        apiTest: apiTestResult,
        syncResult: syncError ? { error: syncError } : syncResult,
        totalDbEvents: calendlyEvents.length
      };

      setDebugResults(results);
      console.log('🔍 Debug results:', results);

      // Refresh the events data
      await refetch();

      toast({
        title: "Debug Complete",
        description: "Comprehensive debug analysis completed. Check results below.",
      });

    } catch (error) {
      console.error('Debug failed:', error);
      toast({
        title: "Debug Failed",
        description: error.message || "Failed to run debug analysis",
        variant: "destructive",
      });
    } finally {
      setDebugging(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      timeZone: 'America/Denver',
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) + ' MST';
  };

  if (!projectId) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Bug className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Please select a project to run debug analysis.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Calendly Debug Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Run comprehensive analysis to identify why recent events aren't showing up.
          </p>
          <Button 
            onClick={runComprehensiveDebug}
            disabled={debugging}
            variant="outline"
            size="sm"
          >
            <Bug className={`h-4 w-4 mr-2 ${debugging ? 'animate-spin' : ''}`} />
            {debugging ? 'Analyzing...' : 'Run Debug'}
          </Button>
        </div>

        {debugging && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <Bug className="h-4 w-4 animate-spin" />
              <span className="font-medium">Running Comprehensive Debug Analysis</span>
            </div>
            <div className="text-sm text-blue-600 space-y-1">
              <p>• Checking integration status</p>
              <p>• Verifying event type mappings</p>
              <p>• Analyzing recent database events</p>
              <p>• Testing API access</p>
              <p>• Running enhanced sync with detailed logging</p>
            </div>
          </div>
        )}

        {debugResults && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Integration Status */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Integration Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {debugResults.integration ? (
                    <div className="space-y-2">
                      <Badge className="bg-green-100 text-green-700">Connected</Badge>
                      <p className="text-xs text-gray-600">
                        Last sync: {debugResults.integration.last_sync ? 
                          formatDate(debugResults.integration.last_sync) : 'Never'}
                      </p>
                    </div>
                  ) : (
                    <Badge variant="destructive">Not Connected</Badge>
                  )}
                </CardContent>
              </Card>

              {/* API Access */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    API Access
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {debugResults.apiTest?.success ? (
                    <Badge className="bg-green-100 text-green-700">Working</Badge>
                  ) : (
                    <div className="space-y-1">
                      <Badge variant="destructive">Failed</Badge>
                      <p className="text-xs text-red-600">
                        {debugResults.apiTest?.error?.message || 'Unknown error'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Event Mappings */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Webhook className="h-4 w-4" />
                    Event Mappings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant={debugResults.mappings.length > 0 ? "default" : "secondary"}>
                      {debugResults.mappings.length} mapped
                    </Badge>
                    {debugResults.mappings.length > 0 && (
                      <div className="text-xs text-gray-600">
                        {debugResults.mappings.map((mapping: any, index: number) => (
                          <p key={index}>• {mapping.event_type_name}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recent Events */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent Events (48h)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={debugResults.recentDbEvents.length > 0 ? "default" : "secondary"}>
                    {debugResults.recentDbEvents.length} events
                  </Badge>
                  {debugResults.recentDbEvents.length > 0 && (
                    <div className="text-xs text-gray-600 mt-2 space-y-1 max-h-20 overflow-y-auto">
                      {debugResults.recentDbEvents.slice(0, 3).map((event: any, index: number) => (
                        <p key={index}>
                          • {formatDate(event.created_at)} - {event.event_type_name}
                        </p>
                      ))}
                      {debugResults.recentDbEvents.length > 3 && (
                        <p>... and {debugResults.recentDbEvents.length - 3} more</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sync Results */}
            {debugResults.syncResult && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Latest Sync Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {debugResults.syncResult.error ? (
                    <div className="space-y-2">
                      <Badge variant="destructive">Sync Failed</Badge>
                      <p className="text-xs text-red-600">
                        {debugResults.syncResult.error.message}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Badge className="bg-blue-100 text-blue-700">
                          {debugResults.syncResult.gapsFound} gaps found
                        </Badge>
                        <Badge className="bg-green-100 text-green-700">
                          {debugResults.syncResult.eventsSynced} synced
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        Processed {debugResults.syncResult.projectsProcessed} projects
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-2">
                  {!debugResults.integration && (
                    <p className="text-red-600">• Reconnect Calendly integration</p>
                  )}
                  {debugResults.mappings.length === 0 && (
                    <p className="text-orange-600">• Configure event type mappings</p>
                  )}
                  {!debugResults.apiTest?.success && (
                    <p className="text-red-600">• Fix API access issues</p>
                  )}
                  {debugResults.recentDbEvents.length === 0 && debugResults.mappings.length > 0 && (
                    <p className="text-orange-600">• Check if events are being created in Calendly during the test period</p>
                  )}
                  {debugResults.syncResult?.gapsFound === 0 && debugResults.recentDbEvents.length === 0 && (
                    <p className="text-blue-600">• Verify that the events you expect are within the sync date range</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <p className="text-xs text-gray-500 text-center">
              Debug completed at {formatDate(debugResults.timestamp)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
