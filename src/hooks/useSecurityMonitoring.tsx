
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface SecurityEvent {
  id: string;
  type: 'login_attempt' | 'failed_login' | 'data_access' | 'suspicious_activity';
  timestamp: Date;
  details: string;
  severity: 'low' | 'medium' | 'high';
}

export const useSecurityMonitoring = () => {
  const { user } = useAuth();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [alerts, setAlerts] = useState<SecurityEvent[]>([]);

  const logSecurityEvent = (
    type: SecurityEvent['type'],
    details: string,
    severity: SecurityEvent['severity'] = 'low'
  ) => {
    const event: SecurityEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      details,
      severity
    };

    setSecurityEvents(prev => [event, ...prev.slice(0, 99)]); // Keep last 100 events
    
    if (severity === 'high' || severity === 'medium') {
      setAlerts(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 alerts
    }

    // Log to console for monitoring
    console.log(`[SECURITY] ${severity.toUpperCase()}: ${type} - ${details}`);
  };

  const clearAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  // Monitor for suspicious patterns
  useEffect(() => {
    if (!user) return;

    // Check for multiple failed login attempts (this would be implemented with proper backend logging)
    const checkFailedLogins = () => {
      const recentFailedLogins = securityEvents.filter(
        event => event.type === 'failed_login' && 
        Date.now() - event.timestamp.getTime() < 15 * 60 * 1000 // Last 15 minutes
      );

      if (recentFailedLogins.length >= 3) {
        logSecurityEvent(
          'suspicious_activity',
          `Multiple failed login attempts detected: ${recentFailedLogins.length} attempts in 15 minutes`,
          'high'
        );
      }
    };

    checkFailedLogins();
  }, [securityEvents, user]);

  return {
    securityEvents,
    alerts,
    logSecurityEvent,
    clearAlert,
    clearAllAlerts
  };
};
