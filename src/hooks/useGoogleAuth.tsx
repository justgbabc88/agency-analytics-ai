import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface GoogleUser {
  email: string;
  name: string;
  picture: string;
}

interface GoogleSheet {
  id: string;
  name: string;
  webViewLink: string;
}

export const useGoogleAuth = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load saved auth state from localStorage
    const savedToken = localStorage.getItem('google_access_token');
    const savedUser = localStorage.getItem('google_user');
    
    if (savedToken && savedUser) {
      setAccessToken(savedToken);
      setUser(JSON.parse(savedUser));
      setIsConnected(true);
    }
  }, []);

  const refreshToken = async () => {
    const refreshTokenValue = localStorage.getItem('google_refresh_token');
    
    if (!refreshTokenValue) {
      console.log('No refresh token available, need to re-authenticate');
      disconnect();
      return null;
    }

    try {
      console.log('Attempting to refresh access token...');
      
      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: { 
          action: 'refresh_token', 
          refreshToken: refreshTokenValue 
        }
      });

      if (error || !data || !data.accessToken) {
        console.error('Token refresh failed:', error);
        disconnect();
        return null;
      }

      console.log('Token refreshed successfully');
      setAccessToken(data.accessToken);
      localStorage.setItem('google_access_token', data.accessToken);
      
      return data.accessToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      disconnect();
      return null;
    }
  };

  const makeAuthenticatedRequest = async (requestFn: (token: string) => Promise<any>) => {
    let token = accessToken;
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      // Try with current token
      return await requestFn(token);
    } catch (error: any) {
      // If we get a 401, try to refresh the token
      if (error.message?.includes('401') || error.message?.includes('Invalid Credentials')) {
        console.log('Access token expired, attempting refresh...');
        
        const newToken = await refreshToken();
        if (!newToken) {
          throw new Error('Authentication expired. Please reconnect your Google account.');
        }
        
        // Retry with new token
        return await requestFn(newToken);
      }
      
      throw error;
    }
  };

  const initiateAuth = async () => {
    setLoading(true);
    try {
      console.log('Initiating Google OAuth...');

      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: { action: 'get_auth_url' }
      });

      console.log('Auth URL response:', { data, error });

      if (error) {
        console.error('Error getting auth URL:', error);
        throw new Error(`Failed to get auth URL: ${error.message || JSON.stringify(error)}`);
      }

      if (!data || !data.authUrl) {
        console.error('No auth URL in response:', data);
        throw new Error('No auth URL received from server');
      }

      console.log('Opening popup with auth URL:', data.authUrl);

      // Open OAuth URL in a popup
      const popup = window.open(
        data.authUrl,
        'google-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      // Listen for the OAuth callback
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          console.log('Popup was closed');
          clearInterval(checkClosed);
          setLoading(false);
        }
      }, 1000);

      // Listen for messages from the popup
      const messageListener = (event: MessageEvent) => {
        console.log('Received message from popup:', event.data);
        
        if (event.origin !== window.location.origin) {
          console.log('Message from different origin, ignoring');
          return;
        }
        
        if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
          console.log('OAuth success, exchanging code:', event.data.code);
          clearInterval(checkClosed);
          popup?.close();
          handleAuthSuccess(event.data.code);
        } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
          console.error('OAuth error from popup:', event.data.error);
          clearInterval(checkClosed);
          popup?.close();
          setLoading(false);
          throw new Error(`OAuth error: ${event.data.error}`);
        }
      };

      window.addEventListener('message', messageListener);

      // Cleanup listener after 5 minutes
      setTimeout(() => {
        console.log('Cleaning up OAuth popup listener');
        window.removeEventListener('message', messageListener);
        clearInterval(checkClosed);
        if (popup && !popup.closed) popup.close();
        setLoading(false);
      }, 300000);

    } catch (error) {
      console.error('Failed to initiate Google auth:', error);
      setLoading(false);
      throw error;
    }
  };

  const handleAuthSuccess = async (code: string) => {
    try {
      console.log('Exchanging code for tokens...');
      
      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: { 
          action: 'exchange_code', 
          code 
        }
      });

      console.log('Token exchange response:', { data, error });

      if (error) {
        console.error('Token exchange error:', error);
        throw new Error(`Token exchange failed: ${error.message || JSON.stringify(error)}`);
      }

      if (!data || !data.accessToken) {
        console.error('No access token in response:', data);
        throw new Error('No access token received');
      }

      console.log('Successfully received access token and user info');
      setAccessToken(data.accessToken);
      setUser(data.userInfo);
      setIsConnected(true);

      // Save to localStorage
      localStorage.setItem('google_access_token', data.accessToken);
      localStorage.setItem('google_user', JSON.stringify(data.userInfo));

      if (data.refreshToken) {
        localStorage.setItem('google_refresh_token', data.refreshToken);
      }

    } catch (error) {
      console.error('Failed to exchange auth code:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    console.log('Disconnecting Google account');
    setIsConnected(false);
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_user');
    localStorage.removeItem('google_refresh_token');
  };

  const listSheets = async (): Promise<GoogleSheet[]> => {
    return makeAuthenticatedRequest(async (token) => {
      console.log('Fetching sheets list...');

      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: { 
          action: 'list_sheets', 
          accessToken: token 
        },
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      console.log('Sheets list response:', { data, error });

      if (error) {
        console.error('Error fetching sheets:', error);
        throw new Error(`Failed to fetch sheets: ${error.message || JSON.stringify(error)}`);
      }
      
      return data.sheets;
    });
  };

  const getSheetData = async (spreadsheetId: string, range?: string) => {
    return makeAuthenticatedRequest(async (token) => {
      console.log('Fetching sheet data for:', spreadsheetId, 'range:', range);

      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: { 
          action: 'get_sheet_data', 
          accessToken: token, 
          spreadsheetId, 
          range 
        },
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      console.log('Sheet data response:', { data, error });

      if (error) {
        console.error('Error fetching sheet data:', error);
        throw new Error(`Failed to fetch sheet data: ${error.message || JSON.stringify(error)}`);
      }
      
      return data;
    });
  };

  return {
    isConnected,
    user,
    loading,
    initiateAuth,
    disconnect,
    listSheets,
    getSheetData,
  };
};
