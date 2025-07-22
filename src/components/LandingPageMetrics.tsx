
import { MetricCard } from "./MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormSubmissionMetrics } from "@/hooks/useGHLFormSubmissions";
import { format } from "date-fns";

interface DailyPageViewData {
  date: string;
  totalPageViews: number;
  uniqueVisitors: number;
  landingPageBreakdown: { url: string; count: number }[];
}

interface LandingPageMetricsProps {
  totalPageViews: number;
  uniqueVisitors: number; // Added separate unique visitors prop
  bookingRate: number;
  previousBookingRate: number;
  totalBookings: number;
  previousTotalBookings: number;
  costPerBooking: number;
  previousCostPerBooking: number;
  formSubmissions?: FormSubmissionMetrics;
  totalSpend: number;
  dailyPageViewData: DailyPageViewData[];
}

export const LandingPageMetrics = ({
  totalPageViews,
  uniqueVisitors,
  bookingRate,
  previousBookingRate,
  totalBookings,
  previousTotalBookings,
  costPerBooking,
  previousCostPerBooking,
  formSubmissions,
  totalSpend,
  dailyPageViewData,
}: LandingPageMetricsProps) => {
  console.log('🔍 [LandingPageMetrics] Component rendered with data:', {
    formSubmissions: formSubmissions ? {
      totalSubmissions: formSubmissions.totalSubmissions,
      totalForms: formSubmissions.totalForms,
      recentSubmissions: formSubmissions.recentSubmissions?.length,
      submissionsByDay: Object.keys(formSubmissions.submissionsByDay || {}).length
    } : null,
    formSubmissionsRaw: formSubmissions
  });

  const leads = formSubmissions?.totalSubmissions || 0;
  const previousLeads = Math.floor(leads * 0.85);
  const leadConversionRate = uniqueVisitors > 0 ? (leads / uniqueVisitors) * 100 : 0;
  const previousLeadConversionRate = leadConversionRate * 0.9;
  const costPerLead = leads > 0 ? totalSpend / leads : 0;
  const previousCostPerLead = costPerLead * 1.1;
  const costPerCall = totalBookings > 0 ? totalSpend / totalBookings : 0;
  const previousCostPerCall = costPerCall * 1.1;

  console.log('🔍 [LandingPageMetrics] Calculated leads value:', {
    leads,
    totalSubmissions: formSubmissions?.totalSubmissions,
    isUndefined: formSubmissions?.totalSubmissions === undefined,
    isNull: formSubmissions?.totalSubmissions === null
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Landing Page</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <MetricCard 
            title="Total Page Views" 
            value={totalPageViews} 
            previousValue={Math.floor(totalPageViews * 0.9)} 
            description="All page view events"
          />
          <MetricCard 
            title="Unique Visitors" 
            value={uniqueVisitors} 
            previousValue={Math.floor(uniqueVisitors * 0.9)} 
            description="Unique visitors from enabled pages"
          />
          <MetricCard 
            title="Leads" 
            value={leads} 
            previousValue={previousLeads}
            description="Form submissions received"
          />
          <MetricCard 
            title="Lead Conversion Rate" 
            value={leadConversionRate} 
            previousValue={previousLeadConversionRate} 
            format="percentage"
            description="Leads per unique visitor"
          />
          <MetricCard 
            title="Total Bookings" 
            value={totalBookings} 
            previousValue={previousTotalBookings}
            description="Events created in date range"
          />
          <MetricCard 
            title="Booking Rate" 
            value={bookingRate} 
            previousValue={previousBookingRate} 
            format="percentage"
            description="Bookings per unique visitor"
          />
          <MetricCard 
            title="Cost Per Lead" 
            value={costPerLead} 
            previousValue={previousCostPerLead} 
            format="currency"
            description="Spend per form submission"
          />
          <MetricCard 
            title="Cost Per Call" 
            value={costPerCall} 
            previousValue={previousCostPerCall} 
            format="currency"
            description="Spend per booking"
          />
        </div>

        {/* Daily Page View Breakdown */}
        {dailyPageViewData.length > 0 && (
          <div className="mt-6">
            <h3 className="text-md font-semibold mb-4">Daily Page View Breakdown</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {dailyPageViewData.map((day) => (
                <Card key={day.date} className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">
                      {format(new Date(day.date), 'MMM dd, yyyy')}
                    </span>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <Badge variant="secondary">
                        {day.totalPageViews} page views
                      </Badge>
                      <Badge variant="outline">
                        {day.uniqueVisitors} unique visitors
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Landing Page Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                    {day.landingPageBreakdown.slice(0, 6).map((page, index) => (
                      <div key={index} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded">
                        <span className="truncate mr-2" title={page.url}>
                          {page.url.split('/').pop() || 'Home'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {page.count}
                        </Badge>
                      </div>
                    ))}
                    {day.landingPageBreakdown.length > 6 && (
                      <div className="text-xs text-muted-foreground p-2">
                        +{day.landingPageBreakdown.length - 6} more pages
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
