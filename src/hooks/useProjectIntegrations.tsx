
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useProjectIntegrations = (projectId?: string) => {
  const queryClient = useQueryClient();

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['project-integrations', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      console.log('Fetching integrations for project:', projectId);
      
      try {
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
      } catch (error) {
        console.error('Failed to fetch project integrations:', error);
        throw error;
      }
    },
    enabled: !!projectId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const updateIntegration = useMutation({
    mutationFn: async ({ platform, isConnected }: { platform: string; isConnected: boolean }) => {
      if (!projectId) {
        const error = new Error('No project selected');
        console.error('Update integration failed:', error.message);
        throw error;
      }
      
      console.log('Updating integration:', { projectId, platform, isConnected });
      
      try {
        // First check if the integration exists
        const { data: existing, error: checkError } = await supabase
          .from('project_integrations')
          .select('id, is_connected, last_sync')
          .eq('project_id', projectId)
          .eq('platform', platform)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking existing integration:', checkError);
          throw checkError;
        }

        let result;
        const timestamp = new Date().toISOString();

        if (existing) {
          // Update existing integration
          console.log('Updating existing integration:', existing.id);
          const { data, error } = await supabase
            .from('project_integrations')
            .update({
              is_connected: isConnected,
              last_sync: isConnected ? timestamp : existing.last_sync,
              updated_at: timestamp,
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (error) {
            console.error('Error updating existing integration:', error);
            throw error;
          }
          result = data;
        } else {
          // Create new integration
          console.log('Creating new integration for platform:', platform);
          const { data, error } = await supabase
            .from('project_integrations')
            .insert({
              project_id: projectId,
              platform,
              is_connected: isConnected,
              last_sync: isConnected ? timestamp : null,
              created_at: timestamp,
              updated_at: timestamp,
            })
            .select()
            .single();

          if (error) {
            console.error('Error creating new integration:', error);
            throw error;
          }
          result = data;
        }
        
        console.log('Integration operation completed successfully:', result);
        return result;
      } catch (error) {
        console.error('Error in updateIntegration:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-integrations', projectId] });
    },
    onError: (error) => {
      console.error('Integration update mutation failed:', error);
    },
  });

  const syncIntegration = useMutation({
    mutationFn: async ({ platform, apiKeys }: { platform: string; apiKeys: Record<string, string> }) => {
      if (!projectId) {
        const error = new Error('No project selected');
        console.error('Sync integration failed:', error.message);
        throw error;
      }
      
      console.log('Syncing integration:', { projectId, platform });
      
      try {
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
      } catch (error) {
        console.error('Failed to sync integration:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-integrations', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-integration-data', projectId] });
    },
    onError: (error) => {
      console.error('Integration sync mutation failed:', error);
    },
  });

  return {
    integrations: integrations || [],
    isLoading,
    updateIntegration,
    syncIntegration,
  };
};
