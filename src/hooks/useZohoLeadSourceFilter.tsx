import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Deal {
  Lead_Source?: string;
  Agreement_Received_Date?: string;
  [key: string]: any;
}

export const useZohoLeadSourceFilter = (projectId?: string) => {
  const [selectedLeadSources, setSelectedLeadSources] = useState<string[]>([]);

  // Use React Query for efficient caching of Zoho data
  const { data: zohoData, isLoading, refetch } = useQuery({
    queryKey: ['zoho-deals', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('project_integration_data')
        .select('data')
        .eq('project_id', projectId)
        .eq('platform', 'zoho_crm')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data?.data) {
        const zohoData = data.data as any;
        return zohoData.data?.deals?.records || [];
      }
      
      return [];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
  });

  const allDeals = zohoData || [];

  // Extract unique lead sources with memoization
  const leadSources = useMemo(() => {
    if (!allDeals.length) return [];
    
    const sources = Array.from(new Set(
      allDeals
        .map((deal: Deal) => deal.Lead_Source)
        .filter(Boolean)
    )) as string[];
    
    return sources;
  }, [allDeals]);

  // Filter deals by selected lead sources with memoization
  const filteredDeals = useMemo(() => {
    if (selectedLeadSources.length === 0) return allDeals;
    return allDeals.filter((deal: Deal) => 
      deal.Lead_Source && selectedLeadSources.includes(deal.Lead_Source)
    );
  }, [allDeals, selectedLeadSources]);

  const handleLeadSourceToggle = (source: string, checked: boolean) => {
    if (checked) {
      setSelectedLeadSources(prev => [...prev, source]);
    } else {
      setSelectedLeadSources(prev => prev.filter(s => s !== source));
    }
  };

  const clearAllLeadSources = () => {
    setSelectedLeadSources([]);
  };

  const selectAllLeadSources = () => {
    setSelectedLeadSources([...leadSources]);
  };

  return {
    leadSources,
    selectedLeadSources,
    allDeals,
    filteredDeals,
    loading: isLoading,
    handleLeadSourceToggle,
    clearAllLeadSources,
    selectAllLeadSources,
    refetchDeals: refetch
  };
};