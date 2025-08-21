
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Save, Key, Shield, AlertTriangle, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSecureApiKeys } from "@/hooks/useSecureApiKeys";

interface ApiKeyManagerProps {
  platform: string;
  onSave?: (keys: Record<string, string>) => void;
  savedKeys?: Record<string, string>;
}

const platformConfigs = {
  clickfunnels: {
    name: "ClickFunnels",
    fields: [
      { key: "api_key", label: "API Key", type: "password" },
      { key: "subdomain", label: "Subdomain", type: "text" },
    ]
  },
  gohighlevel: {
    name: "GoHighLevel",
    fields: [
      { key: "api_key", label: "API Key", type: "password" },
      { key: "location_id", label: "Location ID", type: "text" },
    ]
  },
  activecampaign: {
    name: "ActiveCampaign",
    fields: [
      { key: "api_key", label: "API Key", type: "password" },
      { key: "api_url", label: "API URL", type: "text", placeholder: "https://youraccountname.api-us1.com" },
    ]
  }
};

export const ApiKeyManager = ({ platform, onSave, savedKeys = {} }: ApiKeyManagerProps) => {
  const config = platformConfigs[platform as keyof typeof platformConfigs];
  const { 
    saveSecureApiKeys, 
    getApiKeys, 
    validateApiKey, 
    rotateApiKey,
    loading: secureLoading,
    error: secureError
  } = useSecureApiKeys();
  
  const [keys, setKeys] = useState<Record<string, string>>(savedKeys);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [validationWarnings, setValidationWarnings] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  if (!config) return null;

  // Load existing secure keys
  useEffect(() => {
    const existingKeys = getApiKeys(platform);
    if (Object.keys(existingKeys).length > 0) {
      setKeys(existingKeys);
    }
  }, [platform, getApiKeys]);

  const validateAllKeys = () => {
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};
    
    Object.entries(keys).forEach(([keyName, value]) => {
      const validation = validateApiKey(platform, keyName, value);
      if (validation.errors.length > 0) {
        errors[keyName] = validation.errors;
      }
      if (validation.warnings.length > 0) {
        warnings[keyName] = validation.warnings;
      }
    });
    
    setValidationErrors(errors);
    setValidationWarnings(warnings);
    
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!validateAllKeys()) {
        toast({
          title: "Validation Failed",
          description: "Please fix the validation errors before saving.",
          variant: "destructive",
        });
        return;
      }

      await saveSecureApiKeys(platform, keys);
      
      // Call legacy onSave if provided for backward compatibility
      if (onSave) {
        onSave(keys);
      }

      toast({
        title: "API Keys Saved Securely",
        description: `${config.name} credentials have been encrypted and saved.`,
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save API keys securely",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRotateKey = async (keyName: string) => {
    try {
      await rotateApiKey(platform, keyName);
      toast({
        title: "Key Rotation Requested",
        description: `Please update the ${keyName} manually in your ${config.name} account.`,
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Rotation Failed",
        description: "Failed to request key rotation",
        variant: "destructive",
      });
    }
  };

  const togglePasswordVisibility = (fieldKey: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          {config.name} Secure Configuration
        </CardTitle>
        {secureError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{secureError}</AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {config.fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={field.key} className="flex items-center gap-2">
                {field.label}
                <Badge variant="secondary" className="text-xs">
                  Encrypted
                </Badge>
              </Label>
              {field.type === "password" && keys[field.key] && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRotateKey(field.key)}
                  className="h-auto p-1 text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Rotate
                </Button>
              )}
            </div>
            <div className="relative">
              <Input
                id={field.key}
                type={field.type === "password" && !showPasswords[field.key] ? "password" : "text"}
                value={keys[field.key] || ""}
                onChange={(e) => {
                  setKeys(prev => ({ ...prev, [field.key]: e.target.value }));
                  // Clear validation errors when user types
                  if (validationErrors[field.key]) {
                    setValidationErrors(prev => {
                      const updated = { ...prev };
                      delete updated[field.key];
                      return updated;
                    });
                  }
                }}
                placeholder={field.placeholder}
                className={validationErrors[field.key] ? "border-destructive" : ""}
              />
              {field.type === "password" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => togglePasswordVisibility(field.key)}
                >
                  {showPasswords[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              )}
            </div>
            
            {/* Validation Errors */}
            {validationErrors[field.key] && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {validationErrors[field.key].join(', ')}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Validation Warnings */}
            {validationWarnings[field.key] && (
              <Alert variant="default" className="py-2 border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-sm text-yellow-800">
                  {validationWarnings[field.key].join(', ')}
                </AlertDescription>
              </Alert>
            )}
          </div>
        ))}
        
        <div className="pt-4 border-t">
          <Button 
            onClick={handleSave} 
            className="w-full" 
            disabled={saving || secureLoading}
          >
            <Shield className="h-4 w-4 mr-2" />
            {saving ? "Saving Securely..." : "Save Encrypted Configuration"}
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            All credentials are encrypted and stored securely in your database
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
