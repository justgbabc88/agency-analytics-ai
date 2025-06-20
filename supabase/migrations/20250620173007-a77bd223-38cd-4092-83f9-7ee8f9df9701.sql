
-- Add RLS policies for tables that don't have them yet
-- Using IF NOT EXISTS pattern to avoid conflicts

-- Enable RLS on tables (this is safe to run multiple times)
ALTER TABLE public.tracking_pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribution_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_integrations ENABLE ROW LEVEL SECURITY;

-- Add policies only if they don't exist
DO $$
BEGIN
    -- tracking_pixels policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tracking_pixels' AND policyname = 'Users can view pixels for their projects') THEN
        CREATE POLICY "Users can view pixels for their projects" ON public.tracking_pixels FOR SELECT USING (public.user_owns_project(project_id));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tracking_pixels' AND policyname = 'Users can create pixels for their projects') THEN
        CREATE POLICY "Users can create pixels for their projects" ON public.tracking_pixels FOR INSERT WITH CHECK (public.user_owns_project(project_id));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tracking_pixels' AND policyname = 'Users can update pixels for their projects') THEN
        CREATE POLICY "Users can update pixels for their projects" ON public.tracking_pixels FOR UPDATE USING (public.user_owns_project(project_id));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tracking_pixels' AND policyname = 'Users can delete pixels for their projects') THEN
        CREATE POLICY "Users can delete pixels for their projects" ON public.tracking_pixels FOR DELETE USING (public.user_owns_project(project_id));
    END IF;

    -- tracking_events policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tracking_events' AND policyname = 'Users can view events for their projects') THEN
        CREATE POLICY "Users can view events for their projects" ON public.tracking_events FOR SELECT USING (public.user_owns_project(project_id));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tracking_events' AND policyname = 'Users can create events for their projects') THEN
        CREATE POLICY "Users can create events for their projects" ON public.tracking_events FOR INSERT WITH CHECK (public.user_owns_project(project_id));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tracking_events' AND policyname = 'Users can update events for their projects') THEN
        CREATE POLICY "Users can update events for their projects" ON public.tracking_events FOR UPDATE USING (public.user_owns_project(project_id));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tracking_events' AND policyname = 'Users can delete events for their projects') THEN
        CREATE POLICY "Users can delete events for their projects" ON public.tracking_events FOR DELETE USING (public.user_owns_project(project_id));
    END IF;

    -- tracking_sessions policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tracking_sessions' AND policyname = 'Users can view sessions for their projects') THEN
        CREATE POLICY "Users can view sessions for their projects" ON public.tracking_sessions FOR SELECT USING (public.user_owns_project(project_id));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tracking_sessions' AND policyname = 'Users can create sessions for their projects') THEN
        CREATE POLICY "Users can create sessions for their projects" ON public.tracking_sessions FOR INSERT WITH CHECK (public.user_owns_project(project_id));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tracking_sessions' AND policyname = 'Users can update sessions for their projects') THEN
        CREATE POLICY "Users can update sessions for their projects" ON public.tracking_sessions FOR UPDATE USING (public.user_owns_project(project_id));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tracking_sessions' AND policyname = 'Users can delete sessions for their projects') THEN
        CREATE POLICY "Users can delete sessions for their projects" ON public.tracking_sessions FOR DELETE USING (public.user_owns_project(project_id));
    END IF;

    -- attribution_data policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attribution_data' AND policyname = 'Users can view attribution for their projects') THEN
        CREATE POLICY "Users can view attribution for their projects" ON public.attribution_data FOR SELECT USING (public.user_owns_project(project_id));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attribution_data' AND policyname = 'Users can create attribution for their projects') THEN
        CREATE POLICY "Users can create attribution for their projects" ON public.attribution_data FOR INSERT WITH CHECK (public.user_owns_project(project_id));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attribution_data' AND policyname = 'Users can update attribution for their projects') THEN
        CREATE POLICY "Users can update attribution for their projects" ON public.attribution_data FOR UPDATE USING (public.user_owns_project(project_id));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attribution_data' AND policyname = 'Users can delete attribution for their projects') THEN
        CREATE POLICY "Users can delete attribution for their projects" ON public.attribution_data FOR DELETE USING (public.user_owns_project(project_id));
    END IF;

    -- project_integrations policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_integrations' AND policyname = 'Users can view integrations for their projects') THEN
        CREATE POLICY "Users can view integrations for their projects" ON public.project_integrations FOR SELECT USING (public.user_owns_project(project_id));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_integrations' AND policyname = 'Users can create integrations for their projects') THEN
        CREATE POLICY "Users can create integrations for their projects" ON public.project_integrations FOR INSERT WITH CHECK (public.user_owns_project(project_id));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_integrations' AND policyname = 'Users can update integrations for their projects') THEN
        CREATE POLICY "Users can update integrations for their projects" ON public.project_integrations FOR UPDATE USING (public.user_owns_project(project_id));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'project_integrations' AND policyname = 'Users can delete integrations for their projects') THEN
        CREATE POLICY "Users can delete integrations for their projects" ON public.project_integrations FOR DELETE USING (public.user_owns_project(project_id));
    END IF;
END $$;

-- Add unique constraint to prevent duplicate project integrations (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'project_integrations_project_platform_unique'
        AND table_name = 'project_integrations'
    ) THEN
        ALTER TABLE public.project_integrations 
        ADD CONSTRAINT project_integrations_project_platform_unique 
        UNIQUE (project_id, platform);
    END IF;
END $$;
