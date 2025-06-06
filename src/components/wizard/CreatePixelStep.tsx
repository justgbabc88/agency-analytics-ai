
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PixelData {
  id?: string;
  name: string;
  pixelId: string;
  domains: string;
  config: any;
}

interface CreatePixelStepProps {
  projectId: string;
  pixelData: PixelData;
  updatePixelData: (updates: Partial<PixelData>) => void;
  onComplete: () => void;
}

export const CreatePixelStep = ({ projectId, pixelData, updatePixelData, onComplete }: CreatePixelStepProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generatePixelId = () => {
    const id = `pixel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    updatePixelData({ pixelId: id });
  };

  useEffect(() => {
    if (!pixelData.pixelId) {
      generatePixelId();
    }
  }, []);

  const createPixel = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('tracking_pixels')
        .insert({
          project_id: projectId,
          name: pixelData.name,
          pixel_id: pixelData.pixelId,
          domains: pixelData.domains ? pixelData.domains.split(',').map(d => d.trim()) : null,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      updatePixelData({ id: data.id });
      queryClient.invalidateQueries({ queryKey: ['tracking-pixels', projectId] });
      toast({
        title: "Success!",
        description: "Tracking pixel created successfully",
      });
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create tracking pixel",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!pixelData.name.trim()) {
      toast({
        title: "Required Field",
        description: "Please enter a pixel name",
        variant: "destructive",
      });
      return;
    }
    
    setIsCreating(true);
    createPixel.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Create Your Tracking Pixel</h3>
        <p className="text-muted-foreground">
          Start by giving your pixel a name and specifying which domains it will track.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Pixel Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="pixelName">Pixel Name *</Label>
            <Input
              id="pixelName"
              value={pixelData.name}
              onChange={(e) => updatePixelData({ name: e.target.value })}
              placeholder="e.g., Main Website Pixel"
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Give your pixel a descriptive name to easily identify it later.
            </p>
          </div>

          <div>
            <Label htmlFor="domains">Allowed Domains (Optional)</Label>
            <Input
              id="domains"
              value={pixelData.domains}
              onChange={(e) => updatePixelData({ domains: e.target.value })}
              placeholder="e.g., yourdomain.com, subdomain.yourdomain.com"
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Comma-separated list of domains where this pixel will be installed. Leave empty to allow all domains.
            </p>
          </div>

          <div>
            <Label htmlFor="pixelId">Pixel ID</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="pixelId"
                value={pixelData.pixelId}
                readOnly
                className="bg-muted"
              />
              <Button onClick={generatePixelId} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Unique identifier for your pixel. Click refresh to generate a new one.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={handleCreate} 
          disabled={!pixelData.name.trim() || isCreating}
          size="lg"
        >
          {isCreating ? "Creating..." : "Create Pixel"}
        </Button>
      </div>
    </div>
  );
};
