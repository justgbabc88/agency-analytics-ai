import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, X } from "lucide-react";
import { useSecureApiKeys } from "@/hooks/useSecureApiKeys";
import { useToast } from "@/hooks/use-toast";

export const ApiKeyMigrationNotice = () => {
  const [hasLegacyKeys, setHasLegacyKeys] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { saveSecureApiKeys } = useSecureApiKeys();
  const { toast } = useToast();

  useEffect(() => {
    // Check if there are any legacy API keys in localStorage
    const legacyKeys = localStorage.getItem('api_keys');
    if (legacyKeys && !isDismissed) {
      try {
        const parsedKeys = JSON.parse(legacyKeys);
        const hasKeys = Object.keys(parsedKeys).some(platform => 
          Object.keys(parsedKeys[platform] || {}).length > 0
        );
        setHasLegacyKeys(hasKeys);
      } catch (error) {
        console.error('Error parsing legacy API keys:', error);
      }
    }
  }, [isDismissed]);

  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      const legacyKeys = localStorage.getItem('api_keys');
      if (!legacyKeys) {
        toast({
          title: "No Keys Found",
          description: "No legacy API keys found to migrate.",
          variant: "destructive"
        });
        return;
      }

      const parsedKeys = JSON.parse(legacyKeys);
      let migratedCount = 0;

      for (const [platform, keys] of Object.entries(parsedKeys)) {
        if (keys && typeof keys === 'object' && Object.keys(keys).length > 0) {
          await saveSecureApiKeys(platform, keys as Record<string, string>);
          migratedCount++;
        }
      }

      // Clear localStorage after successful migration
      localStorage.removeItem('api_keys');
      setHasLegacyKeys(false);

      toast({
        title: "Migration Successful",
        description: `Successfully migrated API keys for ${migratedCount} platform(s) to secure storage.`,
      });

    } catch (error) {
      console.error('Migration failed:', error);
      toast({
        title: "Migration Failed",
        description: "Failed to migrate API keys. Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setHasLegacyKeys(false);
  };

  if (!hasLegacyKeys || isDismissed) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4 relative">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="pr-8">
        <div className="space-y-3">
          <div>
            <strong>Security Notice:</strong> Legacy API keys detected in browser storage. 
            For enhanced security, these should be migrated to encrypted storage.
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleMigration}
              disabled={isMigrating}
              className="bg-white text-red-700 hover:bg-red-50"
            >
              {isMigrating ? "Migrating..." : "Migrate Now"}
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleDismiss}
              className="text-red-700 hover:bg-red-50"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </AlertDescription>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDismiss}
        className="absolute top-2 right-2 h-6 w-6 p-0 text-red-700 hover:bg-red-50"
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
};