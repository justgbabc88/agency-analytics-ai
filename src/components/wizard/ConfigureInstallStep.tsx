
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FunnelPageMapper } from './FunnelPageMapper';
import { SimplifiedInstallationGuide } from './SimplifiedInstallationGuide';
import { Settings, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PixelData } from './types';

interface ConfigureInstallStepProps {
  projectId: string;
  pixelData: PixelData;
  onPagesConfigured: (pages: any[]) => void;
}

export const ConfigureInstallStep = ({ projectId, pixelData, onPagesConfigured }: ConfigureInstallStepProps) => {
  console.log('ConfigureInstallStep: Received pixelData:', pixelData);
  
  const handlePagesConfigured = (pages: any[]) => {
    console.log('ConfigureInstallStep: Pages configured:', pages);
    onPagesConfigured(pages);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Configure Your Funnel Pages</h3>
        <p className="text-muted-foreground">
          Set up the pages in your funnel to generate optimized tracking codes for each step.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Funnel Page Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FunnelPageMapper
            onPagesConfigured={handlePagesConfigured}
            initialPages={pixelData.config?.funnelPages || []}
          />
        </CardContent>
      </Card>
    </div>
  );
};
