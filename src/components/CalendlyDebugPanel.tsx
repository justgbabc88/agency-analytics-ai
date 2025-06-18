
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bug, Database, Calendar, Webhook, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCalendlyData } from "@/hooks/useCalendlyData";

interface CalendlyDebugPanelProps {
  projectId?: string;
}

export const CalendlyDebugPanel = ({ projectId }: CalendlyDebugPanelProps) => {
  const [debugging, setDebugging] = useState(false);
  const [liveDebugging, setLiveDebugging] = useState(false);
  const [debugResults, setDebugResults] = useState<any>(null);
  const { calendlyEvents, refetch } = useCalendlyData(projectId);
  const { toast } = useToast();

  const runLiveEventCheck = async () => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "No project selected",
        variant: "destructive",
      });
      return;
    }

    setLiveDebugging(true);
    
    try {
      console.log('🔍 Running live event check for today...');
      
      // Get today's date range in MST
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);
      
      console.log(`🔍 Checking for events from ${todayStart.toISOString()} to ${todayEnd.toISOString()}`);
      
      // Check Calendly API directly for today's events
      const { data: apiResult, error: apiError } = await supabase.functions.invoke('calendly-oauth', {
        body: { 
          action: 'get_events_by_date',
          projectId,
          startDate: todayStart.toISOString(),
          endDate: todayEnd.toISOString()
        }
      });

      if (apiError) {
        console.error('API Error:', apiError);
        throw new Error(apiError.message || 'Failed to fetch events from API');
      }

      // Check database for today's events - created today
      const { data: dbEventsCreatedToday, error: dbCreatedError } = await supabase
        .from('calendly_events')
        .select('*')
        .eq('project_id', projectId)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString())
        .order('created_at', { ascending: false });

      if (dbCreatedError) {
        console.error('DB Created Error:', dbCreatedError);
      }

      // Check for events scheduled today
      const { data: dbEventsScheduledToday, error: dbScheduledError } = await supabase
        .from('calendly_events')
        .select('*')
        .eq('project_id', projectId)
        .gte('scheduled_at', todayStart.toISOString())
        .lte('scheduled_at', todayEnd.toISOString())
        .order('scheduled_at', { ascending: false });

      if (dbScheduledError) {
        console.error('DB Scheduled Error:', dbScheduledError);
      }

      const results = {
        timestamp: new Date().toISOString(),
        todayRange: {
          start: todayStart.toISOString(),
          end: todayEnd.toISOString(),
          startMST: todayStart.toLocaleString('en-US', { timeZone: 'America/Denver' }),
          endMST: todayEnd.toLocaleString('en-US', { timeZone: 'America/Denver' })
        },
        apiEvents: apiResult?.events || [],
        dbEventsCreatedToday: dbEventsCreatedToday || [],
        dbEventsScheduledToday: dbEventsScheduledToday || [],
        apiEventCount: apiResult?.events?.length || 0,
        dbCreatedTodayCount: (dbEventsCreatedToday || []).length,
        dbScheduledTodayCount: (dbEventsScheduledToday || []).length,
        missingEvents: []
      };

      // Find events that are in API but not in database
      if (apiResult?.events && Array.isArray(apiResult.events)) {
        results.missingEvents = apiResult.events.filter((apiEvent: any) => {
          if (!apiEvent.uri) return false;
          const existsInDb = (dbEventsCreatedToday || []).some(dbEvent => dbEvent.calendly_event_id === apiEvent.uri);
          return !existsInDb;
        });
      }

      setDebugResults(results);
      console.log('🔍 Live debug results:', results);

      const foundToday = results.apiEventCount;
      const missingCount = results.missingEvents.length;

      toast({
        title: "Live Event Check Complete",
        description: `Found ${foundToday} API events today. ${missingCount} missing from database.`,
      });

    } catch (error) {
      console.error('Live debug failed:', error);
      toast({
        title: "Live Debug Failed",
        description: error instanceof Error ? error.message : "Failed to run live event check",
        variant: "destructive",
      });
    } finally {
      setLiveDebugging(false);
    }
  };

  const runComprehensiveDebug = async () => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "No project selected",
        variant: "destructive",
      });
      return;
    }

    setDebugging(true);
    setDebugResults(null);
    
    try {
      console.log('🔍 Starting comprehensive Calendly debug...');
      
      // Step 1: Check integration status
      const { data: integration, error: integrationError } = await supabase
        .from('project_integrations')
        .select('*')
        .eq('project_id', projectId)
        .eq('platform', 'calendly')
        .maybeSingle();

      if (integrationError) {
        console.error('Integration error:', integrationError);
      }

      // Step 2: Check event mappings
      const { data: mappings, error: mappingsError } = await supabase
        .from('calendly_event_mappings')
        .select('*')
        .eq('project_id', projectId);

      if (mappingsError) {
        console.error('Mappings error:', mappingsError);
      }

      // Step 3: Check recent events in database
      const { data: recentEvents, error: recentError } = await supabase
        .from('calendly_events')
        .select('*')
        .eq('project_id', projectId)
        .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (recentError) {
        console.error('Recent events error:', recentError);
      }

      // Step 4: Test API access
      let apiTestResult = null;
      try {
        const { data: apiTest, error: apiError } = await supabase.functions.invoke('calendly-oauth', {
          body: { action: 'get_access_token', projectId }
        });
        apiTestResult = { success: !apiError, data: apiTest, error: apiError };
      } catch (error) {
        apiTestResult = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }

      // Step 5: Run debug sync
      let syncResult = null;
      try {
        const { data: syncData, error: syncError } = await supabase.functions.invoke('calendly-sync-gaps', {
          body: { 
            triggerReason: 'comprehensive_debug',
            projectId,
            debugMode: true
          }
        });
        syncResult = syncError ? { error: syncError } : syncData;
      } catch (error) {
        syncResult = { error: error instanceof Error ? error.message : 'Unknown error' };
      }

      const results = {
        timestamp: new Date().toISOString(),
        integration: integration || null,
        mappings: mappings || [],
        recentDbEvents: recentEvents || [],
        apiTest: apiTestResult,
        syncResult: syncResult,
        totalDbEvents: (calendlyEvents || []).length
      };

      setDebugResults(results);
      console.log('🔍 Debug results:', results);

      // Refresh the events data
      if (refetch) {
        await refetch();
      }

      toast({
        title: "Debug Complete",
        description: "Comprehensive debug analysis completed. Check results below.",
      });

    } catch (error) {
      console.error('Debug failed:', error);
      toast({
        title: "Debug Failed",
        description: error instanceof Error ? error.message : "Failed to run debug analysis",
        variant: "destructive",
      });
    } finally {
      setDebugging(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
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
    } catch (error) {
      return dateString;
    }
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
            Debug missing events and identify sync issues.
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={runLiveEventCheck}
              disabled={liveDebugging}
              variant="outline"
              size="sm"
              className="bg-green-50 hover:bg-green-100 border-green-200"
            >
              <Clock className={`h-4 w-4 mr-2 ${liveDebugging ? 'animate-spin' : ''}`} />
              {liveDebugging ? 'Checking...' : 'Live Check Today'}
            </Button>
            <Button 
              onClick={runComprehensiveDebug}
              disabled={debugging}
              variant="outline"
              size="sm"
            >
              <Bug className={`h-4 w-4 mr-2 ${debugging ? 'animate-spin' : ''}`} />
              {debugging ? 'Analyzing...' : 'Full Debug'}
            </Button>
          </div>
        </div>

        {(debugging || liveDebugging) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-700 mb-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="font-medium">
                {liveDebugging ? 'Checking Today\'s Events' : 'Running Comprehensive Debug Analysis'}
              </span>
            </div>
            <div className="text-sm text-blue-600 space-y-1">
              {liveDebugging ? (
                <>
                  <p>• Fetching today's events from Calendly API</p>
                  <p>• Comparing with database records</p>
                  <p>• Identifying missing events (like your 1:35 PM booking)</p>
                </>
              ) : (
                <>
                  <p>• Checking integration status</p>
                  <p>• Verifying event type mappings</p>
                  <p>• Analyzing recent database events</p>
                  <p>• Testing API access</p>
                  <p>• Running enhanced sync with detailed logging</p>
                </>
              )}
            </div>
          </div>
        )}

        {debugResults && (
          <div className="space-y-4">
            {/* Live Check Results */}
            {debugResults.todayRange && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Today's Event Check ({debugResults.todayRange.startMST.split(',')[0]})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-700">{debugResults.apiEventCount || 0}</div>
                      <div className="text-sm text-green-600">API Events Found</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-700">{debugResults.dbCreatedTodayCount || 0}</div>
                      <div className="text-sm text-blue-600">DB Events Created Today</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-700">{debugResults.dbScheduledTodayCount || 0}</div>
                      <div className="text-sm text-purple-600">DB Events Scheduled Today</div>
                    </div>
                  </div>

                  {debugResults.missingEvents && debugResults.missingEvents.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-red-700 mb-2">
                        Missing Events Found ({debugResults.missingEvents.length}):
                      </h4>
                      <div className="space-y-2">
                        {debugResults.missingEvents.map((event: any, index: number) => (
                          <div key={index} className="text-sm bg-red-50 p-2 rounded">
                            <p><strong>Event:</strong> {event.event_type_name || 'Unknown'}</p>
                            <p><strong>Scheduled:</strong> {formatDate(event.start_time)}</p>
                            <p><strong>Created:</strong> {formatDate(event.created_at)}</p>
                            <p className="text-xs text-gray-600"><strong>ID:</strong> {event.uri}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {debugResults.apiEvents && debugResults.apiEvents.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-green-700 mb-2">
                        API Events Found Today ({debugResults.apiEvents.length}):
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {debugResults.apiEvents.map((event: any, index: number) => (
                          <div key={index} className="text-sm bg-green-100 p-2 rounded">
                            <p><strong>Event:</strong> {event.event_type_name || 'Unknown'}</p>
                            <p><strong>Scheduled:</strong> {formatDate(event.start_time)}</p>
                            <p><strong>Status:</strong> {event.status}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Comprehensive debug results */}
            {!debugResults.todayRange && (
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
                      <Badge variant={(debugResults.mappings || []).length > 0 ? "default" : "secondary"}>
                        {(debugResults.mappings || []).length} mapped
                      </Badge>
                      {(debugResults.mappings || []).length > 0 && (
                        <div className="text-xs text-gray-600">
                          {(debugResults.mappings || []).map((mapping: any, index: number) => (
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
                    <Badge variant={(debugResults.recentDbEvents || []).length > 0 ? "default" : "secondary"}>
                      {(debugResults.recentDbEvents || []).length} events
                    </Badge>
                    {(debugResults.recentDbEvents || []).length > 0 && (
                      <div className="text-xs text-gray-600 mt-2 space-y-1 max-h-20 overflow-y-auto">
                        {(debugResults.recentDbEvents || []).slice(0, 3).map((event: any, index: number) => (
                          <p key={index}>
                            • {formatDate(event.created_at)} - {event.event_type_name}
                          </p>
                        ))}
                        {(debugResults.recentDbEvents || []).length > 3 && (
                          <p>... and {(debugResults.recentDbEvents || []).length - 3} more</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

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
                        {debugResults.syncResult.error.message || debugResults.syncResult.error}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Badge className="bg-blue-100 text-blue-700">
                          {debugResults.syncResult.gapsFound || 0} gaps found
                        </Badge>
                        <Badge className="bg-green-100 text-green-700">
                          {debugResults.syncResult.eventsSynced || 0} synced
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        Processed {debugResults.syncResult.projectsProcessed || 0} projects
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
                  {(debugResults.mappings || []).length === 0 && (
                    <p className="text-orange-600">• Configure event type mappings</p>
                  )}
                  {!debugResults.apiTest?.success && (
                    <p className="text-red-600">• Fix API access issues</p>
                  )}
                  {debugResults.missingEvents && debugResults.missingEvents.length > 0 && (
                    <p className="text-red-600">• {debugResults.missingEvents.length} events found in API but missing from database - manual sync needed</p>
                  )}
                  {(debugResults.recentDbEvents || []).length === 0 && (debugResults.mappings || []).length > 0 && (
                    <p className="text-orange-600">• Check if events are being created in Calendly during the test period</p>
                  )}
                  {debugResults.syncResult?.gapsFound === 0 && (debugResults.recentDbEvents || []).length === 0 && (
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
