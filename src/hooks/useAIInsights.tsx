
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
    mutationFn: async ({ campaignId, type, title, description, priority, campaignData }: {
      campaignId: string;
      type: string;
      title: string;
      description: string;
      priority: string;
      campaignData?: any;
    }) => {
      try {
        // Use ChatGPT to generate more detailed insights
        const messages = [
          {
            role: 'user',
            content: `Generate a detailed marketing insight for a campaign with this data: ${JSON.stringify(campaignData || {})}. The insight should be about: ${description}. Make it actionable and specific.`
          }
        ];

        const { data: aiResponse, error: aiError } = await supabase.functions.invoke('chat-gpt', {
          body: { 
            messages, 
            context: { 
              type: 'general_insights',
              campaignData 
            }
          }
        });

        let enhancedDescription = description;
        if (!aiError && aiResponse?.response) {
          enhancedDescription = aiResponse.response;
        }

        const { data, error } = await supabase
          .from('ai_insights')
          .insert({
            campaign_id: campaignId,
            insight_type: type,
            title,
            description: enhancedDescription,
            priority,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error generating AI insight:', error);
        
        // Fallback to original description if ChatGPT fails
        const { data, error: dbError } = await supabase
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

        if (dbError) throw dbError;
        return data;
      }
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
