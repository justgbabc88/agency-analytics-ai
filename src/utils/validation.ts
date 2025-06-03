
// Security validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeInput = (input: string): string => {
  // Remove potential XSS characters
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent basic XSS
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

export const validateAgencyName = (name: string): boolean => {
  const sanitized = sanitizeInput(name);
  return sanitized.length >= 2 && sanitized.length <= 100 && /^[a-zA-Z0-9\s\-_.]+$/.test(sanitized);
};

export const validateProjectName = (name: string): boolean => {
  const sanitized = sanitizeInput(name);
  return sanitized.length >= 2 && sanitized.length <= 100 && /^[a-zA-Z0-9\s\-_.]+$/.test(sanitized);
};

export const validateUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
};

export const rateLimitCheck = (() => {
  const attempts: { [key: string]: number[] } = {};
  
  return (identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!attempts[identifier]) {
      attempts[identifier] = [];
    }
    
    // Remove old attempts outside the window
    attempts[identifier] = attempts[identifier].filter(time => time > windowStart);
    
    if (attempts[identifier].length >= maxAttempts) {
      return false; // Rate limit exceeded
    }
    
    attempts[identifier].push(now);
    return true; // Within rate limit
  };
})();
