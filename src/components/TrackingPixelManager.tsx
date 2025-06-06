
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ExistingPixelManager } from './wizard/ExistingPixelManager';
import { PixelSetupWizard } from './PixelSetupWizard';
import { Code, Plus, Settings, AlertTriangle } from "lucide-react";
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

interface TrackingPixelManagerProps {
  projectId: string;
}

export const TrackingPixelManager = ({ projectId }: TrackingPixelManagerProps) => {
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing');
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
      return data || [];
    },
    enabled: !!projectId,
  });

  const clearPixelData = useMutation({
    mutationFn: async () => {
      console.log('Clearing all tracking data for project:', projectId);
      
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
      // Invalidate all relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['tracking-pixels', projectId] });
      queryClient.invalidateQueries({ queryKey: ['recent-events', projectId] });
      queryClient.invalidateQueries({ queryKey: ['event-stats', projectId] });
      queryClient.invalidateQueries({ queryKey: ['attribution-data', projectId] });
      
      // Also invalidate any pixel-specific queries
      pixels?.forEach(pixel => {
        queryClient.invalidateQueries({ queryKey: ['event-stats', projectId, pixel.id] });
      });

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

  if (isLoading) {
    return <div>Loading tracking pixels...</div>;
  }

  const hasPixels = pixels && pixels.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Tracking Pixel Manager</h2>
        <div className="flex gap-2">
          {hasPixels && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-orange-600 hover:text-orange-700">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Clear All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Tracking Data</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all tracking events, sessions, and attribution data for this project. 
                    This action cannot be undone. Are you sure you want to proceed?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => clearPixelData.mutate()}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Clear All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('existing')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'existing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="h-4 w-4 inline mr-2" />
            Manage Existing Pixels
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'new'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Plus className="h-4 w-4 inline mr-2" />
            Create New Pixel
          </button>
        </nav>
      </div>

      {activeTab === 'existing' ? (
        <ExistingPixelManager projectId={projectId} />
      ) : (
        <PixelSetupWizard projectId={projectId} />
      )}
    </div>
  );
};
