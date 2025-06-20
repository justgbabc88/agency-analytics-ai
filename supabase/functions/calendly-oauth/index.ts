
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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, code, projectId, state } = await req.json();
    
    console.log('📥 OAuth request received:', { action, projectId, code: code ? 'present' : 'missing' });
    console.log('🎯 Processing action:', action, 'for project:', projectId);

    const clientId = Deno.env.get('CALENDLY_CLIENT_ID');
    const clientSecret = Deno.env.get('CALENDLY_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Missing Calendly credentials');
    }

    // Use the redirect URI that matches your Calendly app configuration
    const redirectUri = 'https://agency-analytics-ai.lovable.app/calendly-callback';

    switch (action) {
      case 'get_auth_url':
        const authUrl = `https://auth.calendly.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=default&state=${projectId}`;
        console.log('✅ Generated auth URL for project:', projectId);
        return new Response(JSON.stringify({ authUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'handle_callback':
        console.log('🔄 Exchanging authorization code for access token...');
        
        const tokenResponse = await fetch('https://auth.calendly.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('❌ Token exchange failed:', errorText);
          throw new Error(`Token exchange failed: ${errorText}`);
        }

        const tokenData = await tokenResponse.json();
        console.log('✅ Successfully received access token');

        // Get user info
        const userResponse = await fetch('https://api.calendly.com/users/me', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!userResponse.ok) {
          throw new Error('Failed to get user info');
        }

        const userData = await userResponse.json();
        const currentUserUri = userData.resource.uri;
        console.log('📋 Current organization:', userData.resource.current_organization);

        // Store the tokens
        const { error: integrationError } = await supabase
          .from('project_integration_data')
          .upsert({
            project_id: projectId,
            platform: 'calendly',
            data: {
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              user_uri: currentUserUri,
              organization_uri: userData.resource.current_organization,
              scope: tokenData.scope,
              token_type: tokenData.token_type,
              expires_in: tokenData.expires_in,
              created_at: new Date().toISOString()
            },
            synced_at: new Date().toISOString()
          }, {
            onConflict: 'project_id,platform'
          });

        if (integrationError) {
          console.error('❌ Error storing integration data:', integrationError);
          throw integrationError;
        }

        // Update integration status
        const { error: statusError } = await supabase
          .from('project_integrations')
          .upsert({
            project_id: projectId,
            platform: 'calendly',
            is_connected: true,
            last_sync: new Date().toISOString()
          }, {
            onConflict: 'project_id,platform'
          });

        if (statusError) {
          console.error('❌ Error updating integration status:', statusError);
          throw statusError;
        }

        // Set up webhooks with discovery
        console.log('🔗 Setting up webhooks with discovery...');
        
        try {
          const webhookUrl = 'https://iqxvtfupjjxjkbajgcve.supabase.co/functions/v1/calendly-webhook';
          
          console.log('➕ Creating new webhook...');
          const webhookResponse = await fetch('https://api.calendly.com/webhook_subscriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              url: webhookUrl,
              events: [
                'invitee.created',
                'invitee.canceled'
              ],
              organization: userData.resource.current_organization,
              scope: 'organization'
            })
          });

          if (!webhookResponse.ok) {
            const errorData = await webhookResponse.json();
            console.error('⚠️ Webhook registration failed:', errorData);
            
            if (errorData.title === 'Already Exists') {
              console.log('🔍 Webhook exists but not found in list, attempting discovery...');
            }
          }
        } catch (webhookError) {
          console.error('⚠️ Webhook setup failed:', webhookError);
        }

        console.log('✅ Calendly integration completed successfully');

        return new Response(JSON.stringify({ 
          success: true,
          user_uri: currentUserUri,
          organization: userData.resource.current_organization
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_access_token':
        console.log('🔍 Getting access token for project:', projectId);
        
        // Get stored tokens from project_integration_data
        const { data: integrationData, error: fetchError } = await supabase
          .from('project_integration_data')
          .select('data')
          .eq('project_id', projectId)
          .eq('platform', 'calendly')
          .single();

        if (fetchError || !integrationData) {
          console.error('❌ No integration data found for project:', projectId, fetchError);
          throw new Error('No Calendly integration found for this project');
        }

        const tokenInfo = integrationData.data;
        
        // Check if token needs refresh (if expires_in is available)
        if (tokenInfo.expires_in && tokenInfo.created_at) {
          const tokenAge = Date.now() - new Date(tokenInfo.created_at).getTime();
          const expiresInMs = tokenInfo.expires_in * 1000;
          
          if (tokenAge >= expiresInMs * 0.9) { // Refresh if 90% expired
            console.log('🔄 Token needs refresh, attempting refresh...');
            
            try {
              const refreshResponse = await fetch('https://auth.calendly.com/oauth/token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  grant_type: 'refresh_token',
                  refresh_token: tokenInfo.refresh_token,
                  client_id: clientId,
                  client_secret: clientSecret,
                }),
              });

              if (refreshResponse.ok) {
                const newTokenData = await refreshResponse.json();
                console.log('✅ Token refreshed successfully');
                
                // Update stored tokens
                const updatedTokenInfo = {
                  ...tokenInfo,
                  access_token: newTokenData.access_token,
                  refresh_token: newTokenData.refresh_token || tokenInfo.refresh_token,
                  expires_in: newTokenData.expires_in,
                  created_at: new Date().toISOString()
                };
                
                await supabase
                  .from('project_integration_data')
                  .update({
                    data: updatedTokenInfo,
                    synced_at: new Date().toISOString()
                  })
                  .eq('project_id', projectId)
                  .eq('platform', 'calendly');

                return new Response(JSON.stringify({
                  access_token: newTokenData.access_token,
                  user_uri: tokenInfo.user_uri,
                  organization_uri: tokenInfo.organization_uri
                }), {
                  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
              }
            } catch (refreshError) {
              console.warn('⚠️ Token refresh failed, using existing token:', refreshError);
            }
          }
        }

        console.log('✅ Returning existing access token');
        return new Response(JSON.stringify({
          access_token: tokenInfo.access_token,
          user_uri: tokenInfo.user_uri,
          organization_uri: tokenInfo.organization_uri
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'get_event_types':
        console.log('🔍 Starting event types fetch for project:', projectId);
        
        // Get access token first
        const { data: tokenDataForTypes, error: tokenError } = await supabase
          .from('project_integration_data')
          .select('data')
          .eq('project_id', projectId)
          .eq('platform', 'calendly')
          .single();

        if (tokenError || !tokenDataForTypes) {
          console.error('❌ No access token found for project:', projectId, tokenError);
          throw new Error('No access token found');
        }

        const accessToken = tokenDataForTypes.data.access_token;
        const eventTypesUserUri = tokenDataForTypes.data.user_uri;
        
        console.log('👤 Using user URI for event types:', eventTypesUserUri);
        console.log('🔑 Access token available:', !!accessToken);
        
        const eventTypesUrl = `https://api.calendly.com/event_types?user=${encodeURIComponent(eventTypesUserUri)}`;
        console.log('🌐 Fetching event types from URL:', eventTypesUrl);

        const eventTypesResponse = await fetch(eventTypesUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('📡 Event types response status:', eventTypesResponse.status);
        
        if (!eventTypesResponse.ok) {
          const errorText = await eventTypesResponse.text();
          console.error('❌ Event types API error:', {
            status: eventTypesResponse.status,
            statusText: eventTypesResponse.statusText,
            body: errorText
          });
          throw new Error(`Failed to fetch event types: ${eventTypesResponse.status} - ${errorText}`);
        }

        const eventTypesData = await eventTypesResponse.json();
        console.log('📋 Raw event types response:', JSON.stringify(eventTypesData, null, 2));
        console.log('🎯 Event types collection length:', eventTypesData.collection?.length || 0);
        
        // Transform the response to match expected format
        const transformedResponse = {
          event_types: eventTypesData.collection || [],
          pagination: eventTypesData.pagination || {}
        };
        
        console.log('✅ Returning transformed event types:', transformedResponse.event_types.length);
        
        return new Response(JSON.stringify(transformedResponse), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'disconnect':
        console.log('🔌 Disconnecting Calendly integration for project:', projectId);
        
        try {
          // Get current integration data to clean up webhooks
          const { data: currentData } = await supabase
            .from('project_integration_data')
            .select('data')
            .eq('project_id', projectId)
            .eq('platform', 'calendly')
            .single();

          if (currentData?.data?.access_token) {
            // Try to clean up webhooks
            try {
              const webhookListResponse = await fetch('https://api.calendly.com/webhook_subscriptions', {
                headers: {
                  'Authorization': `Bearer ${currentData.data.access_token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (webhookListResponse.ok) {
                const webhookData = await webhookListResponse.json();
                const ourWebhookUrl = 'https://iqxvtfupjjxjkbajgcve.supabase.co/functions/v1/calendly-webhook';
                
                for (const webhook of webhookData.collection || []) {
                  if (webhook.callback_url === ourWebhookUrl) {
                    await fetch(`https://api.calendly.com/webhook_subscriptions/${webhook.uri.split('/').pop()}`, {
                      method: 'DELETE',
                      headers: {
                        'Authorization': `Bearer ${currentData.data.access_token}`,
                      }
                    });
                    console.log('🗑️ Removed webhook:', webhook.uri);
                  }
                }
              }
            } catch (webhookError) {
              console.warn('⚠️ Failed to clean up webhooks:', webhookError);
            }
          }

          // Remove integration data
          await supabase
            .from('project_integration_data')
            .delete()
            .eq('project_id', projectId)
            .eq('platform', 'calendly');

          // Update integration status
          await supabase
            .from('project_integrations')
            .update({
              is_connected: false,
              last_sync: null
            })
            .eq('project_id', projectId)
            .eq('platform', 'calendly');

          // Remove event mappings
          await supabase
            .from('calendly_event_mappings')
            .delete()
            .eq('project_id', projectId);

          // Remove stored events
          await supabase
            .from('calendly_events')
            .delete()
            .eq('project_id', projectId);

          console.log('✅ Calendly integration disconnected successfully');

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('❌ Error during disconnect:', error);
          throw error;
        }

      default:
        console.error('❌ Invalid action received:', action);
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Calendly OAuth error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
