-- Enable Row Level Security on project_integration_data table
ALTER TABLE public.project_integration_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_integration_data using user_owns_project function
-- Users can view integration data for their projects
CREATE POLICY "Users can view integration data for their projects" 
ON public.project_integration_data 
FOR SELECT 
USING (public.user_owns_project(project_id));

-- Users can create integration data for their projects
CREATE POLICY "Users can create integration data for their projects" 
ON public.project_integration_data 
FOR INSERT 
WITH CHECK (public.user_owns_project(project_id));

-- Users can update integration data for their projects
CREATE POLICY "Users can update integration data for their projects" 
ON public.project_integration_data 
FOR UPDATE 
USING (public.user_owns_project(project_id));

-- Users can delete integration data for their projects
CREATE POLICY "Users can delete integration data for their projects" 
ON public.project_integration_data 
FOR DELETE 
USING (public.user_owns_project(project_id));

-- Allow service role to manage integration data for automated syncs
CREATE POLICY "Service role can manage all integration data" 
ON public.project_integration_data 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);