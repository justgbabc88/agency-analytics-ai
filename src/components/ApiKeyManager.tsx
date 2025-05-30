
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Save, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ApiKeyManagerProps {
  platform: string;
  onSave: (keys: Record<string, string>) => void;
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
  const [keys, setKeys] = useState<Record<string, string>>(savedKeys);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  if (!config) return null;

  const handleSave = () => {
    onSave(keys);
    toast({
      title: "API Keys Saved",
      description: `${config.name} credentials have been saved securely.`,
    });
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
          <Key className="h-5 w-5" />
          {config.name} Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {config.fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>{field.label}</Label>
            <div className="relative">
              <Input
                id={field.key}
                type={field.type === "password" && !showPasswords[field.key] ? "password" : "text"}
                value={keys[field.key] || ""}
                onChange={(e) => setKeys(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
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
          </div>
        ))}
        <Button onClick={handleSave} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  );
};
