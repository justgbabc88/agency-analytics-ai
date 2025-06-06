
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SimplifiedInstallationGuide } from './SimplifiedInstallationGuide';
import { FunnelPageMapper } from './FunnelPageMapper';
import { Code, ArrowLeft, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
        <h3 className="font-semibold">Manage {selectedPixel.name}</h3>
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
