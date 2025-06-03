
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, RefreshCw, Calendar, CheckCircle } from "lucide-react";
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

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calendly-oauth', {
        body: { action: 'get_auth_url', projectId }
      });

      if (error) throw error;

      // Open OAuth popup
      const popup = window.open(
        data.auth_url,
        'calendly-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Listen for popup close
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          checkConnectionStatus();
        }
      }, 1000);

    } catch (error) {
      console.error('OAuth error:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Calendly",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase.functions.invoke('calendly-oauth', {
        body: { action: 'get_event_types', projectId }
      });

      if (error) throw error;

      setEventTypes(data.event_types || []);
      onConnectionChange(true);
      
      toast({
        title: "Connected Successfully",
        description: "Calendly account connected!",
      });

      loadEventMappings();
    } catch (error) {
      console.error('Failed to fetch event types:', error);
    }
  };

  const loadEventTypes = async () => {
    if (!projectId || !isConnected) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calendly-oauth', {
        body: { action: 'get_event_types', projectId }
      });

      if (error) throw error;
      setEventTypes(data.event_types || []);
    } catch (error) {
      console.error('Failed to load event types:', error);
      toast({
        title: "Error",
        description: "Failed to load event types",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      } else {
        // Remove mapping
        const { error } = await supabase
          .from('calendly_event_mappings')
          .delete()
          .eq('project_id', projectId)
          .eq('calendly_event_type_id', eventType.uri);

        if (error) throw error;
      }

      loadEventMappings();
      
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
      loadEventTypes();
      loadEventMappings();
    }
  }, [isConnected, projectId]);

  if (!projectId) {
    return (
      <Card>
        <CardContent className="text-center py-8">
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
          Calendly OAuth Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Connect your Calendly account to automatically track scheduled calls and sync them with your Book Call funnel.
            </p>
            <Button 
              onClick={handleConnect} 
              disabled={loading}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {loading ? "Connecting..." : "Connect Calendly"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600 border-green-600">
                Connected
              </Badge>
              <Button variant="ghost" size="sm" onClick={loadEventTypes} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

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
                      New bookings for these events will automatically appear in your Book Call funnel dashboard
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
