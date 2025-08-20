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

export const useSecureApiKeys = (projectId?: string) => {
  const { user } = useAuth();
  const { logSecurityEvent, logSensitiveOperation } = useSecurityAudit();
  const [apiKeys, setApiKeys] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Enhanced API key validation using the new validator
  const validateApiKey = useCallback(async (platform: string, keyName: string, value: string): Promise<ApiKeyValidationResult> => {
    const { ApiKeyValidator } = await import('@/utils/encryption');
    const validation = ApiKeyValidator.validate(platform, keyName, value);
    
    return {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }, []);

  // Enhanced encryption using Web Crypto API
  const encryptValue = useCallback(async (value: string): Promise<string> => {
    if (!user || !projectId) {
      throw new Error('User and project required for encryption');
    }

    try {
      const { EncryptionService } = await import('@/utils/encryption');
      return await EncryptionService.encrypt(value, user.id, projectId);
    } catch (error) {
      console.error('Encryption failed, falling back to base64:', error);
      // Fallback to base64 if encryption fails
      return btoa(value + '::' + Date.now());
    }
  }, [user, projectId]);

  // Enhanced decryption
  const decryptValue = useCallback(async (encryptedValue: string): Promise<string> => {
    if (!user || !projectId) {
      return '';
    }

    try {
      const { EncryptionService } = await import('@/utils/encryption');
      return await EncryptionService.decrypt(encryptedValue, user.id, projectId);
    } catch (error) {
      // Fallback to base64 decoding for legacy keys
      try {
        const decoded = atob(encryptedValue);
        const [value] = decoded.split('::');
        return value || '';
      } catch {
        return '';
      }
    }
  }, [user, projectId]);

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
        .eq('platform', 'api_keys_secure')
        .eq('project_id', projectId || user.id);

      if (existingKeys && existingKeys.length > 0) {
        const secureData = existingKeys[0].data as Record<string, Record<string, string>>;
        const decryptedKeys: Record<string, Record<string, string>> = {};
        
        for (const [platform, keys] of Object.entries(secureData)) {
          decryptedKeys[platform] = {};
          for (const [keyName, encryptedValue] of Object.entries(keys)) {
            try {
              decryptedKeys[platform][keyName] = await decryptValue(encryptedValue);
            } catch (error) {
              console.warn(`Failed to decrypt key ${platform}:${keyName}:`, error);
              decryptedKeys[platform][keyName] = '';
            }
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
  }, [user, logSecurityEvent, decryptValue, projectId]);

  // Save secure API keys to Supabase
  const saveSecureApiKeys = useCallback(async (platform: string, keys: Record<string, string>) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setError(null);

      // Validate all keys (now async)
      const validationResults = await Promise.all(
        Object.entries(keys).map(async ([keyName, value]) => ({
          keyName,
          ...(await validateApiKey(platform, keyName, value))
        }))
      );

      const hasErrors = validationResults.some(result => !result.isValid);
      if (hasErrors) {
        const errors = validationResults.flatMap(r => r.errors);
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      // Log security event for API key save
      logSensitiveOperation('api_keys_saved', 'api_credentials', null);

      // Encrypt keys (now async)
      const encryptedKeys: Record<string, string> = {};
      for (const [keyName, value] of Object.entries(keys)) {
        encryptedKeys[keyName] = await encryptValue(value);
      }

      // Update local state
      const updatedKeys = { ...apiKeys, [platform]: keys };
      setApiKeys(updatedKeys);

      // Save to secure storage (now async)
      const secureData = { ...updatedKeys };
      for (const [plt, pltKeys] of Object.entries(secureData)) {
        const encrypted: Record<string, string> = {};
        for (const [keyName, value] of Object.entries(pltKeys)) {
          encrypted[keyName] = await encryptValue(value);
        }
        secureData[plt] = encrypted;
      }

      await supabase
        .from('project_integration_data')
        .upsert({
          platform: 'api_keys_secure',
          project_id: projectId || user.id, // Use provided project ID or fallback to user ID
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
  }, [user, apiKeys, validateApiKey, encryptValue, logSensitiveOperation, logSecurityEvent, projectId]);

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

    logSensitiveOperation('api_key_rotation_requested', 'api_credentials', null);
    
    // In production, this would trigger a key rotation workflow
    console.warn(`API Key rotation requested for ${platform}:${keyName}. Please update the key manually.`);
  }, [user, logSensitiveOperation]);

  // Clear all API keys (security action)
  const clearAllApiKeys = useCallback(async () => {
    if (!user) return;

    logSensitiveOperation('api_keys_cleared', 'api_credentials', null);
    
    setApiKeys({});
    
    try {
      await supabase
        .from('project_integration_data')
        .delete()
        .eq('platform', 'api_keys_secure')
        .eq('project_id', projectId || user.id);
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