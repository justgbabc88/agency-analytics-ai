
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useAgency = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: agency, isLoading } = useQuery({
    queryKey: ['agency', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
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
