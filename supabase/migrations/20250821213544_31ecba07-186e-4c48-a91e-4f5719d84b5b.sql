-- Add unique constraints to ensure one integration per project per platform
ALTER TABLE project_integrations ADD CONSTRAINT project_integrations_unique UNIQUE (project_id, platform);
ALTER TABLE project_integration_data ADD CONSTRAINT project_integration_data_unique UNIQUE (project_id, platform);