
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
    console.log('📅 [createDateRangeInUserTimezone] Input dates:', {
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      userTimezone,
      isSameDay: fromDate.toDateString() === toDate.toDateString()
    });
    
    // For single day selections, ensure we get the full day in the user's timezone
    // Convert the calendar date to user timezone and create start/end of that day
    const fromInUserTz = toZonedTime(fromDate, userTimezone);
    const toInUserTz = toZonedTime(toDate, userTimezone);
    
    // Get date components in user timezone
    const fromYear = fromInUserTz.getFullYear();
    const fromMonth = fromInUserTz.getMonth();
    const fromDay = fromInUserTz.getDate();
    
    const toYear = toInUserTz.getFullYear();
    const toMonth = toInUserTz.getMonth();
    const toDay = toInUserTz.getDate();
    
    // Create date strings in YYYY-MM-DD format
    const fromDateStr = `${fromYear}-${String(fromMonth + 1).padStart(2, '0')}-${String(fromDay).padStart(2, '0')}`;
    const toDateStr = `${toYear}-${String(toMonth + 1).padStart(2, '0')}-${String(toDay).padStart(2, '0')}`;
    
    console.log('📅 [createDateRangeInUserTimezone] Date strings in user timezone:', {
      fromDateStr,
      toDateStr,
      userTimezone
    });
    
    // Create start/end of day in the user's profile timezone
    const fromStartOfDay = fromZonedTime(`${fromDateStr} 00:00:00`, userTimezone);
    const toEndOfDay = fromZonedTime(`${toDateStr} 23:59:59`, userTimezone);
    
    console.log('📅 [createDateRangeInUserTimezone] Final range:', {
      from: fromStartOfDay.toISOString(),
      to: toEndOfDay.toISOString(),
      fromLocal: fromStartOfDay.toString(),
      toLocal: toEndOfDay.toString(),
      spansDays: Math.ceil((toEndOfDay.getTime() - fromStartOfDay.getTime()) / (1000 * 60 * 60 * 24))
    });
    
    return { from: fromStartOfDay, to: toEndOfDay };
  };

  // Quick preset buttons for easy access
  const quickPresets = [
    { 
      label: "Today", 
      value: "today", 
      getDates: () => {
        // Get today in the user's profile timezone
        const nowInUserTz = toZonedTime(new Date(), userTimezone);
        return createDateRangeInUserTimezone(nowInUserTz, nowInUserTz);
      }
    },
    { 
      label: "Yesterday", 
      value: "yesterday", 
      getDates: () => {
        // Get yesterday in the user's profile timezone
        const nowInUserTz = toZonedTime(new Date(), userTimezone);
        const yesterdayInUserTz = subDays(nowInUserTz, 1);
        return createDateRangeInUserTimezone(yesterdayInUserTz, yesterdayInUserTz);
      }
    },
    { 
      label: "Last 7 days", 
      value: "7days", 
      getDates: () => {
        const nowInUserTz = toZonedTime(new Date(), userTimezone);
        const sevenDaysAgoInUserTz = subDays(nowInUserTz, 6);
        return createDateRangeInUserTimezone(sevenDaysAgoInUserTz, nowInUserTz);
      }
    },
    { 
      label: "Last 30 days", 
      value: "30days", 
      getDates: () => {
        const nowInUserTz = toZonedTime(new Date(), userTimezone);
        const thirtyDaysAgoInUserTz = subDays(nowInUserTz, 29);
        return createDateRangeInUserTimezone(thirtyDaysAgoInUserTz, nowInUserTz);
      }
    },
  ];

  const [dateRange, setDateRange] = useState(() => {
    const nowInUserTz = toZonedTime(new Date(), userTimezone);
    const thirtyDaysAgoInUserTz = subDays(nowInUserTz, 29);
    const initial = createDateRangeInUserTimezone(thirtyDaysAgoInUserTz, nowInUserTz);
    return initial;
  });
  const [selectedPreset, setSelectedPreset] = useState("30days");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [selectionStep, setSelectionStep] = useState<'start' | 'end'>('start');

  // Re-initialize date range when user timezone changes
  useEffect(() => {
    console.log('📅 User timezone changed, re-initializing date range:', userTimezone);
    const nowInUserTz = toZonedTime(new Date(), userTimezone);
    const thirtyDaysAgoInUserTz = subDays(nowInUserTz, 29);
    const initial = createDateRangeInUserTimezone(thirtyDaysAgoInUserTz, nowInUserTz);
    setDateRange(initial);
    onDateChange(initial.from, initial.to);
  }, [userTimezone]);

  const handlePresetClick = (preset: any) => {
    console.log('📅 Preset clicked:', preset.label);
    setSelectedPreset(preset.value);
    setSelectionStep('start'); // Reset selection step
    const dates = preset.getDates();
    setDateRange(dates);
    onDateChange(dates.from, dates.to);
  };

  const handleCustomDateChange = (selectedDate: Date | undefined) => {
    if (!selectedDate) return;
    
    console.log('📅 Date clicked:', selectedDate, 'Current step:', selectionStep);
    
    if (selectionStep === 'start') {
      // First click - set start date, clear end date, wait for end date
      const startDate = createDateRangeInUserTimezone(selectedDate, selectedDate);
      setDateRange({ from: startDate.from, to: undefined });
      setSelectionStep('end');
      setSelectedPreset("custom");
      console.log('📅 Start date set:', selectedDate);
    } else {
      // Second click - set end date and complete the range
      const currentStart = dateRange.from;
      if (!currentStart) {
        // Fallback: if somehow we don't have a start date, treat this as start
        const startDate = createDateRangeInUserTimezone(selectedDate, selectedDate);
        setDateRange({ from: startDate.from, to: undefined });
        setSelectionStep('end');
        return;
      }
      
      // Determine which date should be start and which should be end
      const tempStartInUserTz = toZonedTime(currentStart, userTimezone);
      const startOfTempStart = startOfDay(tempStartInUserTz);
      const startOfSelected = startOfDay(selectedDate);
      
      let finalStartDate, finalEndDate;
      if (startOfSelected >= startOfTempStart) {
        // Selected date is after or same as current start - normal order
        finalStartDate = tempStartInUserTz;
        finalEndDate = selectedDate;
      } else {
        // Selected date is before current start - swap them
        finalStartDate = selectedDate;
        finalEndDate = tempStartInUserTz;
      }
      
      const finalRange = createDateRangeInUserTimezone(finalStartDate, finalEndDate);
      setDateRange(finalRange);
      onDateChange(finalRange.from, finalRange.to);
      setSelectionStep('start'); // Reset for next selection
      setIsCalendarOpen(false); // Close after complete selection
      console.log('📅 Range completed:', finalStartDate, 'to', finalEndDate);
    }
  };

  const formatDateRange = () => {
    if (!dateRange.from) return "Select date range";
    
    // If we only have a start date (during selection), show it
    if (!dateRange.to) {
      return format(toZonedTime(dateRange.from, userTimezone), "MMM d, yyyy") + " - Select end date";
    }
    
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
    const nowInUserTz = toZonedTime(new Date(), userTimezone);
    const thirtyDaysAgoInUserTz = subDays(nowInUserTz, 29);
    const initial = createDateRangeInUserTimezone(thirtyDaysAgoInUserTz, nowInUserTz);
    setDateRange(initial);
    setSelectedPreset("30days");
    setSelectionStep('start'); // Reset selection step
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
                {selectionStep === 'start' ? 'Click to select start date' : 'Click to select end date'}
              </p>
            </div>
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                selected={{
                  from: dateRange?.from ? toZonedTime(dateRange.from, userTimezone) : undefined,
                  to: dateRange?.to ? toZonedTime(dateRange.to, userTimezone) : undefined,
                }}
                onDayClick={(day) => {
                  handleCustomDateChange(day);
                }}
                onSelect={() => {
                  // Disable the default range selection behavior
                  // We handle all clicks through onDayClick
                }}
                defaultMonth={dateRange?.from ? toZonedTime(dateRange.from, userTimezone) : undefined}
                numberOfMonths={2}
                className="pointer-events-auto"
                fixedWeeks
              />
            </div>
            <div className="p-3 border-t flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                <div>Selected: {formatDateRange()}</div>
                <div className="mt-1">
                  {selectionStep === 'start' ? '1. Choose start date' : '2. Choose end date'}
                </div>
              </div>
              <Button 
                size="sm" 
                onClick={() => {
                  setIsCalendarOpen(false);
                  setSelectionStep('start'); // Reset for next time
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
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
