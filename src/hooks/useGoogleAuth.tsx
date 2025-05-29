
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

  const initiateAuth = async () => {
    setLoading(true);
    try {
      console.log('Initiating Google OAuth...');
      
      const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: JSON.stringify({ action: 'get_auth_url' }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Auth URL response:', data, error);

      if (error) {
        console.error('Error getting auth URL:', error);
        throw error;
      }

      if (!data || !data.authUrl) {
        throw new Error('No auth URL received from server');
      }

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
          clearInterval(checkClosed);
          setLoading(false);
        }
      }, 1000);

      // Listen for messages from the popup
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'GOOGLE_OAUTH_SUCCESS') {
          clearInterval(checkClosed);
          popup?.close();
          handleAuthSuccess(event.data.code);
        } else if (event.data.type === 'GOOGLE_OAUTH_ERROR') {
          clearInterval(checkClosed);
          popup?.close();
          console.error('OAuth error:', event.data.error);
          setLoading(false);
        }
      };

      window.addEventListener('message', messageListener);

      // Cleanup listener after 5 minutes
      setTimeout(() => {
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
        body: JSON.stringify({ action: 'exchange_code', code }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Token exchange response:', data, error);

      if (error) {
        console.error('Token exchange error:', error);
        throw error;
      }

      if (!data || !data.accessToken) {
        throw new Error('No access token received');
      }

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
    setIsConnected(false);
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_user');
    localStorage.removeItem('google_refresh_token');
  };

  const listSheets = async (): Promise<GoogleSheet[]> => {
    if (!accessToken) throw new Error('Not authenticated');

    console.log('Fetching sheets list...');

    const { data: { session } } = await supabase.auth.getSession();
    
    const { data, error } = await supabase.functions.invoke('google-oauth', {
      body: JSON.stringify({ action: 'list_sheets', accessToken }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
    });

    console.log('Sheets list response:', data, error);

    if (error) throw error;
    return data.sheets;
  };

  const getSheetData = async (spreadsheetId: string, range?: string) => {
    if (!accessToken) throw new Error('Not authenticated');

    console.log('Fetching sheet data...');

    const { data: { session } } = await supabase.auth.getSession();

    const { data, error } = await supabase.functions.invoke('google-oauth', {
      body: JSON.stringify({ 
        action: 'get_sheet_data', 
        accessToken, 
        spreadsheetId, 
        range 
      }),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
    });

    console.log('Sheet data response:', data, error);

    if (error) throw error;
    return data;
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
