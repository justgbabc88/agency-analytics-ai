
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, Users, TrendingUp, DollarSign, Phone, Target, BarChart3 } from "lucide-react";
import { useCalendlyData } from "@/hooks/useCalendlyData";
import { useFacebookData } from "@/hooks/useFacebookData";
import { FacebookMetrics } from "./FacebookMetrics";

interface BookCallFunnelProps {
  projectId?: string;
}

export const BookCallFunnel = ({ projectId }: BookCallFunnelProps) => {
  const [dateRange] = useState({ 
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
    to: new Date() 
  });
  
  const { calendlyData, isLoading: calendlyLoading } = useCalendlyData({ projectId, dateRange });
  const { facebookData, isLoading: facebookLoading } = useFacebookData({ dateRange });

  // Calculate booking metrics
  const totalBookings = calendlyData?.events?.length || 0;
  const scheduledBookings = calendlyData?.events?.filter(event => event.status === 'scheduled')?.length || 0;
  const completedBookings = calendlyData?.events?.filter(event => event.status === 'completed')?.length || 0;
  const cancelledBookings = calendlyData?.events?.filter(event => event.status === 'cancelled')?.length || 0;

  // Calculate Facebook to booking conversion if both data sources are available
  const facebookClicks = facebookData?.insights?.clicks || 0;
  const clickToBookingRate = facebookClicks > 0 ? (totalBookings / facebookClicks) * 100 : 0;

  const bookingMetrics = [
    {
      title: "Total Bookings",
      value: totalBookings,
      icon: CalendarDays,
      description: "All scheduled calls",
      color: "text-blue-600"
    },
    {
      title: "Scheduled",
      value: scheduledBookings,
      icon: Users,
      description: "Upcoming calls",
      color: "text-green-600"
    },
    {
      title: "Completed",
      value: completedBookings,
      icon: Phone,
      description: "Calls completed",
      color: "text-purple-600"
    },
    {
      title: "Click to Booking Rate",
      value: clickToBookingRate,
      icon: Target,
      description: "Facebook clicks to bookings",
      color: "text-orange-600",
      isPercentage: true
    }
  ];

  const isLoading = calendlyLoading || facebookLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-600" />
            Book a Call Funnel Dashboard
            <Badge variant="outline">Last 30 Days</Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {bookingMetrics.map((metric, index) => {
          const IconComponent = metric.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{metric.title}</p>
                    <p className="text-2xl font-bold">
                      {metric.isPercentage ? `${metric.value.toFixed(2)}%` : metric.value.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
                  </div>
                  <IconComponent className={`h-8 w-8 ${metric.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="facebook" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Facebook Ads
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Bookings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conversion Funnel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Facebook Clicks</span>
                    <span className="text-lg font-bold text-blue-600">{facebookClicks.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 mx-auto bg-gray-300 rounded-full flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-gray-600" />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {clickToBookingRate > 0 ? `${clickToBookingRate.toFixed(2)}%` : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Call Bookings</span>
                    <span className="text-lg font-bold text-green-600">{totalBookings}</span>
                  </div>
                  <div className="flex justify-center">
                    <div className="text-center">
                      <div className="w-8 h-8 mx-auto bg-gray-300 rounded-full flex items-center justify-center">
                        <Phone className="h-4 w-4 text-gray-600" />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {totalBookings > 0 ? `${((completedBookings / totalBookings) * 100).toFixed(1)}%` : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium">Completed Calls</span>
                    <span className="text-lg font-bold text-purple-600">{completedBookings}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-b pb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Cost per Booking</span>
                      <span className="font-semibold">
                        {facebookData?.insights?.spend && totalBookings > 0 
                          ? `$${(facebookData.insights.spend / totalBookings).toFixed(2)}`
                          : 'N/A'
                        }
                      </span>
                    </div>
                  </div>
                  <div className="border-b pb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Booking Rate</span>
                      <span className="font-semibold">
                        {clickToBookingRate > 0 ? `${clickToBookingRate.toFixed(2)}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="border-b pb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Show Rate</span>
                      <span className="font-semibold">
                        {totalBookings > 0 ? `${((completedBookings / totalBookings) * 100).toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Ad Spend</span>
                      <span className="font-semibold">
                        ${(facebookData?.insights?.spend || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="facebook" className="space-y-4">
          <FacebookMetrics dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Booking Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Scheduled</span>
                    </div>
                    <span className="font-semibold">{scheduledBookings}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span>Completed</span>
                    </div>
                    <span className="font-semibold">{completedBookings}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>Cancelled</span>
                    </div>
                    <span className="font-semibold">{cancelledBookings}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {calendlyData?.events?.slice(0, 5).map((event, index) => (
                    <div key={index} className="flex justify-between items-center p-2 border rounded">
                      <div>
                        <p className="text-sm font-medium">{event.invitee_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(event.scheduled_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge 
                        variant={
                          event.status === 'completed' ? 'default' : 
                          event.status === 'scheduled' ? 'secondary' : 
                          'destructive'
                        }
                      >
                        {event.status}
                      </Badge>
                    </div>
                  )) || (
                    <p className="text-gray-500 text-center py-4">No recent bookings</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
