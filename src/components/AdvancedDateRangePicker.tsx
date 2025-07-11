
import React, { useState, useEffect } from "react";
import { CalendarIcon } from "lucide-react";
import { format, subDays, subWeeks, subMonths, startOfWeek, startOfMonth, startOfYear, startOfDay, endOfDay } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    // Convert to user's timezone, then back to UTC for storage
    const fromInUserTz = toZonedTime(fromDate, userTimezone);
    const toInUserTz = toZonedTime(toDate, userTimezone);
    
    // Apply start/end of day in user's timezone
    const fromStartOfDay = startOfDay(fromInUserTz);
    const toEndOfDay = endOfDay(toInUserTz);
    
    // Convert back to UTC for consistent storage and API calls
    const fromUTC = fromZonedTime(fromStartOfDay, userTimezone);
    const toUTC = fromZonedTime(toEndOfDay, userTimezone);
    
    console.log('🌍 Creating timezone-aware date range:', {
      userTimezone,
      original: { from: fromDate.toISOString(), to: toDate.toISOString() },
      inUserTz: { from: fromInUserTz.toISOString(), to: toInUserTz.toISOString() },
      withStartEnd: { from: fromStartOfDay.toISOString(), to: toEndOfDay.toISOString() },
      finalUTC: { from: fromUTC.toISOString(), to: toUTC.toISOString() }
    });
    
    return { from: fromUTC, to: toUTC };
  };

  const datePresets = [
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
      label: "Last 14 days", 
      value: "14days", 
      getDates: () => createDateRangeInUserTimezone(subDays(new Date(), 13), new Date())
    },
    { 
      label: "Last 30 days", 
      value: "30days", 
      getDates: () => createDateRangeInUserTimezone(subDays(new Date(), 29), new Date())
    },
    { 
      label: "This week", 
      value: "thisweek", 
      getDates: () => createDateRangeInUserTimezone(startOfWeek(new Date()), new Date())
    },
    { 
      label: "Last week", 
      value: "lastweek", 
      getDates: () => {
        const lastWeekStart = startOfWeek(subWeeks(new Date(), 1));
        const lastWeekEnd = subDays(startOfWeek(new Date()), 1);
        return createDateRangeInUserTimezone(lastWeekStart, lastWeekEnd);
      }
    },
    { 
      label: "This month", 
      value: "thismonth", 
      getDates: () => createDateRangeInUserTimezone(startOfMonth(new Date()), new Date())
    },
    { 
      label: "Last month", 
      value: "lastmonth", 
      getDates: () => {
        const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
        const lastMonthEnd = subDays(startOfMonth(new Date()), 1);
        return createDateRangeInUserTimezone(lastMonthStart, lastMonthEnd);
      }
    },
    { 
      label: "This year", 
      value: "thisyear", 
      getDates: () => createDateRangeInUserTimezone(startOfYear(new Date()), new Date())
    },
    { 
      label: "Custom", 
      value: "custom", 
      getDates: () => createDateRangeInUserTimezone(subDays(new Date(), 30), new Date())
    },
  ];
  const [dateRange, setDateRange] = useState(() => {
    const initial = createDateRangeInUserTimezone(subDays(new Date(), 29), new Date());
    return initial;
  });
  const [selectedPreset, setSelectedPreset] = useState("30days");
  const [isCustom, setIsCustom] = useState(false);

  // Re-initialize date range when user timezone changes
  useEffect(() => {
    console.log('📅 User timezone changed, re-initializing date range:', userTimezone);
    const initial = createDateRangeInUserTimezone(subDays(new Date(), 29), new Date());
    setDateRange(initial);
    // Notify parent of the timezone-adjusted dates
    onDateChange(initial.from, initial.to);
  }, [userTimezone]);

  const handlePresetChange = (preset: string) => {
    console.log('📅 Preset changed to:', preset);
    setSelectedPreset(preset);
    if (preset === "custom") {
      setIsCustom(true);
      return;
    }
    
    setIsCustom(false);
    const presetConfig = datePresets.find(p => p.value === preset);
    if (presetConfig) {
      const dates = presetConfig.getDates();
      console.log('📅 New dates from preset:', {
        from: format(dates.from, 'yyyy-MM-dd HH:mm:ss'),
        to: format(dates.to, 'yyyy-MM-dd HH:mm:ss'),
        preset
      });
      setDateRange(dates);
      onDateChange(dates.from, dates.to);
    }
  };

  const handleCustomDateChange = (range: any) => {
    console.log('📅 Custom date range selected:', range);
    if (range?.from && range?.to) {
      const dates = createDateRangeInUserTimezone(range.from, range.to);
      console.log('📅 Custom dates processed with timezone:', {
        from: format(dates.from, 'yyyy-MM-dd HH:mm:ss'),
        to: format(dates.to, 'yyyy-MM-dd HH:mm:ss'),
        timezone: userTimezone
      });
      setDateRange(dates);
      onDateChange(dates.from, dates.to);
    } else if (range?.from && !range?.to) {
      // Single date selected, set both from and to to the same date
      const dates = createDateRangeInUserTimezone(range.from, range.from);
      console.log('📅 Single date selected with timezone:', {
        from: format(dates.from, 'yyyy-MM-dd HH:mm:ss'),
        to: format(dates.to, 'yyyy-MM-dd HH:mm:ss'),
        timezone: userTimezone
      });
      setDateRange(dates);
      onDateChange(dates.from, dates.to);
    }
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select date range" />
        </SelectTrigger>
        <SelectContent>
          {datePresets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isCustom && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
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
      )}
    </div>
  );
};
