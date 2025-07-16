import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  projectId: string;
  platform: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 OAuth initiation started');
    const { projectId, platform }: RequestBody = await req.json();
    
    console.log(`🎯 Initiating OAuth for platform: ${platform}, project: ${projectId}`);
    console.log('📋 Environment check:', {
      hasClientId: !!Deno.env.get('GHL_CLIENT_ID'),
      hasClientSecret: !!Deno.env.get('GHL_CLIENT_SECRET')
    });
    
    console.log(`🎯 Initiating OAuth for platform: ${platform}, project: ${projectId}`);

    if (!projectId || !platform) {
      return new Response(
        JSON.stringify({ error: 'Project ID and platform are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Currently only supporting GHL
    if (platform !== 'ghl') {
      return new Response(
        JSON.stringify({ error: 'Platform not supported' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const clientId = Deno.env.get('GHL_CLIENT_ID');
    const redirectUri = `https://iqxvtfupjjxjkbajgcve.supabase.co/functions/v1/integration-oauth-callback`;

    if (!clientId) {
      console.error('❌ GHL_CLIENT_ID not found in environment');
      return new Response(
        JSON.stringify({ error: 'OAuth not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate OAuth URL for GHL
    const scopes = ['forms.readonly', 'forms.write', 'contacts.readonly', 'contacts.write'];
    const state = btoa(JSON.stringify({ projectId, platform }));
    
    const oauthUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}&state=${state}`;

    console.log(`✅ OAuth URL generated for project ${projectId}`);

    return new Response(
      JSON.stringify({ 
        authUrl: oauthUrl,
        state: state
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ OAuth initiation error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to initiate OAuth' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});