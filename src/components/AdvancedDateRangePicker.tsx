
import React, { useState, useEffect } from "react";
import { CalendarIcon, X } from "lucide-react";
import { format, subDays, subWeeks, subMonths, startOfWeek, startOfMonth, startOfYear, startOfDay, endOfDay, addDays } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useUserProfile } from "@/hooks/useUserProfile";

interface AdvancedDateRangePickerProps {
  onDateChange: (from: Date, to: Date) => void;
  className?: string;
}

export const AdvancedDateRangePicker = ({ onDateChange, className }: AdvancedDateRangePickerProps) => {
  const { getUserTimezone } = useUserProfile();
  const userTimezone = getUserTimezone();

  // Create timezone-aware date ranges
  const createDateRangeInUserTimezone = (fromDate: Date, toDate: Date) => {
    // The calendar returns dates in local time
    // We need to create the start/end of day in the user's actual timezone
    // First, get the date components (year, month, day) from the selected dates
    const fromYear = fromDate.getFullYear();
    const fromMonth = fromDate.getMonth();
    const fromDay = fromDate.getDate();
    
    const toYear = toDate.getFullYear();
    const toMonth = toDate.getMonth();
    const toDay = toDate.getDate();
    
    // Create new Date objects for start/end of day in user's timezone
    const fromStartOfDay = new Date(fromYear, fromMonth, fromDay, 0, 0, 0, 0);
    const toEndOfDay = new Date(toYear, toMonth, toDay, 23, 59, 59, 999);
    
    return { from: fromStartOfDay, to: toEndOfDay };
  };

  // Quick preset buttons for easy access
  const quickPresets = [
    { 
      label: "Today", 
      value: "today", 
      getDates: () => {
        const now = new Date();
        return createDateRangeInUserTimezone(now, now);
      }
    },
    { 
      label: "Yesterday", 
      value: "yesterday", 
      getDates: () => {
        const yesterday = subDays(new Date(), 1);
        return createDateRangeInUserTimezone(yesterday, yesterday);
      }
    },
    { 
      label: "Last 7 days", 
      value: "7days", 
      getDates: () => createDateRangeInUserTimezone(subDays(new Date(), 6), new Date())
    },
    { 
      label: "Last 30 days", 
      value: "30days", 
      getDates: () => createDateRangeInUserTimezone(subDays(new Date(), 29), new Date())
    },
  ];

  const [dateRange, setDateRange] = useState(() => {
    const initial = createDateRangeInUserTimezone(subDays(new Date(), 29), new Date());
    return initial;
  });
  const [selectedPreset, setSelectedPreset] = useState("30days");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Re-initialize date range when user timezone changes
  useEffect(() => {
    console.log('📅 User timezone changed, re-initializing date range:', userTimezone);
    const initial = createDateRangeInUserTimezone(subDays(new Date(), 29), new Date());
    setDateRange(initial);
    onDateChange(initial.from, initial.to);
  }, [userTimezone]);

  const handlePresetClick = (preset: any) => {
    console.log('📅 Preset clicked:', preset.label);
    setSelectedPreset(preset.value);
    const dates = preset.getDates();
    setDateRange(dates);
    onDateChange(dates.from, dates.to);
  };

  const handleCustomDateChange = (range: any) => {
    console.log('📅 Custom date range selected:', range);
    
    if (range?.from) {
      // If only from date is selected or both dates are the same, create single day range
      const toDate = range.to || range.from;
      const dates = createDateRangeInUserTimezone(range.from, toDate);
      
      setDateRange(dates);
      onDateChange(dates.from, dates.to);
      setSelectedPreset("custom");
      
      // Close calendar if we have a complete selection
      if (range.to || !range.to) {
        setIsCalendarOpen(false);
      }
    }
  };

  const formatDateRange = () => {
    if (!dateRange.from) return "Select date range";
    
    const fromFormatted = format(toZonedTime(dateRange.from, userTimezone), "MMM d");
    const toFormatted = format(toZonedTime(dateRange.to, userTimezone), "MMM d, yyyy");
    
    // Check if it's the same day
    const isSameDay = format(toZonedTime(dateRange.from, userTimezone), "yyyy-MM-dd") === 
                     format(toZonedTime(dateRange.to, userTimezone), "yyyy-MM-dd");
    
    if (isSameDay) {
      return format(toZonedTime(dateRange.from, userTimezone), "MMM d, yyyy");
    }
    
    return `${fromFormatted} - ${toFormatted}`;
  };

  const clearSelection = () => {
    const initial = createDateRangeInUserTimezone(subDays(new Date(), 29), new Date());
    setDateRange(initial);
    setSelectedPreset("30days");
    onDateChange(initial.from, initial.to);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Quick preset buttons */}
      <div className="flex flex-wrap gap-2">
        {quickPresets.map((preset) => (
          <Badge
            key={preset.value}
            variant={selectedPreset === preset.value ? "default" : "outline"}
            className="cursor-pointer hover:bg-accent"
            onClick={() => handlePresetClick(preset)}
          >
            {preset.label}
          </Badge>
        ))}
      </div>

      {/* Custom date picker and current selection */}
      <div className="flex items-center gap-2">
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal min-w-[250px]",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4 border-b">
              <h4 className="font-medium text-sm mb-2">Select Date Range</h4>
              <p className="text-xs text-muted-foreground">
                Click one date for single day, or click and drag for range
              </p>
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={{
                from: dateRange?.from,
                to: dateRange?.to,
              }}
              onSelect={handleCustomDateChange}
              numberOfMonths={2}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        {selectedPreset === "custom" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="p-1 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Timezone indicator */}
      <div className="text-xs text-muted-foreground">
        Timezone: {userTimezone}
      </div>
    </div>
  );
};
