
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAgency } from './useAgency';
import { useApiKeys } from './useApiKeys';

export const useIntegrations = () => {
  const { user } = useAuth();
  const { agency } = useAgency();
  const { getApiKeys } = useApiKeys();
  const queryClient = useQueryClient();

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations', agency?.id],
    queryFn: async () => {
      if (!agency) return [];
      
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('agency_id', agency.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!agency,
  });

  // Query for integration data (including Supermetrics data)
  const { data: integrationData } = useQuery({
    queryKey: ['integration_data', agency?.id],
    queryFn: async () => {
      if (!agency) return [];
      
      const { data, error } = await supabase
        .from('integration_data')
        .select('*')
        .eq('agency_id', agency.id)
        .order('synced_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!agency,
  });

  const updateIntegration = useMutation({
    mutationFn: async ({ platform, isConnected }: { platform: string; isConnected: boolean }) => {
      if (!agency) throw new Error('No agency found');
      
      if (isConnected) {
        // If connecting, try to sync data using the stored API keys
        const apiKeys = getApiKeys(platform);
        
        if (Object.keys(apiKeys).length > 0) {
          const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-integrations', {
            body: {
              platform,
              apiKeys,
              agencyId: agency.id
            }
          });

          if (syncError) {
            console.error('Sync error:', syncError);
          } else {
            console.log('Sync successful:', syncData);
          }
        }
      }
      
      const { data, error } = await supabase
        .from('integrations')
        .upsert({
          agency_id: agency.id,
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
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integration_data'] });
    },
  });

  const syncIntegration = useMutation({
    mutationFn: async (platform: string) => {
      if (!agency) throw new Error('No agency found');
      
      const apiKeys = getApiKeys(platform);
      
      const { data, error } = await supabase.functions.invoke('sync-integrations', {
        body: {
          platform,
          apiKeys,
          agencyId: agency.id
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integration_data'] });
    },
  });

  // Helper function to get Supermetrics data specifically
  const getSupermetricsData = () => {
    return integrationData?.find(data => data.platform === 'supermetrics')?.data;
  };

  return {
    integrations,
    integrationData,
    isLoading,
    updateIntegration,
    syncIntegration,
    getSupermetricsData,
  };
};
