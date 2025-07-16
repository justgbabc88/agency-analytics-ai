-- Update the GHL integration to be connected
UPDATE project_integrations 
SET is_connected = true, 
    last_sync = now(),
    updated_at = now()
WHERE project_id = '382c6666-c24d-4de1-b449-3858a46fbed3' 
  AND platform = 'ghl';