import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface EnhancedSecurityEventData {
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  domain?: string;
  project_id?: string;
}

// Rate limiting to prevent audit log spam
class AuditRateLimiter {
  private static logs: Map<string, number> = new Map();
  private static readonly WINDOW_MS = 60000; // 1 minute
  private static readonly MAX_LOGS_PER_WINDOW = 10;

  static shouldLog(key: string): boolean {
    const now = Date.now();
    const windowStart = Math.floor(now / this.WINDOW_MS) * this.WINDOW_MS;
    const logKey = `${key}:${windowStart}`;
    
    const currentCount = this.logs.get(logKey) || 0;
    if (currentCount >= this.MAX_LOGS_PER_WINDOW) {
      return false;
    }
    
    this.logs.set(logKey, currentCount + 1);
    
    // Cleanup old entries
    for (const [k, v] of this.logs.entries()) {
      const keyTime = parseInt(k.split(':')[1]);
      if (now - keyTime > this.WINDOW_MS * 2) {
        this.logs.delete(k);
      }
    }
    
    return true;
  }
}

export const useEnhancedSecurityAudit = () => {
  const { user } = useAuth();

  const logSecurityEvent = useCallback(async (eventData: EnhancedSecurityEventData) => {
    if (!user) return;

    // Rate limiting to prevent spam
    const logKey = `${user.id}:${eventData.action}:${eventData.resource_type}`;
    if (!AuditRateLimiter.shouldLog(logKey)) {
      return; // Skip logging if rate limited
    }

    try {
      const { error } = await supabase.rpc('log_security_event', {
        p_user_id: user.id,
        p_action: eventData.action,
        p_resource_type: eventData.resource_type,
        p_resource_id: eventData.resource_id || null,
        p_details: {
          ...eventData.details || {},
          domain: eventData.domain,
          project_id: eventData.project_id,
          user_agent: navigator.userAgent.substring(0, 200), // Limit length
          timestamp: new Date().toISOString()
        },
        p_severity: eventData.severity || 'info'
      });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }, [user]);

  const logApiKeyOperation = useCallback(async (
    projectId: string,
    platform: string,
    action: 'created' | 'updated' | 'rotated' | 'deleted' | 'accessed',
    keyName?: string,
    metadata?: any
  ) => {
    if (!user) return;

    // Log through the existing security audit system for now
    logSecurityEvent({
      action: `api_key_${action}`,
      resource_type: 'api_credentials',
      resource_id: projectId,
      details: {
        platform,
        key_name: keyName,
        metadata: metadata || {},
        project_id: projectId
      },
      severity: 'warning'
    });
  }, [user, logSecurityEvent]);

  const validateTrackingRequest = useCallback(async (
    projectId: string,
    domain?: string,
    eventType: string = 'page_view',
    hasContactData: boolean = false
  ): Promise<boolean> => {
    try {
      // For now, implement basic validation logic
      // This will be enhanced when the RPC function is available
      
      // Always allow page views without contact data
      if (eventType === 'page_view' && !hasContactData) {
        return true;
      }
      
      // Log suspicious activity for events with contact data from unknown domains
      if (hasContactData && domain) {
        logSecurityEvent({
          action: 'tracking_validation_check',
          resource_type: 'tracking_events',
          resource_id: projectId,
          details: {
            domain,
            event_type: eventType,
            has_contact_data: hasContactData,
            project_id: projectId
          },
          severity: 'info'
        });
      }
      
      return true; // Allow for now, will be restricted later
    } catch (error) {
      console.error('Failed to validate tracking request:', error);
      return false;
    }
  }, [logSecurityEvent]);

  const logSuspiciousActivity = useCallback((
    activity: string,
    details: any,
    severity: 'warning' | 'critical' = 'warning'
  ) => {
    logSecurityEvent({
      action: 'suspicious_activity_detected',
      resource_type: 'security_monitoring',
      details: {
        activity,
        ...details,
        detection_time: new Date().toISOString()
      },
      severity
    });
  }, [logSecurityEvent]);

  const logDataAccess = useCallback((
    resourceType: string,
    resourceId?: string,
    sensitive: boolean = false
  ) => {
    // Only log sensitive data access to reduce noise
    if (!sensitive) return;

    logSecurityEvent({
      action: 'sensitive_data_accessed',
      resource_type: resourceType,
      resource_id: resourceId,
      details: {
        access_type: 'read',
        sensitivity_level: 'high'
      },
      severity: 'info'
    });
  }, [logSecurityEvent]);

  return {
    logSecurityEvent,
    logApiKeyOperation,
    validateTrackingRequest,
    logSuspiciousActivity,
    logDataAccess
  };
};