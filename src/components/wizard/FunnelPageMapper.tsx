

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Globe, Trash2, Plus } from "lucide-react";

interface FunnelPage {
  id: string;
  name: string;
  url: string;
  type: string;
  events: string[];
}

interface FunnelPageMapperProps {
  onPagesConfigured: (pages: FunnelPage[]) => void;
  initialPages?: FunnelPage[];
  funnelType?: string;
}

export const FunnelPageMapper = ({ 
  onPagesConfigured, 
  initialPages = [],
  funnelType = 'webinar'
}: FunnelPageMapperProps) => {
  const [pages, setPages] = useState<FunnelPage[]>([]);

  useEffect(() => {
    if (initialPages && initialPages.length > 0) {
      setPages(initialPages);
    } else {
      setPages([{
        id: generateId(),
        name: '',
        url: '',
        type: 'landing',
        events: []
      }]);
    }
  }, [initialPages]);

  const generateId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  const addPage = () => {
    setPages(prev => [...prev, {
      id: generateId(),
      name: '',
      url: '',
      type: 'landing',
      events: []
    }]);
  };

  const removePage = (id: string) => {
    setPages(prev => prev.filter(page => page.id !== id));
  };

  const updatePage = (id: string, updates: Partial<FunnelPage>) => {
    setPages(prev => prev.map(page => page.id === id ? { ...page, ...updates } : page));
  };

  const handleSave = () => {
    onPagesConfigured(pages);
  };

  // Define events based on funnel type
  const getEventsForFunnelType = (funnelType: string) => {
    switch (funnelType) {
      case 'webinar':
        return [
          { value: 'page_view', label: 'Page View' },
          { value: 'webinar_registration', label: 'Webinar Registration' },
          { value: 'webinar_attendance', label: 'Webinar Attendance' },
          { value: 'purchase', label: 'Purchase' },
        ];
      case 'book_call':
        return [
          { value: 'page_view', label: 'Page View' },
          { value: 'form_submitted', label: 'Form Submitted' },
          { value: 'call_booked', label: 'Call Booked' },
        ];
      default:
        return [
          { value: 'page_view', label: 'Page View' },
          { value: 'form_submission', label: 'Form Submission' },
          { value: 'purchase', label: 'Purchase' },
        ];
    }
  };

  const availableEvents = getEventsForFunnelType(funnelType);

  // Check if all existing pages have URLs filled in
  const canAddNewPage = pages.every(page => page.url.trim() !== '');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Configure Funnel Pages
        </CardTitle>
        <p className="text-sm text-gray-600">
          Add your funnel pages and select which events to track on each page. Add multiple pages to track your complete funnel flow.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {pages.map((page, index) => (
            <Card key={page.id} className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Page {index + 1}</h4>
                  {pages.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePage(page.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Page Name</Label>
                    <Input
                      value={page.name}
                      onChange={(e) => updatePage(page.id, { name: e.target.value })}
                      placeholder="e.g., Landing Page"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Page Type</Label>
                    <Select
                      value={page.type}
                      onValueChange={(value) => updatePage(page.id, { type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {funnelType === 'webinar' ? (
                          <>
                            <SelectItem value="landing">Landing Page</SelectItem>
                            <SelectItem value="webinar">Webinar Page</SelectItem>
                            <SelectItem value="thankyou">Thank You Page</SelectItem>
                            <SelectItem value="checkout">Checkout Page</SelectItem>
                          </>
                        ) : funnelType === 'book_call' ? (
                          <>
                            <SelectItem value="landing">Landing Page</SelectItem>
                            <SelectItem value="booking">Booking Page</SelectItem>
                            <SelectItem value="thankyou">Thank You Page</SelectItem>
                            <SelectItem value="misc">Misc. Page</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="landing">Landing Page</SelectItem>
                            <SelectItem value="booking">Booking Page</SelectItem>
                            <SelectItem value="thankyou">Thank You Page</SelectItem>
                            <SelectItem value="checkout">Checkout Page</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Page URL</Label>
                  <Input
                    value={page.url}
                    onChange={(e) => updatePage(page.id, { url: e.target.value })}
                    placeholder="https://yourdomain.com/page"
                    className={!page.url.trim() ? "border-orange-300 focus:border-orange-500" : ""}
                  />
                  {!page.url.trim() && (
                    <p className="text-sm text-orange-600">
                      URL is required before adding another page
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Events to Track</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableEvents.map((event) => (
                      <div key={event.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${page.id}-${event.value}`}
                          checked={page.events.includes(event.value)}
                          onCheckedChange={(checked) => {
                            const newEvents = checked
                              ? [...page.events, event.value]
                              : page.events.filter(e => e !== event.value);
                            updatePage(page.id, { events: newEvents });
                          }}
                        />
                        <Label htmlFor={`${page.id}-${event.value}`} className="text-sm">
                          {event.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Prominent Add Page Section */}
        <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
          canAddNewPage 
            ? "border-blue-200 bg-blue-50/50" 
            : "border-gray-200 bg-gray-50/50"
        }`}>
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                canAddNewPage 
                  ? "bg-blue-100" 
                  : "bg-gray-100"
              }`}>
                <Plus className={`h-6 w-6 ${
                  canAddNewPage 
                    ? "text-blue-600" 
                    : "text-gray-400"
                }`} />
              </div>
            </div>
            <div>
              <h4 className={`font-medium ${
                canAddNewPage 
                  ? "text-blue-900" 
                  : "text-gray-600"
              }`}>
                Add Another Page
              </h4>
              <p className={`text-sm mt-1 ${
                canAddNewPage 
                  ? "text-blue-700" 
                  : "text-gray-500"
              }`}>
                {canAddNewPage 
                  ? "Track your complete funnel by adding all your pages (landing, thank you, checkout, etc.)"
                  : "Please add URLs to all existing pages before adding another page"
                }
              </p>
            </div>
            <Button
              type="button"
              onClick={addPage}
              disabled={!canAddNewPage}
              className={canAddNewPage 
                ? "bg-blue-600 hover:bg-blue-700 text-white" 
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }
              size="lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Page
            </Button>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} size="lg" className="min-w-[150px]">
            Save Configuration ({pages.length} page{pages.length !== 1 ? 's' : ''})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

