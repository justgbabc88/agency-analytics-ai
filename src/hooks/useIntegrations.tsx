
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useAgency } from './useAgency';
import { useSecureApiKeys } from './useSecureApiKeys';

export const useIntegrations = () => {
  const { user } = useAuth();
  const { agency } = useAgency();
  const { getApiKeys } = useSecureApiKeys();
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

  const updateIntegration = useMutation({
    mutationFn: async ({ platform, isConnected }: { platform: string; isConnected: boolean }) => {
      if (!agency) throw new Error('No agency found');
      
      console.log('🔄 updateIntegration starting with:', { platform, isConnected, agencyId: agency.id });
      
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
      
      console.log('📤 Attempting database operation...');
      
      // For disconnection, update the existing record instead of upsert
      if (!isConnected) {
        const { data, error } = await supabase
          .from('integrations')
          .update({
            is_connected: false,
            last_sync: null,
          })
          .eq('agency_id', agency.id)
          .eq('platform', platform)
          .select()
          .single();

        if (error) {
          console.error('❌ Database update failed:', error);
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        
        console.log('✅ Database update successful:', data);
        return data;
      } else {
        // For connection, use upsert
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

        if (error) {
          console.error('❌ Database upsert failed:', error);
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        
        console.log('✅ Database upsert successful:', data);
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
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
    },
  });

  return {
    integrations,
    isLoading,
    updateIntegration,
    syncIntegration,
  };
};
