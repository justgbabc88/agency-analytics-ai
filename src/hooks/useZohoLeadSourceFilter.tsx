import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Deal {
  Lead_Source?: string;
  Agreement_Received_Date?: string;
  [key: string]: any;
}

export const useZohoLeadSourceFilter = (projectId?: string) => {
  const [leadSources, setLeadSources] = useState<string[]>([]);
  const [selectedLeadSources, setSelectedLeadSources] = useState<string[]>([]);
  const [allDeals, setAllDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchZohoDeals();
    }
  }, [projectId]);

  const fetchZohoDeals = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
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
        const dealsData = zohoData.data?.deals?.records || [];
        
        setAllDeals(dealsData);

        // Extract unique lead sources
        const sources = Array.from(new Set(
          dealsData
            .map((deal: Deal) => deal.Lead_Source)
            .filter(Boolean)
        )) as string[];
        setLeadSources(sources);
      }
    } catch (error) {
      console.error('Error fetching Zoho deals for lead source filter:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter deals by selected lead sources
  const getFilteredDeals = () => {
    if (selectedLeadSources.length === 0) return allDeals;
    return allDeals.filter(deal => 
      deal.Lead_Source && selectedLeadSources.includes(deal.Lead_Source)
    );
  };

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
    filteredDeals: getFilteredDeals(),
    loading,
    handleLeadSourceToggle,
    clearAllLeadSources,
    selectAllLeadSources,
    refetchDeals: fetchZohoDeals
  };
};