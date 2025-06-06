
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Code, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FunnelPageMapper } from './FunnelPageMapper';
import { SimplifiedInstallationGuide } from './SimplifiedInstallationGuide';

interface FunnelPage {
  id: string;
  name: string;
  url: string;
  type: 'landing' | 'checkout' | 'thankyou' | 'webinar' | 'booking' | 'general';
  events: string[];
}

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
  const [funnelPages, setFunnelPages] = useState<FunnelPage[]>([]);
  const [showInstallation, setShowInstallation] = useState(false);
  const { toast } = useToast();

  const handlePagesConfigured = (pages: FunnelPage[]) => {
    setFunnelPages(pages);
    setShowInstallation(true);
    toast({
      title: "Pages Configured!",
      description: "Your tracking codes have been generated for each page.",
    });
  };

  const handleContinue = () => {
    if (!showInstallation) {
      toast({
        title: "Setup Required",
        description: "Please configure your funnel pages first.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Configuration Complete",
      description: "Your pixel is ready for testing!",
    });
    onComplete();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Configure Your Tracking</h3>
        <p className="text-muted-foreground">
          Let's set up tracking for your specific funnel pages.
        </p>
      </div>

      <Tabs value={showInstallation ? "install" : "configure"} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="configure" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Setup Pages
          </TabsTrigger>
          <TabsTrigger value="install" className="flex items-center gap-2" disabled={!showInstallation}>
            <Code className="h-4 w-4" />
            Get Code
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configure" className="space-y-6">
          <FunnelPageMapper onPagesConfigured={handlePagesConfigured} />
        </TabsContent>

        <TabsContent value="install" className="space-y-6">
          {showInstallation && (
            <SimplifiedInstallationGuide
              pixelData={pixelData}
              funnelPages={funnelPages}
            />
          )}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleContinue} size="lg" disabled={!showInstallation}>
          Continue to Testing
        </Button>
      </div>
    </div>
  );
};
