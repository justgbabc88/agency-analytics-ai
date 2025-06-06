
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Globe, ShoppingCart, Calendar, Video, CheckCircle, FileText } from "lucide-react";

interface FunnelPage {
  id: string;
  name: string;
  url: string;
  type: 'landing' | 'checkout' | 'thankyou' | 'webinar' | 'booking' | 'general';
  events: string[];
}

interface FunnelPageMapperProps {
  onPagesConfigured: (pages: FunnelPage[]) => void;
}

export const FunnelPageMapper = ({ onPagesConfigured }: FunnelPageMapperProps) => {
  const [pages, setPages] = useState<FunnelPage[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const pageTypeOptions = [
    {
      type: 'landing' as const,
      name: 'Landing Page',
      icon: Globe,
      description: 'Where visitors first arrive (homepage, sales page)',
      defaultEvents: ['page_view', 'form_submission', 'button_click']
    },
    {
      type: 'checkout' as const,
      name: 'Checkout Page',
      icon: ShoppingCart,
      description: 'Where customers enter payment information',
      defaultEvents: ['page_view', 'checkout_start', 'form_submission']
    },
    {
      type: 'thankyou' as const,
      name: 'Thank You Page',
      icon: CheckCircle,
      description: 'Confirmation page after purchase/signup',
      defaultEvents: ['page_view', 'purchase', 'conversion']
    },
    {
      type: 'webinar' as const,
      name: 'Webinar Registration',
      icon: Video,
      description: 'Page to register for webinars/events',
      defaultEvents: ['page_view', 'webinar_registration', 'form_submission']
    },
    {
      type: 'booking' as const,
      name: 'Call Booking Page',
      icon: Calendar,
      description: 'Page with calendar booking widget',
      defaultEvents: ['page_view', 'call_booking', 'form_submission']
    },
    {
      type: 'general' as const,
      name: 'Other Page',
      icon: FileText,
      description: 'Any other important page',
      defaultEvents: ['page_view', 'form_submission']
    }
  ];

  const addPage = (pageType: typeof pageTypeOptions[0]) => {
    const newPage: FunnelPage = {
      id: `page_${Date.now()}`,
      name: '',
      url: '',
      type: pageType.type,
      events: pageType.defaultEvents
    };
    setPages([...pages, newPage]);
    setIsAdding(false);
  };

  const updatePage = (pageId: string, updates: Partial<FunnelPage>) => {
    setPages(pages.map(page => 
      page.id === pageId ? { ...page, ...updates } : page
    ));
  };

  const removePage = (pageId: string) => {
    setPages(pages.filter(page => page.id !== pageId));
  };

  const toggleEvent = (pageId: string, event: string) => {
    const page = pages.find(p => p.id === pageId);
    if (!page) return;

    const newEvents = page.events.includes(event)
      ? page.events.filter(e => e !== event)
      : [...page.events, event];

    updatePage(pageId, { events: newEvents });
  };

  const getPageTypeInfo = (type: string) => {
    return pageTypeOptions.find(opt => opt.type === type);
  };

  const eventDescriptions = {
    page_view: 'Track when someone visits this page',
    form_submission: 'Track when forms are submitted',
    button_click: 'Track clicks on important buttons',
    checkout_start: 'Track when checkout process begins',
    purchase: 'Track completed purchases (REVENUE TRACKING)',
    conversion: 'Track successful conversions',
    webinar_registration: 'Track webinar signups',
    call_booking: 'Track booked calls/appointments'
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Tell Us About Your Funnel Pages</h3>
        <p className="text-muted-foreground">
          We'll create the perfect tracking code for each page in your funnel.
        </p>
      </div>

      {/* Added Pages */}
      <div className="space-y-4">
        {pages.map((page) => {
          const pageTypeInfo = getPageTypeInfo(page.type);
          if (!pageTypeInfo) return null;
          
          return (
            <Card key={page.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <pageTypeInfo.icon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{pageTypeInfo.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePage(page.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`name-${page.id}`}>Page Name</Label>
                    <Input
                      id={`name-${page.id}`}
                      value={page.name}
                      onChange={(e) => updatePage(page.id, { name: e.target.value })}
                      placeholder="e.g., Main Sales Page"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`url-${page.id}`}>Page URL (optional)</Label>
                    <Input
                      id={`url-${page.id}`}
                      value={page.url}
                      onChange={(e) => updatePage(page.id, { url: e.target.value })}
                      placeholder="e.g., https://yoursite.com/sales"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">What to track on this page:</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {Object.entries(eventDescriptions).map(([event, description]) => (
                      <div key={event} className="flex items-start space-x-2">
                        <Checkbox
                          id={`${page.id}-${event}`}
                          checked={page.events.includes(event)}
                          onCheckedChange={() => toggleEvent(page.id, event)}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor={`${page.id}-${event}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            {event === 'purchase' && <Badge variant="destructive" className="ml-2 text-xs">Important</Badge>}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Add Page Section */}
      {!isAdding ? (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center">
              <Button onClick={() => setIsAdding(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add a Page to Track
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              What type of page do you want to add?
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pageTypeOptions.map((pageType) => (
                <Card
                  key={pageType.type}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => addPage(pageType)}
                >
                  <CardContent className="p-4 text-center">
                    <pageType.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h4 className="font-medium mb-1">{pageType.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {pageType.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {pages.length > 0 && (
        <div className="flex justify-end">
          <Button 
            onClick={() => onPagesConfigured(pages)}
            size="lg"
            disabled={pages.some(page => !page.name.trim())}
          >
            Generate Tracking Codes
          </Button>
        </div>
      )}
    </div>
  );
};
