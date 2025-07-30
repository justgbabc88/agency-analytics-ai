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

  // Fetch cached submissions data with optimized query
  const { data: submissionsData, isLoading: submissionsLoading } = useQuery({
    queryKey: ['ghl-submissions', projectId, dateRange?.from, dateRange?.to],
    queryFn: async () => {
      if (!projectId) return [];
      
      console.log('🔍 [useGHLFormSubmissions] Fetching submissions for project:', projectId);
      
      // Build optimized query with date filtering at database level
      let query = supabase
        .from('ghl_form_submissions')
        .select('*')
        .eq('project_id', projectId)
        .order('submitted_at', { ascending: false });

      // Apply date filter at database level for much better performance
      if (dateRange) {
        query = query
          .gte('submitted_at', dateRange.from.toISOString())
          .lte('submitted_at', dateRange.to.toISOString());
        
        console.log('🔍 [useGHLFormSubmissions] Applying date filter at DB level:', {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        });
      } else {
        // If no date range, only fetch recent submissions (last 90 days) for performance
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        query = query.gte('submitted_at', ninetyDaysAgo.toISOString());
        
        console.log('🔍 [useGHLFormSubmissions] No date range provided, fetching last 90 days for performance');
      }

      // Limit results for performance - can be increased if needed
      query = query.limit(5000);

      const { data: submissionsData, error: submissionsError } = await query;

      if (submissionsError) {
        throw new Error(`Failed to fetch submissions: ${submissionsError.message}`);
      }

      console.log('🔍 [useGHLFormSubmissions] Submissions fetched:', {
        submissionsCount: submissionsData?.length || 0,
        dateRange: dateRange ? 'filtered' : 'last_90_days',
        firstSubmission: submissionsData?.[0]?.submitted_at,
        lastSubmission: submissionsData?.[submissionsData?.length - 1]?.submitted_at,
      });

      return submissionsData || [];
    },
    enabled: !!projectId,
    staleTime: 3 * 60 * 1000, // Submissions data is fresh for 3 minutes
    gcTime: 20 * 60 * 1000, // Keep in cache for 20 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Remove the automatic background sync query since it's causing extra overhead
  // Instead, rely on the optimized main query with longer stale time

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

    // Since we're now filtering at the database level, we don't need client-side date filtering
    // Just filter by selected forms if provided
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
  }, [submissionsData, formsData, selectedFormIds]);

  // Refetch function for manual refresh
  const refetch = React.useCallback(() => {
    console.log('🔍 [useGHLFormSubmissions] Manual refetch triggered');
    queryClient.invalidateQueries({ queryKey: ['ghl-submissions', projectId, dateRange?.from, dateRange?.to] });
    queryClient.invalidateQueries({ queryKey: ['ghl-forms', projectId] });
  }, [projectId, queryClient, dateRange]);

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