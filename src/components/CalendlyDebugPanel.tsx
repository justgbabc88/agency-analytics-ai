
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Clock, AlertCircle, CheckCircle, Webhook, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

interface CalendlyDebugPanelProps {
  projectId: string;
}

export const CalendlyDebugPanel = ({ projectId }: CalendlyDebugPanelProps) => {
  const [loading, setLoading] = useState(false);
  const [checkingWebhooks, setCheckingWebhooks] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<any>(null);
  const [debugData, setDebugData] = useState<any>(null);
  const { toast } = useToast();

  const checkWebhooks = async () => {
    setCheckingWebhooks(true);
    try {
      const { data, error } = await supabase.functions.invoke('calendly-oauth', {
        body: { 
          action: 'check_webhooks',
          projectId 
        }
      });

      if (error) throw error;
      
      setWebhookStatus(data);
      
      if (data.isConfigured) {
        toast({
          title: "Webhooks Configured ✅",
          description: "Real-time sync is properly set up",
        });
      } else {
        toast({
          title: "Webhooks Not Found ⚠️",
          description: "Real-time sync may not be working. Try setting up webhooks.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Webhook check failed:', error);
      toast({
        title: "Webhook Check Failed",
        description: error.message || "Failed to check webhook status",
        variant: "destructive"
      });
    } finally {
      setCheckingWebhooks(false);
    }
  };

  const setupWebhooks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calendly-oauth', {
        body: { 
          action: 'setup_webhooks',
          projectId 
        }
      });

      if (error) throw error;
      
      toast({
        title: "Webhooks Set Up! ✅",
        description: "Real-time sync is now configured",
      });
      
      // Refresh webhook status
      await checkWebhooks();
    } catch (error) {
      console.error('Webhook setup failed:', error);
      toast({
        title: "Webhook Setup Failed",
        description: error.message || "Failed to set up webhooks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runLiveCheck = async () => {
    setLoading(true);
    try {
      // Get today's date range in user's timezone
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      console.log('Running live check for date range:', {
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString()
      });

      // CRITICAL FIX: Use get_events_by_date instead of any non-existent actions
      const { data: apiData, error: apiError } = await supabase.functions.invoke('calendly-oauth', {
        body: { 
          action: 'get_events_by_date',
          projectId,
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString()
        }
      });

      if (apiError) throw apiError;

      // Get events from database for today
      const { data: dbEvents, error: dbError } = await supabase
        .from('calendly_events')
        .select('*')
        .eq('project_id', projectId)
        .gte('scheduled_at', startOfDay.toISOString())
        .lte('scheduled_at', endOfDay.toISOString())
        .order('scheduled_at', { ascending: false });

      if (dbError) throw dbError;

      const apiEvents = apiData?.events || [];
      const dbEventsCount = dbEvents?.length || 0;

      setDebugData({
        date: format(today, 'yyyy-MM-dd'),
        apiEvents: apiEvents.length,
        dbEvents: dbEventsCount,
        apiEventDetails: apiEvents.slice(0, 3), // Show first 3 for debugging
        dbEventDetails: (dbEvents || []).slice(0, 3),
        isMatch: apiEvents.length === dbEventsCount,
        lastChecked: new Date().toISOString()
      });

      if (apiEvents.length === dbEventsCount) {
        toast({
          title: "✅ Data in Sync",
          description: `Found ${apiEvents.length} events in both API and database`,
        });
      } else {
        toast({
          title: "⚠️ Data Mismatch Detected",
          description: `API: ${apiEvents.length} events, DB: ${dbEventsCount} events. Running gap sync...`,
          variant: "destructive"
        });
        
        // Trigger gap sync automatically
        setTimeout(async () => {
          try {
            await supabase.functions.invoke('calendly-sync-gaps', {
              body: { 
                triggerReason: 'live_check_mismatch',
                projectId,
                debugMode: true
              }
            });
            
            toast({
              title: "Gap Sync Triggered",
              description: "Attempting to sync missing events...",
            });
          } catch (syncError) {
            console.error('Gap sync failed:', syncError);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Live check failed:', error);
      toast({
        title: "Live Check Failed",
        description: error.message || "Failed to check current data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerFullSync = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calendly-sync-gaps', {
        body: { 
          triggerReason: 'manual_full_debug',
          projectId,
          debugMode: true
        }
      });

      if (error) throw error;
      
      toast({
        title: "Full Sync Complete! ✅",
        description: `Found ${data.gapsFound} gaps, synced ${data.eventsSynced} events`,
      });
      
      // Refresh the live check
      setTimeout(() => runLiveCheck(), 2000);
    } catch (error) {
      console.error('Full sync failed:', error);
      toast({
        title: "Full Sync Failed",
        description: error.message || "Failed to run full sync",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendly Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Webhook Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Webhook className="h-4 w-4" />
              Webhook Status
            </h4>
            <Button
              onClick={checkWebhooks}
              disabled={checkingWebhooks}
              variant="outline"
              size="sm"
            >
              {checkingWebhooks ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Check"}
            </Button>
          </div>
          
          {webhookStatus && (
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                {webhookStatus.isConfigured ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Configured
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Found {webhookStatus.webhooks?.length || 0} webhook(s)
              </p>
              {!webhookStatus.isConfigured && (
                <Button
                  onClick={setupWebhooks}
                  disabled={loading}
                  className="mt-2"
                  size="sm"
                >
                  Setup Webhooks
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Live Check */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Live Check Today
            </h4>
            <Button
              onClick={runLiveCheck}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Check Now"}
            </Button>
          </div>
          
          {debugData && (
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                {debugData.isMatch ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    In Sync
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Mismatch
                  </Badge>
                )}
                <span className="text-sm font-medium">{debugData.date}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">API Events:</span> {debugData.apiEvents}
                </div>
                <div>
                  <span className="font-medium">DB Events:</span> {debugData.dbEvents}
                </div>
              </div>
              
              {debugData.apiEventDetails?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-600">Recent API Events:</p>
                  {debugData.apiEventDetails.map((event: any, index: number) => (
                    <div key={index} className="text-xs text-gray-500 ml-2">
                      • {event.event_type_name} - {format(new Date(event.start_time), 'MMM d, h:mm a')}
                    </div>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-2">
                Last checked: {format(new Date(debugData.lastChecked), 'h:mm:ss a')}
              </p>
            </div>
          )}
        </div>

        {/* Full Debug */}
        <div className="pt-2 border-t">
          <Button
            onClick={triggerFullSync}
            disabled={loading}
            className="w-full"
            variant="default"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
            Full Debug & Sync
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
