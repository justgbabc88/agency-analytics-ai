-- Add is_closed field to calendly_events table to track successful conversions
ALTER TABLE public.calendly_events 
ADD COLUMN is_closed boolean NOT NULL DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN public.calendly_events.is_closed IS 'Indicates whether this call resulted in a successful close/conversion';