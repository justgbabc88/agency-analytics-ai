
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAgency } from './useAgency';

export const useAIInsights = (campaignId?: string) => {
  const { agency } = useAgency();
  const queryClient = useQueryClient();

  const { data: insights, isLoading } = useQuery({
    queryKey: ['ai-insights', campaignId],
    queryFn: async () => {
      if (!agency) return [];
      
      let query = supabase
        .from('ai_insights')
        .select(`
          *,
          campaigns (
            name,
            clients (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!agency,
  });

  const markAsRead = useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from('ai_insights')
        .update({ is_read: true })
        .eq('id', insightId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
    },
  });

  const generateInsight = useMutation({
    mutationFn: async ({ campaignId, type, title, description, priority }: {
      campaignId: string;
      type: string;
      title: string;
      description: string;
      priority: string;
    }) => {
      const { data, error } = await supabase
        .from('ai_insights')
        .insert({
          campaign_id: campaignId,
          insight_type: type,
          title,
          description,
          priority,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
    },
  });

  return {
    insights,
    isLoading,
    markAsRead,
    generateInsight,
  };
};
