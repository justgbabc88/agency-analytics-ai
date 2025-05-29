
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const GoogleOAuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Extract the authorization code from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (code) {
      // Send the code back to the parent window if this is a popup
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_SUCCESS',
          code
        }, window.location.origin);
        window.close();
      } else {
        // If not a popup, redirect to integrations page with the code
        navigate('/integrations?google_code=' + code);
      }
    } else if (error) {
      // Handle OAuth error
      console.error('OAuth error:', error);
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_ERROR',
          error
        }, window.location.origin);
        window.close();
      } else {
        navigate('/integrations?error=' + error);
      }
    } else {
      // No code or error, redirect to home
      navigate('/');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">Connecting to Google...</h2>
        <p className="text-gray-600">Please wait while we complete the connection.</p>
      </div>
    </div>
  );
};
