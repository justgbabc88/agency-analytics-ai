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
    
    const getPageLoadEvents = (events: string[]) => {
      let trackingCode = '';
      
      // Fire all events immediately on page load
      events.forEach(eventType => {
        switch (eventType) {
          case 'page_view':
            trackingCode += `
    // Track page view immediately
    track('page_view', { eventName: '${page.name} - Page View' });`;
            break;
            
          case 'form_submission':
            trackingCode += `
    // Track form submission event immediately (simulating form interaction)
    track('form_submission', { 
      eventName: '${page.name} - Form Submission',
      formData: { page: '${page.name}', type: 'simulated' }
    });`;
            break;
            
          case 'webinar_registration':
            trackingCode += `
    // Track webinar registration immediately
    track('webinar_registration', {
      eventName: '${page.name} - Webinar Registration',
      webinarName: '${page.name} Webinar',
      contactInfo: { source: 'page_visit' }
    });`;
            break;
            
          case 'call_booking':
            trackingCode += `
    // Track call booking immediately
    track('call_booking', {
      eventName: '${page.name} - Call Booking',
      appointmentType: '${page.name} Appointment',
      contactInfo: { source: 'page_visit' }
    });`;
            break;
            
          case 'purchase':
            trackingCode += `
    // Track purchase event immediately (for testing purposes)
    track('purchase', {
      eventName: '${page.name} - Purchase',
      revenue: { amount: 99.99, currency: 'USD' },
      contactInfo: { source: 'page_visit' }
    });`;
            break;
            
          default:
            trackingCode += `
    // Track custom event immediately
    track('${eventType}', { eventName: '${page.name} - ${eventType}' });`;
            break;
        }
      });
      
      return trackingCode;
    };

    return `<!-- ${page.name} Tracking Code -->
<script>
(function() {
  const PIXEL_ID = '${pixelData.pixelId}';
  const API_URL = '${supabaseUrl}/functions/v1/track-event';
  
  console.log('Initializing tracking for ${page.name} with pixel:', PIXEL_ID);
  
  function getSessionId() {
    let sessionId = localStorage.getItem('tracking_session_id');
    if (!sessionId) {
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('tracking_session_id', sessionId);
      console.log('Created new session ID:', sessionId);
    }
    return sessionId;
  }

  function track(eventType, data = {}) {
    const trackingData = {
      pixelId: PIXEL_ID,
      sessionId: getSessionId(),
      eventType: eventType,
      pageUrl: window.location.href,
      referrerUrl: document.referrer,
      timestamp: new Date().toISOString(),
      ...data
    };

    console.log('Tracking event on ${page.name}:', trackingData);

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackingData)
    }).then(response => {
      if (response.ok) {
        console.log('Successfully tracked ${page.name} event:', eventType);
        return response.json();
      } else {
        console.error('Failed to track ${page.name} event:', response.status, response.statusText);
        return response.text().then(text => {
          console.error('Error details:', text);
        });
      }
    }).catch(err => {
      console.error('Tracking failed for ${page.name}:', err);
    });
  }

  function init() {
    console.log('Initializing tracking for ${page.name}');
    
    // Fire all configured events immediately on page load
    ${getPageLoadEvents(page.events || [])}
    
    console.log('${page.name} tracking initialization complete');
  }

  // Initialize immediately when script loads
  init();

  // Make tracking function globally available for manual testing
  window.trackEvent = track;
  
  // Debug function to test tracking
  window.testTracking = function() {
    console.log('Testing tracking for ${page.name}');
    track('test_event', { eventName: '${page.name} - Manual Test' });
  };
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
        <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
          <p className="text-sm text-green-800 font-medium">
            ✅ Simplified Mode: All events will fire immediately when someone visits the page
          </p>
        </div>
      </div>

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
                    <Badge variant="secondary">Auto-Fire Events</Badge>
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
                  <h4 className="font-medium mb-2">Events triggered on page load:</h4>
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

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">🎯 Simplified Tracking</h4>
                  <p className="text-sm text-blue-800">
                    This code will fire all configured events immediately when someone visits the page. 
                    Perfect for testing and ensuring events are captured reliably.
                  </p>
                </div>
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
            <p>2. Events will fire automatically when someone visits each page</p>
            <p>3. Check the verification step to see events appearing immediately</p>
            <p>4. All configured events will trigger on page load for reliable tracking</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
