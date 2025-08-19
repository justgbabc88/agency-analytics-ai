
import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { useSecureApiKeys } from './useSecureApiKeys';

interface ApiKeys {
  [platform: string]: Record<string, string>;
}

/**
 * @deprecated This hook uses insecure localStorage for API keys.
 * Use useSecureApiKeys instead for encrypted storage.
 */
export const useApiKeys = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [loading, setLoading] = useState(true);
  const [showDeprecationWarning, setShowDeprecationWarning] = useState(false);
  
  const { saveSecureApiKeys } = useSecureApiKeys();

  useEffect(() => {
    // Load API keys from localStorage (deprecated)
    const savedKeys = localStorage.getItem('api_keys');
    if (savedKeys) {
      try {
        const parsedKeys = JSON.parse(savedKeys);
        setApiKeys(parsedKeys);
        setShowDeprecationWarning(true);
        
        console.warn('🔒 SECURITY WARNING: API keys are stored in localStorage. Please migrate to secure storage.');
      } catch (error) {
        console.error('Error parsing saved API keys:', error);
      }
    }
    setLoading(false);
  }, []);

  const saveApiKeys = async (platform: string, keys: Record<string, string>) => {
    // Show deprecation warning
    console.warn('🔒 SECURITY WARNING: saveApiKeys is deprecated. Use useSecureApiKeys instead.');
    
    const updatedKeys = {
      ...apiKeys,
      [platform]: keys
    };
    setApiKeys(updatedKeys);
    
    // Still save to localStorage for backward compatibility
    localStorage.setItem('api_keys', JSON.stringify(updatedKeys));
    
    // Also save to secure storage
    try {
      await saveSecureApiKeys(platform, keys);
      console.info('✅ API keys also saved to secure storage.');
    } catch (error) {
      console.error('Failed to save to secure storage:', error);
    }
    
    setShowDeprecationWarning(true);
  };

  const getApiKeys = (platform: string) => {
    return apiKeys[platform] || {};
  };

  const hasApiKeys = (platform: string) => {
    const keys = apiKeys[platform];
    return keys && Object.keys(keys).length > 0 && Object.values(keys).some(value => value.trim() !== '');
  };

  const migrateToSecureStorage = async () => {
    try {
      for (const [platform, keys] of Object.entries(apiKeys)) {
        if (Object.keys(keys).length > 0) {
          await saveSecureApiKeys(platform, keys);
        }
      }
      
      // Clear localStorage after migration
      localStorage.removeItem('api_keys');
      setApiKeys({});
      setShowDeprecationWarning(false);
      
      console.info('✅ API keys successfully migrated to secure storage.');
      return true;
    } catch (error) {
      console.error('Failed to migrate API keys:', error);
      return false;
    }
  };

  return {
    apiKeys,
    saveApiKeys,
    getApiKeys,
    hasApiKeys,
    loading,
    showDeprecationWarning,
    migrateToSecureStorage,
    DeprecationWarning: showDeprecationWarning ? () => (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Warning:</strong> Your API keys are stored in insecure localStorage. 
          Please migrate to secure encrypted storage immediately for better security.
        </AlertDescription>
      </Alert>
    ) : null
  };
};
