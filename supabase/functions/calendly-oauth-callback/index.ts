
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // This is the projectId
  const error = url.searchParams.get('error');

  console.log('🔄 OAuth callback received:', { code: !!code, state, error });

  if (error) {
    console.error('OAuth error:', error);
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Calendly Connection Failed</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1 class="error">Connection Failed</h1>
          <p>OAuth error: ${error}</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  if (!code || !state) {
    console.error('Missing code or state parameter');
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Calendly Connection Failed</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1 class="error">Connection Failed</h1>
          <p>Missing authorization code or project ID</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔄 Processing OAuth callback for project:', state);
    
    const { data, error: functionError } = await supabase.functions.invoke('calendly-oauth', {
      body: { 
        action: 'handle_callback',
        code,
        projectId: state
      }
    });

    if (functionError) {
      throw new Error(functionError.message);
    }

    console.log('✅ Calendly connection successful');

    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Calendly Connected Successfully</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: #059669; }
            .spinner {
              border: 4px solid #f3f4f6;
              border-top: 4px solid #059669;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 2s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <h1 class="success">Connected Successfully!</h1>
          <div class="spinner"></div>
          <p>Your Calendly account has been connected. This window will close automatically.</p>
          <script>
            // Send success message to parent window
            if (window.opener) {
              window.opener.postMessage({
                type: 'calendly_connected',
                success: true,
                projectId: '${state}'
              }, '*');
            }
            
            // Close window after a brief delay
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Callback processing error:', error);
    
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Calendly Connection Failed</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: #dc2626; }
          </style>
        </head>
        <body>
          <h1 class="error">Connection Failed</h1>
          <p>${error.message || "Failed to complete Calendly connection"}</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
});
