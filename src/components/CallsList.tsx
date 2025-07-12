import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Mail, Phone, User } from "lucide-react";
import { format } from "date-fns";
import { useUserProfile } from "@/hooks/useUserProfile";

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
}

export const CallsList = ({ calls, isLoading }: CallsListProps) => {
  const { profile } = useUserProfile();
  const userTimezone = profile?.timezone || 'UTC';

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
          Filtered Calls ({calls.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {calls.length === 0 ? (
          <div className="text-center py-8">
            <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Calls Found</h3>
            <p className="text-muted-foreground">
              No calls found for the selected date range.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {calls.map((call) => (
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
                        {format(new Date(call.scheduled_at), 'MMM d, yyyy h:mm a')} {userTimezone}
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
                  <div>{format(new Date(call.created_at), 'MMM d, h:mm a')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};