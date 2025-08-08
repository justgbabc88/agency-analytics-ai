-- Add token expiration tracking for Zoho integration
-- Update the project_integration_data table structure to track token expiration

-- First, let's add a function to refresh Zoho tokens proactively
CREATE OR REPLACE FUNCTION public.refresh_zoho_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  integration_record RECORD;
  new_access_token TEXT;
  refresh_response JSONB;
BEGIN
  -- Find all Zoho integrations that need token refresh (expire within next hour)
  FOR integration_record IN 
    SELECT pid.project_id, pid.data, pid.id
    FROM project_integration_data pid
    WHERE pid.platform = 'zoho_crm'
    AND pid.data ? 'access_token'
    AND pid.data ? 'refresh_token'
    AND pid.data ? 'expires_in'
    AND pid.data ? 'connected_at'
    AND (
      -- If token expires within the next hour, refresh it
      (pid.data->>'connected_at')::timestamp + 
      (COALESCE((pid.data->>'expires_in')::integer, 3600) || ' seconds')::interval 
      < NOW() + interval '1 hour'
    )
  LOOP
    -- Log the refresh attempt
    RAISE NOTICE 'Refreshing Zoho token for project: %', integration_record.project_id;
    
    -- Call the refresh function - this will be handled by the edge function
    -- For now, we'll just update the timestamp to indicate a refresh is needed
    UPDATE project_integration_data 
    SET data = integration_record.data || jsonb_build_object(
      'refresh_needed', true,
      'last_refresh_check', NOW()::text
    )
    WHERE id = integration_record.id;
  END LOOP;
END;
$$;

-- Create a function to schedule automatic token refresh
CREATE OR REPLACE FUNCTION public.setup_zoho_token_refresh_cron()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Enable pg_cron extension if not already enabled
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  
  -- Remove existing cron job if it exists
  PERFORM cron.unschedule('zoho-token-refresh');
  
  -- Schedule token refresh every 30 minutes
  PERFORM cron.schedule(
    'zoho-token-refresh',
    '*/30 * * * *',
    'SELECT public.refresh_zoho_tokens();'
  );
  
  RETURN 'Zoho token refresh cron job scheduled successfully (every 30 minutes)';
END;
$$;

-- Execute the setup function to start the cron job
SELECT public.setup_zoho_token_refresh_cron();