
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Zap } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { SimplifiedInstallationGuide } from './wizard/SimplifiedInstallationGuide';
import { FunnelPageMapper } from './wizard/FunnelPageMapper';

interface PixelSetupWizardProps {
  projectId: string;
}

interface PixelData {
  name: string;
  pixelId: string;
  domains: string;
}

export const PixelSetupWizard = ({ projectId }: PixelSetupWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [pixelName, setPixelName] = useState('');
  const [domains, setDomains] = useState('');
  const [pixelData, setPixelData] = useState<PixelData | null>(null);
  const [funnelPages, setFunnelPages] = useState<any[]>([]);
  const [createdPixelId, setCreatedPixelId] = useState<string>('');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check for existing pixels to enforce 1 pixel per project
  const { data: existingPixels } = useQuery({
    queryKey: ['tracking-pixels', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracking_pixels')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });

  // Get project details to know the funnel type
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const createPixel = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('tracking_pixels')
        .insert([{
          name: pixelName,
          pixel_id: 'pixel_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          project_id: projectId,
          is_active: true,
          domains: domains.split(',').map(s => s.trim()).filter(s => s.length > 0),
          conversion_events: [],
          config: {
            funnelPages: []
          }
        }])
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      console.log('Pixel created successfully:', data);
      setPixelData({
        name: data.name,
        pixelId: data.pixel_id,
        domains: data.domains?.join(', ') || 'All domains'
      });
      setCreatedPixelId(data.id);
      setCurrentStep(2); // Move to page configuration step
      queryClient.invalidateQueries({ queryKey: ['tracking-pixels', projectId] });
      toast({
        title: "Success",
        description: "Tracking pixel created successfully. Now configure your funnel pages.",
      });
    },
    onError: (error) => {
      console.error('Error creating pixel:', error);
      toast({
        title: "Error",
        description: "Failed to create tracking pixel",
        variant: "destructive",
      });
    },
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

  const handleCreatePixel = async () => {
    if (!pixelName.trim()) {
      toast({
        title: "Error",
        description: "Pixel name is required",
        variant: "destructive",
      });
      return;
    }

    await createPixel.mutateAsync();
  };

  const handlePagesConfigured = async (pages: any[]) => {
    console.log('Pages configured:', pages);
    setFunnelPages(pages);

    if (!createdPixelId) {
      console.error('Created pixel ID not found');
      toast({
        title: "Error",
        description: "Pixel ID not found",
        variant: "destructive",
      });
      return;
    }

    const config = {
      funnelPages: pages
    };

    await updatePixelConfig.mutateAsync({
      pixelId: createdPixelId,
      config: config
    });

    setCurrentStep(3); // Move to installation guide step
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  // If project already has a pixel, show existing pixel manager instead
  if (existingPixels && existingPixels.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pixel Already Exists</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Target className="h-16 w-16 mx-auto text-blue-600 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Project Pixel Active</h3>
          <p className="text-gray-600 mb-4">
            This project already has a tracking pixel configured. Each project can only have one pixel.
          </p>
          <p className="text-sm text-gray-500">
            Use the "Manage Pixels" tab to edit your existing pixel configuration.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Pixel Setup
          </CardTitle>
          <p className="text-gray-600">
            Create and configure your tracking pixel in a few simple steps.
          </p>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pixel-name">Pixel Name</Label>
                <Input
                  id="pixel-name"
                  placeholder="e.g., My Awesome Project"
                  value={pixelName}
                  onChange={(e) => setPixelName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domains">Domains (comma-separated, optional)</Label>
                <Input
                  id="domains"
                  placeholder="e.g., yourdomain.com, anotherdomain.net"
                  value={domains}
                  onChange={(e) => setDomains(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleCreatePixel} 
                disabled={createPixel.isPending || !pixelName.trim()}
                className="w-full"
              >
                {createPixel.isPending ? "Creating..." : "Create Pixel & Configure Pages"}
              </Button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Configure Funnel Pages</h3>
                <p className="text-muted-foreground">
                  Set up the pages in your funnel to generate optimized tracking codes for each step.
                </p>
              </div>
              <FunnelPageMapper
                onPagesConfigured={handlePagesConfigured}
                funnelType={project?.funnel_type}
              />
            </div>
          )}

          {currentStep === 3 && pixelData && funnelPages.length > 0 && (
            <SimplifiedInstallationGuide
              pixelData={pixelData}
              funnelPages={funnelPages}
            />
          )}

          {currentStep > 1 && (
            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
