
-- Add RLS policies for calendly_event_mappings table
-- Users can view event mappings for projects they own
CREATE POLICY "Users can view event mappings for their projects" 
  ON public.calendly_event_mappings 
  FOR SELECT 
  USING (public.user_owns_project(project_id));

-- Users can create event mappings for projects they own
CREATE POLICY "Users can create event mappings for their projects" 
  ON public.calendly_event_mappings 
  FOR INSERT 
  WITH CHECK (public.user_owns_project(project_id));

-- Users can update event mappings for projects they own
CREATE POLICY "Users can update event mappings for their projects" 
  ON public.calendly_event_mappings 
  FOR UPDATE 
  USING (public.user_owns_project(project_id));

-- Users can delete event mappings for projects they own
CREATE POLICY "Users can delete event mappings for their projects" 
  ON public.calendly_event_mappings 
  FOR DELETE 
  USING (public.user_owns_project(project_id));
