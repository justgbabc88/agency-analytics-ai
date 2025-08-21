import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiKeys } from './useApiKeys';
import { useToast } from './use-toast';

interface EverWebinarEvent {
  id: string;
  name: string;
  type: 'live' | 'automated';
  registrations: number;
  attendees: number;
  attendance_rate: number;
  created_at: string;
  next_session?: string;
}

interface EverWebinarRegistration {
  id: string;
  event_id: string;
  email: string;
  name: string;
  registered_at: string;
  attended: boolean;
  attendance_duration?: number;
}

interface EverWebinarData {
  events: EverWebinarEvent[];
  registrations: EverWebinarRegistration[];
  totalRegistrations: number;
  totalAttendees: number;
  averageAttendanceRate: number;
}

export const useEverWebinarData = (projectId: string) => {
  const { getApiKeys } = useApiKeys();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const savedKeys = getApiKeys('everwebinar');
  const isConnected = !!savedKeys.api_key;

  // Query EverWebinar events and registrations
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['everwebinar-data', projectId],
    queryFn: async () => {
      if (!isConnected) {
        throw new Error('EverWebinar not connected');
      }

      // In a real implementation, you would make API calls to EverWebinar
      // For now, return mock data structure
      const mockData: EverWebinarData = {
        events: [
          {
            id: 'event_1',
            name: 'Marketing Masterclass',
            type: 'automated',
            registrations: 1245,
            attendees: 423,
            attendance_rate: 34.0,
            created_at: new Date().toISOString(),
            next_session: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'event_2', 
            name: 'Sales Training Webinar',
            type: 'live',
            registrations: 892,
            attendees: 367,
            attendance_rate: 41.1,
            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          }
        ],
        registrations: [],
        totalRegistrations: 2137,
        totalAttendees: 790,
        averageAttendanceRate: 37.0
      };

      return mockData;
    },
    enabled: isConnected && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry if not connected
      if (error.message === 'EverWebinar not connected') {
        return false;
      }
      return failureCount < 3;
    }
  });

  // Sync function for manual data refresh
  const syncEverWebinarData = async () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please connect your EverWebinar account first.",
        variant: "destructive"
      });
      return;
    }

    try {
      await refetch();
      toast({
        title: "Sync Complete",
        description: "EverWebinar data has been refreshed successfully.",
      });
    } catch (error) {
      console.error('EverWebinar sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync EverWebinar data. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Force refresh all EverWebinar related queries
  const refreshAllQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['everwebinar-data'] });
  };

  return {
    // Data
    everWebinarData: data,
    events: data?.events || [],
    registrations: data?.registrations || [],
    totalRegistrations: data?.totalRegistrations || 0,
    totalAttendees: data?.totalAttendees || 0,
    averageAttendanceRate: data?.averageAttendanceRate || 0,
    
    // State
    isLoading,
    error,
    isConnected,
    
    // Actions
    syncEverWebinarData,
    refetch,
    refreshAllQueries
  };
};