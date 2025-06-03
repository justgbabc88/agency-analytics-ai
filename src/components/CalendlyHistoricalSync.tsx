
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Download, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CalendlyHistoricalSyncProps {
  projectId: string;
}

export const CalendlyHistoricalSync = ({ projectId }: CalendlyHistoricalSyncProps) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSync = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Missing Dates",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast({
        title: "Invalid Date Range",
        description: "Start date must be before end date",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      console.log('Syncing historical events for date range:', { startDate, endDate });
      
      const { data, error } = await supabase.functions.invoke('calendly-oauth', {
        body: { 
          action: 'sync_historical_events', 
          projectId,
          dateRange: {
            startDate: new Date(startDate).toISOString(),
            endDate: new Date(endDate).toISOString()
          }
        }
      });

      if (error) {
        console.error('Sync error:', error);
        throw new Error(error.message || 'Failed to sync historical events');
      }

      console.log('Sync result:', data);

      toast({
        title: "Sync Complete",
        description: `Successfully synced ${data.synced_events} events out of ${data.total_events_found} found`,
      });

    } catch (error) {
      console.error('Historical sync error:', error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync historical events",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Set default date range (last 30 days)
  const setDefaultRange = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Sync Historical Events
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Import previously booked Calendly events within a specific date range. 
          Only events from your tracked event types will be synced.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={setDefaultRange}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Last 30 Days
          </Button>
          
          <Button 
            onClick={handleSync} 
            disabled={loading || !startDate || !endDate}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {loading ? "Syncing..." : "Sync Events"}
          </Button>
        </div>

        {!startDate || !endDate ? (
          <div className="text-sm text-gray-500">
            Select a date range to sync historical events
          </div>
        ) : (
          <div className="text-sm text-blue-600">
            Ready to sync events from {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
