import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGHLFormSubmissions, FormSubmissionMetrics } from './useGHLFormSubmissions';
import { useCalendlyData } from './useCalendlyData';
import { useCallStatsCalculations } from './useCallStatsCalculations';
import { useUserProfile } from './useUserProfile';

interface LeadStats {
  // Form submission stats
  formSubmissions: {
    total: number;
    byDay: Record<string, number>;
    byForm: Record<string, number>;
    topForms: Array<{
      form_id: string;
      form_name: string;
      submissions: number;
    }>;
    metrics: FormSubmissionMetrics;
  };
  
  // Call booking stats
  callBookings: {
    total: number;
    taken: number;
    cancelled: number;
    showUpRate: number;
    completed: number;
    upcoming: number;
  };
  
  // Combined lead metrics
  totalLeads: number;
  leadConversionRate: number;
  averageLeadsPerDay: number;
  
  // Performance comparisons
  previousPeriod: {
    formSubmissions: number;
    callBookings: number;
    totalLeads: number;
  };
  
  // Growth rates
  growth: {
    formSubmissions: number;
    callBookings: number;
    totalLeads: number;
  };
}

export const useLeadStats = (
  projectId: string,
  dateRange?: { from: Date; to: Date },
  selectedFormIds?: string[]
) => {
  const { getUserTimezone } = useUserProfile();
  const userTimezone = getUserTimezone();

  // Get cached form submissions data
  const {
    metrics: formMetrics,
    loading: formLoading,
    refetch: refetchForms
  } = useGHLFormSubmissions(projectId, dateRange, selectedFormIds);

  // Get cached Calendly data
  const {
    calendlyEvents,
    isLoading: calendlyLoading,
    refetch: refetchCalendly
  } = useCalendlyData(projectId);

  // Calculate call stats
  const callStats = useCallStatsCalculations(
    calendlyEvents || [],
    dateRange || { from: new Date(), to: new Date() },
    userTimezone
  );

  // Cache the combined lead stats with React Query for additional performance
  const { data: leadStats, isLoading: statsLoading } = useQuery({
    queryKey: ['lead-stats', projectId, dateRange?.from, dateRange?.to, selectedFormIds],
    queryFn: () => {
      // Calculate days in range for averages
      const daysDifference = dateRange ? 
        Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) : 1;

      // Form submission stats
      const formSubmissionStats = {
        total: formMetrics.totalSubmissions,
        byDay: formMetrics.submissionsByDay,
        byForm: formMetrics.submissionsByForm,
        topForms: formMetrics.topPerformingForms,
        metrics: formMetrics
      };

      // Call booking stats
      const callBookingStats = {
        total: callStats.callStats.totalBookings,
        taken: callStats.callsTaken,
        cancelled: callStats.callStats.cancelled,
        showUpRate: callStats.showUpRate,
        completed: callStats.callCounts.completed,
        upcoming: callStats.callCounts.upcoming
      };

      // Combined metrics
      const totalLeads = formMetrics.totalSubmissions + callStats.callStats.totalBookings;
      const leadConversionRate = totalLeads > 0 ? 
        (callStats.callCounts.completed / totalLeads) * 100 : 0;
      const averageLeadsPerDay = totalLeads / Math.max(daysDifference, 1);

      // Previous period comparisons
      const previousPeriodStats = {
        formSubmissions: 0, // Would need historical data for accurate comparison
        callBookings: callStats.previousStats.totalBookings,
        totalLeads: callStats.previousStats.totalBookings
      };

      // Growth calculations
      const growth = {
        formSubmissions: previousPeriodStats.formSubmissions > 0 ? 
          ((formMetrics.totalSubmissions - previousPeriodStats.formSubmissions) / previousPeriodStats.formSubmissions) * 100 : 0,
        callBookings: previousPeriodStats.callBookings > 0 ? 
          ((callStats.callStats.totalBookings - previousPeriodStats.callBookings) / previousPeriodStats.callBookings) * 100 : 0,
        totalLeads: previousPeriodStats.totalLeads > 0 ? 
          ((totalLeads - previousPeriodStats.totalLeads) / previousPeriodStats.totalLeads) * 100 : 0
      };

      const stats: LeadStats = {
        formSubmissions: formSubmissionStats,
        callBookings: callBookingStats,
        totalLeads,
        leadConversionRate,
        averageLeadsPerDay,
        previousPeriod: previousPeriodStats,
        growth
      };

      console.log('📊 [useLeadStats] Calculated lead stats:', {
        projectId,
        dateRange: dateRange ? {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        } : null,
        stats: {
          totalLeads: stats.totalLeads,
          formSubmissions: stats.formSubmissions.total,
          callBookings: stats.callBookings.total,
          conversionRate: stats.leadConversionRate,
          averagePerDay: stats.averageLeadsPerDay
        }
      });

      return stats;
    },
    enabled: !!projectId && !formLoading && !calendlyLoading,
    staleTime: 2 * 60 * 1000, // Stats are fresh for 2 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Manual refetch function
  const refetch = () => {
    console.log('📊 [useLeadStats] Manual refetch triggered');
    refetchForms();
    refetchCalendly();
  };

  const isLoading = formLoading || calendlyLoading || statsLoading;

  return {
    leadStats: leadStats || null,
    loading: isLoading,
    refetch,
    // Expose individual data sources for components that need them
    formMetrics,
    callStats,
    calendlyEvents
  };
};