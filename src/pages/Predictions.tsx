
import React, { useState, useMemo } from 'react';
import { PredictionsGrid } from "@/components/PredictionsGrid";
import { ForecastChart } from "@/components/ForecastChart";
import { ForecastControls } from "@/components/ForecastControls";

const Predictions = () => {
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [forecastPeriod, setForecastPeriod] = useState('30days');

  // Mock data for the components
  const mockForecastData = useMemo(() => [
    { date: '12/1/2024', value: 15000, isActual: true, confidence: 100 },
    { date: '12/2/2024', value: 16200, isActual: true, confidence: 100 },
    { date: '12/3/2024', value: 14800, isActual: true, confidence: 100 },
    { date: '12/4/2024', value: 17500, isActual: true, confidence: 100 },
    { date: '12/5/2024', value: 18200, isActual: false, confidence: 85 },
    { date: '12/6/2024', value: 19100, isActual: false, confidence: 82 },
    { date: '12/7/2024', value: 20300, isActual: false, confidence: 78 },
  ], []);

  const mockFunnelData = useMemo(() => [
    { date: '12/1/2024', isActual: true, product1: 15.2, product2: 12.8, product3: 8.5 },
    { date: '12/2/2024', isActual: true, product1: 16.1, product2: 13.2, product3: 9.1 },
    { date: '12/3/2024', isActual: true, product1: 14.8, product2: 11.9, product3: 7.8 },
    { date: '12/4/2024', isActual: false, product1: 17.2, product2: 14.1, product3: 9.8 },
    { date: '12/5/2024', isActual: false, product1: 18.5, product2: 15.3, product3: 10.5 },
  ], []);

  const mockPredictions = useMemo(() => [
    {
      metric: 'Revenue',
      current: 156780,
      predicted: 172840,
      change: 10.2,
      confidence: 87,
      trend: 'up' as const,
      timeframe: 'Next 30 days'
    },
    {
      metric: 'Conversion Rate',
      current: 3.8,
      predicted: 4.2,
      change: 10.5,
      confidence: 82,
      trend: 'up' as const,
      timeframe: 'Next 30 days'
    },
    {
      metric: 'Cost Per Acquisition',
      current: 85,
      predicted: 78,
      change: -8.2,
      confidence: 79,
      trend: 'down' as const,
      timeframe: 'Next 30 days'
    },
    {
      metric: 'ROAS',
      current: 4.2,
      predicted: 4.8,
      change: 14.3,
      confidence: 85,
      trend: 'up' as const,
      timeframe: 'Next 30 days'
    }
  ], []);

  const selectedProducts = useMemo(() => [
    { id: 'product1', label: 'Product 1', visible: true, color: '#8b5cf6' },
    { id: 'product2', label: 'Product 2', visible: true, color: '#06b6d4' },
    { id: 'product3', label: 'Product 3', visible: true, color: '#10b981' },
  ], []);

  const productConfigMap = useMemo(() => ({
    product1: { id: 'product1', label: 'Product 1', visible: true, color: '#8b5cf6' },
    product2: { id: 'product2', label: 'Product 2', visible: true, color: '#06b6d4' },
    product3: { id: 'product3', label: 'Product 3', visible: true, color: '#10b981' },
  }), []);

  const forecastDays = forecastPeriod === '30days' ? 30 : forecastPeriod === '60days' ? 60 : 90;
  const trend = selectedMetric === 'revenue' ? 'increasing' : 'stable';

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
        <ForecastControls 
          selectedMetric={selectedMetric}
          forecastPeriod={forecastPeriod}
          trend={trend}
          onMetricChange={setSelectedMetric}
          onPeriodChange={setForecastPeriod}
        />

        {/* Forecast Chart */}
        <ForecastChart 
          data={mockForecastData}
          funnelData={mockFunnelData}
          selectedMetric={selectedMetric}
          selectedProducts={selectedProducts}
          trendLineData={null}
          productConfigMap={productConfigMap}
        />

        {/* Predictions Grid */}
        <PredictionsGrid 
          predictions={mockPredictions}
          forecastDays={forecastDays}
        />
      </div>
    </div>
  );
};

export default Predictions;
