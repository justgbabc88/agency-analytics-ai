
import React, { useState, useEffect } from 'react';
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
      const { data, error } = await supabase.functions.invoke('calendly-oauth', {
        body: { action: 'get_auth_url', projectId }
      });

      if (error) {
        throw new Error(error.message || 'Failed to get authorization URL');
      }

      const popup = window.open(
        data.authUrl, 
        'calendly-oauth', 
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setConnecting(false);
          setTimeout(() => checkConnectionStatus(), 1000);
        }
      }, 1000);

      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'calendly_connected' && event.data.success) {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener('message', messageListener);
          setConnecting(false);
          
          toast({
            title: "Connected Successfully",
            description: "Your Calendly account has been connected",
          });
          
          setTimeout(() => checkConnectionStatus(), 1000);
        }
      };

      window.addEventListener('message', messageListener);

      setTimeout(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageListener);
          setConnecting(false);
        }
      }, 300000);

    } catch (error) {
      setConnecting(false);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to initiate Calendly connection",
        variant: "destructive",
      });
    }
  };

  const checkConnectionStatus = async () => {
    if (!projectId) return;

    setLoading(true);

    try {
      const { data: integration, error: integrationError } = await supabase
        .from('project_integrations')
        .select('*')
        .eq('project_id', projectId)
        .eq('platform', 'calendly')
        .eq('is_connected', true)
        .maybeSingle();

      if (integrationError || !integration) {
        onConnectionChange(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('calendly-oauth', {
        body: { action: 'get_event_types', projectId }
      });

      if (error) {
        if (error.message?.includes('authorization') || error.message?.includes('expired') || error.message?.includes('not connected')) {
          onConnectionChange(false);
        }
        return;
      }

      setEventTypes(data.event_types || []);
      onConnectionChange(true);
      
      if (!connecting) {
        toast({
          title: "Connected Successfully",
          description: "Calendly integration is active and ready.",
        });
      }

      await loadEventMappings();
      
    } catch (error) {
      // Silent fail for connection check
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
      // Silent fail for mappings load
    }
  };

  const syncEvents = async () => {
    if (!projectId) return;

    setSyncing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('calendly-sync-gaps', {
        body: { 
          triggerReason: 'manual_sync',
          projectId
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to sync events');
      }

      toast({
        title: "Events Synced Successfully",
        description: `Synced ${data.eventsSynced || 0} events from Calendly.`,
      });

    } catch (error) {
      toast({
        title: "Sync Failed", 
        description: error.message || "Failed to sync events",
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const toggleEventMapping = async (eventType: EventType, isActive: boolean) => {
    if (!projectId) return;

    try {
      // Check if mapping exists
      const existingMapping = eventMappings.find(m => 
        m.calendly_event_type_id === eventType.uri
      );

      if (existingMapping) {
        // Update existing mapping
        const { error } = await supabase
          .from('calendly_event_mappings')
          .update({ 
            is_active: isActive,
            event_type_name: eventType.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingMapping.id);

        if (error) throw error;
      } else if (isActive) {
        // Create new mapping only if activating
        const { error } = await supabase
          .from('calendly_event_mappings')
          .insert({
            project_id: projectId,
            calendly_event_type_id: eventType.uri,
            event_type_name: eventType.name,
            is_active: true,
          });

        if (error) throw error;
      }

      // Reload mappings to update UI
      await loadEventMappings();
      
      // Sync events when toggling
      if (isActive) {
        setTimeout(() => syncEvents(), 500);
      }
      
      toast({
        title: isActive ? "Event Added" : "Event Removed",
        description: `${eventType.name} ${isActive ? 'will now be' : 'will no longer be'} tracked`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to update event tracking for ${eventType.name}`,
        variant: "destructive",
      });
    }
  };

  const isEventMapped = (eventTypeUri: string) => {
    return eventMappings.some(mapping => 
      mapping.calendly_event_type_id === eventTypeUri && 
      mapping.is_active === true
    );
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
      toast({
        title: "Error",
        description: "Failed to disconnect Calendly account",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isConnected && projectId) {
      checkConnectionStatus();
    }
  }, [projectId, isConnected]);

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
              Connect your Calendly account to automatically track scheduled calls.
            </p>
            
            {connecting && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-center gap-2 text-blue-700">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Connecting to Calendly...</span>
                </div>
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
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </Badge>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={syncEvents}
                  disabled={syncing}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                  Sync Events
                </Button>
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
            </div>

            {syncing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-700">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Syncing events from Calendly...</span>
                </div>
              </div>
            )}

            {eventTypes.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-3">
                    Select Event Types to Track
                  </h4>
                  <div className="space-y-3">
                    {eventTypes.map((eventType) => (
                      <div key={eventType.uri} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={isEventMapped(eventType.uri)}
                            onCheckedChange={(checked) => 
                              toggleEventMapping(eventType, checked === true)
                            }
                          />
                          <div>
                            <p className="font-medium">{eventType.name}</p>
                            <p className="text-sm text-gray-500">
                              {eventType.duration} minutes
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
