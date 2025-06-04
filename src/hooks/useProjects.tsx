
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAgency } from './useAgency';

export const useProjects = () => {
  const { agency } = useAgency();
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', agency?.id],
    queryFn: async () => {
      if (!agency) return [];
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('agency_id', agency.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!agency,
  });

  const createProject = useMutation({
    mutationFn: async (projectData: { name: string; funnel_type: string }) => {
      if (!agency) throw new Error('No agency found');
      
      const { data, error } = await supabase
        .from('projects')
        .insert({
          agency_id: agency.id,
          name: projectData.name,
          funnel_type: projectData.funnel_type,
        })
        .select()
        .single();

      if (error) throw error;

      // Create default integrations for the project using upsert to avoid duplicates
      const defaultIntegrations = [
        { project_id: data.id, platform: 'facebook', is_connected: false },
        { project_id: data.id, platform: 'google_sheets', is_connected: false },
        { project_id: data.id, platform: 'clickfunnels', is_connected: false },
      ];

      const { error: integrationsError } = await supabase
        .from('project_integrations')
        .upsert(defaultIntegrations, { 
          onConflict: 'project_id,platform',
          ignoreDuplicates: true 
        });

      if (integrationsError) {
        console.error('Error creating default integrations:', integrationsError);
        // Don't throw here as the project was created successfully
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return {
    projects: projects || [],
    isLoading,
    createProject,
    deleteProject,
  };
};
