
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Globe, ShoppingCart, CheckCircle, FileText, AlertTriangle } from "lucide-react";
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
    // IMPORTANT: You MUST manually call trackPurchase() with the actual order details
    // Example: trackPurchase(orderAmount, 'USD', { email: 'customer@email.com' });
    
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
      tracks: ['Conversion confirmation', 'Success page views', 'Purchase tracking']
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

      {/* Critical Purchase Tracking Alert */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <AlertTriangle className="h-5 w-5" />
            Important: Purchase Tracking Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-orange-800">
            <strong>To track actual purchases and revenue, you MUST manually call the trackPurchase function on your thank you/confirmation page.</strong>
          </p>
          <div className="bg-white p-3 rounded border">
            <p className="text-xs text-gray-600 mb-2">Add this code after a successful purchase:</p>
            <code className="text-sm font-mono bg-gray-100 p-2 rounded block">
              trackPurchase(99.99, 'USD', {'{'}email: 'customer@email.com', name: 'John Doe'{'}'});
            </code>
          </div>
          <p className="text-xs text-orange-700">
            Without this manual call, we can only track purchase intent (button clicks, form submissions) but not actual confirmed revenue.
          </p>
        </CardContent>
      </Card>

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
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Critical: Manual Purchase Tracking Required
                      </h4>
                      <p className="text-sm text-red-800 mb-3">
                        The script above only tracks that someone visited your thank you page. To track actual revenue and customer data, you <strong>MUST</strong> manually add the purchase tracking call.
                      </p>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-red-900">Add this line after a successful purchase:</p>
                        <code className="block p-3 bg-white rounded text-sm border">
                          trackPurchase(orderAmount, 'USD', {'{'}email: customerEmail, name: customerName{'}'});
                        </code>
                        <p className="text-xs text-red-700">
                          Replace 'orderAmount', 'customerEmail', and 'customerName' with actual values from your order.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Implementation Examples:</h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="font-medium text-blue-800">PHP Example:</p>
                          <code className="block p-2 bg-white rounded text-xs mt-1">
                            {`<script>
  trackPurchase(<?php echo $order_total; ?>, 'USD', {
    email: '<?php echo $customer_email; ?>',
    name: '<?php echo $customer_name; ?>'
  });
</script>`}
                          </code>
                        </div>
                        <div>
                          <p className="font-medium text-blue-800">JavaScript Example:</p>
                          <code className="block p-2 bg-white rounded text-xs mt-1">
                            {`// After successful Stripe payment
trackPurchase(paymentIntent.amount / 100, 'USD', {
  email: customer.email,
  name: customer.name
});`}
                          </code>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {pageType.id === 'checkout' && (
                  <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-yellow-900 mb-2">Note about Checkout Tracking:</h4>
                    <p className="text-sm text-yellow-800">
                      This page tracks checkout attempts (when forms are submitted), but not successful purchases. Actual purchase tracking happens on your thank you page using the trackPurchase() function.
                    </p>
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
