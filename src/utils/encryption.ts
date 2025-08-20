// Enhanced encryption utilities using Web Crypto API
export class EncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;

  // Generate a secure encryption key from user data
  static async generateUserKey(userId: string, sessionId: string): Promise<CryptoKey> {
    const keyData = new TextEncoder().encode(`${userId}-${sessionId}-secure-key`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
    
    return crypto.subtle.importKey(
      'raw',
      hashBuffer,
      { name: this.ALGORITHM },
      false,
      ['encrypt', 'decrypt']
    );
  }

  // Encrypt data with AES-GCM
  static async encrypt(data: string, userId: string, sessionId: string): Promise<string> {
    try {
      const key = await this.generateUserKey(userId, sessionId);
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      const encodedData = new TextEncoder().encode(data);

      const encrypted = await crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv },
        key,
        encodedData
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);

      // Return base64 encoded result
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt data with AES-GCM
  static async decrypt(encryptedData: string, userId: string, sessionId: string): Promise<string> {
    try {
      const key = await this.generateUserKey(userId, sessionId);
      const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      
      const iv = combined.slice(0, this.IV_LENGTH);
      const encrypted = combined.slice(this.IV_LENGTH);

      const decrypted = await crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv },
        key,
        encrypted
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Generate a secure random key for API rotation
  static generateSecureKey(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    return Array.from(array, byte => chars[byte % chars.length]).join('');
  }

  // Validate encryption capability
  static async isEncryptionSupported(): Promise<boolean> {
    try {
      if (!crypto.subtle) return false;
      
      // Test encryption/decryption
      const testKey = await this.generateUserKey('test', 'test');
      const testData = 'test-encryption';
      const encrypted = await crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv: crypto.getRandomValues(new Uint8Array(this.IV_LENGTH)) },
        testKey,
        new TextEncoder().encode(testData)
      );
      
      return encrypted.byteLength > 0;
    } catch {
      return false;
    }
  }
}

// Secure storage interface for API keys
export interface SecureApiKeyData {
  platform: string;
  keyName: string;
  encryptedValue: string;
  createdAt: string;
  lastRotated: string;
  expiresAt?: string;
  rotationReminder?: string;
}

// API key security validation
export class ApiKeyValidator {
  private static readonly MIN_LENGTH = 8;
  private static readonly INSECURE_PATTERNS = [
    /^(test|demo|example|sample)/i,
    /^(123|abc|password|admin)/i,
    /\s+/,
    /^(.)\1{7,}$/ // Repeated characters
  ];

  static validate(platform: string, keyName: string, value: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    strength: 'weak' | 'medium' | 'strong';
  } {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      strength: 'weak' as 'weak' | 'medium' | 'strong'
    };

    // Basic validation
    if (!value || value.trim().length === 0) {
      result.isValid = false;
      result.errors.push('API key cannot be empty');
      return result;
    }

    if (value.length < this.MIN_LENGTH) {
      result.isValid = false;
      result.errors.push(`API key must be at least ${this.MIN_LENGTH} characters`);
    }

    // Check for insecure patterns
    for (const pattern of this.INSECURE_PATTERNS) {
      if (pattern.test(value)) {
        result.warnings.push('API key appears to contain test or insecure data');
        break;
      }
    }

    // Calculate strength
    let strengthScore = 0;
    if (value.length >= 16) strengthScore += 2;
    if (value.length >= 32) strengthScore += 2;
    if (/[A-Z]/.test(value)) strengthScore += 1;
    if (/[a-z]/.test(value)) strengthScore += 1;
    if (/\d/.test(value)) strengthScore += 1;
    if (/[^A-Za-z0-9]/.test(value)) strengthScore += 1;

    if (strengthScore >= 6) result.strength = 'strong';
    else if (strengthScore >= 4) result.strength = 'medium';

    // Platform-specific validation
    this.validatePlatformSpecific(platform, keyName, value, result);

    return result;
  }

  private static validatePlatformSpecific(
    platform: string, 
    keyName: string, 
    value: string, 
    result: any
  ) {
    switch (platform) {
      case 'facebook':
        if (keyName === 'app_id' && !/^\d+$/.test(value)) {
          result.errors.push('Facebook App ID must be numeric');
          result.isValid = false;
        }
        if (keyName === 'app_secret' && value.length < 32) {
          result.warnings.push('Facebook App Secret should be at least 32 characters');
        }
        break;
      
      case 'google':
        if (keyName === 'client_id' && !value.includes('.googleusercontent.com')) {
          result.warnings.push('Google Client ID should end with .googleusercontent.com');
        }
        break;
      
      case 'openai':
        if (keyName === 'api_key' && !value.startsWith('sk-')) {
          result.warnings.push('OpenAI API key should start with "sk-"');
        }
        break;
    }
  }
}