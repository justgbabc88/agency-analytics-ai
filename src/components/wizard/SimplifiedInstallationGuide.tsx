
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Copy, AlertTriangle, CheckCircle, Globe, ShoppingCart, Calendar, Video, FileText, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FunnelPage {
  id: string;
  name: string;
  url: string;
  type: 'landing' | 'checkout' | 'thankyou' | 'webinar' | 'booking' | 'general';
  events: string[];
}

interface PixelData {
  name: string;
  pixelId: string;
  domains: string;
}

interface SimplifiedInstallationGuideProps {
  pixelData: PixelData;
  funnelPages: FunnelPage[];
}

export const SimplifiedInstallationGuide = ({ pixelData, funnelPages }: SimplifiedInstallationGuideProps) => {
  const { toast } = useToast();

  const generatePageScript = (page: FunnelPage) => {
    const supabaseUrl = "https://iqxvtfupjjxjkbajgcve.supabase.co";
    
    const getTrackingEvents = (events: string[]) => {
      let trackingCode = '';
      
      if (events.includes('form_submission')) {
        trackingCode += `
    // Track form submissions (registration attempts)
    document.addEventListener('submit', function(e) {
      const form = e.target;
      const formData = new FormData(form);
      const data = {};
      for (let [key, value] of formData.entries()) {
        if (!key.toLowerCase().includes('password')) {
          data[key] = value;
        }
      }
      track('form_submission', {
        eventName: '${page.name} - Form Submission',
        formData: data
      });
    });`;
      }

      if (events.includes('webinar_registration')) {
        trackingCode += `
    // Track confirmed webinar registration (call this after successful registration)
    window.trackWebinarRegistration = function(webinarName, userEmail, userName) {
      track('webinar_registration', {
        eventName: 'Webinar Registration Confirmed',
        webinarName: webinarName,
        contactInfo: { email: userEmail, name: userName }
      });
    };`;
      }

      if (events.includes('call_booking')) {
        trackingCode += `
    // Track confirmed call booking (call this after successful booking)
    window.trackCallBooking = function(appointmentType, userEmail, userName) {
      track('call_booking', {
        eventName: 'Call Booking Confirmed',
        appointmentType: appointmentType,
        contactInfo: { email: userEmail, name: userName }
      });
    };`;
      }

      if (events.includes('purchase')) {
        trackingCode += `
    // IMPORTANT: Track confirmed purchases - you MUST call this manually after successful payment
    // Example: trackPurchase(99.99, 'USD', { email: 'customer@email.com', name: 'John Doe' });
    window.trackPurchase = function(amount, currency = 'USD', customerInfo = {}) {
      track('purchase', {
        eventName: 'Purchase Completed',
        revenue: { amount: parseFloat(amount), currency: currency },
        contactInfo: customerInfo
      });
    };`;
      }

      return trackingCode;
    };

    return `<!-- ${pixelData.name} - ${page.name} -->
<script>
(function() {
  const PIXEL_ID = '${pixelData.pixelId}';
  const API_URL = '${supabaseUrl}/functions/v1/track-event';
  
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
  function init() {${page.events.includes('page_view') ? `
    // Track page view
    track('page_view', { eventName: '${page.name} - Page View' });` : ''}
    ${getTrackingEvents(page.events)}
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose tracking functions globally
  window.trackEvent = track;
})();
</script>`;
  };

  const copyToClipboard = (text: string, pageName: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${pageName} tracking code copied to clipboard`,
    });
  };

  const getPageIcon = (type: string) => {
    switch (type) {
      case 'landing': return Globe;
      case 'checkout': return ShoppingCart;
      case 'thankyou': return CheckCircle;
      case 'webinar': return Video;
      case 'booking': return Calendar;
      default: return FileText;
    }
  };

  const needsManualSetup = (events: string[]) => {
    return events.includes('purchase') || events.includes('webinar_registration') || events.includes('call_booking');
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Your Custom Tracking Codes</h3>
        <p className="text-muted-foreground">
          Copy and paste each code into the &lt;head&gt; section of the corresponding page.
        </p>
      </div>

      {/* Webinar Tracking Strategy Explanation */}
      {funnelPages.some(page => page.type === 'webinar') && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Info className="h-5 w-5" />
              Webinar Tracking Strategy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-blue-800">
              <strong>Best Practice:</strong> Use a two-step tracking approach for webinars:
            </p>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="bg-white p-3 rounded border">
                <p className="font-medium">1. Registration Page: Track form_submission</p>
                <p className="text-xs">Captures registration attempts (when someone submits the form)</p>
              </div>
              <div className="bg-white p-3 rounded border">
                <p className="font-medium">2. Thank You Page: Track webinar_registration</p>
                <p className="text-xs">Confirms successful registration (only counts completed registrations)</p>
              </div>
            </div>
            <p className="text-xs text-blue-700">
              This gives you conversion rates between attempts and successful registrations.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Important Revenue Tracking Alert */}
      {funnelPages.some(page => page.events.includes('purchase')) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Critical: Revenue Tracking Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-red-800">
              <strong>To track actual sales revenue, you MUST manually call the trackPurchase function after successful payments.</strong>
            </p>
            <div className="bg-white p-3 rounded border">
              <p className="text-xs text-gray-600 mb-2">Add this code after successful payment processing:</p>
              <code className="text-sm font-mono bg-gray-100 p-2 rounded block">
                trackPurchase(orderTotal, 'USD', {'{'}email: customerEmail, name: customerName{'}'});
              </code>
            </div>
            <p className="text-xs text-red-700">
              Replace orderTotal, customerEmail, and customerName with actual values from your order system.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Page-specific codes */}
      <div className="space-y-6">
        {funnelPages.map((page) => {
          const PageIcon = getPageIcon(page.type);
          const script = generatePageScript(page);
          
          return (
            <Card key={page.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PageIcon className="h-5 w-5 text-primary" />
                    <CardTitle>{page.name}</CardTitle>
                    {needsManualSetup(page.events) && (
                      <Badge variant="destructive">Requires Manual Setup</Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(script, page.name)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Code
                  </Button>
                </div>
                {page.url && (
                  <p className="text-sm text-muted-foreground">
                    URL: {page.url}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">What this tracks:</h4>
                  <div className="flex flex-wrap gap-2">
                    {page.events.map((event) => (
                      <Badge key={event} variant="secondary">
                        {event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Installation Code</h4>
                  <Textarea
                    value={script}
                    readOnly
                    className="font-mono text-xs h-48 bg-muted"
                  />
                </div>

                {/* Special instructions for manual setup pages */}
                {page.events.includes('purchase') && (
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-2">⚠️ Manual Setup Required</h4>
                    <p className="text-sm text-orange-800 mb-2">
                      After installing the code above, you need to call the trackPurchase function when a payment is successful:
                    </p>
                    <code className="block p-2 bg-white rounded text-sm border">
                      trackPurchase(orderAmount, 'USD', {'{'}email: customerEmail, name: customerName{'}'});
                    </code>
                  </div>
                )}

                {page.events.includes('webinar_registration') && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">📹 Webinar Registration Setup</h4>
                    <p className="text-sm text-blue-800 mb-2">
                      Call this function after successful webinar registration (on thank you page):
                    </p>
                    <code className="block p-2 bg-white rounded text-sm border">
                      trackWebinarRegistration('Webinar Name', 'user@email.com', 'John Doe');
                    </code>
                    <p className="text-xs text-blue-700 mt-2">
                      This should be separate from form_submission tracking on your registration page.
                    </p>
                  </div>
                )}

                {page.events.includes('call_booking') && (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">📞 Call Booking Setup</h4>
                    <p className="text-sm text-green-800 mb-2">
                      Call this function after successful appointment booking (on thank you page):
                    </p>
                    <code className="block p-2 bg-white rounded text-sm border">
                      trackCallBooking('Sales Call', 'user@email.com', 'John Doe');
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-green-800">
            <p>1. Copy each code and paste it in the &lt;head&gt; section of the corresponding page</p>
            <p>2. For webinars: form_submission tracks on registration page, webinar_registration tracks on thank you page</p>
            <p>3. For purchases and bookings: implement the manual tracking calls as shown</p>
            <p>4. Test your tracking by visiting your pages and checking the verification step</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
