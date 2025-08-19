
import { useEverWebinarData } from "@/hooks/useEverWebinarData";
import { MetricCard } from "./MetricCard";
import { ConversionChart } from "./ConversionChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Video, Users, Calendar, TrendingUp, RefreshCw } from "lucide-react";

interface WebinarFunnelProps {
  projectId?: string;
}

const generateWebinarData = () => {
  const dates = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      conversionRate: Math.random() * 15 + 10,
      roas: Math.random() * 4 + 2,
      pageViews: Math.floor(Math.random() * 500) + 200,
      registrations: Math.floor(Math.random() * 100) + 50,
      attendees: Math.floor(Math.random() * 50) + 20
    });
  }
  return dates;
};

export const WebinarFunnel = ({ projectId }: WebinarFunnelProps) => {
  const chartData = generateWebinarData();
  const { 
    everWebinarData, 
    events, 
    totalRegistrations, 
    totalAttendees, 
    averageAttendanceRate,
    isLoading, 
    isConnected, 
    syncEverWebinarData 
  } = useEverWebinarData(projectId || '');

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Video className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Connect EverWebinar</h2>
            <p className="text-gray-600 mb-4">
              Connect your EverWebinar account in the Integrations tab to see your webinar analytics and performance metrics.
            </p>
            <Badge variant="outline">EverWebinar Integration Required</Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Webinar Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Video className="h-5 w-5 text-purple-600" />
              Webinar Overview
            </CardTitle>
            <Button 
              onClick={syncEverWebinarData}
              disabled={isLoading}
              variant="outline" 
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Sync Data
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard 
              title="Total Webinars" 
              value={events.length} 
              previousValue={events.length - 1} 
            />
            <MetricCard 
              title="Total Registrations" 
              value={totalRegistrations} 
              previousValue={Math.floor(totalRegistrations * 0.85)} 
            />
            <MetricCard 
              title="Total Attendees" 
              value={totalAttendees} 
              previousValue={Math.floor(totalAttendees * 0.9)} 
            />
            <MetricCard 
              title="Avg. Attendance Rate" 
              value={averageAttendanceRate} 
              previousValue={averageAttendanceRate - 2.1} 
              format="percentage" 
            />
          </div>
        </CardContent>
      </Card>

      {/* Individual Webinar Performance */}
      {events.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {event.name}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant={event.type === 'live' ? 'default' : 'secondary'}>
                      {event.type}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {event.registrations}
                    </div>
                    <div className="text-sm text-gray-600">Registrations</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {event.attendees}
                    </div>
                    <div className="text-sm text-gray-600">Attendees</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {event.attendance_rate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Attendance Rate</div>
                  </div>
                </div>
                
                {event.next_session && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      Next session: {new Date(event.next_session).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Registration Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Registration & Attendance Trends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ConversionChart 
            data={chartData}
            title="Daily Performance"
            metrics={['registrations', 'attendees']}
          />
        </CardContent>
      </Card>

      {/* Conversion Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Conversion Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MetricCard title="Registration Rate" value={24.8} previousValue={22.1} format="percentage" />
            <MetricCard title="Show Up Rate" value={averageAttendanceRate} previousValue={averageAttendanceRate - 3.2} format="percentage" />
            <MetricCard title="Sales Conversion" value={8.2} previousValue={7.1} format="percentage" />
            <MetricCard title="Revenue per Attendee" value={47.50} previousValue={42.20} format="currency" />
          </div>
          <ConversionChart 
            data={chartData}
            title="Conversion Rates Over Time"
            metrics={['conversionRate', 'roas']}
          />
        </CardContent>
      </Card>
    </div>
  );
};
