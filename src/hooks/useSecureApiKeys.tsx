import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSecurityAudit } from './useSecurityAudit';

interface SecureApiKeyData {
  platform: string;
  keyName: string;
  encryptedValue: string;
  lastRotated: string;
  expiresAt?: string;
}

interface ApiKeyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const useSecureApiKeys = () => {
  const { user } = useAuth();
  const { logSecurityEvent, logSensitiveOperation } = useSecurityAudit();
  const [apiKeys, setApiKeys] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Validate API key format and security
  const validateApiKey = useCallback((platform: string, keyName: string, value: string): ApiKeyValidationResult => {
    const result: ApiKeyValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Basic validation
    if (!value || value.trim().length === 0) {
      result.isValid = false;
      result.errors.push('API key cannot be empty');
      return result;
    }

    // Security validations
    if (value.length < 8) {
      result.isValid = false;
      result.errors.push('API key is too short (minimum 8 characters)');
    }

    // Check for common insecure patterns
    const insecurePatterns = [
      /^(test|demo|example|sample)/i,
      /^(123|abc|password)/i,
      /\s/
    ];

    for (const pattern of insecurePatterns) {
      if (pattern.test(value)) {
        result.warnings.push('API key appears to contain test or insecure data');
        break;
      }
    }

    // Platform-specific validation
    switch (platform) {
      case 'facebook':
        if (keyName === 'app_id' && !/^\d+$/.test(value)) {
          result.errors.push('Facebook App ID must be numeric');
          result.isValid = false;
        }
        break;
      case 'google':
        if (keyName === 'client_id' && !value.includes('.googleusercontent.com')) {
          result.warnings.push('Google Client ID should end with .googleusercontent.com');
        }
        break;
    }

    return result;
  }, []);

  // Encrypt API key value (simple base64 for demo - in production use proper encryption)
  const encryptValue = useCallback((value: string): string => {
    // In production, use proper encryption with user-specific keys
    return btoa(value + '::' + Date.now());
  }, []);

  // Decrypt API key value
  const decryptValue = useCallback((encryptedValue: string): string => {
    try {
      const decoded = atob(encryptedValue);
      const [value] = decoded.split('::');
      return value || '';
    } catch {
      return '';
    }
  }, []);

  // Load secure API keys from Supabase
  const loadSecureApiKeys = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Log security event for API key access
      logSecurityEvent({
        action: 'api_keys_loaded',
        resource_type: 'api_credentials',
        details: { timestamp: new Date().toISOString() },
        severity: 'info'
      });

      // In a real implementation, fetch from a secure storage table
      // For now, simulate secure loading
      const { data: existingKeys } = await supabase
        .from('project_integration_data')
        .select('platform, data')
        .eq('platform', 'api_keys_secure');

      if (existingKeys && existingKeys.length > 0) {
        const secureData = existingKeys[0].data as Record<string, Record<string, string>>;
        const decryptedKeys: Record<string, Record<string, string>> = {};
        
        for (const [platform, keys] of Object.entries(secureData)) {
          decryptedKeys[platform] = {};
          for (const [keyName, encryptedValue] of Object.entries(keys)) {
            decryptedKeys[platform][keyName] = decryptValue(encryptedValue);
          }
        }
        
        setApiKeys(decryptedKeys);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load API keys';
      setError(errorMsg);
      logSecurityEvent({
        action: 'api_keys_load_failed',
        resource_type: 'api_credentials',
        details: { error: errorMsg },
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [user, logSecurityEvent, decryptValue]);

  // Save secure API keys to Supabase
  const saveSecureApiKeys = useCallback(async (platform: string, keys: Record<string, string>) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);

      // Validate all keys
      const validationResults = Object.entries(keys).map(([keyName, value]) => ({
        keyName,
        ...validateApiKey(platform, keyName, value)
      }));

      const hasErrors = validationResults.some(result => !result.isValid);
      if (hasErrors) {
        const errors = validationResults.flatMap(r => r.errors);
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      // Log security event for API key save
      logSensitiveOperation('api_keys_saved', 'api_credentials', platform);

      // Encrypt keys
      const encryptedKeys: Record<string, string> = {};
      for (const [keyName, value] of Object.entries(keys)) {
        encryptedKeys[keyName] = encryptValue(value);
      }

      // Update local state
      const updatedKeys = { ...apiKeys, [platform]: keys };
      setApiKeys(updatedKeys);

      // Save to secure storage
      const secureData = { ...updatedKeys };
      for (const [plt, pltKeys] of Object.entries(secureData)) {
        const encrypted: Record<string, string> = {};
        for (const [keyName, value] of Object.entries(pltKeys)) {
          encrypted[keyName] = encryptValue(value);
        }
        secureData[plt] = encrypted;
      }

      await supabase
        .from('project_integration_data')
        .upsert({
          platform: 'api_keys_secure',
          project_id: user.id, // Using user ID as project ID for now
          data: secureData,
          synced_at: new Date().toISOString()
        });

      // Show warnings if any
      const warnings = validationResults.flatMap(r => r.warnings);
      if (warnings.length > 0) {
        console.warn('API Key Security Warnings:', warnings);
      }

      return { success: true, warnings };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save API keys';
      setError(errorMsg);
      logSecurityEvent({
        action: 'api_keys_save_failed',
        resource_type: 'api_credentials',
        details: { platform, error: errorMsg },
        severity: 'error'
      });
      throw err;
    }
  }, [user, apiKeys, validateApiKey, encryptValue, logSensitiveOperation, logSecurityEvent]);

  // Get API keys for a platform
  const getApiKeys = useCallback((platform: string) => {
    return apiKeys[platform] || {};
  }, [apiKeys]);

  // Check if platform has valid API keys
  const hasApiKeys = useCallback((platform: string) => {
    const keys = apiKeys[platform];
    return keys && Object.keys(keys).length > 0 && Object.values(keys).some(value => value.trim() !== '');
  }, [apiKeys]);

  // Rotate API key (mark for rotation)
  const rotateApiKey = useCallback(async (platform: string, keyName: string) => {
    if (!user) return;

    logSensitiveOperation('api_key_rotation_requested', 'api_credentials', `${platform}:${keyName}`);
    
    // In production, this would trigger a key rotation workflow
    console.warn(`API Key rotation requested for ${platform}:${keyName}. Please update the key manually.`);
  }, [user, logSensitiveOperation]);

  // Clear all API keys (security action)
  const clearAllApiKeys = useCallback(async () => {
    if (!user) return;

    logSensitiveOperation('api_keys_cleared', 'api_credentials', 'all_platforms');
    
    setApiKeys({});
    
    try {
      await supabase
        .from('project_integration_data')
        .delete()
        .eq('platform', 'api_keys_secure')
        .eq('project_id', user.id);
    } catch (err) {
      console.error('Failed to clear secure storage:', err);
    }
  }, [user, logSensitiveOperation]);

  // Load keys on mount
  useEffect(() => {
    loadSecureApiKeys();
  }, [loadSecureApiKeys]);

  return {
    apiKeys,
    loading,
    error,
    saveSecureApiKeys,
    getApiKeys,
    hasApiKeys,
    validateApiKey,
    rotateApiKey,
    clearAllApiKeys,
    refreshKeys: loadSecureApiKeys
  };
};