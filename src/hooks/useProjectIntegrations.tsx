
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useProjectIntegrations = (projectId?: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['project-integrations', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      console.log('Fetching project integrations for project:', projectId);
      
      const { data, error } = await supabase
        .from('project_integrations')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching project integrations:', error);
        throw error;
      }
      
      console.log('Project integrations fetched:', data);
      return data || [];
    },
    enabled: !!projectId,
  });

  const updateIntegration = useMutation({
    mutationFn: async ({ platform, isConnected }: { platform: string; isConnected: boolean }) => {
      if (!projectId) throw new Error('No project ID provided');
      
      console.log('Updating integration:', { projectId, platform, isConnected });
      
      // Use upsert to handle the unique constraint properly
      const { data, error } = await supabase
        .from('project_integrations')
        .upsert({
          project_id: projectId,
          platform,
          is_connected: isConnected,
          last_sync: isConnected ? new Date().toISOString() : null,
        }, {
          onConflict: 'project_id,platform',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating project integration:', error);
        throw error;
      }
      
      console.log('Integration updated successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-integrations'] });
      toast({
        title: "Success",
        description: "Integration updated successfully",
      });
    },
    onError: (error) => {
      console.error('Integration update failed:', error);
      toast({
        title: "Error",
        description: `Failed to update integration: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const syncIntegration = useMutation({
    mutationFn: async (platform: string) => {
      if (!projectId) throw new Error('No project ID provided');
      
      console.log('Syncing integration:', { projectId, platform });
      
      const { data, error } = await supabase.functions.invoke('sync-project-integrations', {
        body: {
          platform,
          projectId
        }
      });

      if (error) {
        console.error('Error syncing integration:', error);
        throw error;
      }
      
      console.log('Integration synced successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-integrations'] });
      toast({
        title: "Success",
        description: "Integration synced successfully",
      });
    },
    onError: (error) => {
      console.error('Integration sync failed:', error);
      toast({
        title: "Error",
        description: `Failed to sync integration: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  return {
    integrations,
    isLoading,
    updateIntegration,
    syncIntegration,
  };
};
