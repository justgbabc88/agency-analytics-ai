import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink, RefreshCw, Calendar, CheckCircle, AlertCircle, Bug, Settings, Trash2, Search } from "lucide-react";
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

interface CalendlyIntegrationData {
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  organization?: string;
  webhook_id?: string;
  signing_key?: string;
  user_uri?: string;
  webhook_status?: string;
  webhook_message?: string;
  webhook_url?: string;
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
  const [debugging, setDebugging] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [cleaningWebhooks, setCleaningWebhooks] = useState(false);
  const [listingWebhooks, setListingWebhooks] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'unknown' | 'registered' | 'failed' | 'polling'>('unknown');
  const [webhookMessage, setWebhookMessage] = useState<string>('');
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

      console.log('Redirecting to OAuth URL...');
      
      // Redirect to the OAuth URL directly
      window.location.href = data.auth_url;

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

  const checkConnectionStatus = async () => {
    if (!projectId) return;

    console.log('Checking connection status for project:', projectId);
    setLoading(true);

    try {
      // First check if we have a valid integration record
      const { data: integration, error: integrationError } = await supabase
        .from('project_integrations')
        .select('*')
        .eq('project_id', projectId)
        .eq('platform', 'calendly')
        .eq('is_connected', true)
        .maybeSingle();

      if (integrationError) {
        console.error('Integration check error:', integrationError);
        onConnectionChange(false);
        return;
      }

      if (!integration) {
        console.log('No connected integration found in database');
        onConnectionChange(false);
        setWebhookStatus('unknown');
        return;
      }

      // Check webhook status from integration data
      const { data: integrationData } = await supabase
        .from('project_integration_data')
        .select('data')
        .eq('project_id', projectId)
        .eq('platform', 'calendly')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (integrationData?.data) {
        const data = integrationData.data as CalendlyIntegrationData;
        const status = data.webhook_status || 'unknown';
        const message = data.webhook_message || '';
        
        setWebhookStatus(status === 'registered' ? 'registered' : status === 'failed' ? 'polling' : 'unknown');
        setWebhookMessage(message);
        
        console.log('📊 Webhook status:', status, '-', message);
      }

      // Try to fetch event types to verify the connection is still valid
      const { data, error } = await supabase.functions.invoke('calendly-oauth', {
        body: { action: 'get_event_types', projectId }
      });

      if (error) {
        console.error('Event types check error:', error);
        
        // Only mark as disconnected if it's an auth error, not a network error
        if (error.message?.includes('authorization') || error.message?.includes('expired') || error.message?.includes('not connected')) {
          console.log('Marking integration as disconnected due to auth error');
          onConnectionChange(false);
          setWebhookStatus('unknown');
        } else {
          // For other errors, keep the connection status as is but show a warning
          console.warn('Connection check failed but keeping status:', error.message);
          toast({
            title: "Connection Warning",
            description: "Could not verify Calendly connection. Refresh to retry.",
            variant: "default",
          });
        }
        return;
      }

      // Success!
      setEventTypes(data.event_types || []);
      onConnectionChange(true);
      
      if (!connecting) {
        console.log('Connection verified successfully');
        
        // Show status-appropriate toast
        if (webhookStatus === 'registered') {
          toast({
            title: "Real-time Updates Active",
            description: "Webhooks are configured for instant event notifications.",
          });
        } else if (webhookStatus === 'polling') {
          toast({
            title: "Connection Active (Polling Mode)",
            description: webhookMessage || "Connected successfully. Using polling for updates.",
            variant: "default",
          });
        }
      }

      await loadEventMappings();
      
    } catch (error) {
      console.error('Failed to check connection status:', error);
      // Don't automatically disconnect on network errors
      console.log('Keeping current connection status due to network error');
      
      if (!connecting) {
        toast({
          title: "Connection Check Failed",
          description: "Network error while checking connection. Refresh to retry.",
          variant: "default",
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

  const listWebhooks = async () => {
    if (!projectId) return;

    setListingWebhooks(true);
    
    try {
      console.log('🔍 Listing Calendly webhooks...');
      
      const { data, error } = await supabase.functions.invoke('calendly-oauth', {
        body: { 
          action: 'list_webhooks',
          projectId
        }
      });

      if (error) {
        console.error('List webhooks error:', error);
        throw new Error(error.message || 'Failed to list webhooks');
      }

      console.log('📋 Existing webhooks:', data.webhooks);

      toast({
        title: "Webhooks Listed",
        description: `Found ${data.webhooks.length} existing webhooks. Check console for details.`,
      });

    } catch (error) {
      console.error('List webhooks failed:', error);
      toast({
        title: "List Webhooks Failed", 
        description: error.message || "Failed to list webhooks",
        variant: "destructive"
      });
    } finally {
      setListingWebhooks(false);
    }
  };

  const cleanupWebhooks = async () => {
    if (!projectId) return;

    setCleaningWebhooks(true);
    
    try {
      console.log('🧹 Cleaning up duplicate Calendly webhooks...');
      
      const { data, error } = await supabase.functions.invoke('calendly-oauth', {
        body: { 
          action: 'cleanup_webhooks',
          projectId
        }
      });

      if (error) {
        console.error('Cleanup webhooks error:', error);
        throw new Error(error.message || 'Failed to cleanup webhooks');
      }

      console.log('🧹 Webhook cleanup result:', data);

      toast({
        title: "Webhooks Cleaned",
        description: `Removed ${data.cleaned_count} duplicate webhooks out of ${data.found_count} found.`,
      });

      // Refresh connection status after cleanup
      setTimeout(() => checkConnectionStatus(), 1000);

    } catch (error) {
      console.error('Webhook cleanup failed:', error);
      toast({
        title: "Webhook Cleanup Failed", 
        description: error.message || "Failed to cleanup webhooks",
        variant: "destructive"
      });
    } finally {
      setCleaningWebhooks(false);
    }
  };

  const debugSync = async () => {
    if (!projectId) return;

    setDebugging(true);
    
    try {
      console.log('🐛 Starting debug sync with enhanced logging...');
      
      const { data, error } = await supabase.functions.invoke('calendly-sync-gaps', {
        body: { 
          triggerReason: 'debug_sync',
          projectId,
          debugMode: true
        }
      });

      if (error) {
        console.error('Debug sync error:', error);
        throw new Error(error.message || 'Failed to run debug sync');
      }

      console.log('🐛 Debug sync result:', data);

      toast({
        title: "Debug Sync Complete",
        description: `Found ${data.gapsFound} gaps, synced ${data.eventsSynced} events. Check console for detailed logs.`,
      });

    } catch (error) {
      console.error('Debug sync failed:', error);
      toast({
        title: "Debug Sync Failed", 
        description: error.message || "Failed to run debug sync",
        variant: "destructive"
      });
    } finally {
      setDebugging(false);
    }
  };

  const manualResyncEvents = async () => {
    if (!projectId) return;

    setSyncing(true);
    
    try {
      console.log('Triggering enhanced manual gap sync...');
      
      const { data, error } = await supabase.functions.invoke('calendly-sync-gaps', {
        body: { 
          triggerReason: 'manual_sync_enhanced',
          projectId,
          debugMode: debugMode
        }
      });

      if (error) {
        console.error('Manual sync error:', error);
        throw new Error(error.message || 'Failed to sync events');
      }

      console.log('Manual sync result:', data);

      toast({
        title: "Events Synced Successfully",
        description: `Found and synced ${data.eventsSynced} events. ${data.gapsFound} gaps detected and filled.`,
      });

    } catch (error) {
      console.error('Manual sync error:', error);
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

    console.log('🎯 Toggling event mapping:', {
      eventName: eventType.name,
      eventUri: eventType.uri,
      isActive,
      projectId
    });

    try {
      if (isActive) {
        // Use upsert to handle the unique constraint
        const { error } = await supabase
          .from('calendly_event_mappings')
          .upsert({
            project_id: projectId,
            calendly_event_type_id: eventType.uri,
            event_type_name: eventType.name,
            is_active: true,
          }, {
            onConflict: 'project_id,calendly_event_type_id'
          });

        if (error) {
          console.error('❌ Error upserting mapping:', error);
          throw error;
        }
        
        console.log('✅ Successfully activated mapping for:', eventType.name);
      } else {
        // Delete the mapping when deactivating
        const { error } = await supabase
          .from('calendly_event_mappings')
          .delete()
          .eq('project_id', projectId)
          .eq('calendly_event_type_id', eventType.uri);

        if (error) {
          console.error('❌ Error deleting mapping:', error);
          throw error;
        }
        
        console.log('✅ Successfully deactivated mapping for:', eventType.name);
      }

      // Reload mappings without triggering full connection check
      await loadEventMappings();
      
      toast({
        title: isActive ? "Event Added" : "Event Removed",
        description: `${eventType.name} ${isActive ? 'will now be' : 'will no longer be'} tracked`,
      });

      // Auto-sync historical events when first event type is added
      if (isActive) {
        const currentMappings = eventMappings.filter(m => m.is_active);
        if (currentMappings.length === 0) {
          console.log('🔄 Triggering auto-sync for first event mapping');
          setTimeout(() => manualResyncEvents(), 1000);
        }
      }
    } catch (error) {
      console.error('💥 Failed to update event mapping for:', eventType.name, error);
      
      toast({
        title: "Error",
        description: `Failed to update event tracking for ${eventType.name}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const isEventMapped = (eventTypeUri: string) => {
    const mapping = eventMappings.find(mapping => 
      mapping.calendly_event_type_id === eventTypeUri && mapping.is_active
    );
    
    return !!mapping;
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
      setWebhookStatus('unknown');
      setWebhookMessage('');
      onConnectionChange(false);
      
      toast({
        title: "Disconnected",
        description: "Calendly account has been disconnected and webhooks removed",
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
                {webhookStatus === 'registered' && (
                  <Badge variant="outline" className="text-blue-600 border-blue-600">
                    Real-time Active
                  </Badge>
                )}
                {webhookStatus === 'polling' && (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    Polling Mode
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={checkConnectionStatus} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={listWebhooks}
                  disabled={listingWebhooks}
                  className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                >
                  <Search className={`h-4 w-4 mr-1 ${listingWebhooks ? 'animate-spin' : ''}`} />
                  List Webhooks
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={cleanupWebhooks}
                  disabled={cleaningWebhooks}
                  className="bg-red-50 hover:bg-red-100 border-red-200"
                >
                  <Trash2 className={`h-4 w-4 mr-1 ${cleaningWebhooks ? 'animate-spin' : ''}`} />
                  Clean Webhooks
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={debugSync}
                  disabled={debugging}
                  className="bg-orange-50 hover:bg-orange-100 border-orange-200"
                >
                  <Bug className={`h-4 w-4 mr-1 ${debugging ? 'animate-spin' : ''}`} />
                  Debug Sync
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={manualResyncEvents}
                  disabled={syncing}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                  Re-sync Events
                </Button>
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
            </div>

            {webhookStatus === 'registered' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <CheckCircle className="h-4 w-4 inline mr-2" />
                  Real-time webhooks are active! You'll get instant notifications for new bookings and cancellations.
                </p>
                {webhookMessage && (
                  <p className="text-xs text-green-600 mt-1">
                    {webhookMessage}
                  </p>
                )}
              </div>
            )}

            {webhookStatus === 'polling' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  Using polling mode for updates. Events will be synced via API polling (may have delays).
                </p>
                {webhookMessage && (
                  <p className="text-xs text-yellow-600 mt-1">
                    {webhookMessage}
                  </p>
                )}
                <div className="mt-2">
                  <p className="text-xs text-yellow-700">
                    💡 Use "Clean Webhooks" to remove duplicates, then reconnect for real-time updates.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <Settings className="h-4 w-4 text-gray-500" />
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={debugMode}
                  onCheckedChange={(checked) => setDebugMode(checked === true)}
                />
                Enable enhanced debugging (logs 7 days of events)
              </label>
            </div>

            {(syncing || debugging || cleaningWebhooks || listingWebhooks) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-700">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    {debugging && 'Running debug sync with enhanced logging...'}
                    {syncing && 'Re-syncing events...'}
                    {cleaningWebhooks && 'Cleaning up duplicate webhooks...'}
                    {listingWebhooks && 'Listing existing webhooks...'}
                  </span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  {debugging && 'Check browser console for detailed debug information.'}
                  {syncing && 'This may take a moment...'}
                  {cleaningWebhooks && 'Removing duplicate webhooks to enable real-time updates.'}
                  {listingWebhooks && 'Checking for existing webhook configurations.'}
                </p>
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
                              toggleEventMapping(eventType, checked === true)
                            }
                          />
                          <div>
                            <p className="font-medium">{eventType.name}</p>
                            <p className="text-sm text-gray-500">
                              {eventType.duration} minutes • {eventType.kind}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">
                              {eventType.uri}
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
                      {webhookStatus === 'registered' 
                        ? 'Real-time webhook updates are active.'
                        : 'Events are synced via API polling. Use "Clean Webhooks" and reconnect for real-time updates.'
                      }
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
