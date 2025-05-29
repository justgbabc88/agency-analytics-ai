
import { useState, useEffect } from 'react';

interface ApiKeys {
  [platform: string]: Record<string, string>;
}

export const useApiKeys = () => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load API keys from localStorage
    const savedKeys = localStorage.getItem('api_keys');
    if (savedKeys) {
      try {
        setApiKeys(JSON.parse(savedKeys));
      } catch (error) {
        console.error('Error parsing saved API keys:', error);
      }
    }
    setLoading(false);
  }, []);

  const saveApiKeys = (platform: string, keys: Record<string, string>) => {
    const updatedKeys = {
      ...apiKeys,
      [platform]: keys
    };
    setApiKeys(updatedKeys);
    localStorage.setItem('api_keys', JSON.stringify(updatedKeys));
  };

  const getApiKeys = (platform: string) => {
    return apiKeys[platform] || {};
  };

  const hasApiKeys = (platform: string) => {
    const keys = apiKeys[platform];
    return keys && Object.keys(keys).length > 0 && Object.values(keys).some(value => value.trim() !== '');
  };

  return {
    apiKeys,
    saveApiKeys,
    getApiKeys,
    hasApiKeys,
    loading
  };
};
