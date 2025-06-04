
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Brain, MessageSquare, TrendingUp, AlertTriangle, CheckCircle, Send, Sparkles } from "lucide-react";
import { useFacebookData } from "@/hooks/useFacebookData";

interface FacebookAIInsightsProps {
  dateRange?: { from: Date; to: Date };
}

interface AIInsight {
  id: string;
  type: 'optimization' | 'warning' | 'trend' | 'opportunity';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  metric?: string;
  value?: number;
}

export const FacebookAIInsights = ({ dateRange }: FacebookAIInsightsProps) => {
  const { facebookData, insights, isLoading } = useFacebookData({ dateRange });
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ type: 'user' | 'ai'; message: string; timestamp: Date }>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Generate AI insights based on the Facebook data
  const generateInsights = (): AIInsight[] => {
    if (!insights || isLoading) return [];

    const aiInsights: AIInsight[] = [];

    // CTR Analysis
    if (insights.ctr > 0) {
      if (insights.ctr < 1.0) {
        aiInsights.push({
          id: 'ctr-low',
          type: 'warning',
          title: 'Low Click-Through Rate',
          description: `Your CTR of ${insights.ctr.toFixed(2)}% is below the 1.0% benchmark. Consider testing new ad creatives or refining your audience targeting.`,
          priority: 'high',
          metric: 'CTR',
          value: insights.ctr
        });
      } else if (insights.ctr > 2.0) {
        aiInsights.push({
          id: 'ctr-high',
          type: 'trend',
          title: 'Excellent Click-Through Rate',
          description: `Your CTR of ${insights.ctr.toFixed(2)}% is performing well above average. Consider scaling this campaign or applying similar strategies to other campaigns.`,
          priority: 'medium',
          metric: 'CTR',
          value: insights.ctr
        });
      }
    }

    // CPC Analysis
    const cpc = insights.clicks > 0 ? insights.spend / insights.clicks : 0;
    if (cpc > 0) {
      if (cpc > 2.0) {
        aiInsights.push({
          id: 'cpc-high',
          type: 'optimization',
          title: 'High Cost Per Click',
          description: `Your CPC of $${cpc.toFixed(2)} is elevated. Consider optimizing your bidding strategy or improving your ad relevance score.`,
          priority: 'high',
          metric: 'CPC',
          value: cpc
        });
      }
    }

    // Frequency Analysis
    const frequency = insights.reach > 0 ? insights.impressions / insights.reach : 1;
    if (frequency > 3.0) {
      aiInsights.push({
        id: 'frequency-high',
        type: 'warning',
        title: 'High Ad Frequency',
        description: `Your frequency of ${frequency.toFixed(1)} indicates users are seeing your ads frequently. Consider refreshing your creative or expanding your audience.`,
        priority: 'medium',
        metric: 'Frequency',
        value: frequency
      });
    }

    // Conversion Analysis
    if (insights.conversions > 0 && insights.clicks > 0) {
      const conversionRate = (insights.conversions / insights.clicks) * 100;
      if (conversionRate < 2.0) {
        aiInsights.push({
          id: 'conversion-low',
          type: 'opportunity',
          title: 'Conversion Rate Opportunity',
          description: `Your conversion rate of ${conversionRate.toFixed(2)}% has room for improvement. Consider optimizing your landing page or refining your audience.`,
          priority: 'medium',
          metric: 'Conversion Rate',
          value: conversionRate
        });
      }
    }

    // Spend Analysis
    if (insights.spend > 0) {
      if (insights.spend > 1000 && insights.conversions < 10) {
        aiInsights.push({
          id: 'spend-efficiency',
          type: 'warning',
          title: 'Spend Efficiency Alert',
          description: `You've spent $${insights.spend.toFixed(2)} with ${insights.conversions} conversions. Consider pausing underperforming ads and reallocating budget.`,
          priority: 'high',
          metric: 'Spend Efficiency',
          value: insights.spend / Math.max(insights.conversions, 1)
        });
      }
    }

    return aiInsights;
  };

  const aiInsights = generateInsights();

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'optimization': return <TrendingUp className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'opportunity': return <Sparkles className="h-4 w-4" />;
      case 'trend': return <CheckCircle className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'optimization': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'opportunity': return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'trend': return 'bg-green-50 border-green-200 text-green-800';
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

  const handleAskQuestion = async () => {
    if (!question.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    const userMessage = question.trim();
    setQuestion('');

    // Add user message to chat
    setChatHistory(prev => [...prev, {
      type: 'user',
      message: userMessage,
      timestamp: new Date()
    }]);

    // Simulate AI response based on the data
    setTimeout(() => {
      let aiResponse = '';

      if (userMessage.toLowerCase().includes('ctr') || userMessage.toLowerCase().includes('click')) {
        aiResponse = `Your current CTR is ${insights.ctr?.toFixed(2)}%. ${insights.ctr && insights.ctr < 1.5 ? 'This is below the industry average of 1.5-2%. Consider testing new ad creatives or refining your audience targeting.' : 'This is performing well! Consider scaling successful campaigns.'}`;
      } else if (userMessage.toLowerCase().includes('spend') || userMessage.toLowerCase().includes('cost')) {
        const cpc = insights.clicks > 0 ? insights.spend / insights.clicks : 0;
        aiResponse = `You've spent $${insights.spend?.toFixed(2)} with a CPC of $${cpc.toFixed(2)}. ${cpc > 2 ? 'Your CPC is elevated - consider optimizing your bidding strategy.' : 'Your CPC is reasonable for your industry.'}`;
      } else if (userMessage.toLowerCase().includes('conversion')) {
        const conversionRate = insights.clicks > 0 ? (insights.conversions / insights.clicks) * 100 : 0;
        aiResponse = `Your conversion rate is ${conversionRate.toFixed(2)}%. ${conversionRate < 2 ? 'There\'s room for improvement - consider optimizing your landing page experience.' : 'Your conversion rate is performing well!'}`;
      } else if (userMessage.toLowerCase().includes('frequency')) {
        const frequency = insights.reach > 0 ? insights.impressions / insights.reach : 1;
        aiResponse = `Your ad frequency is ${frequency.toFixed(1)}. ${frequency > 3 ? 'This is high - users are seeing your ads frequently. Consider refreshing your creative.' : 'Your frequency is healthy.'}`;
      } else {
        aiResponse = `Based on your Facebook Ads data: You have ${insights.impressions?.toLocaleString()} impressions, ${insights.clicks?.toLocaleString()} clicks, and spent $${insights.spend?.toFixed(2)}. Your CTR is ${insights.ctr?.toFixed(2)}% and you have ${insights.conversions} conversions. Is there a specific metric you'd like me to analyze further?`;
      }

      setChatHistory(prev => [...prev, {
        type: 'ai',
        message: aiResponse,
        timestamp: new Date()
      }]);
      setIsAnalyzing(false);
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Loading AI analysis...</p>
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
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Connect your Facebook account to get AI-powered insights.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aiInsights.length > 0 ? (
            <div className="space-y-4">
              {aiInsights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getInsightIcon(insight.type)}
                      <h4 className="font-medium">{insight.title}</h4>
                    </div>
                    {getPriorityBadge(insight.priority)}
                  </div>
                  <p className="text-sm opacity-90">{insight.description}</p>
                  {insight.metric && insight.value && (
                    <div className="mt-2 text-xs opacity-75">
                      {insight.metric}: {typeof insight.value === 'number' && insight.metric?.includes('$') 
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
              <p className="text-gray-500">No specific insights available yet.</p>
              <p className="text-sm text-gray-400">AI analysis will appear as your campaign data grows.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Chat Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Ask AI About Your Data
          </CardTitle>
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
                      <p className="text-sm">AI is analyzing your data...</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Questions */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "How is my CTR performing?",
                  "Is my spend efficient?",
                  "What about my conversion rate?",
                  "Should I adjust my frequency?"
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
                placeholder="Ask about your Facebook Ads performance..."
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
