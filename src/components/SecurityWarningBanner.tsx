import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, ShieldX, ExternalLink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface SecurityIssue {
  check_name: string;
  status: string;
  severity: string;
  description: string;
  recommendation: string;
}

export const SecurityWarningBanner = () => {
  const { user } = useAuth();
  const [securityIssues, setSecurityIssues] = useState<SecurityIssue[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    // Mock security status - in production this would come from a real security scan
    const mockSecurityIssues: SecurityIssue[] = [
      {
        check_name: 'leaked_password_protection',
        status: 'disabled',
        severity: 'warn',
        description: 'Leaked password protection is currently disabled. This allows users to set passwords that have been found in data breaches.',
        recommendation: 'Enable leaked password protection in Supabase Auth settings to prevent users from using compromised passwords.'
      }
    ];

    // Filter out dismissed issues
    const activeIssues = mockSecurityIssues.filter(issue => !dismissed.has(issue.check_name));
    setSecurityIssues(activeIssues);
  }, [user, dismissed]);

  const dismissIssue = (checkName: string) => {
    setDismissed(prev => new Set([...prev, checkName]));
  };

  const getVariant = (severity: string) => {
    return severity === 'critical' || severity === 'error' ? 'destructive' : 'default';
  };

  const getIcon = (severity: string) => {
    return severity === 'critical' || severity === 'error' ? AlertTriangle : ShieldX;
  };

  if (!user || securityIssues.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      {securityIssues.map((issue) => {
        const Icon = getIcon(issue.severity);
        return (
          <Alert 
            key={issue.check_name} 
            variant={getVariant(issue.severity)}
            className="border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200"
          >
            <Icon className="h-4 w-4" />
            <AlertDescription className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium mb-2">
                  Security Warning: {issue.check_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                <div className="text-sm mb-3">
                  {issue.description}
                </div>
                <div className="text-sm font-medium mb-3">
                  💡 {issue.recommendation}
                </div>
                {issue.check_name === 'leaked_password_protection' && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="text-orange-700 border-orange-300 hover:bg-orange-100 dark:text-orange-300 dark:border-orange-700 dark:hover:bg-orange-900"
                    >
                      <a 
                        href="https://supabase.com/dashboard/project/iqxvtfupjjxjkbajgcve/auth/policies"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Fix in Supabase Auth Settings
                      </a>
                    </Button>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissIssue(issue.check_name)}
                className="ml-4 text-orange-600 hover:text-orange-800 hover:bg-orange-100 dark:text-orange-400 dark:hover:text-orange-200 dark:hover:bg-orange-900"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </Button>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
};