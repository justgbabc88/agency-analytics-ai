
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

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
    <Card>
      <CardHeader>
        <CardTitle>Advanced Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tracking Options */}
        <div className="space-y-4">
          <h4 className="font-semibold">What to Track</h4>
          
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
              <Label htmlFor="auto-clicks">Purchase Buttons</Label>
              <p className="text-sm text-muted-foreground">Track clicks on buy/purchase buttons</p>
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
  );
};
