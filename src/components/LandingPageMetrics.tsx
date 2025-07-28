
import { MetricCard } from "./MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormSubmissionMetrics } from "@/hooks/useGHLFormSubmissions";

interface LandingPageMetricsProps {
  totalPageViews: number; // This will represent unique visitors from toggled pages
  bookingRate: number;
  previousBookingRate: number;
  totalBookings: number;
  previousTotalBookings: number;
  costPerBooking: number;
  previousCostPerBooking: number;
  formSubmissions?: FormSubmissionMetrics;
  totalSpend: number;
}

export const LandingPageMetrics = ({
  totalPageViews,
  bookingRate,
  previousBookingRate,
  totalBookings,
  previousTotalBookings,
  costPerBooking,
  previousCostPerBooking,
  formSubmissions,
  totalSpend,
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
  const leadConversionRate = totalPageViews > 0 ? (leads / totalPageViews) * 100 : 0;
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
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <MetricCard 
            title="Visitors" 
            value={totalPageViews} 
            previousValue={Math.floor(totalPageViews * 0.9)} 
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
            title="New Bookings" 
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
      </CardContent>
    </Card>
  );
};
