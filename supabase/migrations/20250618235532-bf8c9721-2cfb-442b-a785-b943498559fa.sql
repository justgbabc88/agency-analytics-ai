
-- First, let's see all the duplicate mappings
SELECT 
  calendly_event_type_id,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text, ', ') as mapping_ids,
  STRING_AGG(project_id::text, ', ') as project_ids
FROM calendly_event_mappings 
GROUP BY calendly_event_type_id 
HAVING COUNT(*) > 1;

-- Remove duplicate mappings, keeping only the oldest one for each event type
DELETE FROM calendly_event_mappings 
WHERE id NOT IN (
  SELECT DISTINCT ON (calendly_event_type_id) id 
  FROM calendly_event_mappings 
  ORDER BY calendly_event_type_id, created_at ASC
);

-- Now migrate all calendly_events to the main project
UPDATE calendly_events 
SET project_id = '382c6666-c24d-4de1-b449-3858a46fbed3'
WHERE project_id != '382c6666-c24d-4de1-b449-3858a46fbed3';

-- Add the unique constraint now that duplicates are removed
ALTER TABLE calendly_event_mappings 
ADD CONSTRAINT unique_calendly_event_type_mapping 
UNIQUE (calendly_event_type_id);

-- Clean up any orphaned project data
DELETE FROM project_integration_data 
WHERE project_id NOT IN (SELECT id FROM projects);

DELETE FROM project_integrations 
WHERE project_id NOT IN (SELECT id FROM projects);

-- Remove any duplicate projects with the same name (keep the one that has the main project ID)
DELETE FROM projects 
WHERE name = 'Book A Call [TEST]' 
AND id != '382c6666-c24d-4de1-b449-3858a46fbed3';
