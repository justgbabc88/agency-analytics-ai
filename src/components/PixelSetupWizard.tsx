
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreatePixelStep } from './wizard/CreatePixelStep';
import { ConfigureInstallStep } from './wizard/ConfigureInstallStep';
import { TestVerifyStep } from './wizard/TestVerifyStep';
import { ExistingPixelManager } from './wizard/ExistingPixelManager';
import { ArrowLeft, ArrowRight, Zap, Settings, Eye, Archive } from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';

interface PixelSetupWizardProps {
  projectId: string;
}

interface PixelData {
  id?: string;
  name: string;
  pixelId: string;
  domains: string;
  config?: any;
}

export const PixelSetupWizard = ({ projectId }: PixelSetupWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [pixelData, setPixelData] = useState<PixelData | null>(null);
  const [funnelPages, setFunnelPages] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('new');
  const queryClient = useQueryClient();

  const steps = [
    { id: 1, title: 'Create Pixel', icon: Zap },
    { id: 2, title: 'Configure & Install', icon: Settings },
    { id: 3, title: 'Test & Verify', icon: Eye },
  ];

  const handlePixelCreated = (data: PixelData) => {
    console.log('PixelSetupWizard: Pixel created:', data);
    setPixelData(data);
    setCurrentStep(2);
  };

  const handlePagesConfigured = (pages: any[]) => {
    console.log('PixelSetupWizard: Funnel pages configured:', pages);
    setFunnelPages(pages);
    
    if (pixelData) {
      const updatedPixelData = {
        ...pixelData,
        config: {
          ...(pixelData.config || {}),
          funnelPages: pages
        }
      };
      setPixelData(updatedPixelData);
    }
    
    setCurrentStep(3);
  };

  const handleConfigSaved = () => {
    console.log('PixelSetupWizard: Configuration saved, invalidating queries');
    queryClient.invalidateQueries({ queryKey: ['tracking-pixels', projectId] });
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

  const resetWizard = () => {
    setCurrentStep(1);
    setPixelData(null);
    setFunnelPages([]);
  };

  if (activeTab === 'existing') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('new')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quick Setup
          </Button>
          <h2 className="text-xl font-semibold">Manage Existing Pixels</h2>
        </div>
        <ExistingPixelManager projectId={projectId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quick Pixel Setup
            </CardTitle>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="new">New Pixel</TabsTrigger>
                <TabsTrigger value="existing">
                  <Archive className="h-4 w-4 mr-2" />
                  Manage Existing
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                    ${isActive ? 'border-primary bg-primary text-white' : 
                      isCompleted ? 'border-green-500 bg-green-500 text-white' : 
                      'border-gray-300 bg-white text-gray-400'}
                  `}>
                    <StepIcon className="h-5 w-5" />
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                      Step {step.id}
                    </p>
                    <p className={`text-xs ${isActive ? 'text-primary' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {currentStep === 1 && (
              <CreatePixelStep
                projectId={projectId}
                onPixelCreated={handlePixelCreated}
              />
            )}
            
            {currentStep === 2 && pixelData && (
              <ConfigureInstallStep
                projectId={projectId}
                pixelData={pixelData}
                onPagesConfigured={handlePagesConfigured}
              />
            )}
            
            {currentStep === 3 && pixelData && (
              <TestVerifyStep
                projectId={projectId}
                pixelData={pixelData}
                funnelPages={funnelPages}
                onConfigSaved={handleConfigSaved}
              />
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex gap-2">
              {currentStep === 3 && (
                <Button
                  variant="outline"
                  onClick={resetWizard}
                >
                  Create Another Pixel
                </Button>
              )}
              
              {currentStep < 3 && (
                <Button
                  onClick={nextStep}
                  disabled={currentStep === 1 && !pixelData}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
