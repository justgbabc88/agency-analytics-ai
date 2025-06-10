
import React, { useState } from 'react';
import { DateRangePicker } from "@/components/DateRangePicker";
import { FacebookMetrics } from "@/components/FacebookMetrics";
import { subDays } from "date-fns";

const FacebookAds = () => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const handleDateChange = (from: Date, to: Date) => {
    setDateRange({ from, to });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Facebook Ads Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor your Facebook advertising performance</p>
          </div>
          <DateRangePicker
            onDateChange={handleDateChange}
          />
        </div>

        {/* Facebook Metrics */}
        <FacebookMetrics dateRange={dateRange} />
      </div>
    </div>
  );
};

export default FacebookAds;
