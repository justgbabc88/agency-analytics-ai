
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PixelSetupWizard } from '@/components/PixelSetupWizard';
import { TrackingPixelManager } from '@/components/TrackingPixelManager';
import { AttributionDashboard } from '@/components/AttributionDashboard';
import { ExistingPixelManager } from '@/components/wizard/ExistingPixelManager';
import { ProjectSelector } from '@/components/ProjectSelector';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Target, Zap, BarChart3, Code } from "lucide-react";

const Tracking = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Tracking & Attribution</h1>
          <p className="text-gray-600 mt-2">
            Track, attribute, and optimize your marketing campaigns with precision.
          </p>
        </div>
        <div className="w-80">
          <ProjectSelector
            selectedProjectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
          />
        </div>
      </div>

      {!selectedProjectId ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Target className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Select a Project</h2>
            <p className="text-gray-600">
              Choose a project to start tracking your marketing campaigns and conversions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="setup" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="setup" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Quick Setup
            </TabsTrigger>
            <TabsTrigger value="existing" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Get Codes
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Manage Pixels
            </TabsTrigger>
            <TabsTrigger value="attribution" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Attribution
            </TabsTrigger>
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup">
            <PixelSetupWizard projectId={selectedProjectId} />
          </TabsContent>

          <TabsContent value="existing">
            <ExistingPixelManager projectId={selectedProjectId} />
          </TabsContent>

          <TabsContent value="manage">
            <TrackingPixelManager projectId={selectedProjectId} />
          </TabsContent>

          <TabsContent value="attribution">
            <AttributionDashboard projectId={selectedProjectId} />
          </TabsContent>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    Tracking Pixel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Generate a JavaScript tracking pixel to capture visitor data, UTM parameters, and conversions.
                  </p>
                  <ul className="text-xs space-y-1 text-gray-500">
                    <li>• Automatic page view tracking</li>
                    <li>• Form submission capture</li>
                    <li>• UTM parameter storage</li>
                    <li>• Click ID preservation</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    Attribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Attribute revenue back to the original traffic source and campaign that drove the conversion.
                  </p>
                  <ul className="text-xs space-y-1 text-gray-500">
                    <li>• First-touch attribution</li>
                    <li>• Contact matching</li>
                    <li>• Revenue tracking</li>
                    <li>• Campaign performance</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Get detailed insights into your marketing performance with AI-powered recommendations.
                  </p>
                  <ul className="text-xs space-y-1 text-gray-500">
                    <li>• Source performance analysis</li>
                    <li>• Conversion rate tracking</li>
                    <li>• ROI calculations</li>
                    <li>• Optimization insights</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Tracking;
