
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useAgency = () => {
  const { user, ensureAgency } = useAuth();
  const queryClient = useQueryClient();

  const { data: agency, isLoading } = useQuery({
    queryKey: ['agency', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // First try to get existing agency
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching agency:', error);
        throw error;
      }

      // If no agency exists, create one
      if (!data) {
        console.log('No agency found, creating one...');
        return await ensureAgency();
      }

      return data;
    },
    enabled: !!user,
    retry: 1,
  });

  const updateAgency = useMutation({
    mutationFn: async (updates: { name?: string; website?: string }) => {
      if (!agency) throw new Error('No agency found');
      
      const { data, error } = await supabase
        .from('agencies')
        .update(updates)
        .eq('id', agency.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency'] });
    },
  });

  return {
    agency,
    isLoading,
    updateAgency,
  };
};
