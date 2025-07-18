import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";

interface PageViewFilterProps {
  trackingEvents: any[];
  onFilterChange: (enabledPages: string[]) => void;
}

export const PageViewFilter = ({ trackingEvents, onFilterChange }: PageViewFilterProps) => {
  // Get unique page URLs from tracking events
  const uniquePages = Array.from(
    new Set(trackingEvents.map(event => event.page_url))
  ).sort();

  // State to track which pages are enabled (all enabled by default)
  const [enabledPages, setEnabledPages] = useState<Record<string, boolean>>({});

  // Initialize all pages as enabled when unique pages change
  useEffect(() => {
    const initialState = uniquePages.reduce((acc, page) => {
      acc[page] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setEnabledPages(initialState);
  }, [uniquePages.join(',')]);

  // Call parent callback when enabled pages change
  useEffect(() => {
    const enabled = Object.keys(enabledPages).filter(page => enabledPages[page]);
    onFilterChange(enabled);
  }, [enabledPages, onFilterChange]);

  const handleToggle = (pageUrl: string, enabled: boolean) => {
    setEnabledPages(prev => ({
      ...prev,
      [pageUrl]: enabled
    }));
  };

  if (uniquePages.length === 0) {
    return null;
  }

  // Helper function to get a clean page name from URL
  const getPageName = (url: string) => {
    try {
      const urlObj = new URL(url);
      let path = urlObj.pathname;
      if (path === '/') return 'Homepage';
      return path.replace(/^\//, '').replace(/\/$/, '') || 'Unknown Page';
    } catch {
      return url.length > 30 ? url.substring(0, 30) + '...' : url;
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Connected Pages</h3>
      <div className="flex flex-wrap gap-4">
        {uniquePages.map((pageUrl) => (
          <div key={pageUrl} className="flex items-center space-x-3 bg-card border rounded-lg px-4 py-3">
            <div className="flex-1 min-w-0">
              <Label htmlFor={`page-${pageUrl}`} className="text-sm font-medium cursor-pointer">
                {getPageName(pageUrl)}
              </Label>
              <p className="text-xs text-muted-foreground">page view</p>
            </div>
            <Switch
              id={`page-${pageUrl}`}
              checked={enabledPages[pageUrl] || false}
              onCheckedChange={(checked) => handleToggle(pageUrl, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};