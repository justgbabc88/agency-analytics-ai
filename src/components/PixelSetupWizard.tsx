
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { CreatePixelStep } from './wizard/CreatePixelStep';
import { ConfigureInstallStep } from './wizard/ConfigureInstallStep';
import { TestVerifyStep } from './wizard/TestVerifyStep';

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
    funnelPages?: any[];
  };
}

interface PixelSetupWizardProps {
  projectId: string;
}

export const PixelSetupWizard = ({ projectId }: PixelSetupWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [pixelData, setPixelData] = useState<PixelData>({
    name: '',
    pixelId: '',
    domains: '',
    config: {
      autoTrackPageViews: true,
      autoTrackFormSubmissions: true,
      autoTrackClicks: true,
      purchaseSelectors: ['button[class*="buy"]', 'button[class*="purchase"]', 'a[href*="checkout"]', '.add-to-cart'],
      formExclusions: ['.search-form', '.newsletter-form'],
      customEvents: [],
      dataLayerEnabled: false,
      sessionTimeout: 30,
      funnelPages: [],
    }
  });
  const [isPixelCreated, setIsPixelCreated] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [funnelPages, setFunnelPages] = useState<any[]>([]);

  const steps = [
    { id: 1, title: 'Create Pixel', description: 'Basic pixel setup' },
    { id: 2, title: 'Configure & Install', description: 'Setup tracking and installation' },
    { id: 3, title: 'Test & Verify', description: 'Verify tracking is working' }
  ];

  const updatePixelData = (updates: Partial<PixelData>) => {
    setPixelData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePixelCreated = () => {
    setIsPixelCreated(true);
    nextStep();
  };

  const handleConfigurationComplete = (pages: any[]) => {
    setFunnelPages(pages);
    setIsConfigured(true);
    nextStep();
  };

  const progress = (currentStep / 3) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pixel Setup Wizard</CardTitle>
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <div className="flex justify-between text-sm text-muted-foreground">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-center space-x-2 ${
                    step.id === currentStep ? 'text-primary font-medium' : ''
                  } ${step.id < currentStep ? 'text-green-600' : ''}`}
                >
                  {step.id < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                      step.id === currentStep ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'
                    }`}>
                      {step.id}
                    </span>
                  )}
                  <div>
                    <div className="font-medium">{step.title}</div>
                    <div className="text-xs">{step.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentStep === 1 && (
            <CreatePixelStep
              projectId={projectId}
              pixelData={pixelData}
              updatePixelData={updatePixelData}
              onComplete={handlePixelCreated}
            />
          )}
          
          {currentStep === 2 && (
            <ConfigureInstallStep
              pixelData={pixelData}
              funnelPages={funnelPages}
              onBack={prevStep}
              onNext={handleConfigurationComplete}
            />
          )}
          
          {currentStep === 3 && (
            <TestVerifyStep
              projectId={projectId}
              pixelData={pixelData}
            />
          )}
        </CardContent>
        
        <div className="px-6 pb-6">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            {currentStep < 3 && (
              <Button
                onClick={nextStep}
                disabled={currentStep === 1 && !isPixelCreated}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
