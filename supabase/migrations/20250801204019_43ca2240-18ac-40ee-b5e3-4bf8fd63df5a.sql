-- Add cancelled_at field to track actual cancellation timestamps
ALTER TABLE calendly_events 
ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE NULL;

-- Create index for performance on cancelled_at queries
CREATE INDEX idx_calendly_events_cancelled_at ON calendly_events(cancelled_at) WHERE cancelled_at IS NOT NULL;

-- Update existing cancelled events to use created_at as fallback for cancelled_at
-- This is a reasonable approximation for existing data
UPDATE calendly_events 
SET cancelled_at = created_at 
WHERE status IN ('cancelled', 'canceled') 
AND cancelled_at IS NULL;