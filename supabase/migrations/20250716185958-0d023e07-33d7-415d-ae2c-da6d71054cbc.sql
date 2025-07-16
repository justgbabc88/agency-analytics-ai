-- Add 'ghl' to the allowed platforms in project_integrations table
ALTER TABLE project_integrations 
DROP CONSTRAINT project_integrations_platform_check;

ALTER TABLE project_integrations 
ADD CONSTRAINT project_integrations_platform_check 
CHECK (platform = ANY (ARRAY['facebook'::text, 'google_sheets'::text, 'clickfunnels'::text, 'calendly'::text, 'ghl'::text]));

-- Add 'ghl' to the allowed platforms in project_integration_data table
ALTER TABLE project_integration_data 
DROP CONSTRAINT project_integration_data_platform_check;

ALTER TABLE project_integration_data 
ADD CONSTRAINT project_integration_data_platform_check 
CHECK (platform = ANY (ARRAY['facebook'::text, 'google_sheets'::text, 'clickfunnels'::text, 'calendly'::text, 'ghl'::text]));