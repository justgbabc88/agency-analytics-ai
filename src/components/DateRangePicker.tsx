
import React, { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { subDays } from "date-fns/subDays";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRangePickerProps {
  onDateChange: (from: Date, to: Date) => void;
  className?: string;
}

export const DateRangePicker = ({ onDateChange, className }: DateRangePickerProps) => {
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });

  const handleDateChange = (from: Date | undefined, to: Date | undefined) => {
    if (from && to) {
      setDateRange({ from, to });
      onDateChange(from, to);
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
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
            onSelect={(range) => {
              handleDateChange(range?.from, range?.to);
            }}
            numberOfMonths={2}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
