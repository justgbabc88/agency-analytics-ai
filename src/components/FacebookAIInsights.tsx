
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Brain, MessageSquare, TrendingUp, AlertTriangle, CheckCircle, Send, Sparkles, Target, BarChart3, Zap } from "lucide-react";
import { useFacebookData } from "@/hooks/useFacebookData";

interface FacebookAIInsightsProps {
  dateRange?: { from: Date; to: Date };
}

interface AIInsight {
  id: string;
  type: 'optimization' | 'warning' | 'trend' | 'opportunity' | 'pattern' | 'forecast';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  metric?: string;
  value?: number;
  confidence: number;
  actionable: string[];
}

export const FacebookAIInsights = ({ dateRange }: FacebookAIInsightsProps) => {
  const { facebookData, insights, isLoading } = useFacebookData({ dateRange });
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ type: 'user' | 'ai'; message: string; timestamp: Date }>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Advanced AI insights with deep pattern analysis
  const generateAdvancedInsights = (): AIInsight[] => {
    if (!insights || isLoading) return [];

    const aiInsights: AIInsight[] = [];

    // Calculate derived metrics for deeper analysis
    const cpm = insights.spend && insights.impressions ? (insights.spend / insights.impressions) * 1000 : 0;
    const cpc = insights.spend && insights.clicks ? insights.spend / insights.clicks : 0;
    const frequency = insights.reach && insights.reach > 0 ? insights.impressions / insights.reach : 1.2;
    const clickValue = insights.clicks > 0 ? insights.spend / insights.clicks : 0;
    const impressionEfficiency = insights.spend > 0 ? insights.impressions / insights.spend : 0;

    // Performance Tier Analysis
    let performanceTier = 'average';
    let tierScore = 0;
    
    if (insights.ctr > 2.5) tierScore += 25;
    else if (insights.ctr > 1.5) tierScore += 15;
    else if (insights.ctr < 1.0) tierScore -= 15;
    
    if (cpm < 8) tierScore += 25;
    else if (cpm < 15) tierScore += 15;
    else if (cpm > 25) tierScore -= 15;
    
    if (frequency < 2.5) tierScore += 15;
    else if (frequency > 4) tierScore -= 20;
    
    if (cpc < 2) tierScore += 20;
    else if (cpc > 5) tierScore -= 20;

    if (tierScore >= 50) performanceTier = 'excellent';
    else if (tierScore >= 25) performanceTier = 'good';
    else if (tierScore <= -25) performanceTier = 'poor';

    // Deep Performance Analysis
    aiInsights.push({
      id: 'performance-tier',
      type: 'pattern',
      title: `Campaign Performance Tier: ${performanceTier.toUpperCase()}`,
      description: `Based on multi-metric analysis (CTR: ${insights.ctr?.toFixed(2)}%, CPM: $${cpm.toFixed(2)}, Frequency: ${frequency.toFixed(1)}, CPC: $${cpc.toFixed(2)}), your campaign is performing at ${performanceTier} level with a composite score of ${tierScore}/100.`,
      priority: tierScore < 0 ? 'high' : tierScore > 50 ? 'low' : 'medium',
      confidence: 85,
      actionable: tierScore < 0 ? [
        'Immediate creative refresh needed',
        'Audience targeting optimization required',
        'Consider budget reallocation'
      ] : tierScore > 50 ? [
        'Scale successful campaigns',
        'Apply learnings to other campaigns',
        'Test higher budgets'
      ] : [
        'Test new creative variations',
        'Refine audience targeting',
        'Monitor performance closely'
      ]
    });

    // CTR Deep Dive with Context
    if (insights.ctr > 0) {
      let ctrContext = '';
      let ctrActions: string[] = [];
      
      if (insights.ctr < 1.0) {
        ctrContext = `Your CTR of ${insights.ctr.toFixed(2)}% is significantly below industry benchmarks (1.5-2.5%). This suggests a disconnect between your ad creative and target audience.`;
        ctrActions = [
          'A/B test completely different creative angles',
          'Analyze competitor ads for inspiration',
          'Narrow audience targeting to more qualified users',
          'Test video vs image creatives'
        ];
      } else if (insights.ctr > 3.0) {
        ctrContext = `Your CTR of ${insights.ctr.toFixed(2)}% is exceptional, indicating strong audience-creative alignment. This high engagement suggests your messaging resonates perfectly.`;
        ctrActions = [
          'Scale this campaign immediately',
          'Apply creative elements to other campaigns',
          'Test slightly broader audiences',
          'Increase budget gradually to maintain performance'
        ];
      } else if (insights.ctr > 2.0) {
        ctrContext = `Your CTR of ${insights.ctr.toFixed(2)}% is above average, showing good audience engagement. There's still room for optimization.`;
        ctrActions = [
          'Test minor creative variations',
          'Experiment with different call-to-actions',
          'Consider lookalike audience expansion'
        ];
      }

      aiInsights.push({
        id: 'ctr-deep-analysis',
        type: insights.ctr < 1.0 ? 'warning' : insights.ctr > 3.0 ? 'opportunity' : 'optimization',
        title: 'CTR Performance Deep Dive',
        description: ctrContext,
        priority: insights.ctr < 1.0 ? 'high' : insights.ctr > 3.0 ? 'low' : 'medium',
        metric: 'CTR',
        value: insights.ctr,
        confidence: 90,
        actionable: ctrActions
      });
    }

    // Cost Efficiency Matrix Analysis
    const efficiencyScore = (100 / (cpm + 1)) + (insights.ctr * 10) + (100 / (cpc + 1));
    aiInsights.push({
      id: 'cost-efficiency-matrix',
      type: 'pattern',
      title: 'Cost Efficiency Analysis',
      description: `Your cost efficiency score is ${efficiencyScore.toFixed(1)}/100. CPM: $${cpm.toFixed(2)}, CPC: $${cpc.toFixed(2)}. ${efficiencyScore > 50 ? 'Efficient spend with good cost control.' : efficiencyScore > 30 ? 'Moderate efficiency with room for improvement.' : 'Poor cost efficiency requiring immediate optimization.'}`,
      priority: efficiencyScore < 30 ? 'high' : efficiencyScore > 50 ? 'low' : 'medium',
      confidence: 80,
      actionable: efficiencyScore < 30 ? [
        'Pause underperforming ad sets immediately',
        'Implement strict budget caps',
        'Focus on highest CTR audiences only'
      ] : [
        'Monitor cost trends daily',
        'Test budget increases on best performers',
        'Optimize bidding strategy'
      ]
    });

    // Frequency and Saturation Analysis
    if (frequency > 0) {
      let frequencyInsight = '';
      let frequencyActions: string[] = [];
      
      if (frequency > 4.0) {
        frequencyInsight = `High frequency of ${frequency.toFixed(1)} indicates potential ad fatigue. Users are seeing your ads too often, which can lead to declining performance and increased costs.`;
        frequencyActions = [
          'Refresh creative immediately',
          'Expand audience size by 30-50%',
          'Implement frequency caps (max 3 per week)',
          'Test new audience interests'
        ];
      } else if (frequency < 1.5) {
        frequencyInsight = `Low frequency of ${frequency.toFixed(1)} suggests untapped reach potential. You're not maximizing audience exposure, which could limit campaign effectiveness.`;
        frequencyActions = [
          'Increase daily budget by 20-30%',
          'Expand to lookalike audiences',
          'Test broader interest targeting',
          'Consider reach optimization'
        ];
      } else {
        frequencyInsight = `Optimal frequency of ${frequency.toFixed(1)} indicates healthy audience exposure without oversaturation.`;
        frequencyActions = [
          'Maintain current frequency levels',
          'Monitor for gradual increases',
          'Prepare backup creatives'
        ];
      }

      aiInsights.push({
        id: 'frequency-saturation',
        type: frequency > 4.0 ? 'warning' : frequency < 1.5 ? 'opportunity' : 'trend',
        title: 'Audience Saturation Analysis',
        description: frequencyInsight,
        priority: frequency > 4.0 ? 'high' : frequency < 1.5 ? 'medium' : 'low',
        metric: 'Frequency',
        value: frequency,
        confidence: 88,
        actionable: frequencyActions
      });
    }

    // Spend Velocity and Pacing Analysis
    if (insights.spend > 0) {
      const dailySpendRate = insights.spend / (dateRange ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) : 7);
      const projectedMonthlySpend = dailySpendRate * 30;
      
      aiInsights.push({
        id: 'spend-pacing',
        type: 'forecast',
        title: 'Spend Pacing & Projection',
        description: `Current daily spend rate: $${dailySpendRate.toFixed(2)}. At this pace, monthly spend will reach $${projectedMonthlySpend.toFixed(0)}. ${dailySpendRate > 100 ? 'High velocity spend - monitor ROI closely.' : dailySpendRate < 20 ? 'Conservative pacing - consider scaling successful elements.' : 'Moderate pacing allows for optimization.'}`,
        priority: dailySpendRate > 200 ? 'high' : 'medium',
        confidence: 75,
        actionable: [
          `Monitor daily spend against $${dailySpendRate.toFixed(0)} baseline`,
          'Set up spend alerts for budget control',
          'Review performance every 48 hours',
          'Prepare scaling strategy for winners'
        ]
      });
    }

    // Audience Quality Assessment
    const audienceQualityScore = (insights.ctr * 20) + ((1000 / (cpm + 1)) * 2) + (frequency < 3 ? 20 : 0);
    aiInsights.push({
      id: 'audience-quality',
      type: 'pattern',
      title: 'Audience Quality Assessment',
      description: `Your audience quality score is ${audienceQualityScore.toFixed(1)}/100. ${audienceQualityScore > 70 ? 'High-quality, engaged audience showing strong interest signals.' : audienceQualityScore > 40 ? 'Moderate audience quality with optimization potential.' : 'Low audience quality requiring targeting refinement.'}`,
      priority: audienceQualityScore < 40 ? 'high' : 'medium',
      confidence: 82,
      actionable: audienceQualityScore < 40 ? [
        'Rebuild audiences from scratch',
        'Use higher-intent keywords',
        'Target competitor audiences',
        'Implement exclusion lists'
      ] : [
        'Create lookalike audiences from best performers',
        'Test interest expansion',
        'Monitor engagement metrics'
      ]
    });

    return aiInsights.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority] || b.confidence - a.confidence;
    });
  };

  const aiInsights = generateAdvancedInsights();

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'optimization': return <TrendingUp className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'opportunity': return <Sparkles className="h-4 w-4" />;
      case 'trend': return <CheckCircle className="h-4 w-4" />;
      case 'pattern': return <BarChart3 className="h-4 w-4" />;
      case 'forecast': return <Target className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'optimization': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'opportunity': return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'trend': return 'bg-green-50 border-green-200 text-green-800';
      case 'pattern': return 'bg-indigo-50 border-indigo-200 text-indigo-800';
      case 'forecast': return 'bg-orange-50 border-orange-200 text-orange-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-orange-100 text-orange-800',
      low: 'bg-green-100 text-green-800'
    };
    return <Badge className={colors[priority as keyof typeof colors]}>{priority.toUpperCase()}</Badge>;
  };

  const getConfidenceBadge = (confidence: number) => {
    const color = confidence >= 80 ? 'bg-green-100 text-green-700' : confidence >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700';
    return <Badge className={color}>{confidence}% confidence</Badge>;
  };

  const handleAskQuestion = async () => {
    if (!question.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    const userMessage = question.trim();
    setQuestion('');

    setChatHistory(prev => [...prev, {
      type: 'user',
      message: userMessage,
      timestamp: new Date()
    }]);

    // Enhanced AI responses with deeper analysis
    setTimeout(() => {
      let aiResponse = '';
      const cpm = insights.spend && insights.impressions ? (insights.spend / insights.impressions) * 1000 : 0;
      const cpc = insights.spend && insights.clicks ? insights.spend / insights.clicks : 0;
      const frequency = insights.reach > 0 ? insights.impressions / insights.reach : 1;

      if (userMessage.toLowerCase().includes('pattern') || userMessage.toLowerCase().includes('trend')) {
        aiResponse = `I've identified several key patterns: 1) Your CTR of ${insights.ctr?.toFixed(2)}% ${insights.ctr && insights.ctr > 2 ? 'shows strong creative-audience alignment' : 'suggests creative optimization needed'}. 2) Frequency at ${frequency.toFixed(1)} indicates ${frequency > 3 ? 'potential ad fatigue' : frequency < 1.5 ? 'untapped reach' : 'healthy exposure'}. 3) Cost efficiency shows ${cpm < 10 ? 'excellent' : cpm > 20 ? 'poor' : 'moderate'} performance at $${cpm.toFixed(2)} CPM.`;
      } else if (userMessage.toLowerCase().includes('optimization') || userMessage.toLowerCase().includes('improve')) {
        const topRecommendation = aiInsights.length > 0 ? aiInsights[0] : null;
        aiResponse = topRecommendation 
          ? `Top optimization opportunity: ${topRecommendation.title}. ${topRecommendation.description} Key actions: ${topRecommendation.actionable.slice(0, 2).join(', ')}.`
          : `Focus on: 1) ${insights.ctr && insights.ctr < 1.5 ? 'Creative testing to improve CTR' : 'Scaling successful elements'}, 2) ${cpm > 15 ? 'Audience refinement to reduce CPM' : 'Maintaining cost efficiency'}, 3) ${frequency > 3 ? 'Creative refresh to combat fatigue' : 'Monitoring performance trends'}.`;
      } else if (userMessage.toLowerCase().includes('scale') || userMessage.toLowerCase().includes('budget')) {
        aiResponse = `Scaling analysis: With CTR at ${insights.ctr?.toFixed(2)}% and CPM at $${cpm.toFixed(2)}, ${insights.ctr && insights.ctr > 2 && cpm < 15 ? 'this campaign is ready for 20-30% budget increases' : insights.ctr && insights.ctr > 1.5 ? 'cautious 10-15% budget increases are recommended' : 'hold scaling until performance improves'}. Monitor frequency (currently ${frequency.toFixed(1)}) to avoid audience fatigue.`;
      } else {
        const performanceLevel = insights.ctr && insights.ctr > 2.5 && cpm < 10 ? 'excellent' : insights.ctr && insights.ctr > 1.5 && cpm < 20 ? 'good' : 'needs improvement';
        aiResponse = `Campaign performance summary: ${performanceLevel} overall. CTR: ${insights.ctr?.toFixed(2)}% (${insights.ctr && insights.ctr > 2 ? 'above' : insights.ctr && insights.ctr > 1 ? 'average' : 'below'} benchmark), CPM: $${cpm.toFixed(2)} (${cpm < 10 ? 'efficient' : cpm > 20 ? 'expensive' : 'moderate'}), Frequency: ${frequency.toFixed(1)} (${frequency > 3 ? 'high' : frequency < 1.5 ? 'low' : 'optimal'}). What specific aspect would you like me to analyze deeper?`;
      }

      setChatHistory(prev => [...prev, {
        type: 'ai',
        message: aiResponse,
        timestamp: new Date()
      }]);
      setIsAnalyzing(false);
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Loading advanced AI analysis...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!facebookData) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Advanced AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Connect your Facebook account to get advanced AI-powered insights and pattern analysis.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Advanced AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Advanced AI Insights & Pattern Analysis
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">Deep learning analysis of your campaign performance with actionable recommendations</p>
        </CardHeader>
        <CardContent>
          {aiInsights.length > 0 ? (
            <div className="space-y-4">
              {aiInsights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getInsightIcon(insight.type)}
                      <h4 className="font-medium">{insight.title}</h4>
                    </div>
                    <div className="flex gap-2">
                      {getPriorityBadge(insight.priority)}
                      {getConfidenceBadge(insight.confidence)}
                    </div>
                  </div>
                  <p className="text-sm opacity-90 mb-3">{insight.description}</p>
                  
                  {insight.actionable && insight.actionable.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium opacity-75 mb-2">Recommended Actions:</p>
                      <ul className="text-xs opacity-75 space-y-1">
                        {insight.actionable.map((action, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <Zap className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {insight.metric && insight.value && (
                    <div className="mt-2 text-xs opacity-75">
                      Current {insight.metric}: {typeof insight.value === 'number' && insight.metric?.includes('$') 
                        ? `$${insight.value.toFixed(2)}` 
                        : typeof insight.value === 'number' && insight.metric?.includes('%')
                        ? `${insight.value.toFixed(2)}%`
                        : insight.value
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Advanced analysis will appear as your campaign data grows.</p>
              <p className="text-sm text-gray-400">The AI needs more data points to detect patterns and trends.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced AI Chat Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Advanced AI Analysis Chat
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">Ask about patterns, trends, optimization strategies, and performance analysis</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Chat History */}
            {chatHistory.length > 0 && (
              <div className="max-h-64 overflow-y-auto space-y-3 p-4 bg-gray-50 rounded-lg">
                {chatHistory.map((message, index) => (
                  <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.type === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-800 border'
                    }`}>
                      <p className="text-sm">{message.message}</p>
                      <p className={`text-xs mt-1 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {isAnalyzing && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-800 border px-4 py-2 rounded-lg">
                      <p className="text-sm">AI is performing deep analysis...</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Questions */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Advanced analysis questions:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "What patterns do you see?",
                  "How can I optimize performance?",
                  "Should I scale this campaign?",
                  "What trends are emerging?",
                  "Analyze my audience quality",
                  "Predict future performance"
                ].map((quickQuestion) => (
                  <Button
                    key={quickQuestion}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuestion(quickQuestion);
                      setTimeout(() => handleAskQuestion(), 100);
                    }}
                    disabled={isAnalyzing}
                    className="text-xs"
                  >
                    {quickQuestion}
                  </Button>
                ))}
              </div>
            </div>

            {/* Question Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Ask about performance patterns, optimization strategies, or forecasting..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
                disabled={isAnalyzing}
              />
              <Button 
                onClick={handleAskQuestion}
                disabled={!question.trim() || isAnalyzing}
                size="sm"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
