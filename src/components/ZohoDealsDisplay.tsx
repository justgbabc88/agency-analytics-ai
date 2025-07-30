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
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [localLoading, setLocalLoading] = useState(true);
  const { toast } = useToast();
  const { getUserTimezone } = useUserProfile();

  // Use shared filter state if available, otherwise use local state
  const leadSources = zohoLeadSourceFilter?.leadSources || [];
  const selectedLeadSources = zohoLeadSourceFilter?.selectedLeadSources || [];
  const loading = zohoLeadSourceFilter?.loading ?? localLoading;
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
      setLocalLoading(true);
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
      setLocalLoading(false);
    }
  };

  // Filter deals by search term and date range (lead source filtering is handled by the shared hook)
  const filteredDeals = useMemo(() => {
    // Start with either shared filtered deals or all deals
    let filtered = zohoLeadSourceFilter?.filteredDeals || deals;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(deal =>
        deal.Deal_Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.Stage?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.Lead_Source?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        deal.UTM_Campaign?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by agreement date range using timezone-aware filtering
    if (dateFrom || dateTo) {
      const userTimezone = getUserTimezone();
      const fromDate = dateFrom ? new Date(dateFrom) : null;
      const toDate = dateTo ? new Date(dateTo) : null;
      
      filtered = filtered.filter(deal => {
        if (!deal.Agreement_Received_Date) return false;
        
        // Use timezone-aware date range checking
        if (fromDate && toDate) {
          return isEventInDateRange(deal.Agreement_Received_Date, fromDate, toDate, userTimezone);
        } else if (fromDate) {
          return isEventInDateRange(deal.Agreement_Received_Date, fromDate, new Date('2099-12-31'), userTimezone);
        } else if (toDate) {
          return isEventInDateRange(deal.Agreement_Received_Date, new Date('1900-01-01'), toDate, userTimezone);
        }
        
        return true;
      });
    }

    return filtered;
  }, [zohoLeadSourceFilter?.filteredDeals, deals, searchTerm, dateFrom, dateTo]);

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
      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Deal Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(analytics.total_deal_value)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Deals</p>
                  <p className="text-2xl font-bold">{analytics.deals_count}</p>
                </div>
              </div>
            </CardContent>
          </Card>

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
        </div>
      )}

      {/* Deals by Stage */}
      {analytics?.deals_by_stage && (
        <Card>
          <CardHeader>
            <CardTitle>Deals by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(analytics.deals_by_stage).map(([stage, count]) => (
                <Badge key={stage} className={getStageColor(stage)}>
                  {stage}: {count as number}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2 bg-background">
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
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search deals, stages, campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Agreement Date Filter
              </label>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">From Date</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    placeholder="From date"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">To Date</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    placeholder="To date"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                    }}
                    className="w-full"
                  >
                    Clear Date Filter
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Deals Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Lead Source</TableHead>
                  <TableHead>UTM Campaign</TableHead>
                  <TableHead>UTM Medium</TableHead>
                  <TableHead>UTM Content</TableHead>
                  <TableHead>Agreement Date</TableHead>
                  <TableHead>Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeals.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-medium">{deal.Deal_Name}</TableCell>
                    <TableCell>{formatCurrency(deal.Amount)}</TableCell>
                    <TableCell>
                      <Badge className={getStageColor(deal.Stage)}>
                        {deal.Stage}
                      </Badge>
                    </TableCell>
                    <TableCell>{deal.Lead_Source || 'N/A'}</TableCell>
                    <TableCell>{deal.UTM_Campaign || 'N/A'}</TableCell>
                    <TableCell>{deal.UTM_Medium || 'N/A'}</TableCell>
                    <TableCell>{deal.UTM_Content || 'N/A'}</TableCell>
                    <TableCell>{formatDate(deal.Agreement_Received_Date)}</TableCell>
                    <TableCell>{deal.Owner?.name || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filteredDeals.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No deals match your current filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};