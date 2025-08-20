-- Drop the old check constraint and recreate it with the new ads_only value
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_funnel_type_check;

-- Add the updated check constraint that includes ads_only
ALTER TABLE projects ADD CONSTRAINT projects_funnel_type_check 
CHECK (funnel_type IN ('webinar', 'book_call', 'low_ticket', 'high_ticket', 'ads_only'));