
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SimplifiedInstallationGuide } from './SimplifiedInstallationGuide';
import { FunnelPageMapper } from './FunnelPageMapper';
import { ArrowLeft, ArrowRight } from "lucide-react";

interface ConfigureInstallStepProps {
  pixelData: {
    name: string;
    pixelId: string;
    domains: string;
  };
  funnelPages: any[];
  onBack: () => void;
  onNext: (pages: any[]) => void;
}

export const ConfigureInstallStep = ({ pixelData, funnelPages, onBack, onNext }: ConfigureInstallStepProps) => {
  const [currentPages, setCurrentPages] = useState<any[]>(funnelPages);
  const [showCodes, setShowCodes] = useState(false);

  const handlePagesConfigured = (pages: any[]) => {
    setCurrentPages(pages);
    setShowCodes(true);
  };

  const handleContinue = () => {
    onNext(currentPages);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Setup
        </Button>
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
