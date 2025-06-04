
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
      
      console.log('Fetching projects for agency:', agency.id);
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('agency_id', agency.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
      
      console.log('Fetched projects:', data);
      return data || [];
    },
    enabled: !!agency,
  });

  const createProject = useMutation({
    mutationFn: async (projectData: { name: string; funnel_type: string }) => {
      if (!agency) throw new Error('No agency found');
      
      console.log('Creating project:', projectData);
      
      const { data, error } = await supabase
        .from('projects')
        .insert({
          agency_id: agency.id,
          name: projectData.name,
          funnel_type: projectData.funnel_type,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating project:', error);
        throw error;
      }

      console.log('Created project:', data);

      // Create default integrations for the project using upsert to avoid duplicates
      const defaultIntegrations = [
        { 
          project_id: data.id, 
          platform: 'facebook', 
          is_connected: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { 
          project_id: data.id, 
          platform: 'google_sheets', 
          is_connected: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { 
          project_id: data.id, 
          platform: 'clickfunnels', 
          is_connected: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      console.log('Creating default integrations:', defaultIntegrations);

      const { error: integrationsError } = await supabase
        .from('project_integrations')
        .upsert(defaultIntegrations, { 
          onConflict: 'project_id,platform',
          ignoreDuplicates: true 
        });

      if (integrationsError) {
        console.error('Error creating default integrations:', integrationsError);
        // Don't throw here as the project was created successfully
      } else {
        console.log('Successfully created default integrations');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      console.log('Deleting project:', projectId);
      
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        console.error('Error deleting project:', error);
        throw error;
      }
      
      console.log('Successfully deleted project:', projectId);
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
