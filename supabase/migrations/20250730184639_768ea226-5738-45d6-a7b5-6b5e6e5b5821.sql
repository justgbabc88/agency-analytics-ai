-- Update the platform check constraint in project_integrations table to include zoho_crm
ALTER TABLE public.project_integrations 
DROP CONSTRAINT IF EXISTS project_integrations_platform_check;

-- Add updated constraint that includes zoho_crm
ALTER TABLE public.project_integrations 
ADD CONSTRAINT project_integrations_platform_check 
CHECK (platform IN ('facebook', 'google_sheets', 'clickfunnels', 'calendly', 'ghl', 'zoho_crm'));