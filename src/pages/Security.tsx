import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Shield, Lock } from "lucide-react";
import { SecurityDashboard } from "@/components/SecurityDashboard";
import { EnhancedSecurityMonitoring } from "@/components/EnhancedSecurityMonitoring";
import { SecurityMonitoring } from "@/components/SecurityMonitoring";
import { useAuth } from "@/hooks/useAuth";

export default function Security() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Please log in to access the security dashboard and monitoring tools.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Security Center</h1>
          <p className="text-muted-foreground">
            Comprehensive security monitoring and management for your agency
          </p>
        </div>
      </div>

      {/* Security Notice */}
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Enhanced:</strong> Your project now includes advanced security 
          features including PII protection, encrypted API key storage, audit logging, 
          and real-time monitoring. All sensitive data is protected with row-level security policies.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Security Dashboard</TabsTrigger>
          <TabsTrigger value="monitoring">Enhanced Monitoring</TabsTrigger>
          <TabsTrigger value="audit">Audit & Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <SecurityDashboard />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <EnhancedSecurityMonitoring />
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <SecurityMonitoring />
        </TabsContent>
      </Tabs>

      {/* Security Recommendations Footer */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Important Reminder:</strong> Enable "Leaked Password Protection" in your 
          Supabase Auth settings for additional security. This feature is currently disabled 
          and should be enabled in production environments.
        </AlertDescription>
      </Alert>
    </div>
  );
}