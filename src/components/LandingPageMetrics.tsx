
import { MetricCard } from "./MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LandingPageMetricsProps {
  totalPageViews: number;
  bookingRate: number;
  previousBookingRate: number;
  totalBookings: number;
  previousTotalBookings: number;
  costPerBooking: number;
  previousCostPerBooking: number;
}

export const LandingPageMetrics = ({
  totalPageViews,
  bookingRate,
  previousBookingRate,
  totalBookings,
  previousTotalBookings,
  costPerBooking,
  previousCostPerBooking,
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
      </CardContent>
    </Card>
  );
};
