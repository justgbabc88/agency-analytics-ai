import { AIChatPanel } from "./AIChatPanel";
import { useCalendlyData } from "@/hooks/useCalendlyData";
import { useGHLFormSubmissions } from "@/hooks/useGHLFormSubmissions";
import { useFacebookData } from "@/hooks/useFacebookData";
import { generateCallDataFromEvents } from "@/utils/chartDataGeneration";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useMemo, useState } from "react";
import { startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Brain } from "lucide-react";
import { GoHighLevelConnector } from "./GoHighLevelConnector";
import { useProjectIntegrations } from "@/hooks/useProjectIntegrations";
import { BookCallFunnel } from "./BookCallFunnel";

interface BookCallAIAssistantProps {
  projectId: string;
  dateRange: { from: Date; to: Date };
  selectedCampaignIds?: string[];
}

export const BookCallAIAssistant = ({ projectId, dateRange, selectedCampaignIds = [] }: BookCallAIAssistantProps) => {
  const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
  const { calendlyEvents } = useCalendlyData(projectId);
  const { metrics: formSubmissions } = useGHLFormSubmissions(projectId, dateRange, selectedFormIds);
  const { facebookData } = useFacebookData({ dateRange, campaignIds: selectedCampaignIds });
  const { getUserTimezone } = useUserProfile();
  const { integrations } = useProjectIntegrations(projectId);
  
  const userTimezone = getUserTimezone();

  // Calculate metrics based on date range and selected forms
  const metrics = useMemo(() => {
    // Filter events for the date range
    const filteredEvents = calendlyEvents.filter(event => {
      const eventCreatedInUserTz = toZonedTime(new Date(event.created_at), userTimezone);
      const selectedFromDate = toZonedTime(dateRange.from, userTimezone);
      const selectedToDate = toZonedTime(dateRange.to, userTimezone);
      
      const eventDate = startOfDay(eventCreatedInUserTz);
      const fromDate = startOfDay(selectedFromDate);
      const toDate = startOfDay(selectedToDate);
      
      return eventDate >= fromDate && eventDate <= toDate;
    });

    // Calculate call stats
    const totalBookings = filteredEvents.length;
    const callsTaken = calendlyEvents.filter(call => 
      call.status.toLowerCase() !== 'cancelled'
    ).length;
    const callsCancelled = calendlyEvents.filter(c => 
      c.status.toLowerCase() === 'cancelled'
    ).length;
    const showUpRate = (callsTaken + callsCancelled) > 0 ? 
      Math.round((callsTaken / (callsTaken + callsCancelled)) * 100) : 0;

    // Calculate financial metrics
    const totalSpend = facebookData?.insights?.spend || 0;
    const costPerLead = formSubmissions?.totalSubmissions > 0 ? 
      (totalSpend / formSubmissions.totalSubmissions) : 0;
    const costPerCall = totalBookings > 0 ? (totalSpend / totalBookings) : 0;

    // Generate chart data for page views
    const chartData = generateCallDataFromEvents(filteredEvents, dateRange, userTimezone);
    const totalPageViews = chartData.reduce((sum, day) => sum + day.pageViews, 0);
    const bookingRate = totalPageViews > 0 ? ((totalBookings / totalPageViews) * 100) : 0;

    return {
      // Call Statistics
      totalBookings,
      callsTaken,
      callsCancelled,
      showUpRate,
      
      // Lead & Form Data
      totalLeads: formSubmissions?.totalSubmissions || 0,
      totalForms: formSubmissions?.totalForms || 0,
      
      // Financial Metrics
      totalSpend,
      costPerLead,
      costPerCall,
      
      // Facebook Metrics
      facebookImpressions: facebookData?.insights?.impressions || 0,
      facebookClicks: facebookData?.insights?.clicks || 0,
      facebookCTR: facebookData?.insights?.ctr || 0,
      facebookCPC: facebookData?.insights?.cpc || 0,
      facebookReach: facebookData?.insights?.reach || 0,
      facebookConversions: facebookData?.insights?.conversions || 0,
      
      // Landing Page Metrics
      totalPageViews,
      bookingRate,
      
      // Date Range
      dateRange: {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      }
    };
  }, [calendlyEvents, formSubmissions, facebookData, dateRange, userTimezone]);

  const ghlIntegration = integrations.find(i => i.platform === 'ghl');
  const isGHLConnected = ghlIntegration?.is_connected || false;

  if (!projectId) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <MessageSquare className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Select a Project</h2>
          <p className="text-gray-600">
            Choose a project from the navbar to start chatting with your AI assistant about your book call funnel performance.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Book Call Funnel AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Ask me anything about your book call funnel performance. I have access to your Facebook ads, 
            lead data, call statistics, cost metrics, and conversion rates.
          </p>
          
          {/* Quick metrics summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">{metrics.totalBookings}</div>
              <div className="text-xs text-gray-600">Total Calls</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">{metrics.totalLeads}</div>
              <div className="text-xs text-gray-600">Total Leads</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-purple-600">${metrics.costPerCall.toFixed(2)}</div>
              <div className="text-xs text-gray-600">Cost/Call</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600">{metrics.showUpRate}%</div>
              <div className="text-xs text-gray-600">Show Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Book Call Funnel */}
      <BookCallFunnel
        projectId={projectId}
        dateRange={dateRange}
        selectedCampaignIds={selectedCampaignIds}
        selectedFormIds={selectedFormIds}
        onFormSelectionChange={setSelectedFormIds}
      />

      {/* GHL Form Selection */}
      <GoHighLevelConnector
        projectId={projectId}
        isConnected={isGHLConnected}
        onConnectionChange={() => {}} // Handle in parent if needed
        onFormSelectionChange={setSelectedFormIds}
      />

      <AIChatPanel 
        dateRange={dateRange}
        metrics={metrics}
      />
    </div>
  );
};