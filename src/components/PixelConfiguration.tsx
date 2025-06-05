
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Trash2 } from "lucide-react";

interface PixelConfig {
  autoTrackPageViews: boolean;
  autoTrackFormSubmissions: boolean;
  autoTrackClicks: boolean;
  purchaseSelectors: string[];
  formExclusions: string[];
  customEvents: { name: string; selector: string; eventType: string }[];
  dataLayerEnabled: boolean;
  sessionTimeout: number;
}

interface PixelConfigurationProps {
  config: PixelConfig;
  onConfigChange: (config: PixelConfig) => void;
}

export const PixelConfiguration = ({ config, onConfigChange }: PixelConfigurationProps) => {
  const [newPurchaseSelector, setNewPurchaseSelector] = useState('');
  const [newFormExclusion, setNewFormExclusion] = useState('');
  const [newCustomEvent, setNewCustomEvent] = useState({ name: '', selector: '', eventType: 'click' });

  const updateConfig = (updates: Partial<PixelConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const addPurchaseSelector = () => {
    if (newPurchaseSelector.trim()) {
      updateConfig({
        purchaseSelectors: [...config.purchaseSelectors, newPurchaseSelector.trim()]
      });
      setNewPurchaseSelector('');
    }
  };

  const removePurchaseSelector = (index: number) => {
    updateConfig({
      purchaseSelectors: config.purchaseSelectors.filter((_, i) => i !== index)
    });
  };

  const addFormExclusion = () => {
    if (newFormExclusion.trim()) {
      updateConfig({
        formExclusions: [...config.formExclusions, newFormExclusion.trim()]
      });
      setNewFormExclusion('');
    }
  };

  const removeFormExclusion = (index: number) => {
    updateConfig({
      formExclusions: config.formExclusions.filter((_, i) => i !== index)
    });
  };

  const addCustomEvent = () => {
    if (newCustomEvent.name.trim() && newCustomEvent.selector.trim()) {
      updateConfig({
        customEvents: [...config.customEvents, { ...newCustomEvent }]
      });
      setNewCustomEvent({ name: '', selector: '', eventType: 'click' });
    }
  };

  const removeCustomEvent = (index: number) => {
    updateConfig({
      customEvents: config.customEvents.filter((_, i) => i !== index)
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Pixel Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-tracking Settings */}
        <div className="space-y-4">
          <h4 className="font-semibold">Automatic Tracking</h4>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-pageviews">Page Views</Label>
              <p className="text-sm text-gray-600">Automatically track when users visit pages</p>
            </div>
            <Switch
              id="auto-pageviews"
              checked={config.autoTrackPageViews}
              onCheckedChange={(checked) => updateConfig({ autoTrackPageViews: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-forms">Form Submissions</Label>
              <p className="text-sm text-gray-600">Automatically track form submissions</p>
            </div>
            <Switch
              id="auto-forms"
              checked={config.autoTrackFormSubmissions}
              onCheckedChange={(checked) => updateConfig({ autoTrackFormSubmissions: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-clicks">Purchase Intent Clicks</Label>
              <p className="text-sm text-gray-600">Track clicks on purchase-related buttons</p>
            </div>
            <Switch
              id="auto-clicks"
              checked={config.autoTrackClicks}
              onCheckedChange={(checked) => updateConfig({ autoTrackClicks: checked })}
            />
          </div>
        </div>

        <Separator />

        {/* Purchase Selectors */}
        <div className="space-y-4">
          <h4 className="font-semibold">Purchase Button Selectors</h4>
          <p className="text-sm text-gray-600">
            CSS selectors for buttons that indicate purchase intent
          </p>
          
          <div className="flex gap-2">
            <Input
              value={newPurchaseSelector}
              onChange={(e) => setNewPurchaseSelector(e.target.value)}
              placeholder="e.g., .buy-now-btn, #checkout-button"
            />
            <Button onClick={addPurchaseSelector} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {config.purchaseSelectors.map((selector, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {selector}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removePurchaseSelector(index)}
                  className="h-4 w-4 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Form Exclusions */}
        <div className="space-y-4">
          <h4 className="font-semibold">Form Exclusions</h4>
          <p className="text-sm text-gray-600">
            CSS selectors for forms to exclude from tracking
          </p>
          
          <div className="flex gap-2">
            <Input
              value={newFormExclusion}
              onChange={(e) => setNewFormExclusion(e.target.value)}
              placeholder="e.g., .search-form, #newsletter-form"
            />
            <Button onClick={addFormExclusion} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {config.formExclusions.map((selector, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {selector}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFormExclusion(index)}
                  className="h-4 w-4 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        {/* Custom Events */}
        <div className="space-y-4">
          <h4 className="font-semibold">Custom Events</h4>
          <p className="text-sm text-gray-600">
            Track custom interactions on your website
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Input
              value={newCustomEvent.name}
              onChange={(e) => setNewCustomEvent({ ...newCustomEvent, name: e.target.value })}
              placeholder="Event name"
            />
            <Input
              value={newCustomEvent.selector}
              onChange={(e) => setNewCustomEvent({ ...newCustomEvent, selector: e.target.value })}
              placeholder="CSS selector"
            />
            <select
              value={newCustomEvent.eventType}
              onChange={(e) => setNewCustomEvent({ ...newCustomEvent, eventType: e.target.value })}
              className="px-3 py-2 border rounded-md"
            >
              <option value="click">Click</option>
              <option value="hover">Hover</option>
              <option value="view">View</option>
            </select>
            <Button onClick={addCustomEvent} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {config.customEvents.map((event, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <span className="font-medium">{event.name}</span>
                  <span className="text-sm text-gray-600 ml-2">({event.eventType})</span>
                  <br />
                  <code className="text-xs bg-gray-100 px-1 rounded">{event.selector}</code>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeCustomEvent(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Advanced Settings */}
        <div className="space-y-4">
          <h4 className="font-semibold">Advanced Settings</h4>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="data-layer">Enhanced Data Layer</Label>
              <p className="text-sm text-gray-600">Track additional page metadata</p>
            </div>
            <Switch
              id="data-layer"
              checked={config.dataLayerEnabled}
              onCheckedChange={(checked) => updateConfig({ dataLayerEnabled: checked })}
            />
          </div>

          <div>
            <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
            <Input
              id="session-timeout"
              type="number"
              value={config.sessionTimeout}
              onChange={(e) => updateConfig({ sessionTimeout: parseInt(e.target.value) || 30 })}
              className="w-32 mt-1"
              min="5"
              max="180"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
