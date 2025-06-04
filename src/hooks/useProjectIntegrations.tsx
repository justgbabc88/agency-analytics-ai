
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useProjectIntegrations = (projectId?: string) => {
  const queryClient = useQueryClient();

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['project-integrations', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      console.log('Fetching integrations for project:', projectId);
      
      const { data, error } = await supabase
        .from('project_integrations')
        .select('*')
        .eq('project_id', projectId)
        .order('platform');

      if (error) {
        console.error('Error fetching project integrations:', error);
        throw error;
      }
      
      console.log('Fetched integrations:', data);
      return data || [];
    },
    enabled: !!projectId,
  });

  const updateIntegration = useMutation({
    mutationFn: async ({ platform, isConnected }: { platform: string; isConnected: boolean }) => {
      if (!projectId) throw new Error('No project selected');
      
      console.log('Updating integration:', { projectId, platform, isConnected });
      
      const updateData = {
        project_id: projectId,
        platform,
        is_connected: isConnected,
        last_sync: isConnected ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('project_integrations')
        .upsert(updateData, {
          onConflict: 'project_id,platform',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating integration:', error);
        throw error;
      }
      
      console.log('Updated integration:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-integrations', projectId] });
    },
  });

  const syncIntegration = useMutation({
    mutationFn: async ({ platform, apiKeys }: { platform: string; apiKeys: Record<string, string> }) => {
      if (!projectId) throw new Error('No project selected');
      
      console.log('Syncing integration:', { projectId, platform });
      
      const { data, error } = await supabase.functions.invoke('sync-project-integrations', {
        body: { 
          projectId,
          platform, 
          apiKeys 
        }
      });

      if (error) {
        console.error('Error syncing integration:', error);
        throw error;
      }
      
      console.log('Sync result:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-integrations', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-integration-data', projectId] });
    },
  });

  return {
    integrations: integrations || [],
    isLoading,
    updateIntegration,
    syncIntegration,
  };
};
