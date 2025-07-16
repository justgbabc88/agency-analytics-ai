import { useState, useEffect, useMemo } from 'react';
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

export const useGHLFormSubmissions = (projectId: string, dateRange?: { from: Date; to: Date }) => {
  const [submissions, setSubmissions] = useState<GHLFormSubmission[]>([]);
  const [forms, setForms] = useState<GHLForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getUserTimezone } = useUserProfile();
  
  const userTimezone = getUserTimezone();

  // Fetch forms and submissions
  useEffect(() => {
    if (!projectId) return;
    
    console.log('🔍 [useGHLFormSubmissions] useEffect triggered with:', {
      projectId,
      dateRange: dateRange ? {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      } : null,
      userTimezone
    });

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch forms
        const { data: formsData, error: formsError } = await supabase
          .from('ghl_forms')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (formsError) {
          throw new Error(`Failed to fetch forms: ${formsError.message}`);
        }

        // Fetch submissions with explicit high limit
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('ghl_form_submissions')
          .select('*')
          .eq('project_id', projectId)
          .order('submitted_at', { ascending: false })
          .limit(5000); // Explicitly set high limit

        if (submissionsError) {
          throw new Error(`Failed to fetch submissions: ${submissionsError.message}`);
        }

        console.log('🔍 [useGHLFormSubmissions] Raw data fetched:', {
          formsCount: formsData?.length || 0,
          submissionsCount: submissionsData?.length || 0,
          firstSubmission: submissionsData?.[0]?.submitted_at,
          lastSubmission: submissionsData?.[submissionsData.length - 1]?.submitted_at
        });
        
        // Additional debugging
        console.warn('DEBUG: Total submissions loaded:', submissionsData?.length);
        alert(`DEBUG: Loaded ${submissionsData?.length} submissions from database`);

        setForms(formsData || []);
        setSubmissions(submissionsData || []);
      } catch (err) {
        console.error('Error fetching GHL data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  // Calculate metrics based on date range
  const metrics = useMemo((): FormSubmissionMetrics => {
    let filteredSubmissions = submissions;

    // Filter by date range if provided
    if (dateRange) {
      console.log('🔍 [useGHLFormSubmissions] Starting date filter:', {
        dateRange: {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString(),
          fromLocal: dateRange.from.toString(),
          toLocal: dateRange.to.toString()
        },
        userTimezone,
        totalSubmissions: submissions.length
      });
      
      filteredSubmissions = submissions.filter((submission, index) => {
        // Parse the submission timestamp (it's in UTC)
        const submissionDateUTC = parseISO(submission.submitted_at);
        
        // Convert submission date to user's timezone
        const submissionDateInUserTz = toZonedTime(submissionDateUTC, userTimezone);
        
        // Convert date range boundaries to user's timezone for comparison
        const rangeStartInUserTz = toZonedTime(dateRange.from, userTimezone);
        const rangeEndInUserTz = toZonedTime(dateRange.to, userTimezone);
        
        // Check if submission date (in user timezone) falls within the range (in user timezone)
        const isWithinRange = isWithinInterval(submissionDateInUserTz, {
          start: rangeStartInUserTz,
          end: rangeEndInUserTz
        });
        
        // Log first few for debugging
        if (index < 10) {
          console.log(`🔍 [useGHLFormSubmissions] Submission ${index + 1}:`, {
            id: submission.id.substring(0, 8),
            submitted_at: submission.submitted_at,
            submissionDateUTC: submissionDateUTC.toISOString(),
            submissionDateInUserTz: submissionDateInUserTz.toISOString(),
            submissionDateOnly: submissionDateInUserTz.toISOString().split('T')[0],
            rangeStartInUserTz: rangeStartInUserTz.toISOString(),
            rangeEndInUserTz: rangeEndInUserTz.toISOString(),
            isWithinRange
          });
        }
        
        return isWithinRange;
      });
      
      console.log('🔍 [useGHLFormSubmissions] Date filtering completed:', {
        originalCount: submissions.length,
        filteredCount: filteredSubmissions.length,
        userTimezone,
        dateRangeUsed: {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        },
        sampleFilteredSubmissions: filteredSubmissions.slice(0, 3).map(s => ({
          id: s.id.substring(0, 8),
          submitted_at: s.submitted_at,
          submitted_at_user_tz: toZonedTime(parseISO(s.submitted_at), userTimezone).toISOString(),
          date_only: toZonedTime(parseISO(s.submitted_at), userTimezone).toISOString().split('T')[0]
        }))
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
  }, [submissions, forms, dateRange, userTimezone]);

  // Refetch data function
  const refetch = async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data: formsData, error: formsError } = await supabase
        .from('ghl_forms')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      const { data: submissionsData, error: submissionsError } = await supabase
        .from('ghl_form_submissions')
        .select('*')
        .eq('project_id', projectId)
        .order('submitted_at', { ascending: false });

      if (formsError || submissionsError) {
        throw new Error('Failed to refetch data');
      }

      setForms(formsData || []);
      setSubmissions(submissionsData || []);
    } catch (err) {
      console.error('Error refetching GHL data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return {
    submissions,
    forms,
    metrics,
    loading,
    error,
    refetch
  };
};