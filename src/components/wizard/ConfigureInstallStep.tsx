
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SimplifiedInstallationGuide } from './SimplifiedInstallationGuide';
import { FunnelPageMapper } from './FunnelPageMapper';
import { ArrowLeft, ArrowRight } from "lucide-react";

interface PixelData {
  id?: string;
  name: string;
  pixelId: string;
  domains: string;
  config?: any;
}

interface ConfigureInstallStepProps {
  projectId: string;
  pixelData: PixelData;
  onPagesConfigured: (pages: any[]) => void;
}

export const ConfigureInstallStep = ({ projectId, pixelData, onPagesConfigured }: ConfigureInstallStepProps) => {
  const [currentPages, setCurrentPages] = useState<any[]>([]);
  const [showCodes, setShowCodes] = useState(false);

  const handlePagesConfigured = (pages: any[]) => {
    setCurrentPages(pages);
    setShowCodes(true);
  };

  const handleContinue = () => {
    onPagesConfigured(currentPages);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Configure & Install Your Pixel</h3>
          <p className="text-muted-foreground">
            Map your funnel pages and get installation codes.
          </p>
        </div>
        {showCodes && currentPages.length > 0 && (
          <Button onClick={handleContinue}>
            Continue to Verification
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>

      {!showCodes ? (
        <FunnelPageMapper
          onPagesConfigured={handlePagesConfigured}
          initialPages={currentPages}
        />
      ) : (
        <SimplifiedInstallationGuide
          pixelData={pixelData}
          funnelPages={currentPages}
        />
      )}
    </div>
  );
};
