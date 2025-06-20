
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Eye, EyeOff, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PixelConfiguration } from './PixelConfiguration';

interface TrackingPixelGeneratorProps {
  projectId: string;
}

const defaultConfig = {
  autoTrackPageViews: true,
  autoTrackFormSubmissions: true,
  autoTrackClicks: true,
  purchaseSelectors: ['button[class*="buy"]', 'button[class*="purchase"]', 'a[href*="checkout"]', '.add-to-cart'],
  formExclusions: ['.search-form', '.newsletter-form'],
  customEvents: [],
  dataLayerEnabled: false,
  sessionTimeout: 30,
};

export const TrackingPixelGenerator = ({ projectId }: TrackingPixelGeneratorProps) => {
  const [pixelName, setPixelName] = useState('');
  const [domains, setDomains] = useState('');
  const [pixelId, setPixelId] = useState('');
  const [showScript, setShowScript] = useState(false);
  const [config, setConfig] = useState(defaultConfig);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generatePixelId = () => {
    const id = `pixel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setPixelId(id);
  };

  useEffect(() => {
    generatePixelId();
  }, []);

  const createPixel = useMutation({
    mutationFn: async () => {
      if (!pixelName.trim()) {
        throw new Error('Pixel name is required');
      }

      console.log('Creating pixel with data:', {
        project_id: projectId,
        name: pixelName,
        pixel_id: pixelId,
        domains: domains ? domains.split(',').map(d => d.trim()) : [],
        config
      });

      const { data, error } = await supabase
        .from('tracking_pixels')
        .insert({
          project_id: projectId,
          name: pixelName,
          pixel_id: pixelId,
          domains: domains ? domains.split(',').map(d => d.trim()) : [],
          config,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        console.error('Pixel creation error:', error);
        throw error;
      }

      console.log('Pixel created successfully:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracking-pixels', projectId] });
      toast({
        title: "Success",
        description: "Tracking pixel created successfully",
      });
      
      // Reset form
      setPixelName('');
      setDomains('');
      generatePixelId();
      setConfig(defaultConfig);
    },
    onError: (error) => {
      console.error('Pixel creation failed:', error);
      toast({
        title: "Error",
        description: `Failed to create tracking pixel: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const generateTrackingScript = () => {
    const supabaseUrl = "https://iqxvtfupjjxjkbajgcve.supabase.co";
    
    return `<!-- Advanced Marketing Attribution Tracking Pixel -->
<script>
(function() {
  // Configuration
  const PIXEL_ID = '${pixelId}';
  const API_URL = '${supabaseUrl}/functions/v1/track-event';
  const CONFIG = ${JSON.stringify(config, null, 2)};
  
  // Generate or get session ID
  function getSessionId() {
    let sessionId = localStorage.getItem('tracking_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('tracking_session_id', sessionId);
      
      // Set session timeout
      setTimeout(() => {
        localStorage.removeItem('tracking_session_id');
      }, CONFIG.sessionTimeout * 60 * 1000);
    }
    return sessionId;
  }

  // Get UTM parameters and click IDs from URL
  function getUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const params = {};
    
    // UTM parameters
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
      const value = urlParams.get(param);
      if (value) params[param.replace('utm_', '')] = value;
    });
    
    // Click IDs
    const clickIds = {};
    if (urlParams.get('fbclid')) clickIds.fbclid = urlParams.get('fbclid');
    if (urlParams.get('gclid')) clickIds.gclid = urlParams.get('gclid');
    if (urlParams.get('ttclid')) clickIds.ttclid = urlParams.get('ttclid');
    
    return { utm: params, clickIds };
  }

  // Get device information
  function getDeviceInfo() {
    const ua = navigator.userAgent;
    let deviceType = 'desktop';
    let browser = 'unknown';
    let os = 'unknown';

    // Device type detection
    if (/tablet/i.test(ua)) deviceType = 'tablet';
    else if (/mobile/i.test(ua)) deviceType = 'mobile';

    // Browser detection
    if (ua.indexOf('Chrome') > -1) browser = 'chrome';
    else if (ua.indexOf('Safari') > -1) browser = 'safari';
    else if (ua.indexOf('Firefox') > -1) browser = 'firefox';
    else if (ua.indexOf('Edge') > -1) browser = 'edge';

    // OS detection
    if (ua.indexOf('Windows') > -1) os = 'windows';
    else if (ua.indexOf('Mac') > -1) os = 'macos';
    else if (ua.indexOf('Linux') > -1) os = 'linux';
    else if (ua.indexOf('Android') > -1) os = 'android';
    else if (ua.indexOf('iOS') > -1) os = 'ios';

    return { userAgent: ua, deviceType, browser, os };
  }

  // Enhanced data layer tracking
  function getDataLayerInfo() {
    if (!CONFIG.dataLayerEnabled) return {};
    
    return {
      pageTitle: document.title,
      pageLanguage: document.documentElement.lang,
      pageCharset: document.characterSet,
      screenResolution: screen.width + 'x' + screen.height,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  // Store UTM and click ID data in localStorage for session persistence
  function storeTrackingData() {
    const { utm, clickIds } = getUrlParams();
    if (Object.keys(utm).length > 0) {
      localStorage.setItem('tracking_utm', JSON.stringify(utm));
    }
    if (Object.keys(clickIds).length > 0) {
      localStorage.setItem('tracking_click_ids', JSON.stringify(clickIds));
    }
  }

  // Get stored tracking data
  function getStoredTrackingData() {
    const utm = JSON.parse(localStorage.getItem('tracking_utm') || '{}');
    const clickIds = JSON.parse(localStorage.getItem('tracking_click_ids') || '{}');
    return { utm, clickIds };
  }

  // Send tracking data to API
  function track(eventType, data = {}) {
    const sessionId = getSessionId();
    const { utm, clickIds } = getStoredTrackingData();
    const deviceInfo = getDeviceInfo();
    const dataLayerInfo = getDataLayerInfo();

    const trackingData = {
      pixelId: PIXEL_ID,
      sessionId: sessionId,
      eventType: eventType,
      pageUrl: window.location.href,
      referrerUrl: document.referrer,
      utm: utm,
      clickIds: clickIds,
      deviceInfo: deviceInfo,
      dataLayer: dataLayerInfo,
      ...data
    };

    fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trackingData)
    }).catch(err => console.warn('Tracking failed:', err));
  }

  // Check if element matches exclusion selectors
  function isExcluded(element, exclusions) {
    return exclusions.some(selector => {
      try {
        return element.matches(selector) || element.closest(selector);
      } catch (e) {
        return false;
      }
    });
  }

  // Initialize tracking
  function init() {
    storeTrackingData();
    
    // Track page view
    if (CONFIG.autoTrackPageViews) {
      track('page_view', {
        eventName: 'Page View'
      });
    }

    // Track form submissions
    if (CONFIG.autoTrackFormSubmissions) {
      document.addEventListener('submit', function(e) {
        const form = e.target;
        if (form.tagName === 'FORM' && !isExcluded(form, CONFIG.formExclusions)) {
          const formData = new FormData(form);
          const data = {};
          const contactInfo = {};
          
          for (let [key, value] of formData.entries()) {
            data[key] = value;
            
            // Extract contact information
            if (key.toLowerCase().includes('email')) contactInfo.email = value;
            if (key.toLowerCase().includes('phone')) contactInfo.phone = value;
            if (key.toLowerCase().includes('name')) contactInfo.name = value;
          }

          track('form_submission', {
            eventName: 'Form Submission',
            formData: data,
            contactInfo: contactInfo
          });
        }
      });
    }

    // Track purchase intent clicks
    if (CONFIG.autoTrackClicks && CONFIG.purchaseSelectors.length > 0) {
      document.addEventListener('click', function(e) {
        const element = e.target;
        const matchesSelector = CONFIG.purchaseSelectors.some(selector => {
          try {
            return element.matches(selector) || element.closest(selector);
          } catch (err) {
            return false;
          }
        });

        if (matchesSelector) {
          track('click', {
            eventName: 'Purchase Intent Click',
            customData: {
              elementText: element.textContent || element.value,
              elementClass: element.className,
              elementHref: element.href,
              elementId: element.id
            }
          });
        }
      });
    }

    // Track custom events
    CONFIG.customEvents.forEach(customEvent => {
      const eventType = customEvent.eventType === 'hover' ? 'mouseenter' : customEvent.eventType === 'view' ? 'scroll' : 'click';
      
      document.addEventListener(eventType, function(e) {
        try {
          if (e.target.matches(customEvent.selector) || e.target.closest(customEvent.selector)) {
            track('custom_event', {
              eventName: customEvent.name,
              customData: {
                eventType: customEvent.eventType,
                selector: customEvent.selector,
                elementText: e.target.textContent,
                elementClass: e.target.className
              }
            });
          }
        } catch (err) {
          // Ignore invalid selectors
        }
      });
    });
  }

  // Expose global tracking functions
  window.trackEvent = function(eventType, data) {
    track(eventType, data);
  };

  window.trackPurchase = function(amount, currency = 'USD', customerInfo = {}) {
    track('purchase', {
      eventName: 'Purchase',
      revenue: { amount: parseFloat(amount), currency: currency },
      contactInfo: customerInfo
    });
  };

  window.trackSplitTest = function(testName, variant, customData = {}) {
    track('split_test_view', {
      eventName: 'Split Test View',
      customData: {
        testName: testName,
        variant: variant,
        ...customData
      }
    });
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Tracking script copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Tracking Pixel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pixelName">Pixel Name</Label>
              <Input
                id="pixelName"
                value={pixelName}
                onChange={(e) => setPixelName(e.target.value)}
                placeholder="e.g., Main Website Pixel"
              />
            </div>
            <div>
              <Label htmlFor="domains">Allowed Domains (comma-separated)</Label>
              <Input
                id="domains"
                value={domains}
                onChange={(e) => setDomains(e.target.value)}
                placeholder="e.g., yourdomain.com, subdomain.yourdomain.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="pixelId">Pixel ID</Label>
            <div className="flex gap-2">
              <Input
                id="pixelId"
                value={pixelId}
                readOnly
                className="bg-gray-50"
              />
              <Button onClick={generatePixelId} variant="outline">
                Regenerate
              </Button>
            </div>
          </div>

          <Button 
            onClick={() => createPixel.mutate()} 
            disabled={createPixel.isPending || !pixelName.trim()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {createPixel.isPending ? 'Creating...' : 'Create Pixel'}
          </Button>
        </CardContent>
      </Card>

      <PixelConfiguration config={config} onConfigChange={setConfig} />

      <Card>
        <CardHeader>
          <CardTitle>Generated Tracking Script</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Tracking Script</Label>
              <Button
                onClick={() => setShowScript(!showScript)}
                variant="outline"
                size="sm"
              >
                {showScript ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showScript ? 'Hide' : 'Show'} Script
              </Button>
            </div>
            
            {showScript && (
              <div className="relative">
                <Textarea
                  value={generateTrackingScript()}
                  readOnly
                  className="font-mono text-xs h-96 bg-gray-50"
                />
                <Button
                  onClick={() => copyToClipboard(generateTrackingScript())}
                  className="absolute top-2 right-2"
                  size="sm"
                  variant="outline"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Implementation Instructions:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Copy the tracking script above</li>
              <li>2. Paste it in the &lt;head&gt; section of every page you want to track</li>
              <li>3. The script will automatically track based on your configuration settings</li>
              <li>4. Use trackPurchase(amount, currency, customerInfo) to track conversions</li>
              <li>5. Use trackEvent(eventType, data) for additional custom events</li>
              <li>6. Use trackSplitTest(testName, variant) for A/B testing</li>
            </ol>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">Usage Examples:</h4>
            <div className="text-sm text-green-800 space-y-2">
              <div className="font-mono bg-white p-2 rounded">
                trackPurchase(99.99, 'USD', {'{'}email: 'customer@email.com', name: 'John Doe'{'}'});
              </div>
              <div className="font-mono bg-white p-2 rounded">
                trackSplitTest('homepage_hero', 'variant_b');
              </div>
              <div className="font-mono bg-white p-2 rounded">
                trackEvent('button_click', {'{'}buttonName: 'Get Started'{'}'});
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
