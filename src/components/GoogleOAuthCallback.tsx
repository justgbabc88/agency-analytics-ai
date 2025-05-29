
import { useEffect } from 'react';

export const GoogleOAuthCallback = () => {
  useEffect(() => {
    // Extract the authorization code from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (code) {
      // Send the code back to the parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_SUCCESS',
          code
        }, window.location.origin);
        window.close();
      }
    } else if (error) {
      // Handle OAuth error
      if (window.opener) {
        window.opener.postMessage({
          type: 'GOOGLE_OAUTH_ERROR',
          error
        }, window.location.origin);
        window.close();
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">Connecting to Google...</h2>
        <p className="text-gray-600">This window will close automatically.</p>
      </div>
    </div>
  );
};
