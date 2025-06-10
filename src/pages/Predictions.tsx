
import React from 'react';
import { PredictionsGrid } from "@/components/PredictionsGrid";
import { ForecastChart } from "@/components/ForecastChart";
import { ForecastControls } from "@/components/ForecastControls";

const Predictions = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Predictions</h1>
            <p className="text-gray-600 mt-1">AI-powered forecasting and predictions for your campaigns</p>
          </div>
        </div>

        {/* Forecast Controls */}
        <ForecastControls />

        {/* Forecast Chart */}
        <ForecastChart />

        {/* Predictions Grid */}
        <PredictionsGrid />
      </div>
    </div>
  );
};

export default Predictions;
