import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SecurityEventData {
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: any;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export const useSecurityAudit = () => {
  const { user } = useAuth();

  const logSecurityEvent = useCallback(async (eventData: SecurityEventData) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('log_security_event', {
        p_user_id: user.id,
        p_action: eventData.action,
        p_resource_type: eventData.resource_type,
        p_resource_id: eventData.resource_id || null,
        p_details: eventData.details || {},
        p_severity: eventData.severity || 'info'
      });

      if (error) {
        console.error('Failed to log security event:', error);
      }
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }, [user]);

  const logLogin = useCallback((method: string) => {
    logSecurityEvent({
      action: 'user_login',
      resource_type: 'authentication',
      details: { method, timestamp: new Date().toISOString() },
      severity: 'info'
    });
  }, [logSecurityEvent]);

  const logLogout = useCallback(() => {
    logSecurityEvent({
      action: 'user_logout', 
      resource_type: 'authentication',
      details: { timestamp: new Date().toISOString() },
      severity: 'info'
    });
  }, [logSecurityEvent]);

  const logFailedLogin = useCallback((email: string, error: string) => {
    logSecurityEvent({
      action: 'login_failed',
      resource_type: 'authentication',
      details: { 
        email, 
        error, 
        timestamp: new Date().toISOString(),
        ip_address: 'unknown' // In production, capture real IP
      },
      severity: 'warning'
    });
  }, [logSecurityEvent]);

  const logDataAccess = useCallback((resourceType: string, resourceId?: string) => {
    logSecurityEvent({
      action: 'data_accessed',
      resource_type: resourceType,
      resource_id: resourceId,
      details: { timestamp: new Date().toISOString() },
      severity: 'info'
    });
  }, [logSecurityEvent]);

  const logSensitiveOperation = useCallback((operation: string, resourceType: string, resourceId?: string) => {
    logSecurityEvent({
      action: operation,
      resource_type: resourceType,
      resource_id: resourceId,
      details: { 
        timestamp: new Date().toISOString(),
        user_agent: navigator.userAgent
      },
      severity: 'warning'
    });
  }, [logSecurityEvent]);

  const logSecurityIncident = useCallback((incident: string, details: any) => {
    logSecurityEvent({
      action: 'security_incident',
      resource_type: 'system',
      details: { 
        incident, 
        ...details, 
        timestamp: new Date().toISOString() 
      },
      severity: 'critical'
    });
  }, [logSecurityEvent]);

  return {
    logSecurityEvent,
    logLogin,
    logLogout,
    logFailedLogin,
    logDataAccess,
    logSensitiveOperation,
    logSecurityIncident
  };
};