import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SimplifiedInstallationGuide } from './SimplifiedInstallationGuide';
import { FunnelPageMapper } from './FunnelPageMapper';
import { Code, ArrowLeft, Settings, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ExistingPixelManagerProps {
  projectId: string;
}

interface PixelWithConfig {
  id: string;
  name: string;
  pixel_id: string;
  project_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  domains: string[] | null;
  conversion_events: string[];
  config: {
    funnelPages?: any[];
  } | null;
}

export const ExistingPixelManager = ({ projectId }: ExistingPixelManagerProps) => {
  const [selectedPixelId, setSelectedPixelId] = useState<string>('');
  const [selectedPixel, setSelectedPixel] = useState<PixelWithConfig | null>(null);
  const [showCodes, setShowCodes] = useState(false);
  const [editingPages, setEditingPages] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: pixels, isLoading } = useQuery({
    queryKey: ['tracking-pixels', projectId],
    queryFn: async () => {
      console.log('Fetching pixels for project:', projectId);
      const { data, error } = await supabase
        .from('tracking_pixels')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pixels:', error);
        throw error;
      }
      console.log('Fetched pixels:', data);
      return (data || []) as PixelWithConfig[];
    },
    enabled: !!projectId,
  });

  // Update selected pixel when pixels data changes
  useEffect(() => {
    if (selectedPixelId && pixels) {
      const updatedPixel = pixels.find(p => p.id === selectedPixelId);
      if (updatedPixel) {
        console.log('Updating selected pixel with fresh data:', updatedPixel);
        setSelectedPixel(updatedPixel);
      }
    }
  }, [pixels, selectedPixelId]);

  const updatePixelConfig = useMutation({
    mutationFn: async ({ pixelId, config }: { pixelId: string; config: any }) => {
      const { error } = await supabase
        .from('tracking_pixels')
        .update({ config })
        .eq('id', pixelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking-pixels', projectId] });
      toast({
        title: "Success",
        description: "Pixel configuration updated successfully",
      });
    },
  });

  const clearPixelData = useMutation({
    mutationFn: async (pixelId: string) => {
      console.log('Clearing data for pixel:', pixelId);
      
      // Delete tracking events for this project
      const { error: eventsError } = await supabase
        .from('tracking_events')
        .delete()
        .eq('project_id', projectId);

      if (eventsError) {
        console.error('Error deleting tracking events:', eventsError);
        throw eventsError;
      }

      // Delete tracking sessions for this project
      const { error: sessionsError } = await supabase
        .from('tracking_sessions')
        .delete()
        .eq('project_id', projectId);

      if (sessionsError) {
        console.error('Error deleting tracking sessions:', sessionsError);
        throw sessionsError;
      }

      // Delete attribution data for this project
      const { error: attributionError } = await supabase
        .from('attribution_data')
        .delete()
        .eq('project_id', projectId);

      if (attributionError) {
        console.error('Error deleting attribution data:', attributionError);
        throw attributionError;
      }

      console.log('Successfully cleared all tracking data for project');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking-pixels', projectId] });
      queryClient.invalidateQueries({ queryKey: ['recent-events', projectId] });
      queryClient.invalidateQueries({ queryKey: ['event-stats', projectId] });
      // Add attribution-related query invalidations
      queryClient.invalidateQueries({ queryKey: ['event-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tracking-pixels'] });
      toast({
        title: "Success",
        description: "All tracking data cleared successfully",
      });
    },
    onError: (error) => {
      console.error('Error clearing pixel data:', error);
      toast({
        title: "Error",
        description: "Failed to clear tracking data",
        variant: "destructive",
      });
    },
  });

  const handlePixelSelect = (pixelId: string) => {
    console.log('Selecting pixel:', pixelId);
    const pixel = pixels?.find(p => p.id === pixelId);
    if (pixel) {
      console.log('Selected pixel:', pixel);
      setSelectedPixelId(pixelId);
      setSelectedPixel(pixel);
      setShowCodes(false);
      setEditingPages(false);
    }
  };

  const handlePagesUpdate = async (pages: any[]) => {
    if (!selectedPixel) return;

    const updatedConfig = {
      ...(selectedPixel.config || {}),
      funnelPages: pages
    };

    await updatePixelConfig.mutateAsync({
      pixelId: selectedPixel.id,
      config: updatedConfig
    });

    // The pixel will be updated via the useEffect when the query invalidates
    setEditingPages(false);
    
    // Show codes if we have pages configured
    if (pages.length > 0) {
      setShowCodes(true);
    }
  };

  const handleBackToSelection = () => {
    setSelectedPixelId('');
    setSelectedPixel(null);
    setShowCodes(false);
    setEditingPages(false);
  };

  if (isLoading) {
    return <div>Loading pixels...</div>;
  }

  if (!pixels || pixels.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Code className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Pixels Found</h3>
          <p className="text-gray-600">
            You haven't created any tracking pixels yet. Use the Quick Setup to create your first pixel.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!selectedPixel) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select a Tracking Pixel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Choose a pixel to manage:</label>
            <Select value={selectedPixelId} onValueChange={handlePixelSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tracking pixel" />
              </SelectTrigger>
              <SelectContent>
                {pixels.map((pixel) => (
                  <SelectItem key={pixel.id} value={pixel.id}>
                    <div className="flex items-center gap-2">
                      <span>{pixel.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {pixel.pixel_id}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (editingPages) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingPages(false)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pixel
          </Button>
          <h3 className="font-semibold">Edit Funnel Pages for {selectedPixel.name}</h3>
        </div>
        
        <FunnelPageMapper
          onPagesConfigured={handlePagesUpdate}
          initialPages={selectedPixel?.config?.funnelPages || []}
        />
      </div>
    );
  }

  if (showCodes && selectedPixel) {
    const pixelData = {
      name: selectedPixel.name,
      pixelId: selectedPixel.pixel_id,
      domains: selectedPixel.domains?.join(', ') || 'All domains'
    };

    const funnelPages = selectedPixel.config?.funnelPages || [];
    console.log('Showing codes for funnel pages:', funnelPages);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCodes(false)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pixel Management
          </Button>
          <h3 className="font-semibold">Tracking Codes for {selectedPixel.name}</h3>
        </div>

        <SimplifiedInstallationGuide
          pixelData={pixelData}
          funnelPages={funnelPages}
        />
      </div>
    );
  }

  // Main pixel management view
  const funnelPages = selectedPixel.config?.funnelPages || [];
  const hasFunnelPages = funnelPages.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToSelection}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pixel Selection
        </Button>
        <h3 className="font-semibold">Manage {selectedPixel?.name}</h3>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pixel Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Name:</span> {selectedPixel.name}</div>
            <div><span className="font-medium">Pixel ID:</span> {selectedPixel.pixel_id}</div>
            <div><span className="font-medium">Domains:</span> {selectedPixel.domains?.join(', ') || 'All domains'}</div>
            <div><span className="font-medium">Pages Configured:</span> {funnelPages.length}</div>
            <div><span className="font-medium">Status:</span> 
              <Badge variant={selectedPixel.is_active ? "default" : "secondary"} className="ml-2">
                {selectedPixel.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>

          {hasFunnelPages && (
            <div className="space-y-2">
              <h4 className="font-medium">Configured Pages:</h4>
              <div className="space-y-1">
                {funnelPages.map((page: any, index: number) => (
                  <div key={page.id || index} className="text-sm border rounded p-2">
                    <div className="font-medium">{page.name}</div>
                    <div className="text-gray-600 text-xs">{page.url}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(page.events || []).map((event: string) => (
                        <Badge key={event} variant="outline" className="text-xs px-1 py-0">
                          {event.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            {hasFunnelPages ? (
              <>
                <Button onClick={() => setShowCodes(true)}>
                  <Code className="h-4 w-4 mr-2" />
                  View Tracking Codes
                </Button>
                <Button variant="outline" onClick={() => setEditingPages(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Pages
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditingPages(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Configure Funnel Pages
              </Button>
            )}
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-orange-600 hover:text-orange-700">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Clear Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Tracking Data</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all tracking events, sessions, and attribution data for this project. 
                    This action cannot be undone. Are you sure you want to proceed?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => selectedPixel && clearPixelData.mutate(selectedPixel.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Clear All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {!hasFunnelPages && (
            <div className="text-center py-4 text-gray-500 bg-gray-50 rounded">
              <p className="text-sm">No funnel pages configured yet.</p>
              <p className="text-xs">Configure your funnel pages to start generating tracking codes.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
