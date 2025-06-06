
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle } from "lucide-react";

interface Config {
  autoTrackPageViews: boolean;
  autoTrackFormSubmissions: boolean;
  autoTrackClicks: boolean;
  purchaseSelectors: string[];
  formExclusions: string[];
  customEvents: { name: string; selector: string; eventType: string }[];
  dataLayerEnabled: boolean;
  sessionTimeout: number;
}

interface PixelConfigurationSimplifiedProps {
  config: Config;
  onConfigChange: (updates: Partial<Config>) => void;
}

export const PixelConfigurationSimplified = ({ config, onConfigChange }: PixelConfigurationSimplifiedProps) => {
  return (
    <div className="space-y-6">
      {/* Important Purchase Tracking Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-5 w-5" />
            Purchase Tracking Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-800 mb-3">
            <strong>Important:</strong> The settings below track purchase intent (clicks, form submissions). To track actual revenue, you must manually call <code className="bg-white px-1 rounded">trackPurchase()</code> on your confirmation page.
          </p>
          <div className="bg-white p-3 rounded border">
            <code className="text-xs">trackPurchase(99.99, 'USD', {'{'}email: 'customer@email.com'{'}'});</code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What to Track</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tracking Options */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-pageviews">Page Views</Label>
                <p className="text-sm text-muted-foreground">Track when users visit pages</p>
              </div>
              <Switch
                id="auto-pageviews"
                checked={config.autoTrackPageViews}
                onCheckedChange={(checked) => onConfigChange({ autoTrackPageViews: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-forms">Form Submissions</Label>
                <p className="text-sm text-muted-foreground">Track form submissions automatically</p>
              </div>
              <Switch
                id="auto-forms"
                checked={config.autoTrackFormSubmissions}
                onCheckedChange={(checked) => onConfigChange({ autoTrackFormSubmissions: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-clicks">Purchase Intent Buttons</Label>
                <p className="text-sm text-muted-foreground">Track clicks on buy/purchase buttons (not actual purchases)</p>
              </div>
              <Switch
                id="auto-clicks"
                checked={config.autoTrackClicks}
                onCheckedChange={(checked) => onConfigChange({ autoTrackClicks: checked })}
              />
            </div>
          </div>

          <Separator />

          {/* Advanced Settings */}
          <div className="space-y-4">
            <h4 className="font-semibold">Advanced Options</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="data-layer">Enhanced Tracking</Label>
                <p className="text-sm text-muted-foreground">Collect additional page metadata</p>
              </div>
              <Switch
                id="data-layer"
                checked={config.dataLayerEnabled}
                onCheckedChange={(checked) => onConfigChange({ dataLayerEnabled: checked })}
              />
            </div>

            <div>
              <Label htmlFor="session-timeout">Session Length (minutes)</Label>
              <Input
                id="session-timeout"
                type="number"
                value={config.sessionTimeout}
                onChange={(e) => onConfigChange({ sessionTimeout: parseInt(e.target.value) || 30 })}
                className="w-32 mt-1"
                min="5"
                max="180"
              />
              <p className="text-sm text-muted-foreground mt-1">
                How long to track a user session before it expires
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
