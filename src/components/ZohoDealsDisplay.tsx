import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DollarSign, Users, Filter, Search, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isEventInDateRange } from '@/utils/dateFiltering';

interface ZohoDealsDisplayProps {
  projectId?: string;
  zohoLeadSourceFilter?: {
    leadSources: string[];
    selectedLeadSources: string[];
    filteredDeals: any[];
    loading: boolean;
    handleLeadSourceToggle: (source: string, checked: boolean) => void;
    clearAllLeadSources: () => void;
    selectAllLeadSources: () => void;
  };
}

interface Deal {
  id: string;
  Deal_Name: string;
  Amount: number;
  Stage: string;
  Lead_Source?: string;
  UTM_Campaign?: string;
  UTM_Medium?: string;
  UTM_Content?: string;
  Agreement_Received_Date?: string;
  Created_Time: string;
  Owner?: {
    name: string;
    email: string;
  };
}

export const ZohoDealsDisplay = ({ projectId, zohoLeadSourceFilter }: ZohoDealsDisplayProps) => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { getUserTimezone } = useUserProfile();

  // Use shared filter state if available, otherwise use local state
  const leadSources = zohoLeadSourceFilter?.leadSources || [];
  const selectedLeadSources = zohoLeadSourceFilter?.selectedLeadSources || [];
  const filteredDeals = zohoLeadSourceFilter?.filteredDeals || [];
  const handleLeadSourceToggle = zohoLeadSourceFilter?.handleLeadSourceToggle || (() => {});
  const clearAllLeadSources = zohoLeadSourceFilter?.clearAllLeadSources || (() => {});
  const selectAllLeadSources = zohoLeadSourceFilter?.selectAllLeadSources || (() => {});

  useEffect(() => {
    if (projectId) {
      fetchZohoData();
    }
  }, [projectId]);

  const fetchZohoData = async () => {
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
        
        // Check if there's an error in the sync data
        if (zohoData.error) {
          toast({
            title: "Zoho CRM Sync Error",
            description: zohoData.error,
            variant: "destructive",
          });
          return;
        }
        
        const dealsData = zohoData.data?.deals?.records || [];
        const analyticsData = zohoData.analytics || {};

        setDeals(dealsData);
        setAnalytics(analyticsData);
      }
    } catch (error) {
      console.error('Error fetching Zoho data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch Zoho deals data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    // Use timezone-aware formatting to avoid date shifts
    const userTimezone = getUserTimezone();
    try {
      return formatInTimeZone(new Date(dateString), userTimezone, 'MM/dd/yyyy');
    } catch (error) {
      // Fallback to simple date parsing if timezone formatting fails
      return new Date(dateString).toLocaleDateString();
    }
  };

  const getStageColor = (stage: string) => {
    const stageColors: Record<string, string> = {
      'Qualification': 'bg-blue-100 text-blue-800',
      'Needs Analysis': 'bg-purple-100 text-purple-800',
      'Value Proposition': 'bg-orange-100 text-orange-800',
      'Id. Decision Makers': 'bg-yellow-100 text-yellow-800',
      'Perception Analysis': 'bg-indigo-100 text-indigo-800',
      'Proposal/Price Quote': 'bg-cyan-100 text-cyan-800',
      'Negotiation/Review': 'bg-red-100 text-red-800',
      'Closed Won': 'bg-green-100 text-green-800',
      'Closed Lost': 'bg-gray-100 text-gray-800',
      'Nurturing': 'bg-pink-100 text-pink-800',
    };
    return stageColors[stage] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading Zoho deals...</span>
        </CardContent>
      </Card>
    );
  }

  if (!deals.length) {
    return (
      <Card>
        <CardContent className="text-center p-8">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Deals Found</h3>
          <p className="text-muted-foreground">
            No deals data available. Try syncing your Zoho CRM integration.
          </p>
          <Button onClick={fetchZohoData} className="mt-4">
            Refresh Data
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Only show Filtered Results metric */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-purple-600" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Filtered Results</p>
              <p className="text-2xl font-bold">{filteredDeals.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead Source Filter Only */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Lead Source Filter
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Lead Sources</label>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={selectAllLeadSources}
                  disabled={selectedLeadSources.length === leadSources.length}
                >
                  Select All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearAllLeadSources}
                  disabled={selectedLeadSources.length === 0}
                >
                  Clear All
                </Button>
              </div>
            </div>
            <div className="border rounded-md p-3 space-y-2 bg-background">
              {leadSources.length === 0 ? (
                <p className="text-sm text-muted-foreground">No lead sources available</p>
              ) : (
                leadSources.map((source) => (
                  <div key={source} className="flex items-center space-x-2">
                    <Checkbox
                      id={`lead-source-${source}`}
                      checked={selectedLeadSources.includes(source)}
                      onCheckedChange={(checked) => handleLeadSourceToggle(source, checked as boolean)}
                    />
                    <label 
                      htmlFor={`lead-source-${source}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {source}
                    </label>
                  </div>
                ))
              )}
            </div>
            {selectedLeadSources.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {selectedLeadSources.length} source(s) selected
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};