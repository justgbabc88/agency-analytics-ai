-- Drop the duplicate policy that uses the old pattern
DROP POLICY IF EXISTS "Users can create integration data for their projects" ON public.project_integration_data;

-- Add service role policy for automated syncs
CREATE POLICY "Service role can manage all integration data" 
ON public.project_integration_data 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);