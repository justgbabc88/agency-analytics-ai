
-- Enable RLS on calendly_event_mappings table
ALTER TABLE public.calendly_event_mappings ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for calendly_event_mappings table
DO $$
BEGIN
    -- Users can view event mappings for projects they own
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'calendly_event_mappings' AND policyname = 'Users can view event mappings for their projects') THEN
        CREATE POLICY "Users can view event mappings for their projects" 
          ON public.calendly_event_mappings 
          FOR SELECT 
          USING (public.user_owns_project(project_id));
    END IF;

    -- Users can create event mappings for projects they own
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'calendly_event_mappings' AND policyname = 'Users can create event mappings for their projects') THEN
        CREATE POLICY "Users can create event mappings for their projects" 
          ON public.calendly_event_mappings 
          FOR INSERT 
          WITH CHECK (public.user_owns_project(project_id));
    END IF;

    -- Users can update event mappings for projects they own
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'calendly_event_mappings' AND policyname = 'Users can update event mappings for their projects') THEN
        CREATE POLICY "Users can update event mappings for their projects" 
          ON public.calendly_event_mappings 
          FOR UPDATE 
          USING (public.user_owns_project(project_id));
    END IF;

    -- Users can delete event mappings for projects they own
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'calendly_event_mappings' AND policyname = 'Users can delete event mappings for their projects') THEN
        CREATE POLICY "Users can delete event mappings for their projects" 
          ON public.calendly_event_mappings 
          FOR DELETE 
          USING (public.user_owns_project(project_id));
    END IF;
END $$;

-- Add unique constraint to prevent duplicate event type mappings (if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'calendly_event_mappings_unique_event_type'
        AND table_name = 'calendly_event_mappings'
    ) THEN
        ALTER TABLE public.calendly_event_mappings 
        ADD CONSTRAINT calendly_event_mappings_unique_event_type 
        UNIQUE (calendly_event_type_id);
    END IF;
END $$;
