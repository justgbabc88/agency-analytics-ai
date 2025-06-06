import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Globe, ShoppingCart, Calendar, Video, CheckCircle, FileText, Edit, ExternalLink } from "lucide-react";

interface FunnelPage {
  id: string;
  name: string;
  url: string;
  type: 'landing' | 'checkout' | 'thankyou' | 'webinar' | 'booking' | 'general';
  events: string[];
}

interface FunnelPageMapperProps {
  onPagesConfigured: (pages: FunnelPage[]) => void;
  initialPages?: FunnelPage[];
}

export const FunnelPageMapper = ({ onPagesConfigured, initialPages = [] }: FunnelPageMapperProps) => {
  const [pages, setPages] = useState<FunnelPage[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  useEffect(() => {
    if (initialPages.length > 0) {
      setPages(initialPages);
    }
  }, [initialPages]);

  const pageTypeOptions = [
    {
      type: 'landing' as const,
      name: 'Landing Page',
      icon: Globe,
      description: 'Where visitors first arrive (homepage, sales page)',
      defaultEvents: ['page_view', 'form_submission']
    },
    {
      type: 'checkout' as const,
      name: 'Checkout Page',
      icon: ShoppingCart,
      description: 'Where customers enter payment information',
      defaultEvents: ['page_view', 'form_submission']
    },
    {
      type: 'thankyou' as const,
      name: 'Thank You Page',
      icon: CheckCircle,
      description: 'Confirmation page after purchase/signup',
      defaultEvents: ['page_view', 'purchase']
    },
    {
      type: 'webinar' as const,
      name: 'Webinar Registration',
      icon: Video,
      description: 'Page to register for webinars/events',
      defaultEvents: ['page_view', 'form_submission']
    },
    {
      type: 'booking' as const,
      name: 'Call Booking Page',
      icon: Calendar,
      description: 'Page with calendar booking widget',
      defaultEvents: ['page_view', 'form_submission']
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
    setEditingPageId(newPage.id);
    setIsAdding(false);
  };

  const updatePage = (pageId: string, updates: Partial<FunnelPage>) => {
    setPages(pages.map(page => 
      page.id === pageId ? { ...page, ...updates } : page
    ));
  };

  const removePage = (pageId: string) => {
    setPages(pages.filter(page => page.id !== pageId));
    if (editingPageId === pageId) {
      setEditingPageId(null);
    }
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
    form_submission: 'Track registration attempts (when forms are submitted)',
    purchase: 'Track completed purchases (REVENUE TRACKING)',
    webinar_registration: 'Track confirmed webinar registrations (use on thank you page)',
    call_booking: 'Track confirmed appointment bookings (use on thank you page)'
  };

  const savePageEditing = (pageId: string) => {
    const page = pages.find(p => p.id === pageId);
    if (page && page.name.trim() && page.url.trim()) {
      setEditingPageId(null);
    }
  };

  const isPageValid = (page: FunnelPage) => {
    return page.name.trim() && page.url.trim();
  };

  const allPagesValid = pages.length > 0 && pages.every(isPageValid);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Tell Us About Your Funnel Pages</h3>
        <p className="text-muted-foreground">
          Add each page in your funnel to generate the perfect tracking code.
        </p>
      </div>

      {/* Added Pages Display */}
      {pages.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium">Your Funnel Pages</h4>
          {pages.map((page) => {
            const pageTypeInfo = getPageTypeInfo(page.type);
            if (!pageTypeInfo) return null;
            
            const isEditing = editingPageId === page.id;
            
            return (
              <Card key={page.id} className={`relative ${!isPageValid(page) ? 'border-orange-200 bg-orange-50' : ''}`}>
                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <pageTypeInfo.icon className="h-4 w-4 text-primary" />
                      <CardTitle className="text-sm">{pageTypeInfo.name}</CardTitle>
                      {isPageValid(page) && <Badge variant="secondary" className="text-xs px-2 py-0">Ready</Badge>}
                      {!isPageValid(page) && <Badge variant="destructive" className="text-xs px-2 py-0">Incomplete</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      {!isEditing && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setEditingPageId(page.id)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => removePage(page.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {isEditing ? (
                  <CardContent className="space-y-3 pt-0 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`name-${page.id}`} className="text-xs font-medium">Page Name *</Label>
                        <Input
                          id={`name-${page.id}`}
                          value={page.name}
                          onChange={(e) => updatePage(page.id, { name: e.target.value })}
                          placeholder="e.g., Main Sales Page"
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`url-${page.id}`} className="text-xs font-medium">Page URL *</Label>
                        <Input
                          id={`url-${page.id}`}
                          value={page.url}
                          onChange={(e) => updatePage(page.id, { url: e.target.value })}
                          placeholder="e.g., https://yoursite.com/sales"
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-medium">What to track on this page:</Label>
                      <div className="grid grid-cols-1 gap-2 mt-2">
                        {Object.entries(eventDescriptions).map(([event, description]) => {
                          // Show specific events based on page type
                          const shouldShow = 
                            event === 'page_view' || 
                            event === 'form_submission' ||
                            (event === 'purchase' && page.type === 'thankyou') ||
                            (event === 'webinar_registration' && page.type === 'thankyou') ||
                            (event === 'call_booking' && page.type === 'thankyou');
                          
                          if (!shouldShow) return null;

                          return (
                            <div key={event} className="flex items-start space-x-2">
                              <Checkbox
                                id={`${page.id}-${event}`}
                                checked={page.events.includes(event)}
                                onCheckedChange={() => toggleEvent(page.id, event)}
                                className="mt-0.5"
                              />
                              <div className="grid gap-1 leading-none">
                                <label
                                  htmlFor={`${page.id}-${event}`}
                                  className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                  {(event === 'purchase' || event === 'webinar_registration' || event === 'call_booking') && 
                                    <Badge variant="destructive" className="ml-2 text-xs px-1 py-0">Manual Setup</Badge>
                                  }
                                </label>
                                <p className="text-xs text-muted-foreground">
                                  {description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button size="sm" className="h-7 text-xs" onClick={() => savePageEditing(page.id)} disabled={!page.name.trim() || !page.url.trim()}>
                        Save Page
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="pt-0 pb-2">
                    <div className="space-y-2">
                      <div className="text-xs">
                        <span className="font-medium">Name:</span> {page.name || 'Not set'}
                      </div>
                      {page.url && (
                        <div className="text-xs">
                          <span className="font-medium">URL:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <a 
                              href={page.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline text-xs truncate flex-1"
                              title={page.url}
                            >
                              {page.url}
                            </a>
                            <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          </div>
                        </div>
                      )}
                      {!page.url && (
                        <div className="text-xs">
                          <span className="font-medium">URL:</span> Not set
                        </div>
                      )}
                      <div className="text-xs">
                        <span className="font-medium">Tracking:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {page.events.map((event) => (
                            <Badge key={event} variant="outline" className="text-xs px-1 py-0">
                              {event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Page Section */}
      {!isAdding ? (
        <Card className="border-dashed">
          <CardContent className="pt-4 pb-4">
            <div className="text-center">
              <Button onClick={() => setIsAdding(true)} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add a Page to Track
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              What type of page do you want to add?
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setIsAdding(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pageTypeOptions.map((pageType) => (
                <Card
                  key={pageType.type}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => addPage(pageType)}
                >
                  <CardContent className="p-3 text-center">
                    <pageType.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <h4 className="font-medium mb-1 text-sm">{pageType.name}</h4>
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

      {allPagesValid && (
        <div className="flex justify-end">
          <Button 
            onClick={() => onPagesConfigured(pages)}
            size="lg"
          >
            Generate Tracking Codes
          </Button>
        </div>
      )}
    </div>
  );
};
