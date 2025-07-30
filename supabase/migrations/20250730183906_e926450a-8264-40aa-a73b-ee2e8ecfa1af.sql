-- Check current constraint on project_integration_data table
SELECT conname, pg_get_constraintdef(c.oid) 
FROM pg_constraint c 
JOIN pg_namespace n ON n.oid = c.connamespace 
WHERE c.conrelid = 'public.project_integration_data'::regclass 
AND c.contype = 'c';

-- Update the platform check constraint to include zoho_crm
ALTER TABLE public.project_integration_data 
DROP CONSTRAINT IF EXISTS project_integration_data_platform_check;

-- Add updated constraint that includes zoho_crm
ALTER TABLE public.project_integration_data 
ADD CONSTRAINT project_integration_data_platform_check 
CHECK (platform IN ('facebook', 'google', 'calendly', 'ghl', 'zoho_crm'));