import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const ZohoOAuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Zoho OAuth callback page loaded');
    console.log('Current URL:', window.location.href);
    
    // Extract the authorization code from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const state = urlParams.get('state');

    console.log('Zoho OAuth callback received:', { 
      code: code ? 'present' : 'missing', 
      error,
      state,
      allParams: Object.fromEntries(urlParams.entries())
    });

    if (code) {
      console.log('Authorization code found, sending to parent window');
      
      // Send the code back to the parent window if this is a popup
      if (window.opener) {
        console.log('Sending success message to parent window');
        window.opener.postMessage({
          type: 'ZOHO_OAUTH_SUCCESS',
          code,
          state
        }, window.location.origin);
        
        console.log('Closing popup window');
        window.close();
      } else {
        console.log('Not a popup, redirecting to integrations page');
        // If not a popup, redirect to integrations page with the code
        navigate('/integrations?zoho_code=' + code);
      }
    } else if (error) {
      // Handle OAuth error
      console.error('OAuth error received:', error);
      
      if (window.opener) {
        console.log('Sending error message to parent window');
        window.opener.postMessage({
          type: 'ZOHO_OAUTH_ERROR',
          error
        }, window.location.origin);
        
        console.log('Closing popup window after error');
        window.close();
      } else {
        console.log('Not a popup, redirecting to integrations page with error');
        navigate('/integrations?error=' + error);
      }
    } else {
      // No code or error, redirect to home
      console.log('No code or error found, redirecting to home');
      navigate('/');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">Connecting to Zoho CRM...</h2>
        <p className="text-gray-600">Please wait while we complete the connection.</p>
      </div>
    </div>
  );
};