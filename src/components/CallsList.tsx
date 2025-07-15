import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Mail, Phone, User } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useState } from "react";

interface Call {
  id: string;
  calendly_event_id: string;
  event_type_name: string;
  invitee_name: string | null;
  invitee_email: string | null;
  scheduled_at: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CallsListProps {
  calls: Call[];
  isLoading?: boolean;
  dateRange?: { from: Date; to: Date };
}

export const CallsList = ({ calls, isLoading, dateRange }: CallsListProps) => {
  const { profile } = useUserProfile();
  const userTimezone = profile?.timezone || 'UTC';
  const [statusFilter, setStatusFilter] = useState<string>('total_bookings');

  // Helper function to check if a call is scheduled within the date range
  const isCallScheduledInDateRange = (call: Call): boolean => {
    if (!dateRange) return true;
    
    // Convert the call's scheduled_at to user's timezone for comparison
    const callScheduledInUserTz = toZonedTime(new Date(call.scheduled_at), userTimezone);
    const selectedFromDate = toZonedTime(dateRange.from, userTimezone);
    const selectedToDate = toZonedTime(dateRange.to, userTimezone);
    
    // Get the date part only (year, month, day) for comparison
    const callDate = startOfDay(callScheduledInUserTz);
    const fromDate = startOfDay(selectedFromDate);
    const toDate = startOfDay(selectedToDate);
    
    return callDate >= fromDate && callDate <= toDate;
  };

  // Helper function to check if a call was created within the date range  
  const isCallCreatedInDateRange = (call: Call): boolean => {
    if (!dateRange) return true;
    
    // Convert the call's created_at to user's timezone for comparison
    const callCreatedInUserTz = toZonedTime(new Date(call.created_at), userTimezone);
    const selectedFromDate = toZonedTime(dateRange.from, userTimezone);
    const selectedToDate = toZonedTime(dateRange.to, userTimezone);
    
    // Get the date part only (year, month, day) for comparison
    const callDate = startOfDay(callCreatedInUserTz);
    const fromDate = startOfDay(selectedFromDate);
    const toDate = startOfDay(selectedToDate);
    
    return callDate >= fromDate && callDate <= toDate;
  };

  // Filter calls based on selected status
  const filteredCalls = calls.filter(call => {
    if (statusFilter === 'total_bookings') return isCallCreatedInDateRange(call); // Show bookings created in date range
    if (statusFilter === 'calls_taken') return isCallScheduledInDateRange(call) && call.status.toLowerCase() !== 'cancelled'; // Show non-cancelled calls scheduled in date range
    if (statusFilter === 'calls_cancelled') return call.status.toLowerCase() === 'cancelled' && isCallScheduledInDateRange(call); // Show cancelled calls scheduled in date range
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'no_show':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'scheduled':
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Filtered Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading calls...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Filtered Calls ({filteredCalls.length})
        </CardTitle>
        <div className="flex gap-2 mt-4">
          <Button
            variant={statusFilter === 'total_bookings' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('total_bookings')}
          >
            Total Bookings ({calls.filter(call => isCallCreatedInDateRange(call)).length})
          </Button>
          <Button
            variant={statusFilter === 'calls_taken' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('calls_taken')}
          >
            Calls Taken ({calls.filter(call => isCallScheduledInDateRange(call) && call.status.toLowerCase() !== 'cancelled').length})
          </Button>
          <Button
            variant={statusFilter === 'calls_cancelled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('calls_cancelled')}
          >
            Calls Cancelled ({calls.filter(c => c.status.toLowerCase() === 'cancelled' && isCallScheduledInDateRange(c)).length})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {filteredCalls.length === 0 ? (
          <div className="text-center py-8">
            <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Calls Found</h3>
            <p className="text-muted-foreground">
              {calls.length === 0 ? "No calls found for the selected date range." : "No calls match the selected status filter."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredCalls.map((call) => (
              <div key={call.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className={getStatusColor(call.status)}>
                      {formatStatus(call.status)}
                    </Badge>
                    <h4 className="font-medium">{call.event_type_name}</h4>
                  </div>
                  
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4" />
                       <span>
                         {formatInTimeZone(new Date(call.scheduled_at), userTimezone, 'MMM d, yyyy h:mm a')}
                       </span>
                    </div>
                    
                    {call.invitee_name && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{call.invitee_name}</span>
                      </div>
                    )}
                    
                    {call.invitee_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{call.invitee_email}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right text-sm text-muted-foreground">
                  <div>Booked</div>
                  <div>{formatInTimeZone(new Date(call.created_at), userTimezone, 'MMM d, h:mm a')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};