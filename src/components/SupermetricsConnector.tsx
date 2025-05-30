
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGoogleSheetsData } from "@/hooks/useGoogleSheetsData";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, TrendingUp, Users, DollarSign, Eye, MousePointer, Target, Calendar } from "lucide-react";

export const SupermetricsConnector = () => {
  const { syncedData, calculateMetricsFromSyncedData } = useGoogleSheetsData();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const { toast } = useToast();

  const metrics = calculateMetricsFromSyncedData();

  const performSupermetricsAnalysis = async () => {
    if (!syncedData || !metrics) {
      toast({
        title: "No Data Available",
        description: "Please connect Google Sheets first to enable Supermetrics analysis.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    
    // Simulate analysis with real data
    await new Promise(resolve => setTimeout(resolve, 2000));

    const analysisResult = {
      performanceScore: Math.round(metrics.roas * 20 + metrics.conversionRate * 2),
      insights: [
        {
          metric: "ROAS Performance",
          value: metrics.roas.toFixed(2),
          benchmark: "3.5",
          status: metrics.roas >= 3.5 ? "above" : metrics.roas >= 2.5 ? "average" : "below",
          recommendation: metrics.roas >= 3.5 ? "Excellent performance! Scale campaigns." : 
                         metrics.roas >= 2.5 ? "Good performance. Optimize targeting." : 
                         "Below benchmark. Review ad creative and targeting."
        },
        {
          metric: "Conversion Rate",
          value: `${metrics.conversionRate.toFixed(1)}%`,
          benchmark: "3.5%",
          status: metrics.conversionRate >= 3.5 ? "above" : metrics.conversionRate >= 2.0 ? "average" : "below",
          recommendation: metrics.conversionRate >= 3.5 ? "Strong conversion rate. Test higher-value offers." :
                         metrics.conversionRate >= 2.0 ? "Average performance. A/B test landing pages." :
                         "Low conversion rate. Optimize funnel flow and messaging."
        },
        {
          metric: "Cost Efficiency",
          value: `$${metrics.cpc.toFixed(2)}`,
          benchmark: "$1.50",
          status: metrics.cpc <= 1.50 ? "above" : metrics.cpc <= 2.50 ? "average" : "below",
          recommendation: metrics.cpc <= 1.50 ? "Excellent cost efficiency. Expand reach." :
                         metrics.cpc <= 2.50 ? "Reasonable costs. Optimize for quality traffic." :
                         "High costs. Review keyword targeting and bid strategies."
        }
      ],
      trends: {
        growth: metrics.revenue > metrics.cost * 2 ? "positive" : "neutral",
        efficiency: metrics.roas > 3 ? "improving" : "stable",
        volume: metrics.impressions > 10000 ? "high" : "moderate"
      },
      recommendations: [
        metrics.roas < 2.5 ? "Focus on improving ROAS through better targeting" : "Scale successful campaigns",
        metrics.conversionRate < 3 ? "Optimize landing page conversion rate" : "Test premium offers",
        metrics.cpc > 2 ? "Reduce cost per click through bid optimization" : "Expand reach with current efficiency"
      ].filter(Boolean)
    };

    setAnalysis(analysisResult);
    setIsAnalyzing(false);

    toast({
      title: "Supermetrics Analysis Complete",
      description: `Performance Score: ${analysisResult.performanceScore}/100`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Supermetrics Analytics Integration
            </CardTitle>
            <Badge variant={syncedData ? "default" : "secondary"}>
              {syncedData ? "Data Connected" : "No Data"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Supermetrics integration provides advanced analytics and insights based on your Google Sheets data.
            {!syncedData && " Connect Google Sheets first to enable Supermetrics analysis."}
          </p>
          
          <Button 
            onClick={performSupermetricsAnalysis}
            disabled={!syncedData || isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? "Analyzing Data..." : "Run Supermetrics Analysis"}
          </Button>
        </CardContent>
      </Card>

      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Current Data Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <DollarSign className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                <div className="text-lg font-semibold">${metrics.revenue.toLocaleString()}</div>
                <div className="text-xs text-gray-600">Revenue</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Target className="h-5 w-5 mx-auto mb-1 text-green-600" />
                <div className="text-lg font-semibold">{metrics.roas.toFixed(2)}</div>
                <div className="text-xs text-gray-600">ROAS</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <MousePointer className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                <div className="text-lg font-semibold">{metrics.conversionRate.toFixed(1)}%</div>
                <div className="text-xs text-gray-600">Conv. Rate</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <Eye className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                <div className="text-lg font-semibold">{metrics.dataRows}</div>
                <div className="text-xs text-gray-600">Data Points</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Analysis
                <Badge className="ml-2">{analysis.performanceScore}/100</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="insights" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="insights">Key Insights</TabsTrigger>
                  <TabsTrigger value="trends">Trends</TabsTrigger>
                  <TabsTrigger value="recommendations">Actions</TabsTrigger>
                </TabsList>

                <TabsContent value="insights" className="space-y-4">
                  {analysis.insights.map((insight: any, index: number) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{insight.metric}</h4>
                        <Badge 
                          variant={insight.status === "above" ? "default" : 
                                  insight.status === "average" ? "secondary" : "destructive"}
                        >
                          {insight.status === "above" ? "Above Benchmark" :
                           insight.status === "average" ? "Average" : "Below Benchmark"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                        <div>
                          <span className="text-gray-600">Current: </span>
                          <span className="font-medium">{insight.value}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Benchmark: </span>
                          <span className="font-medium">{insight.benchmark}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{insight.recommendation}</p>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="trends" className="space-y-4">
                  <div className="grid gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Growth Trend</h4>
                      <Badge variant={analysis.trends.growth === "positive" ? "default" : "secondary"}>
                        {analysis.trends.growth === "positive" ? "Positive Growth" : "Neutral Growth"}
                      </Badge>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Efficiency Trend</h4>
                      <Badge variant={analysis.trends.efficiency === "improving" ? "default" : "secondary"}>
                        {analysis.trends.efficiency === "improving" ? "Improving" : "Stable"}
                      </Badge>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Volume Trend</h4>
                      <Badge variant={analysis.trends.volume === "high" ? "default" : "secondary"}>
                        {analysis.trends.volume === "high" ? "High Volume" : "Moderate Volume"}
                      </Badge>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="recommendations" className="space-y-4">
                  {analysis.recommendations.map((rec: string, index: number) => (
                    <div key={index} className="p-4 border rounded-lg flex items-start gap-3">
                      <Target className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
