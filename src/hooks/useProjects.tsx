
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
      
      try {
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
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        throw error;
      }
    },
    enabled: !!agency,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const createProject = useMutation({
    mutationFn: async (projectData: { name: string; funnel_type: string }) => {
      if (!agency) {
        const error = new Error('No agency found');
        console.error('Create project failed:', error.message);
        throw error;
      }
      
      console.log('Creating project:', projectData);
      
      try {
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

        // Create default integrations using a more robust approach
        await createDefaultIntegrations(data.id);

        return data;
      } catch (error) {
        console.error('Failed to create project:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => {
      console.error('Create project mutation failed:', error);
    },
  });

  const createDefaultIntegrations = async (projectId: string) => {
    const defaultPlatforms = ['facebook', 'google_sheets', 'clickfunnels'];
    
    for (const platform of defaultPlatforms) {
      try {
        // Use upsert to handle conflicts gracefully
        const { error: upsertError } = await supabase
          .from('project_integrations')
          .upsert({
            project_id: projectId,
            platform,
            is_connected: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'project_id,platform',
            ignoreDuplicates: true
          });

        if (upsertError) {
          console.error(`Error upserting ${platform} integration:`, upsertError);
          // Don't throw here as the project was created successfully
        } else {
          console.log(`Successfully upserted ${platform} integration for project ${projectId}`);
        }
      } catch (integrationError) {
        console.error(`Failed to process ${platform} integration:`, integrationError);
        // Continue with other integrations
      }
    }
  };

  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      console.log('Deleting project:', projectId);
      
      try {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId);

        if (error) {
          console.error('Error deleting project:', error);
          throw error;
        }
        
        console.log('Successfully deleted project:', projectId);
      } catch (error) {
        console.error('Failed to delete project:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => {
      console.error('Delete project mutation failed:', error);
    },
  });

  return {
    projects: projects || [],
    isLoading,
    createProject,
    deleteProject,
  };
};
