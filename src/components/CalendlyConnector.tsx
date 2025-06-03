
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, RefreshCw, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CalendlyConnectorProps {
  projectId?: string;
  isConnected: boolean;
  onConnectionChange: (connected: boolean) => void;
}

interface EventType {
  uri: string;
  name: string;
  duration: number;
  kind: string;
}

interface EventMapping {
  id: string;
  calendly_event_type_id: string;
  event_type_name: string;
  is_active: boolean;
}

export const CalendlyConnector = ({ 
  projectId, 
  isConnected, 
  onConnectionChange 
}: CalendlyConnectorProps) => {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [eventMappings, setEventMappings] = useState<EventMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const handleConnect = async () => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "Please select a project first",
        variant: "destructive",
      });
      return;
    }

    setConnecting(true);
    
    try {
      console.log('Initiating Calendly connection for project:', projectId);
      
      const { data, error } = await supabase.functions.invoke('calendly-oauth', {
        body: { action: 'get_auth_url', projectId }
      });

      if (error) {
        console.error('Auth URL error:', error);
        throw new Error(error.message || 'Failed to get authorization URL');
      }

      console.log('Opening OAuth popup...');

      // Open OAuth popup
      const popup = window.open(
        data.auth_url,
        'calendly-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes,left=' + 
        (window.screen.width / 2 - 300) + ',top=' + (window.screen.height / 2 - 350)
      );

      if (!popup) {
        throw new Error('Popup was blocked. Please allow popups for this site.');
      }

      // Listen for success message from popup
      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === 'calendly_connected' && event.data.success && event.data.projectId === projectId) {
          console.log('Received success message from popup');
          window.removeEventListener('message', messageHandler);
          
          // Give a moment for database operations to complete
          setTimeout(() => {
            checkConnectionStatus();
          }, 1500);
        }
      };

      window.addEventListener('message', messageHandler);

      // Monitor popup closure
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          
          // Check status even if popup closed without message
          setTimeout(() => {
            setConnecting(false);
            checkConnectionStatus();
          }, 1000);
        }
      }, 1000);

      // Cleanup after timeout
      setTimeout(() => {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        if (popup && !popup.closed) {
          popup.close();
        }
        setConnecting(false);
      }, 300000); // 5 minutes

    } catch (error) {
      console.error('Connection error:', error);
      setConnecting(false);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to initiate Calendly connection",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    if (!projectId) return;

    try {
      const { error } = await supabase.functions.invoke('calendly-oauth', {
        body: { action: 'disconnect', projectId }
      });

      if (error) {
        throw new Error(error.message || 'Failed to disconnect');
      }

      setEventTypes([]);
      setEventMappings([]);
      onConnectionChange(false);
      
      toast({
        title: "Disconnected",
        description: "Calendly account has been disconnected",
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect Calendly account",
        variant: "destructive",
      });
    }
  };

  const checkConnectionStatus = async () => {
    if (!projectId) return;

    console.log('Checking connection status for project:', projectId);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('calendly-oauth', {
        body: { action: 'get_event_types', projectId }
      });

      if (error) {
        console.error('Connection check error:', error);
        
        if (error.message?.includes('No Calendly integration found') || 
            error.message?.includes('not connected')) {
          onConnectionChange(false);
          return;
        }
        
        throw new Error(error.message || 'Failed to check connection');
      }

      // Success!
      setEventTypes(data.event_types || []);
      onConnectionChange(true);
      
      if (!connecting) {
        toast({
          title: "Connected",
          description: `Found ${data.event_types?.length || 0} event types in your Calendly account`,
        });
      }

      await loadEventMappings();
      
    } catch (error) {
      console.error('Failed to check connection status:', error);
      onConnectionChange(false);
      
      if (!connecting) {
        toast({
          title: "Connection Check Failed",
          description: error.message || "Failed to verify Calendly connection",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
      setConnecting(false);
    }
  };

  const loadEventMappings = async () => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase
        .from('calendly_event_mappings')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      setEventMappings(data || []);
    } catch (error) {
      console.error('Failed to load event mappings:', error);
    }
  };

  const autoSyncHistoricalEvents = async () => {
    if (!projectId) return;

    setSyncing(true);
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const today = new Date();

      console.log('Auto-syncing last 30 days of historical events...');
      
      const { data, error } = await supabase.functions.invoke('calendly-oauth', {
        body: { 
          action: 'sync_historical_events', 
          projectId,
          dateRange: {
            startDate: thirtyDaysAgo.toISOString(),
            endDate: today.toISOString()
          }
        }
      });

      if (error) {
        console.error('Auto sync error:', error);
        throw new Error(error.message || 'Failed to sync historical events');
      }

      console.log('Auto sync result:', data);

      if (data.synced_events > 0) {
        toast({
          title: "Historical Events Synced",
          description: `Automatically synced ${data.synced_events} events from the last 30 days`,
        });
      }

    } catch (error) {
      console.error('Auto historical sync error:', error);
      // Don't show error toast for auto sync - it's less intrusive
      console.log('Auto sync failed silently:', error.message);
    } finally {
      setSyncing(false);
    }
  };

  const toggleEventMapping = async (eventType: EventType, isActive: boolean) => {
    if (!projectId) return;

    try {
      if (isActive) {
        // Create mapping
        const { error } = await supabase
          .from('calendly_event_mappings')
          .upsert({
            project_id: projectId,
            calendly_event_type_id: eventType.uri,
            event_type_name: eventType.name,
            is_active: true,
          });

        if (error) throw error;
        
        // Auto-sync historical events when first event type is added
        const currentMappings = eventMappings.filter(m => m.is_active);
        if (currentMappings.length === 0) {
          setTimeout(() => autoSyncHistoricalEvents(), 1000);
        }
      } else {
        // Remove mapping
        const { error } = await supabase
          .from('calendly_event_mappings')
          .delete()
          .eq('project_id', projectId)
          .eq('calendly_event_type_id', eventType.uri);

        if (error) throw error;
      }

      await loadEventMappings();
      
      toast({
        title: isActive ? "Event Added" : "Event Removed",
        description: `${eventType.name} ${isActive ? 'will now be' : 'will no longer be'} tracked`,
      });
    } catch (error) {
      console.error('Failed to update event mapping:', error);
      toast({
        title: "Error",
        description: "Failed to update event tracking",
        variant: "destructive",
      });
    }
  };

  const isEventMapped = (eventTypeUri: string) => {
    return eventMappings.some(mapping => 
      mapping.calendly_event_type_id === eventTypeUri && mapping.is_active
    );
  };

  useEffect(() => {
    if (isConnected && projectId) {
      checkConnectionStatus();
    }
  }, [projectId]);

  if (!projectId) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Please select a project to configure Calendly.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendly Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Connect your Calendly account to automatically track scheduled calls and sync them with your Book Call funnel.
            </p>
            
            {connecting && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 text-blue-700">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Connecting to Calendly...</span>
                </div>
                <p className="text-sm text-blue-600 mt-2">
                  Please complete the authorization in the popup window.
                </p>
              </div>
            )}
            
            <Button 
              onClick={handleConnect} 
              disabled={connecting || loading}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {connecting ? "Connecting..." : "Connect Calendly"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
                <Button variant="ghost" size="sm" onClick={checkConnectionStatus} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </div>

            {syncing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-700">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Syncing historical events...</span>
                </div>
              </div>
            )}

            {eventTypes.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-3">
                    Select Event Types to Track as "Booked Calls"
                  </h4>
                  <div className="space-y-3">
                    {eventTypes.map((eventType) => (
                      <div key={eventType.uri} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={isEventMapped(eventType.uri)}
                            onCheckedChange={(checked) => 
                              toggleEventMapping(eventType, checked as boolean)
                            }
                          />
                          <div>
                            <p className="font-medium">{eventType.name}</p>
                            <p className="text-sm text-gray-500">
                              {eventType.duration} minutes • {eventType.kind}
                            </p>
                          </div>
                        </div>
                        {isEventMapped(eventType.uri) && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {eventMappings.filter(m => m.is_active).length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <CheckCircle className="h-4 w-4 inline mr-2" />
                      {eventMappings.filter(m => m.is_active).length} event type(s) are being tracked
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      New bookings and historical events (last 30 days) will automatically appear in your Book Call funnel dashboard
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {eventTypes.length === 0 && !loading && (
              <div className="text-center py-4">
                <p className="text-gray-500">No event types found in your Calendly account.</p>
                <Button variant="outline" onClick={checkConnectionStatus} className="mt-2">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
