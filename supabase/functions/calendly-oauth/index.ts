
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== CALENDLY OAUTH REQUEST ===');
  console.log('Method:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, projectId, code, webhookUrl } = await req.json();
    console.log('Action:', action, 'ProjectId:', projectId);

    switch (action) {
      case 'get_auth_url': {
        const clientId = Deno.env.get('CALENDLY_CLIENT_ID');
        const redirectUri = `${req.headers.get('origin')}/calendly-oauth-callback`;
        
        if (!clientId) {
          throw new Error('Calendly client ID not configured');
        }

        const authUrl = `https://auth.calendly.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=default&state=${projectId}`;
        
        return new Response(JSON.stringify({ auth_url: authUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'exchange_code': {
        const clientId = Deno.env.get('CALENDLY_CLIENT_ID');
        const clientSecret = Deno.env.get('CALENDLY_CLIENT_SECRET');
        const redirectUri = `${req.headers.get('origin')}/calendly-oauth-callback`;

        if (!clientId || !clientSecret) {
          throw new Error('Calendly credentials not configured');
        }

        // Exchange code for access token
        const tokenResponse = await fetch('https://auth.calendly.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            code: code,
          }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
          throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`);
        }

        // Get user info
        const userResponse = await fetch('https://api.calendly.com/users/me', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        const userData = await userResponse.json();

        if (!userResponse.ok) {
          throw new Error('Failed to get user info');
        }

        // Store the integration
        const { error: integrationError } = await supabase
          .from('project_integrations')
          .upsert({
            project_id: projectId,
            platform: 'calendly',
            is_connected: true,
            last_sync: new Date().toISOString()
          });

        if (integrationError) {
          throw integrationError;
        }

        // Store the access token and user info in integration data
        const { error: dataError } = await supabase
          .from('project_integration_data')
          .upsert({
            project_id: projectId,
            platform: 'calendly',
            data: {
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              user_uri: userData.resource.uri,
              user_name: userData.resource.name,
              user_email: userData.resource.email,
              token_expires_at: tokenData.expires_at ? new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString() : null
            },
            synced_at: new Date().toISOString()
          });

        if (dataError) {
          throw dataError;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_access_token': {
        console.log('=== GET ACCESS TOKEN ===');
        console.log('Project ID:', projectId);

        // Get stored access token
        const { data: tokenData, error: tokenError } = await supabase
          .from('project_integration_data')
          .select('data')
          .eq('project_id', projectId)
          .eq('platform', 'calendly')
          .order('synced_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (tokenError) {
          throw tokenError;
        }

        if (!tokenData || !tokenData.data.access_token) {
          console.log('No access token found for project:', projectId);
          return new Response(JSON.stringify({ error: 'No access token found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        console.log('Token found, returning access token data...');
        return new Response(JSON.stringify({
          access_token: tokenData.data.access_token,
          user_uri: tokenData.data.user_uri
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_event_types': {
        console.log('=== GET EVENT TYPES ===');
        console.log('Project ID:', projectId);

        // Get stored access token
        const { data: tokenData, error: tokenError } = await supabase
          .from('project_integration_data')
          .select('data')
          .eq('project_id', projectId)
          .eq('platform', 'calendly')
          .order('synced_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (tokenError || !tokenData) {
          throw new Error('Access token not found');
        }

        console.log('Token found, fetching event types...');

        const eventTypesUrl = `https://api.calendly.com/event_types?user=${encodeURIComponent(tokenData.data.user_uri)}`;
        console.log('Fetching event types from:', eventTypesUrl);

        const response = await fetch(eventTypesUrl, {
          headers: {
            'Authorization': `Bearer ${tokenData.data.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Calendly API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('Successfully retrieved', data.collection?.length || 0, 'event types');

        return new Response(JSON.stringify({ event_types: data.collection || [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'setup_webhooks': {
        // Get stored access token
        const { data: tokenData, error: tokenError } = await supabase
          .from('project_integration_data')
          .select('data')
          .eq('project_id', projectId)
          .eq('platform', 'calendly')
          .order('synced_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (tokenError || !tokenData) {
          throw new Error('Access token not found');
        }

        // Create webhook subscription
        const webhookResponse = await fetch('https://api.calendly.com/webhook_subscriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenData.data.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/calendly-webhook`,
            events: [
              'invitee.created',
              'invitee.canceled'
            ],
            organization: tokenData.data.user_uri.replace('/users/', '/organizations/'),
            scope: 'organization'
          })
        });

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text();
          console.error('Webhook setup failed:', errorText);
          throw new Error(`Webhook setup failed: ${webhookResponse.status} - ${errorText}`);
        }

        const webhookData = await webhookResponse.json();
        
        return new Response(JSON.stringify({ 
          success: true, 
          webhook_id: webhookData.resource.uri 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'disconnect': {
        // Mark integration as disconnected
        const { error: integrationError } = await supabase
          .from('project_integrations')
          .update({ is_connected: false })
          .eq('project_id', projectId)
          .eq('platform', 'calendly');

        if (integrationError) {
          throw integrationError;
        }

        // Delete stored tokens
        const { error: dataError } = await supabase
          .from('project_integration_data')
          .delete()
          .eq('project_id', projectId)
          .eq('platform', 'calendly');

        if (dataError) {
          throw dataError;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        console.error('=== ERROR === Invalid action:', action);
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('OAuth error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
