import React, { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useUserProfile } from './useUserProfile';

export interface GHLFormSubmission {
  id: string;
  project_id: string;
  form_id: string;
  submission_id: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  form_data: any;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface GHLForm {
  id: string;
  project_id: string;
  form_id: string;
  form_name: string;
  form_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormSubmissionMetrics {
  totalSubmissions: number;
  totalForms: number;
  submissionsByForm: Record<string, number>;
  submissionsByDay: Record<string, number>;
  recentSubmissions: GHLFormSubmission[];
  topPerformingForms: Array<{
    form_id: string;
    form_name: string;
    submissions: number;
  }>;
}

export const useGHLFormSubmissions = (projectId: string, dateRange?: { from: Date; to: Date }, selectedFormIds?: string[]) => {
  const { getUserTimezone } = useUserProfile();
  const userTimezone = getUserTimezone();
  const queryClient = useQueryClient();

  // Fetch cached forms data
  const { data: formsData, isLoading: formsLoading } = useQuery({
    queryKey: ['ghl-forms', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      console.log('🔍 [useGHLFormSubmissions] Fetching forms for project:', projectId);
      
      const { data: formsData, error: formsError } = await supabase
        .from('ghl_forms')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (formsError) {
        throw new Error(`Failed to fetch forms: ${formsError.message}`);
      }

      return formsData || [];
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // Forms data is fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  // Fetch cached submissions data
  const { data: submissionsData, isLoading: submissionsLoading } = useQuery({
    queryKey: ['ghl-submissions', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      console.log('🔍 [useGHLFormSubmissions] Fetching submissions for project:', projectId);
      
      // Fetch all submissions with efficient pagination
      const allSubmissions: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('ghl_form_submissions')
          .select('*')
          .eq('project_id', projectId)
          .order('submitted_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (submissionsError) {
          throw new Error(`Failed to fetch submissions: ${submissionsError.message}`);
        }

        if (submissionsData && submissionsData.length > 0) {
          allSubmissions.push(...submissionsData);
          hasMore = submissionsData.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      console.log('🔍 [useGHLFormSubmissions] Submissions fetched:', {
        submissionsCount: allSubmissions.length,
        pagesLoaded: page,
        firstSubmission: allSubmissions[0]?.submitted_at,
        lastSubmission: allSubmissions[allSubmissions.length - 1]?.submitted_at,
      });

      return allSubmissions;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // Submissions data is fresh for 2 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });

  // Background sync for fresh data
  const { data: syncStatus } = useQuery({
    queryKey: ['ghl-sync-status', projectId],
    queryFn: async () => {
      if (!projectId || !submissionsData) return null;

      // Check if submissions data is stale (older than 5 minutes)
      const queryCache = queryClient.getQueryData(['ghl-submissions', projectId]);
      const queryState = queryClient.getQueryState(['ghl-submissions', projectId]);
      
      if (queryState?.dataUpdatedAt) {
        const dataAge = Date.now() - queryState.dataUpdatedAt;
        const isStale = dataAge > 5 * 60 * 1000;

        if (!isStale) {
          console.log('🔍 [useGHLFormSubmissions] Data is fresh, skipping background sync');
          return { synced: false, reason: 'data_fresh' };
        }
      }

      console.log('🔍 [useGHLFormSubmissions] Data is stale, triggering background refresh');
      
      // Trigger background refresh
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['ghl-submissions', projectId] });
        queryClient.invalidateQueries({ queryKey: ['ghl-forms', projectId] });
      }, 100);

      return { synced: true, timestamp: new Date().toISOString() };
    },
    enabled: !!projectId && !!submissionsData,
    staleTime: 3 * 60 * 1000, // Check for refresh every 3 minutes
    retry: 1,
  });

  // Client-side filtering for instant performance
  const metrics = useMemo((): FormSubmissionMetrics => {
    const forms = formsData || [];
    const submissions = submissionsData || [];
    
    if (submissions.length === 0) {
      return {
        totalSubmissions: 0,
        totalForms: forms.filter(f => f.is_active).length,
        submissionsByForm: {},
        submissionsByDay: {},
        recentSubmissions: [],
        topPerformingForms: []
      };
    }

    let filteredSubmissions = submissions;

    // Filter by selected forms if provided
    if (selectedFormIds?.length) {
      filteredSubmissions = filteredSubmissions.filter(submission => 
        selectedFormIds.includes(submission.form_id)
      );
      
      console.log('🔍 [useGHLFormSubmissions] Form selection filter:', {
        selectedFormIds,
        originalCount: submissions.length,
        afterFormFilter: filteredSubmissions.length
      });
    }

    // Filter by date range if provided
    if (dateRange) {
      console.log('🔍 [useGHLFormSubmissions] Starting date filter:', {
        dateRange: {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        },
        userTimezone,
        totalSubmissions: submissions.length
      });
      
      filteredSubmissions = filteredSubmissions.filter((submission, index) => {
        const submissionDateUTC = parseISO(submission.submitted_at);
        const submissionDateInUserTz = toZonedTime(submissionDateUTC, userTimezone);
        const rangeStartInUserTz = toZonedTime(dateRange.from, userTimezone);
        const rangeEndInUserTz = toZonedTime(dateRange.to, userTimezone);
        
        const isWithinRange = isWithinInterval(submissionDateInUserTz, {
          start: rangeStartInUserTz,
          end: rangeEndInUserTz
        });
        
        // Log first few for debugging
        if (index < 5) {
          console.log(`🔍 [useGHLFormSubmissions] Submission ${index + 1}:`, {
            id: submission.id.substring(0, 8),
            submitted_at: submission.submitted_at,
            submissionDateInUserTz: submissionDateInUserTz.toISOString(),
            isWithinRange
          });
        }
        
        return isWithinRange;
      });
      
      console.log('🔍 [useGHLFormSubmissions] Date filtering completed:', {
        originalCount: submissions.length,
        filteredCount: filteredSubmissions.length,
        userTimezone
      });
    }

    // Group submissions by form
    const submissionsByForm: Record<string, number> = {};
    filteredSubmissions.forEach(submission => {
      submissionsByForm[submission.form_id] = (submissionsByForm[submission.form_id] || 0) + 1;
    });

    // Group submissions by day (in user's timezone)
    const submissionsByDay: Record<string, number> = {};
    filteredSubmissions.forEach(submission => {
      const submissionDateUTC = parseISO(submission.submitted_at);
      const submissionDateInUserTz = toZonedTime(submissionDateUTC, userTimezone);
      const day = startOfDay(submissionDateInUserTz).toISOString().split('T')[0];
      submissionsByDay[day] = (submissionsByDay[day] || 0) + 1;
    });

    // Get top performing forms
    const topPerformingForms = Object.entries(submissionsByForm)
      .map(([form_id, count]) => {
        const form = forms.find(f => f.form_id === form_id);
        return {
          form_id,
          form_name: form?.form_name || 'Unknown Form',
          submissions: count
        };
      })
      .sort((a, b) => b.submissions - a.submissions)
      .slice(0, 5);

    return {
      totalSubmissions: filteredSubmissions.length,
      totalForms: forms.filter(f => f.is_active).length,
      submissionsByForm,
      submissionsByDay,
      recentSubmissions: filteredSubmissions.slice(0, 10),
      topPerformingForms
    };
  }, [submissionsData, formsData, dateRange, userTimezone, selectedFormIds]);

  // Refetch function for manual refresh
  const refetch = React.useCallback(() => {
    console.log('🔍 [useGHLFormSubmissions] Manual refetch triggered');
    queryClient.invalidateQueries({ queryKey: ['ghl-submissions', projectId] });
    queryClient.invalidateQueries({ queryKey: ['ghl-forms', projectId] });
  }, [projectId, queryClient]);

  const isLoading = formsLoading || submissionsLoading;

  return {
    submissions: submissionsData || [],
    forms: formsData || [],
    metrics,
    loading: isLoading,
    error: null, // Let React Query handle errors
    refetch
  };
};