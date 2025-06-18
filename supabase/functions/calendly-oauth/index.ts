
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, projectId, code, webhookUrl } = await req.json();

    if (action === 'get_auth_url') {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      const clientId = Deno.env.get('CALENDLY_CLIENT_ID');
      
      // Use the user's configured redirect URI
      const redirectUri = 'https://agency-analytics-ai.lovable.app/calendly-callback';
      
      const authUrl = new URL('https://auth.calendly.com/oauth/authorize');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', projectId);
      authUrl.searchParams.set('scope', 'default');

      return new Response(JSON.stringify({ auth_url: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'list_webhooks') {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      // Get stored access token
      const { data: integrationData, error } = await supabase
        .from('project_integration_data')
        .select('data')
        .eq('project_id', projectId)
        .eq('platform', 'calendly')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !integrationData) {
        throw new Error('No Calendly integration found');
      }

      const accessToken = integrationData.data.access_token;
      if (!accessToken) {
        throw new Error('No access token found');
      }

      // List existing webhooks
      const webhooksResponse = await fetch('https://api.calendly.com/webhook_subscriptions', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!webhooksResponse.ok) {
        const errorText = await webhooksResponse.text();
        throw new Error(`Failed to list webhooks: ${errorText}`);
      }

      const webhooksData = await webhooksResponse.json();
      
      return new Response(JSON.stringify({
        webhooks: webhooksData.collection || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'cleanup_webhooks') {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      // Get stored access token
      const { data: integrationData, error } = await supabase
        .from('project_integration_data')
        .select('data')
        .eq('project_id', projectId)
        .eq('platform', 'calendly')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !integrationData) {
        throw new Error('No Calendly integration found');
      }

      const accessToken = integrationData.data.access_token;
      if (!accessToken) {
        throw new Error('No access token found');
      }

      const targetWebhookUrl = `https://iqxvtfupjjxjkbajgcve.supabase.co/functions/v1/calendly-webhook`;

      // List existing webhooks first
      const webhooksResponse = await fetch('https://api.calendly.com/webhook_subscriptions', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!webhooksResponse.ok) {
        throw new Error('Failed to list existing webhooks');
      }

      const webhooksData = await webhooksResponse.json();
      const existingWebhooks = webhooksData.collection || [];

      // Find webhooks with our target URL
      const duplicateWebhooks = existingWebhooks.filter(webhook => webhook.url === targetWebhookUrl);
      
      console.log(`🔍 Found ${duplicateWebhooks.length} duplicate webhooks for URL: ${targetWebhookUrl}`);

      let cleanedCount = 0;
      for (const webhook of duplicateWebhooks) {
        try {
          const deleteResponse = await fetch(`https://api.calendly.com/webhook_subscriptions/${webhook.uri}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            }
          });

          if (deleteResponse.ok) {
            console.log(`✅ Deleted webhook: ${webhook.uri}`);
            cleanedCount++;
          } else {
            console.warn(`⚠️ Failed to delete webhook: ${webhook.uri}`);
          }
        } catch (error) {
          console.warn(`⚠️ Error deleting webhook ${webhook.uri}:`, error);
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        cleaned_count: cleanedCount,
        found_count: duplicateWebhooks.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'handle_callback') {
      if (!code || !projectId) {
        throw new Error('Missing code or project ID');
      }

      // Use the same redirect URI for token exchange
      const redirectUri = 'https://agency-analytics-ai.lovable.app/calendly-callback';

      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://auth.calendly.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          client_id: Deno.env.get('CALENDLY_CLIENT_ID'),
          client_secret: Deno.env.get('CALENDLY_CLIENT_SECRET'),
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokenData = await tokenResponse.json();
      console.log('✅ Successfully received access token');

      // Get user info to extract organization
      const userResponse = await fetch('https://api.calendly.com/users/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to get user info from Calendly');
      }

      const userData = await userResponse.json();
      const currentOrganization = userData.resource.current_organization;
      console.log('📋 Current organization:', currentOrganization);

      // Enhanced webhook registration with cleanup
      console.log('🔗 Setting up webhooks with cleanup...');
      const webhookUrl = `https://iqxvtfupjjxjkbajgcve.supabase.co/functions/v1/calendly-webhook`;
      
      // First, list existing webhooks
      const existingWebhooksResponse = await fetch('https://api.calendly.com/webhook_subscriptions', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      let webhookData = null;
      let webhookStatus = 'failed';
      let webhookMessage = 'Unknown error';

      if (existingWebhooksResponse.ok) {
        const existingWebhooksData = await existingWebhooksResponse.json();
        const existingWebhooks = existingWebhooksData.collection || [];
        
        // Check if webhook already exists
        const existingWebhook = existingWebhooks.find(webhook => webhook.url === webhookUrl);
        
        if (existingWebhook) {
          console.log('♻️ Found existing webhook, reusing it:', existingWebhook.uri);
          webhookData = { resource: existingWebhook };
          webhookStatus = 'registered';
          webhookMessage = 'Reused existing webhook';
        } else {
          // No existing webhook, create new one
          const webhookResponse = await fetch('https://api.calendly.com/webhook_subscriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              url: webhookUrl,
              events: ['invitee.created', 'invitee.canceled'],
              organization: currentOrganization,
              scope: 'organization'
            })
          });

          if (webhookResponse.ok) {
            webhookData = await webhookResponse.json();
            webhookStatus = 'registered';
            webhookMessage = 'Successfully created new webhook';
            console.log('✅ Webhook registered successfully:', webhookData.resource.uri);
          } else {
            const errorText = await webhookResponse.text();
            console.warn('⚠️ Webhook registration failed:', errorText);
            webhookStatus = 'failed';
            webhookMessage = `Failed to create webhook: ${errorText}`;
          }
        }
      } else {
        console.warn('⚠️ Failed to list existing webhooks, proceeding with creation attempt');
        webhookStatus = 'failed';
        webhookMessage = 'Failed to list existing webhooks';
      }

      // Store integration data with enhanced webhook info
      const integrationData = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        organization: currentOrganization,
        webhook_id: webhookData?.resource?.uri,
        signing_key: webhookData?.resource?.signing_key,
        user_uri: userData.resource.uri,
        webhook_status: webhookStatus,
        webhook_message: webhookMessage,
        webhook_url: webhookUrl
      };

      // Check if integration already exists
      const { data: existingIntegration } = await supabase
        .from('project_integrations')
        .select('id')
        .eq('project_id', projectId)
        .eq('platform', 'calendly')
        .maybeSingle();

      if (existingIntegration) {
        // Update existing integration
        const { error: integrationError } = await supabase
          .from('project_integrations')
          .update({
            is_connected: true,
            last_sync: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('project_id', projectId)
          .eq('platform', 'calendly');

        if (integrationError) {
          console.error('Failed to update project integration:', integrationError);
          throw new Error('Failed to update integration status');
        }
      } else {
        // Create new integration
        const { error: integrationError } = await supabase
          .from('project_integrations')
          .insert({
            project_id: projectId,
            platform: 'calendly',
            is_connected: true,
            last_sync: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (integrationError) {
          console.error('Failed to create project integration:', integrationError);
          throw new Error('Failed to create integration status');
        }
      }

      // Store integration data (use upsert for integration data)
      const { error: dataError } = await supabase
        .from('project_integration_data')
        .upsert({
          project_id: projectId,
          platform: 'calendly',
          data: integrationData,
          synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (dataError) {
        console.error('Failed to store integration data:', dataError);
        throw new Error('Failed to store integration data');
      }

      console.log('✅ Calendly integration completed successfully');

      return new Response(JSON.stringify({ 
        success: true,
        webhook_registered: webhookStatus === 'registered',
        webhook_status: webhookStatus,
        webhook_message: webhookMessage
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'setup_webhooks') {
      if (!projectId || !webhookUrl) {
        throw new Error('Missing project ID or webhook URL');
      }

      // Get stored access token
      const { data: integrationData, error } = await supabase
        .from('project_integration_data')
        .select('data')
        .eq('project_id', projectId)
        .eq('platform', 'calendly')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !integrationData) {
        throw new Error('No Calendly integration found');
      }

      const accessToken = integrationData.data.access_token;
      const organization = integrationData.data.organization;

      if (!accessToken || !organization) {
        throw new Error('Missing access token or organization');
      }

      // Enhanced webhook setup with discovery and cleanup
      let webhookStatus = 'failed';
      let webhookMessage = 'Unknown error';
      let webhookData = null;

      // First check if webhook already exists
      if (!integrationData.data.webhook_id || integrationData.data.webhook_status !== 'registered') {
        // List existing webhooks first
        const existingWebhooksResponse = await fetch('https://api.calendly.com/webhook_subscriptions', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (existingWebhooksResponse.ok) {
          const existingWebhooksData = await existingWebhooksResponse.json();
          const existingWebhooks = existingWebhooksData.collection || [];
          
          // Look for existing webhook with our URL
          const existingWebhook = existingWebhooks.find(webhook => webhook.url === webhookUrl);
          
          if (existingWebhook) {
            console.log('♻️ Found existing webhook, reusing it:', existingWebhook.uri);
            webhookData = { resource: existingWebhook };
            webhookStatus = 'registered';
            webhookMessage = 'Reused existing webhook';
          } else {
            // Create new webhook
            const webhookResponse = await fetch('https://api.calendly.com/webhook_subscriptions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                url: webhookUrl,
                events: ['invitee.created', 'invitee.canceled'],
                organization: organization,
                scope: 'organization'
              })
            });

            if (webhookResponse.ok) {
              webhookData = await webhookResponse.json();
              webhookStatus = 'registered';
              webhookMessage = 'Successfully created new webhook';
              console.log('✅ Webhook registered successfully');
            } else {
              const errorText = await webhookResponse.text();
              webhookStatus = 'failed';
              webhookMessage = `Failed to create webhook: ${errorText}`;
              console.error('❌ Webhook registration failed:', errorText);
            }
          }
        } else {
          webhookStatus = 'failed';
          webhookMessage = 'Failed to list existing webhooks';
        }

        // Update stored data with webhook info
        if (webhookData) {
          const updatedData = {
            ...integrationData.data,
            webhook_id: webhookData.resource.uri,
            signing_key: webhookData.resource.signing_key,
            webhook_status: webhookStatus,
            webhook_message: webhookMessage,
            webhook_url: webhookUrl
          };

          await supabase
            .from('project_integration_data')
            .update({
              data: updatedData,
              updated_at: new Date().toISOString()
            })
            .eq('project_id', projectId)
            .eq('platform', 'calendly');

          console.log('✅ Webhook data updated in database');
        }
      } else {
        webhookStatus = 'registered';
        webhookMessage = 'Webhook already configured';
      }

      return new Response(JSON.stringify({ 
        success: true,
        webhook_status: webhookStatus,
        webhook_message: webhookMessage
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'get_event_types') {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      const { data: integrationData, error } = await supabase
        .from('project_integration_data')
        .select('data')
        .eq('project_id', projectId)
        .eq('platform', 'calendly')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !integrationData) {
        throw new Error('No Calendly integration found');
      }

      const accessToken = integrationData.data.access_token;
      const userUri = integrationData.data.user_uri;

      if (!accessToken) {
        throw new Error('No access token found');
      }

      const eventTypesResponse = await fetch(`https://api.calendly.com/event_types?user=${userUri}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!eventTypesResponse.ok) {
        throw new Error('Failed to fetch event types from Calendly');
      }

      const eventTypesData = await eventTypesResponse.json();
      
      return new Response(JSON.stringify({
        event_types: eventTypesData.collection || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'disconnect') {
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      // Get stored data to clean up webhook if exists
      const { data: integrationData } = await supabase
        .from('project_integration_data')
        .select('data')
        .eq('project_id', projectId)
        .eq('platform', 'calendly')
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Try to delete webhook if we have the webhook_id and access_token
      if (integrationData?.data?.webhook_id && integrationData?.data?.access_token) {
        try {
          await fetch(`https://api.calendly.com/webhook_subscriptions/${integrationData.data.webhook_id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${integrationData.data.access_token}`,
            }
          });
          console.log('✅ Webhook deleted successfully');
        } catch (error) {
          console.warn('⚠️ Failed to delete webhook:', error);
        }
      }

      // Update integration status
      await supabase
        .from('project_integrations')
        .update({
          is_connected: false,
          last_sync: null,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('platform', 'calendly');

      // Delete integration data
      await supabase
        .from('project_integration_data')
        .delete()
        .eq('project_id', projectId)
        .eq('platform', 'calendly');

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Calendly OAuth error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
