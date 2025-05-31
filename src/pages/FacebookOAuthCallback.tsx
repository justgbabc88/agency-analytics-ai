
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const FacebookOAuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Facebook OAuth callback page loaded');
    console.log('Current URL:', window.location.href);
    console.log('Window opener exists:', !!window.opener);
    console.log('Window origin:', window.location.origin);
    
    // Extract the authorization code from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');

    console.log('Facebook OAuth callback received:', { 
      code: code ? 'present' : 'missing', 
      error,
      errorDescription,
      allParams: Object.fromEntries(urlParams.entries())
    });

    if (code) {
      console.log('Authorization code found, sending to parent window');
      
      // Send the code back to the parent window if this is a popup
      if (window.opener && !window.opener.closed) {
        console.log('Sending success message to parent window');
        
        try {
          window.opener.postMessage({
            type: 'FACEBOOK_OAUTH_SUCCESS',
            code
          }, window.location.origin);
          
          console.log('Success message sent, closing popup window');
          setTimeout(() => {
            window.close();
          }, 100);
        } catch (error) {
          console.error('Failed to send message to parent window:', error);
          // Fallback: redirect to integrations page
          window.location.href = '/integrations?facebook_code=' + code;
        }
      } else {
        console.log('Not a popup or opener closed, redirecting to integrations page');
        // If not a popup, redirect to integrations page with the code
        navigate('/integrations?facebook_code=' + code);
      }
    } else if (error) {
      // Handle OAuth error
      console.error('Facebook OAuth error received:', { error, errorDescription });
      
      if (window.opener && !window.opener.closed) {
        console.log('Sending error message to parent window');
        
        try {
          window.opener.postMessage({
            type: 'FACEBOOK_OAUTH_ERROR',
            error: error,
            errorDescription: errorDescription
          }, window.location.origin);
          
          console.log('Error message sent, closing popup window');
          setTimeout(() => {
            window.close();
          }, 100);
        } catch (error) {
          console.error('Failed to send error message to parent window:', error);
          // Fallback: redirect to integrations page
          window.location.href = '/integrations?error=' + error;
        }
      } else {
        console.log('Not a popup or opener closed, redirecting to integrations page with error');
        navigate('/integrations?error=' + error);
      }
    } else {
      // No code or error, redirect to home
      console.log('No code or error found, redirecting to home');
      setTimeout(() => {
        if (window.opener && !window.opener.closed) {
          window.close();
        } else {
          navigate('/');
        }
      }, 2000);
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">Connecting to Facebook...</h2>
        <p className="text-gray-600">Please wait while we complete the connection.</p>
        <div className="mt-4 text-sm text-gray-500">
          <p>If this window doesn't close automatically, you can close it manually.</p>
        </div>
      </div>
    </div>
  );
};
