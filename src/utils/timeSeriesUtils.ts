
import { format, addDays, parseISO, isValid } from 'date-fns';

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  isActual: boolean;
  confidence?: number;
}

export interface ForecastResult {
  data: TimeSeriesDataPoint[];
  trend: 'increasing' | 'decreasing' | 'stable';
  accuracy: number;
  seasonality?: {
    period: number;
    strength: number;
  };
}

export interface ForecastScenarios {
  optimistic: number;
  realistic: number;
  pessimistic: number;
  confidence: number;
}

export const parseDateFromSheetData = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  
  // Try various date formats commonly found in Google Sheets
  const formats = [
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  ];

  // Try parsing as ISO date first
  const isoDate = parseISO(dateStr);
  if (isValid(isoDate)) return isoDate;

  // Try MM/DD/YYYY format (most common in US)
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isValid(date)) return date;
  }

  return null;
};

export const calculateMovingAverage = (values: number[], window: number): number[] => {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const windowValues = values.slice(start, i + 1);
    const average = windowValues.reduce((sum, val) => sum + val, 0) / windowValues.length;
    result.push(average);
  }
  return result;
};

export const calculateLinearTrend = (values: number[]): { slope: number; intercept: number; rSquared: number } => {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };

  const xValues = Array.from({ length: n }, (_, i) => i);
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let denominator = 0;
  let totalSumSquares = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean;
    const yDiff = values[i] - yMean;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
    totalSumSquares += yDiff * yDiff;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  // Calculate R-squared
  let residualSumSquares = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    const residual = values[i] - predicted;
    residualSumSquares += residual * residual;
  }

  const rSquared = totalSumSquares === 0 ? 0 : 1 - (residualSumSquares / totalSumSquares);

  return { slope, intercept, rSquared: Math.max(0, rSquared) };
};

export const detectSeasonality = (values: number[]): { period: number; strength: number } | null => {
  if (values.length < 7) return null;

  // Check for weekly seasonality (7-day period)
  const weeklyCorrelation = calculateAutocorrelation(values, 7);
  
  if (weeklyCorrelation > 0.3) {
    return { period: 7, strength: weeklyCorrelation };
  }

  return null;
};

const calculateAutocorrelation = (values: number[], lag: number): number => {
  if (values.length <= lag) return 0;

  const n = values.length - lag;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (values[i] - mean) * (values[i + lag] - mean);
  }

  for (let i = 0; i < values.length; i++) {
    denominator += (values[i] - mean) * (values[i] - mean);
  }

  return denominator === 0 ? 0 : numerator / denominator;
};

export const generateForecast = (
  historicalData: { date: string; value: number }[],
  forecastDays: number
): ForecastResult => {
  if (historicalData.length === 0) {
    return {
      data: [],
      trend: 'stable',
      accuracy: 0,
    };
  }

  // Sort data by date
  const sortedData = historicalData
    .filter(d => d.value !== null && d.value !== undefined && !isNaN(d.value))
    .sort((a, b) => {
      const dateA = parseDateFromSheetData(a.date);
      const dateB = parseDateFromSheetData(b.date);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });

  if (sortedData.length === 0) {
    return {
      data: [],
      trend: 'stable',
      accuracy: 0,
    };
  }

  const values = sortedData.map(d => d.value);
  
  // Calculate trend
  const trend = calculateLinearTrend(values);
  const movingAverage = calculateMovingAverage(values, Math.min(7, values.length));
  const seasonality = detectSeasonality(values);

  // Calculate variance for confidence intervals
  const variance = values.length > 1 ? 
    values.reduce((sum, val, i) => {
      const predicted = trend.slope * i + trend.intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0) / (values.length - 1) : 0;

  const standardDeviation = Math.sqrt(variance);

  // Generate forecast data
  const result: TimeSeriesDataPoint[] = [];

  // Add historical data
  sortedData.forEach((point, index) => {
    result.push({
      date: point.date,
      value: point.value,
      isActual: true,
      confidence: 100,
    });
  });

  // Generate future predictions
  const lastDate = parseDateFromSheetData(sortedData[sortedData.length - 1].date);
  if (lastDate) {
    for (let i = 1; i <= forecastDays; i++) {
      const futureDate = addDays(lastDate, i);
      const trendValue = trend.slope * (values.length + i - 1) + trend.intercept;
      
      // Apply seasonal adjustment if detected
      let seasonalAdjustment = 0;
      if (seasonality) {
        const seasonalIndex = (values.length + i - 1) % seasonality.period;
        seasonalAdjustment = Math.sin((2 * Math.PI * seasonalIndex) / seasonality.period) * 
                           (trendValue * seasonality.strength * 0.1);
      }

      const predictedValue = Math.max(0, trendValue + seasonalAdjustment);
      
      // Calculate confidence based on distance from last known data and model accuracy
      const baseConfidence = Math.max(0.4, trend.rSquared);
      const distanceDecay = Math.max(0.3, 1 - (i / forecastDays) * 0.4);
      const confidence = baseConfidence * distanceDecay * 100;

      result.push({
        date: format(futureDate, 'M/d/yyyy'),
        value: Math.round(predictedValue),
        isActual: false,
        confidence: Math.round(confidence),
      });
    }
  }

  // Determine trend direction
  let trendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (Math.abs(trend.slope) > 0.01) {
    trendDirection = trend.slope > 0 ? 'increasing' : 'decreasing';
  }

  return {
    data: result,
    trend: trendDirection,
    accuracy: trend.rSquared * 100,
    seasonality,
  };
};

export const generateScenarioForecasts = (
  baseValue: number,
  trend: { slope: number; intercept: number; rSquared: number },
  daysAhead: number,
  standardDeviation: number
): ForecastScenarios => {
  const trendValue = trend.slope * daysAhead + baseValue;
  
  // Create scenarios based on standard deviation and trend confidence
  const optimisticMultiplier = 1 + (0.2 * trend.rSquared + 0.1);
  const pessimisticMultiplier = 1 - (0.15 * trend.rSquared + 0.1);
  
  return {
    optimistic: Math.round(trendValue * optimisticMultiplier + standardDeviation),
    realistic: Math.round(trendValue),
    pessimistic: Math.round(Math.max(0, trendValue * pessimisticMultiplier - standardDeviation)),
    confidence: Math.round(trend.rSquared * 100),
  };
};
