import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    console.log(`📥 OAuth callback received - code: ${code ? 'present' : 'missing'}, state: ${state}`);

    if (error) {
      console.error('❌ OAuth error:', error);
      return new Response(
        `<html><body><h1>OAuth Error</h1><p>${error}</p></body></html>`,
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    if (!code || !state) {
      console.error('❌ Missing code or state parameter');
      return new Response(
        '<html><body><h1>OAuth Error</h1><p>Missing authorization code or state</p></body></html>',
        {
          status: 400,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    const { projectId, platform } = JSON.parse(atob(state));
    
    console.log(`🎯 Processing OAuth callback for project: ${projectId}, platform: ${platform}`);

    const clientId = Deno.env.get('GHL_CLIENT_ID');
    const clientSecret = Deno.env.get('GHL_CLIENT_SECRET');
    const redirectUri = `https://iqxvtfupjjxjkbajgcve.supabase.co/functions/v1/integration-oauth-callback`;

    if (!clientId || !clientSecret) {
      console.error('❌ GHL OAuth credentials not found');
      return new Response(
        '<html><body><h1>Configuration Error</h1><p>OAuth credentials not configured</p></body></html>',
        {
          status: 500,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Exchange authorization code for access token
    console.log('🔄 Starting token exchange with GHL...');
    console.log('📋 Request details:', {
      url: 'https://services.leadconnectorhq.com/oauth/token',
      method: 'POST',
      clientId: clientId ? 'present' : 'missing',
      clientSecret: clientSecret ? 'present' : 'missing',
      code: code ? 'present' : 'missing',
      redirectUri: redirectUri
    });

    const tokenResponse = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    console.log('📨 Token response status:', tokenResponse.status);
    console.log('📨 Token response headers:', Object.fromEntries(tokenResponse.headers.entries()));

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        body: errorText
      });
      return new Response(
        `<html><body><h1>OAuth Error</h1><p>Failed to exchange authorization code</p><p>Status: ${tokenResponse.status}</p><p>Error: ${errorText}</p></body></html>`,
        {
          status: 500,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ OAuth token received:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,
      locationId: tokenData.locationId,
      userId: tokenData.userId,
      companyId: tokenData.companyId
    });

    // Store the tokens securely in the database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: dbError } = await supabase
      .from('project_integration_data')
      .upsert({
        project_id: projectId,
        platform: platform,
        data: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_type: tokenData.token_type,
          expires_in: tokenData.expires_in,
          scope: tokenData.scope,
          location_id: tokenData.locationId,
          user_id: tokenData.userId,
          company_id: tokenData.companyId,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        },
        synced_at: new Date().toISOString(),
      });

    if (dbError) {
      console.error('❌ Database error storing tokens:', dbError);
      return new Response(
        '<html><body><h1>Database Error</h1><p>Failed to store OAuth tokens</p></body></html>',
        {
          status: 500,
          headers: { 'Content-Type': 'text/html' }
        }
      );
    }

    // Update project integration status
    const { error: integrationError } = await supabase
      .from('project_integrations')
      .upsert({
        project_id: projectId,
        platform: platform,
        is_connected: true,
        last_sync: new Date().toISOString(),
      });

    if (integrationError) {
      console.error('❌ Error updating integration status:', integrationError);
    }

    console.log(`✅ OAuth completed successfully for project ${projectId}`);

    // Return success page with auto-close script
    return new Response(
      `<html>
        <head>
          <title>OAuth Success</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #28a745; }
            .loading { margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1 class="success">✅ OAuth Successful!</h1>
          <p>Go High Level integration has been connected successfully.</p>
          <div class="loading">
            <p>This window will close automatically...</p>
          </div>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );

  } catch (error) {
    console.error('❌ OAuth callback error:', error);
    return new Response(
      '<html><body><h1>OAuth Error</h1><p>An unexpected error occurred</p></body></html>',
      {
        status: 500,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
});