
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

  const createDateRangeInUserTimezone = (fromDate: Date, toDate: Date) => {
    console.log('🚨 [createDateRangeInUserTimezone] FUNCTION CALLED!', {
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      userTimezone,
      isSameDay: fromDate.toDateString() === toDate.toDateString()
    });
    
    // Create start and end of day for the selected dates
    const fromStartOfDay = startOfDay(fromDate);
    const toEndOfDay = endOfDay(toDate);
    
    console.log('🚨 [createDateRangeInUserTimezone] FINAL RESULT:', {
      from: fromStartOfDay.toISOString(),
      to: toEndOfDay.toISOString(),
      fromLocal: fromStartOfDay.toString(), 
      toLocal: toEndOfDay.toString(),
      fromDateInput: fromDate.toString(),
      toDateInput: toDate.toString()
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
      // First click - create a single-day range and complete it immediately
      console.log('🔍 SINGLE DAY SELECTION DEBUG:', {
        selectedDate: selectedDate.toISOString(),
        dateString: selectedDate.toDateString(),
        userTimezone
      });
      const singleDayRange = createDateRangeInUserTimezone(selectedDate, selectedDate);
      console.log('🔍 SINGLE DAY RANGE CREATED:', {
        from: singleDayRange.from.toISOString(),
        to: singleDayRange.to.toISOString(),
        fromLocal: format(singleDayRange.from, 'yyyy-MM-dd HH:mm:ss'),
        toLocal: format(singleDayRange.to, 'yyyy-MM-dd HH:mm:ss')
      });
      setDateRange(singleDayRange);
      onDateChange(singleDayRange.from, singleDayRange.to);
      setSelectionStep('end');
      setSelectedPreset("custom");
      console.log('📅 Single day selected:', selectedDate);
    } else {
      // Second click - check if it's the same day (user wants single day) or create range
      const currentStart = dateRange.from;
      if (!currentStart) {
        // Fallback: if somehow we don't have a start date, treat this as start
        const singleDayRange = createDateRangeInUserTimezone(selectedDate, selectedDate);
        setDateRange(singleDayRange);
        onDateChange(singleDayRange.from, singleDayRange.to);
        setSelectionStep('start');
        return;
      }
      
      // Get the current start date in user timezone for comparison
      const tempStartInUserTz = toZonedTime(currentStart, userTimezone);
      const startOfTempStart = startOfDay(tempStartInUserTz);
      const startOfSelected = startOfDay(selectedDate);
      
      // Check if user clicked the same date (wants single day)
      if (startOfTempStart.getTime() === startOfSelected.getTime()) {
        // Same day clicked - keep it as single day and close
        setSelectionStep('start');
        setIsCalendarOpen(false);
        console.log('📅 Same day clicked - keeping single day selection');
        return;
      }
      
      // Different date - create a range
      let finalStartDate, finalEndDate;
      if (startOfSelected >= startOfTempStart) {
        // Selected date is after current start - normal order
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
