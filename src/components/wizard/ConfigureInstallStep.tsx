
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SimplifiedInstallationGuide } from './SimplifiedInstallationGuide';
import { ArrowLeft, ArrowRight } from "lucide-react";

interface ConfigureInstallStepProps {
  pixelData: {
    name: string;
    pixelId: string;
    domains: string;
  };
  funnelPages: any[];
  onBack: () => void;
  onNext: () => void;
}

export const ConfigureInstallStep = ({ pixelData, funnelPages, onBack, onNext }: ConfigureInstallStepProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pages
        </Button>
        <Button onClick={onNext}>
          Continue to Verification
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      <SimplifiedInstallationGuide
        pixelData={pixelData}
        funnelPages={funnelPages}
      />
    </div>
  );
};
