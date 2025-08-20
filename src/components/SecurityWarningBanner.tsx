import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    const loadSecurityStatus = async () => {
      if (!user) return;

      try {
        // Mock security issues for now since the RPC function doesn't exist yet
        const mockIssues: SecurityIssue[] = [
          {
            check_name: 'leaked_password_protection',
            status: 'non_compliant',
            severity: 'high',
            description: 'Leaked password protection prevents users from using compromised passwords',
            recommendation: 'Enable leaked password protection in Supabase Auth settings'
          }
        ];
        
        const nonCompliantIssues = mockIssues.filter((issue: SecurityIssue) => 
          issue.status !== 'compliant' && !dismissed.includes(issue.check_name)
        );
        setSecurityIssues(nonCompliantIssues);
      } catch (error) {
        console.error('Failed to load security status:', error);
      }
    };

    loadSecurityStatus();
  }, [user, dismissed]);

  const dismissIssue = (checkName: string) => {
    setDismissed(prev => [...prev, checkName]);
  };

  const getVariant = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      default:
        return 'default';
    }
  };

  const getIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <Shield className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  if (securityIssues.length === 0) return null;

  return (
    <div className="space-y-3 mb-6">
      {securityIssues.map((issue) => (
        <Alert key={issue.check_name} variant={getVariant(issue.severity)}>
          {getIcon(issue.severity)}
          <AlertDescription className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-medium mb-1">
                {issue.check_name === 'leaked_password_protection' 
                  ? 'Critical: Enable Leaked Password Protection'
                  : `Security Notice: ${issue.check_name.replace(/_/g, ' ')}`
                }
              </div>
              <div className="text-sm opacity-90 mb-2">
                {issue.description}
              </div>
              <div className="text-sm font-medium">
                Recommendation: {issue.recommendation}
              </div>
              {issue.check_name === 'leaked_password_protection' && (
                <Button
                  variant="outline" 
                  size="sm"
                  className="mt-2"
                  asChild
                >
                  <a 
                    href="https://supabase.com/dashboard/project/iqxvtfupjjxjkbajgcve/auth/providers"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open Supabase Auth Settings
                  </a>
                </Button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dismissIssue(issue.check_name)}
              className="ml-4"
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};