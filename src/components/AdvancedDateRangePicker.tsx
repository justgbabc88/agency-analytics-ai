
import React, { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format, subDays, subWeeks, subMonths, startOfWeek, startOfMonth, startOfYear, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AdvancedDateRangePickerProps {
  onDateChange: (from: Date, to: Date) => void;
  className?: string;
}

const datePresets = [
  { label: "Today", value: "today", getDates: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: "Yesterday", value: "yesterday", getDates: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }) },
  { label: "Last 7 days", value: "7days", getDates: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
  { label: "Last 14 days", value: "14days", getDates: () => ({ from: startOfDay(subDays(new Date(), 13)), to: endOfDay(new Date()) }) },
  { label: "Last 30 days", value: "30days", getDates: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
  { label: "This week", value: "thisweek", getDates: () => ({ from: startOfWeek(new Date()), to: endOfDay(new Date()) }) },
  { label: "Last week", value: "lastweek", getDates: () => ({ from: startOfWeek(subWeeks(new Date(), 1)), to: endOfDay(subDays(startOfWeek(new Date()), 1)) }) },
  { label: "This month", value: "thismonth", getDates: () => ({ from: startOfMonth(new Date()), to: endOfDay(new Date()) }) },
  { label: "Last month", value: "lastmonth", getDates: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfDay(subDays(startOfMonth(new Date()), 1)) }) },
  { label: "This year", value: "thisyear", getDates: () => ({ from: startOfYear(new Date()), to: endOfDay(new Date()) }) },
  { label: "Custom", value: "custom", getDates: () => ({ from: startOfDay(subDays(new Date(), 30)), to: endOfDay(new Date()) }) },
];

export const AdvancedDateRangePicker = ({ onDateChange, className }: AdvancedDateRangePickerProps) => {
  const [dateRange, setDateRange] = useState({
    from: startOfDay(subDays(new Date(), 30)),
    to: endOfDay(new Date())
  });
  const [selectedPreset, setSelectedPreset] = useState("30days");
  const [isCustom, setIsCustom] = useState(false);

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
      const from = startOfDay(range.from);
      const to = endOfDay(range.to);
      console.log('📅 Custom dates processed:', {
        from: format(from, 'yyyy-MM-dd HH:mm:ss'),
        to: format(to, 'yyyy-MM-dd HH:mm:ss')
      });
      setDateRange({ from, to });
      onDateChange(from, to);
    } else if (range?.from && !range?.to) {
      // Single date selected, set both from and to to the same date
      const from = startOfDay(range.from);
      const to = endOfDay(range.from);
      console.log('📅 Single date selected:', {
        from: format(from, 'yyyy-MM-dd HH:mm:ss'),
        to: format(to, 'yyyy-MM-dd HH:mm:ss')
      });
      setDateRange({ from, to });
      onDateChange(from, to);
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex gap-2">
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
      
      {!isCustom && (
        <div className="text-sm text-gray-600">
          {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
        </div>
      )}
    </div>
  );
};
