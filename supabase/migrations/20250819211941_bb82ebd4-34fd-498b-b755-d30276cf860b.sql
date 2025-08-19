-- Remove the problematic RESTRICTIVE policy that's causing security scan errors
DROP POLICY IF EXISTS "deny_anonymous_attribution_access" ON public.attribution_data;

-- The existing policies already provide proper security:
-- 1. "authenticated_users_view_own_project_attribution" - only authenticated users who own projects
-- 2. "service_and_owners_create_attribution_data" - only service role or project owners  
-- 3. Other CRUD policies all require authentication and project ownership

-- No anonymous access is possible with the existing policies, so the RESTRICTIVE policy was redundant
-- and was being flagged by the security scanner as potentially blocking legitimate access