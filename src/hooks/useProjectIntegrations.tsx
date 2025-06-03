
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useProjectIntegrations = (projectId?: string) => {
  const queryClient = useQueryClient();

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['project-integrations', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('project_integrations')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const updateIntegration = useMutation({
    mutationFn: async ({ platform, isConnected }: { platform: string; isConnected: boolean }) => {
      if (!projectId) throw new Error('No project selected');
      
      const { data, error } = await supabase
        .from('project_integrations')
        .upsert({
          project_id: projectId,
          platform,
          is_connected: isConnected,
          last_sync: isConnected ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-integrations', projectId] });
    },
  });

  const syncIntegration = useMutation({
    mutationFn: async ({ platform, apiKeys }: { platform: string; apiKeys: Record<string, string> }) => {
      if (!projectId) throw new Error('No project selected');
      
      const { data, error } = await supabase.functions.invoke('sync-project-integrations', {
        body: { 
          projectId,
          platform, 
          apiKeys 
        }
      });

      if (error) throw error;
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
