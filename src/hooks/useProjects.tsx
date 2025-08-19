import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAgency } from './useAgency';
import { useState, useEffect } from 'react';

export const useProjects = () => {
  const { agency } = useAgency();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => {
    // Initialize from localStorage if available
    const stored = localStorage.getItem('selectedProjectId');
    return stored || '';
  });

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

  // Auto-select first project if none selected and projects are available
  useEffect(() => {
    if (projects && projects.length > 0) {
      if (!selectedProjectId) {
        const projectToSelect = projects[0].id;
        setSelectedProjectId(projectToSelect);
        localStorage.setItem('selectedProjectId', projectToSelect);
      } else {
        // Verify the selected project still exists
        const projectExists = projects.find(p => p.id === selectedProjectId);
        if (!projectExists) {
          const projectToSelect = projects[0]?.id || '';
          setSelectedProjectId(projectToSelect);
          localStorage.setItem('selectedProjectId', projectToSelect);
        }
      }
    }
  }, [projects]);

  // Custom setter that also updates localStorage
  const setSelectedProjectIdWithPersistence = (projectId: string) => {
    setSelectedProjectId(projectId);
    localStorage.setItem('selectedProjectId', projectId);
    console.log('🔄 Project selected:', projectId);
    
    // Invalidate all project-specific queries to force immediate refresh
    queryClient.invalidateQueries({ queryKey: ['recent-events'] });
    queryClient.invalidateQueries({ queryKey: ['event-stats'] });
    queryClient.invalidateQueries({ queryKey: ['ghl-forms'] });
    queryClient.invalidateQueries({ queryKey: ['ghl-submissions'] });
    queryClient.invalidateQueries({ queryKey: ['calendly-events'] });
    queryClient.invalidateQueries({ queryKey: ['calendly-mappings'] });
    queryClient.invalidateQueries({ queryKey: ['facebook-integrations'] });
    queryClient.invalidateQueries({ queryKey: ['project-integrations'] });
    queryClient.invalidateQueries({ queryKey: ['tracking-events'] });
    queryClient.invalidateQueries({ queryKey: ['attribution-data'] });
    console.log('🔄 Invalidated all project-specific queries for immediate refresh');
  };

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

        console.log('Created project successfully:', data);

        // Create default integrations with better error handling
        try {
          await createDefaultIntegrations(data.id);
          console.log('Default integrations created successfully for project:', data.id);
        } catch (integrationError) {
          console.warn('Some default integrations failed to create, but project was created successfully:', integrationError);
          // Don't throw here as the project was created successfully
        }

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
    const results = [];
    
    for (const platform of defaultPlatforms) {
      try {
        console.log(`Creating default integration for ${platform} on project ${projectId}`);
        
        // First check if integration already exists to prevent conflicts
        const { data: existing, error: checkError } = await supabase
          .from('project_integrations')
          .select('id, platform')
          .eq('project_id', projectId)
          .eq('platform', platform)
          .maybeSingle();

        if (checkError) {
          console.error(`Error checking existing ${platform} integration:`, checkError);
          continue;
        }

        if (existing) {
          console.log(`Integration ${platform} already exists for project ${projectId}, skipping`);
          results.push({ platform, status: 'exists', data: existing });
          continue;
        }

        // Create new integration
        const { data, error } = await supabase
          .from('project_integrations')
          .insert({
            project_id: projectId,
            platform,
            is_connected: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error(`Error creating ${platform} integration:`, error);
          results.push({ platform, status: 'error', error });
        } else {
          console.log(`Successfully created ${platform} integration for project ${projectId}:`, data);
          results.push({ platform, status: 'created', data });
        }
      } catch (integrationError) {
        console.error(`Failed to process ${platform} integration:`, integrationError);
        results.push({ platform, status: 'failed', error: integrationError });
      }
    }
    
    console.log('Default integrations creation results:', results);
    return results;
  };

  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      console.log('Deleting project:', projectId);
      
      try {
        // First delete related project integrations to prevent foreign key conflicts
        const { error: integrationsError } = await supabase
          .from('project_integrations')
          .delete()
          .eq('project_id', projectId);

        if (integrationsError) {
          console.warn('Error deleting project integrations (continuing):', integrationsError);
        }

        // Delete project integration data
        const { error: dataError } = await supabase
          .from('project_integration_data')
          .delete()
          .eq('project_id', projectId);

        if (dataError) {
          console.warn('Error deleting project integration data (continuing):', dataError);
        }

        // Finally delete the project
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

  const updateProject = useMutation({
    mutationFn: async ({ projectId, updates }: { projectId: string; updates: { name?: string; funnel_type?: string } }) => {
      console.log('Updating project:', projectId, updates);
      
      try {
        const { data, error } = await supabase
          .from('projects')
          .update(updates)
          .eq('id', projectId)
          .select()
          .single();

        if (error) {
          console.error('Error updating project:', error);
          throw error;
        }
        
        console.log('Successfully updated project:', data);
        return data;
      } catch (error) {
        console.error('Failed to update project:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => {
      console.error('Update project mutation failed:', error);
    },
  });

  return {
    projects: projects || [],
    isLoading,
    createProject,
    updateProject,
    deleteProject,
    selectedProjectId,
    setSelectedProjectId: setSelectedProjectIdWithPersistence,
  };
};
