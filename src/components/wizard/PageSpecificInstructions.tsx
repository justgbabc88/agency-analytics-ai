
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Globe, ShoppingCart, CheckCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PixelData {
  name: string;
  pixelId: string;
  domains: string;
  config: any;
}

interface PageSpecificInstructionsProps {
  pixelData: PixelData;
}

export const PageSpecificInstructions = ({ pixelData }: PageSpecificInstructionsProps) => {
  const { toast } = useToast();

  const generateScript = (pageType: string) => {
    const supabaseUrl = "https://iqxvtfupjjxjkbajgcve.supabase.co";
    
    const baseScript = `<!-- ${pixelData.name} - ${pageType} Page -->
<script>
(function() {
  const PIXEL_ID = '${pixelData.pixelId}';
  const API_URL = '${supabaseUrl}/functions/v1/track-event';
  const CONFIG = ${JSON.stringify(pixelData.config, null, 2)};
  
  // Session management
  function getSessionId() {
    let sessionId = localStorage.getItem('tracking_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('tracking_session_id', sessionId);
    }
    return sessionId;
  }

  // Track function
  function track(eventType, data = {}) {
    const trackingData = {
      pixelId: PIXEL_ID,
      sessionId: getSessionId(),
      eventType: eventType,
      pageUrl: window.location.href,
      referrerUrl: document.referrer,
      ...data
    };

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackingData)
    }).catch(err => console.warn('Tracking failed:', err));
  }

  // Initialize tracking
  function init() {
    // Track page view
    if (CONFIG.autoTrackPageViews) {
      track('page_view', { eventName: '${pageType} Page View' });
    }
    ${getPageSpecificTracking(pageType)}
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose tracking functions globally
  window.trackEvent = track;
  window.trackPurchase = function(amount, currency = 'USD', customerInfo = {}) {
    track('purchase', {
      eventName: 'Purchase',
      revenue: { amount: parseFloat(amount), currency: currency },
      contactInfo: customerInfo
    });
  };
})();
</script>`;

    return baseScript;
  };

  const getPageSpecificTracking = (pageType: string) => {
    switch (pageType) {
      case 'Landing':
        return `
    // Landing page specific tracking
    document.addEventListener('click', function(e) {
      if (e.target.matches('.cta-button, .sign-up-btn, .get-started')) {
        track('cta_click', { 
          eventName: 'CTA Button Click',
          buttonText: e.target.textContent 
        });
      }
    });`;
      
      case 'Checkout':
        return `
    // Checkout page specific tracking
    if (CONFIG.autoTrackFormSubmissions) {
      document.addEventListener('submit', function(e) {
        const form = e.target;
        if (form.matches('.checkout-form')) {
          const formData = new FormData(form);
          const data = {};
          for (let [key, value] of formData.entries()) {
            data[key] = value;
          }
          track('checkout_attempt', {
            eventName: 'Checkout Form Submission',
            formData: data
          });
        }
      });
    }`;
      
      case 'Thank You':
        return `
    // Thank you page - track conversion
    // Add this manually for each conversion:
    // trackPurchase(orderAmount, 'USD', { email: 'customer@email.com' });
    
    setTimeout(() => {
      track('conversion_page_view', {
        eventName: 'Thank You Page View'
      });
    }, 1000);`;
      
      default:
        return '';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Installation code copied to clipboard",
    });
  };

  const pageTypes = [
    {
      id: 'landing',
      name: 'Landing Page',
      icon: Globe,
      description: 'Main entry point for visitors',
      tracks: ['Page views', 'CTA button clicks', 'Form submissions']
    },
    {
      id: 'checkout',
      name: 'Checkout Page',
      icon: ShoppingCart,
      description: 'Where customers enter payment info',
      tracks: ['Page views', 'Checkout attempts', 'Form submissions']
    },
    {
      id: 'thankyou',
      name: 'Thank You Page',
      icon: CheckCircle,
      description: 'Conversion confirmation page',
      tracks: ['Conversion confirmation', 'Success page views']
    },
    {
      id: 'general',
      name: 'Other Pages',
      icon: FileText,
      description: 'All other website pages',
      tracks: ['Page views', 'General interactions']
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Install on Your Website</h3>
        <p className="text-muted-foreground">
          Copy the code for each page type and paste it in the &lt;head&gt; section of your HTML.
        </p>
      </div>

      <Tabs defaultValue="landing" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {pageTypes.map((pageType) => (
            <TabsTrigger key={pageType.id} value={pageType.id} className="flex items-center gap-1">
              <pageType.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{pageType.name}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {pageTypes.map((pageType) => (
          <TabsContent key={pageType.id} value={pageType.id} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <pageType.icon className="h-5 w-5" />
                  {pageType.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {pageType.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">What this tracks:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {pageType.tracks.map((track, index) => (
                      <li key={index}>• {track}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Installation Code</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(generateScript(pageType.name))}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Code
                    </Button>
                  </div>
                  <Textarea
                    value={generateScript(pageType.name)}
                    readOnly
                    className="font-mono text-xs h-64 bg-muted"
                  />
                </div>

                {pageType.id === 'thankyou' && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Important:</h4>
                    <p className="text-sm text-blue-800">
                      On your thank you page, you need to manually call the purchase tracking function with the actual order details:
                    </p>
                    <code className="block mt-2 p-2 bg-white rounded text-xs">
                      trackPurchase(99.99, 'USD', {'{'}email: 'customer@email.com', name: 'John Doe'{'}'});
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
