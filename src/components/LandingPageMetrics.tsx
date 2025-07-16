
import { MetricCard } from "./MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormSubmissionMetrics } from "@/hooks/useGHLFormSubmissions";

interface LandingPageMetricsProps {
  totalPageViews: number;
  bookingRate: number;
  previousBookingRate: number;
  totalBookings: number;
  previousTotalBookings: number;
  costPerBooking: number;
  previousCostPerBooking: number;
  formSubmissions?: FormSubmissionMetrics;
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
}: LandingPageMetricsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Landing Page</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard title="Page Views" value={totalPageViews} previousValue={Math.floor(totalPageViews * 0.9)} />
          <MetricCard 
            title="Booking Rate" 
            value={bookingRate} 
            previousValue={previousBookingRate} 
            format="percentage" 
          />
          <MetricCard 
            title="Total Bookings" 
            value={totalBookings} 
            previousValue={previousTotalBookings}
            description="Events created in date range"
          />
          <MetricCard 
            title="Cost Per Booking" 
            value={costPerBooking} 
            previousValue={previousCostPerBooking} 
            format="currency" 
          />
        </div>

        {/* Form Submissions Section */}
        {formSubmissions && (
          <div className="border-t pt-6">
            <div className="mb-4">
              <h3 className="text-md font-semibold mb-2">Form Submissions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard 
                  title="Total Submissions" 
                  value={formSubmissions.totalSubmissions} 
                  previousValue={Math.floor(formSubmissions.totalSubmissions * 0.85)} 
                  description="Form submissions received"
                />
                <MetricCard 
                  title="Active Forms" 
                  value={formSubmissions.totalForms} 
                  previousValue={formSubmissions.totalForms} 
                  description="Forms currently tracking"
                />
                <MetricCard 
                  title="Conversion Rate" 
                  value={totalPageViews > 0 ? (formSubmissions.totalSubmissions / totalPageViews) * 100 : 0} 
                  previousValue={0} 
                  format="percentage"
                  description="Submissions per page view"
                />
              </div>
            </div>
            
            {/* Top Performing Forms */}
            {formSubmissions.topPerformingForms.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-3">Top Performing Forms</h4>
                <div className="space-y-2">
                  {formSubmissions.topPerformingForms.slice(0, 3).map((form) => (
                    <div key={form.form_id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <span className="text-sm font-medium truncate">{form.form_name}</span>
                      <Badge variant="secondary" className="ml-2">
                        {form.submissions} submissions
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
