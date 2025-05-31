
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, TrendingUp, TrendingDown, AlertCircle, Lightbulb, Target, BarChart } from "lucide-react";
import { useState } from "react";

interface EnhancedAIInsightsProps {
  insights: string;
  accuracy: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  dataPoints: number;
  forecastDays: number;
  currentMetrics: any;
  seasonality?: {
    period: number;
    strength: number;
  };
}

export const EnhancedAIInsights = ({ 
  insights, 
  accuracy, 
  trend, 
  dataPoints, 
  forecastDays, 
  currentMetrics,
  seasonality 
}: EnhancedAIInsightsProps) => {
  const [activeTab, setActiveTab] = useState<'insights' | 'recommendations' | 'risks'>('insights');

  const generateRecommendations = () => {
    const recommendations = [];

    if (trend === 'increasing' && accuracy > 75) {
      recommendations.push({
        type: 'optimization',
        title: 'Scale Winning Campaigns',
        description: 'Strong upward trend detected. Consider increasing budget on top-performing campaigns.',
        priority: 'high',
        icon: <TrendingUp className="h-4 w-4" />
      });
    }

    if (trend === 'decreasing') {
      recommendations.push({
        type: 'alert',
        title: 'Performance Decline Detected',
        description: 'Review ad creative, targeting, and landing page performance immediately.',
        priority: 'critical',
        icon: <AlertCircle className="h-4 w-4" />
      });
    }

    if (dataPoints < 14) {
      recommendations.push({
        type: 'data',
        title: 'Improve Data Collection',
        description: 'Limited historical data affects forecast accuracy. Ensure consistent tracking.',
        priority: 'medium',
        icon: <BarChart className="h-4 w-4" />
      });
    }

    if (currentMetrics?.roas > 3) {
      recommendations.push({
        type: 'growth',
        title: 'Expansion Opportunity',
        description: 'Excellent ROAS suggests room for scaling. Test new audiences and ad formats.',
        priority: 'high',
        icon: <Target className="h-4 w-4" />
      });
    }

    if (forecastDays > 60) {
      recommendations.push({
        type: 'planning',
        title: 'Long-term Strategy',
        description: 'Extended forecasts have lower accuracy. Plan for multiple scenarios.',
        priority: 'medium',
        icon: <Lightbulb className="h-4 w-4" />
      });
    }

    return recommendations;
  };

  const generateRiskFactors = () => {
    const risks = [];

    if (accuracy < 70) {
      risks.push({
        factor: 'Low Forecast Accuracy',
        impact: 'High',
        description: 'Predictions may be unreliable. Use multiple data sources and shorter forecast periods.',
        mitigation: 'Increase data collection frequency and validate against external benchmarks.'
      });
    }

    if (trend === 'decreasing') {
      risks.push({
        factor: 'Declining Performance',
        impact: 'Critical',
        description: 'Revenue and conversion trends are negative, requiring immediate intervention.',
        mitigation: 'Audit campaigns, refresh creative assets, and optimize targeting parameters.'
      });
    }

    if (dataPoints < 7) {
      risks.push({
        factor: 'Insufficient Data',
        impact: 'Medium',
        description: 'Limited historical data reduces the reliability of forecasts and trend analysis.',
        mitigation: 'Implement comprehensive tracking and wait for more data before major decisions.'
      });
    }

    if (currentMetrics?.roas < 2) {
      risks.push({
        factor: 'Poor ROAS',
        impact: 'High',
        description: 'Return on ad spend is below industry standards, indicating inefficient campaigns.',
        mitigation: 'Focus on conversion optimization, audience refinement, and cost reduction strategies.'
      });
    }

    return risks;
  };

  const recommendations = generateRecommendations();
  const risks = generateRiskFactors();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'Critical': return 'text-red-600';
      case 'High': return 'text-orange-600';
      case 'Medium': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Enhanced AI Analysis
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant={activeTab === 'insights' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('insights')}
            >
              Insights
            </Button>
            <Button
              variant={activeTab === 'recommendations' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('recommendations')}
            >
              Actions
            </Button>
            <Button
              variant={activeTab === 'risks' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('risks')}
            >
              Risks
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {activeTab === 'insights' && (
          <div className="space-y-4">
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Brain className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-purple-900 mb-1">AI Forecast Analysis</h4>
                  <p className="text-sm text-purple-800">{insights}</p>
                  {seasonality && (
                    <p className="text-xs text-purple-600 mt-2">
                      📊 Detected {seasonality.period}-day seasonality pattern with {(seasonality.strength * 100).toFixed(1)}% strength.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <h5 className="font-medium">Model Performance</h5>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Accuracy:</span>
                    <span className="font-medium">{accuracy.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Data Points:</span>
                    <span className="font-medium">{dataPoints}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Forecast Period:</span>
                    <span className="font-medium">{forecastDays} days</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="font-medium">Trend Analysis</h5>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Direction:</span>
                    <Badge variant={trend === 'increasing' ? 'default' : trend === 'decreasing' ? 'destructive' : 'secondary'}>
                      {trend === 'increasing' ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : trend === 'decreasing' ? (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      ) : (
                        <BarChart className="h-3 w-3 mr-1" />
                      )}
                      {trend.charAt(0).toUpperCase() + trend.slice(1)}
                    </Badge>
                  </div>
                  {currentMetrics && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ROAS:</span>
                        <span className={`font-medium ${currentMetrics.roas > 3 ? 'text-green-600' : currentMetrics.roas < 2 ? 'text-red-600' : 'text-yellow-600'}`}>
                          {currentMetrics.roas.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Conv. Rate:</span>
                        <span className="font-medium">{currentMetrics.conversionRate.toFixed(1)}%</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="space-y-3">
            {recommendations.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No specific recommendations at this time.</p>
            ) : (
              recommendations.map((rec, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">{rec.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium text-sm">{rec.title}</h5>
                        <Badge className={getPriorityColor(rec.priority)} variant="secondary">
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">{rec.description}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="space-y-3">
            {risks.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No significant risks identified.</p>
            ) : (
              risks.map((risk, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-medium text-sm">{risk.factor}</h5>
                    <Badge variant="outline" className={getImpactColor(risk.impact)}>
                      {risk.impact} Impact
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{risk.description}</p>
                  <div className="text-xs">
                    <span className="font-medium text-blue-700">Mitigation: </span>
                    <span className="text-blue-600">{risk.mitigation}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
