import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Globe, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProjects } from '@/hooks/useProjects';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from '@/hooks/use-toast';

const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

export const TimezoneHandler: React.FC = () => {
  const { projects, selectedProjectId } = useProjects();
  const { profile, getUserTimezone } = useUserProfile();
  const [selectedTimezone, setSelectedTimezone] = useState(getUserTimezone());
  const [isSyncing, setIsSyncing] = useState(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const currentTimezone = getUserTimezone();

  const handleTimezoneSync = async (platform: string) => {
    if (!selectedProjectId) {
      toast({
        title: "No Project Selected",
        description: "Please select a project first",
        variant: "destructive"
      });
      return;
    }

    setIsSyncing(true);
    
    try {
      console.log(`🕐 Starting timezone sync for ${platform}...`);
      
      const { data, error } = await supabase.functions.invoke('timezone-sync-handler', {
        body: {
          project_id: selectedProjectId,
          platform,
          user_timezone: selectedTimezone,
          sync_type: 'incremental'
        }
      });

      if (error) {
        console.error('Timezone sync error:', error);
        throw error;
      }

      console.log('✅ Timezone sync completed:', data);
      
      toast({
        title: "Timezone Sync Complete",
        description: `${platform} data has been synced with ${selectedTimezone} timezone`,
      });

    } catch (error) {
      console.error('❌ Timezone sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync with timezone. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getCurrentTimeInTimezone = (timezone: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      }).format(new Date());
    } catch (error) {
      return 'Invalid timezone';
    }
  };

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a project to configure timezone handling</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Timezone Management</h2>
        <p className="text-muted-foreground">
          Configure timezone-aware data synchronization for {selectedProject.name}
        </p>
      </div>

      {/* Current Timezone Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Current Timezone Settings</span>
          </CardTitle>
          <CardDescription>
            Your current timezone configuration and local time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Profile Timezone</p>
              <p className="text-sm text-muted-foreground">{currentTimezone}</p>
            </div>
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              {getCurrentTimeInTimezone(currentTimezone)}
            </Badge>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">Sync with Different Timezone:</p>
            <div className="flex items-center space-x-3">
              <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedTimezone !== currentTimezone && (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {getCurrentTimeInTimezone(selectedTimezone)}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Timezone-Aware Sync</CardTitle>
          <CardDescription>
            Trigger data synchronization with timezone context for accurate date filtering
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {['calendly', 'facebook', 'ghl'].map((platform) => (
              <div key={platform} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium capitalize">{platform}</h3>
                  <Badge variant="outline">{selectedTimezone}</Badge>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Sync {platform} data with timezone-aware date calculations
                </p>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleTimezoneSync(platform)}
                  disabled={isSyncing}
                >
                  <Zap className="h-3 w-3 mr-2" />
                  {isSyncing ? 'Syncing...' : 'Sync with Timezone'}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">How Timezone Sync Works:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Data is filtered based on your selected timezone's date boundaries</li>
              <li>• Events are properly categorized by local date rather than UTC</li>
              <li>• Reporting and analytics reflect your business timezone</li>
              <li>• Historical data is re-processed with correct timezone context</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};