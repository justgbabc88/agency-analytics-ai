
import React, { useState } from 'react';
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

export const ExistingPixelManager = ({ projectId }: ExistingPixelManagerProps) => {
  const [selectedPixelId, setSelectedPixelId] = useState<string>('');
  const [selectedPixel, setSelectedPixel] = useState<any>(null);
  const [showCodes, setShowCodes] = useState(false);
  const [editingPages, setEditingPages] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: pixels, isLoading } = useQuery({
    queryKey: ['tracking-pixels', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracking_pixels')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

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
    const pixel = pixels?.find(p => p.id === pixelId);
    if (pixel) {
      setSelectedPixelId(pixelId);
      setSelectedPixel(pixel);
      setShowCodes(false);
      setEditingPages(false);
    }
  };

  const handlePagesUpdate = async (pages: any[]) => {
    const updatedConfig = {
      ...selectedPixel.config,
      funnelPages: pages
    };

    // Update the pixel configuration in the database
    await updatePixelConfig.mutateAsync({
      pixelId: selectedPixel.id,
      config: updatedConfig
    });

    // Update local state
    const updatedPixel = {
      ...selectedPixel,
      config: updatedConfig
    };
    setSelectedPixel(updatedPixel);
    setEditingPages(false);
    setShowCodes(true);
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

  if (!selectedPixel && !showCodes) {
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

          {selectedPixel && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <h4 className="font-medium mb-2">Pixel Details</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Name:</span> {selectedPixel.name}</div>
                  <div><span className="font-medium">Pixel ID:</span> {selectedPixel.pixel_id}</div>
                  <div><span className="font-medium">Domains:</span> {selectedPixel.domains?.join(', ') || 'All domains'}</div>
                  <div><span className="font-medium">Pages:</span> {selectedPixel.config?.funnelPages?.length || 0} configured</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setShowCodes(true)}>
                  <Code className="h-4 w-4 mr-2" />
                  Get Tracking Codes
                </Button>
                <Button variant="outline" onClick={() => setEditingPages(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Pages
                </Button>
              </div>
            </div>
          )}
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
          <h3 className="font-semibold">Edit Funnel Pages</h3>
        </div>
        
        <FunnelPageMapper
          onPagesConfigured={handlePagesUpdate}
          initialPages={selectedPixel.config?.funnelPages || []}
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

    if (funnelPages.length === 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCodes(false)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pixel Selection
            </Button>
            <h3 className="font-semibold">Tracking Codes for {selectedPixel.name}</h3>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <Settings className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pages Configured</h3>
              <p className="text-gray-600 mb-4">
                You need to configure your funnel pages before you can get the tracking codes.
              </p>
              <Button onClick={() => setEditingPages(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Configure Pages
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCodes(false)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pixel Selection
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

  return null;
};
