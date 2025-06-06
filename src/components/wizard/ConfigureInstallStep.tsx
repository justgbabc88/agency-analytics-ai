
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Copy, Settings, Code, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PixelConfigurationSimplified } from './PixelConfigurationSimplified';
import { PageSpecificInstructions } from './PageSpecificInstructions';

interface PixelData {
  id?: string;
  name: string;
  pixelId: string;
  domains: string;
  config: {
    autoTrackPageViews: boolean;
    autoTrackFormSubmissions: boolean;
    autoTrackClicks: boolean;
    purchaseSelectors: string[];
    formExclusions: string[];
    customEvents: { name: string; selector: string; eventType: string }[];
    dataLayerEnabled: boolean;
    sessionTimeout: number;
  };
}

interface ConfigureInstallStepProps {
  projectId: string;
  pixelData: PixelData;
  updatePixelData: (updates: Partial<PixelData>) => void;
  onComplete: () => void;
}

export const ConfigureInstallStep = ({ projectId, pixelData, updatePixelData, onComplete }: ConfigureInstallStepProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('basic');
  const { toast } = useToast();

  const presets = {
    basic: {
      name: 'Basic Tracking',
      description: 'Track page views and form submissions',
      config: {
        autoTrackPageViews: true,
        autoTrackFormSubmissions: true,
        autoTrackClicks: false,
        purchaseSelectors: [],
        formExclusions: ['.search-form', '.newsletter-form'],
        customEvents: [],
        dataLayerEnabled: false,
        sessionTimeout: 30,
      }
    },
    ecommerce: {
      name: 'E-commerce',
      description: 'Track purchases and shopping behavior',
      config: {
        autoTrackPageViews: true,
        autoTrackFormSubmissions: true,
        autoTrackClicks: true,
        purchaseSelectors: ['button[class*="buy"]', 'button[class*="purchase"]', 'a[href*="checkout"]', '.add-to-cart'],
        formExclusions: ['.search-form', '.newsletter-form'],
        customEvents: [],
        dataLayerEnabled: true,
        sessionTimeout: 30,
      }
    },
    leadgen: {
      name: 'Lead Generation',
      description: 'Track form submissions and contact interactions',
      config: {
        autoTrackPageViews: true,
        autoTrackFormSubmissions: true,
        autoTrackClicks: true,
        purchaseSelectors: ['button[class*="contact"]', 'button[class*="quote"]', '.cta-button'],
        formExclusions: ['.search-form'],
        customEvents: [],
        dataLayerEnabled: true,
        sessionTimeout: 45,
      }
    }
  };

  const handlePresetSelect = (presetKey: string) => {
    setSelectedPreset(presetKey);
    const preset = presets[presetKey as keyof typeof presets];
    updatePixelData({ config: preset.config });
  };

  const handleConfigUpdate = (configUpdates: any) => {
    updatePixelData({ config: { ...pixelData.config, ...configUpdates } });
  };

  const handleContinue = () => {
    toast({
      title: "Configuration Saved",
      description: "Your pixel configuration has been saved successfully",
    });
    onComplete();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Configure & Install Your Pixel</h3>
        <p className="text-muted-foreground">
          Choose a preset configuration and get installation instructions for your website.
        </p>
      </div>

      <Tabs defaultValue="configure" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="configure" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configure
          </TabsTrigger>
          <TabsTrigger value="install" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Install
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configure" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Setup Presets</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose a preset that matches your use case, or customize manually.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(presets).map(([key, preset]) => (
                  <Card
                    key={key}
                    className={`cursor-pointer transition-colors ${
                      selectedPreset === key ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handlePresetSelect(key)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{preset.name}</h4>
                          {selectedPreset === key && (
                            <Badge variant="default">Selected</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {preset.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </Button>
          </div>

          {showAdvanced && (
            <PixelConfigurationSimplified
              config={pixelData.config}
              onConfigChange={handleConfigUpdate}
            />
          )}
        </TabsContent>

        <TabsContent value="install" className="space-y-6">
          <PageSpecificInstructions
            pixelData={pixelData}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleContinue} size="lg">
          Continue to Testing
        </Button>
      </div>
    </div>
  );
};
