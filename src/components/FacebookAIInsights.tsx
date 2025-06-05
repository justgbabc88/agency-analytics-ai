
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Brain, MessageSquare, TrendingUp, AlertTriangle, CheckCircle, Send, Sparkles, Target, BarChart3, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { useFacebookData } from "@/hooks/useFacebookData";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const { toast } = useToast();

  // Generate AI-powered insights using ChatGPT
  const generateAIInsights = async () => {
    if (!insights || isGeneratingInsights) return;

    setIsGeneratingInsights(true);
    
    try {
      const context = {
        type: 'facebook_analysis',
        metrics: insights,
        dateRange: dateRange ? {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        } : null,
        campaignData: {
          spend: insights.spend,
          impressions: insights.impressions,
          clicks: insights.clicks,
          ctr: insights.ctr,
          cpc: insights.cpc,
          reach: insights.reach,
          conversions: insights.conversions
        }
      };

      const cpm = insights.spend && insights.impressions ? (insights.spend / insights.impressions) * 1000 : 0;
      const frequency = insights.reach && insights.reach > 0 ? insights.impressions / insights.reach : 1.2;

      const messages = [
        {
          role: 'user',
          content: `Analyze this Facebook campaign data and provide 4-6 concise, actionable insights. For each insight, provide:
          - A short, specific title (max 8 words)
          - A brief description (max 30 words)
          - Priority level (high/medium/low)
          - Type (optimization/warning/opportunity/trend)
          - 2-3 specific action items (max 10 words each)

          Current metrics:
          - Spend: $${insights.spend || 0}
          - Impressions: ${insights.impressions || 0}
          - Clicks: ${insights.clicks || 0}
          - CTR: ${insights.ctr || 0}%
          - CPC: $${insights.cpc || 0}
          - CPM: $${cpm.toFixed(2)}
          - Reach: ${insights.reach || 0}
          - Frequency: ${frequency.toFixed(1)}
          - Conversions: ${insights.conversions || 0}

          Format as JSON array with this structure:
          [{"title": "...", "description": "...", "priority": "high/medium/low", "type": "optimization/warning/opportunity/trend", "actions": ["...", "...", "..."]}]`
        }
      ];

      console.log('Generating AI insights with ChatGPT...');

      const { data, error } = await supabase.functions.invoke('chat-gpt', {
        body: { messages, context }
      });

      if (error) {
        console.error('ChatGPT API error:', error);
        throw new Error(error.message || 'Failed to generate insights');
      }

      if (data?.response) {
        try {
          // Try to parse the JSON response
          const insightsData = JSON.parse(data.response);
          const formattedInsights: AIInsight[] = insightsData.map((insight: any, index: number) => ({
            id: `ai-insight-${index}`,
            type: insight.type || 'optimization',
            title: insight.title,
            description: insight.description,
            priority: insight.priority || 'medium',
            confidence: 85 + Math.random() * 10, // Simulated confidence
            actionable: insight.actions || []
          }));
          
          setAiInsights(formattedInsights);
        } catch (parseError) {
          console.error('Failed to parse ChatGPT response:', parseError);
          // Fallback to text-based insights if JSON parsing fails
          setAiInsights([{
            id: 'ai-fallback',
            type: 'optimization',
            title: 'AI Analysis Complete',
            description: data.response.slice(0, 100) + '...',
            priority: 'medium',
            confidence: 75,
            actionable: ['Review full analysis', 'Implement recommendations']
          }]);
        }
      }
    } catch (error) {
      console.error('Error generating AI insights:', error);
      toast({
        title: "AI Insights Error",
        description: "Failed to generate insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'optimization': return <TrendingUp className="h-3 w-3" />;
      case 'warning': return <AlertTriangle className="h-3 w-3" />;
      case 'opportunity': return <Sparkles className="h-3 w-3" />;
      case 'trend': return <CheckCircle className="h-3 w-3" />;
      case 'pattern': return <BarChart3 className="h-3 w-3" />;
      case 'forecast': return <Target className="h-3 w-3" />;
      default: return <Brain className="h-3 w-3" />;
    }
  };

  const getInsightColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-400 bg-red-50';
      case 'medium': return 'border-l-orange-400 bg-orange-50';
      case 'low': return 'border-l-green-400 bg-green-50';
      default: return 'border-l-gray-400 bg-gray-50';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-700 text-xs px-1.5 py-0.5',
      medium: 'bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5',
      low: 'bg-green-100 text-green-700 text-xs px-1.5 py-0.5'
    };
    return <Badge className={colors[priority as keyof typeof colors]}>{priority.charAt(0).toUpperCase()}</Badge>;
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

    try {
      const context = {
        type: 'facebook_analysis',
        metrics: insights,
        dateRange: dateRange ? {
          from: dateRange.from.toISOString(),
          to: dateRange.to.toISOString()
        } : null,
        campaignData: {
          spend: insights.spend,
          impressions: insights.impressions,
          clicks: insights.clicks,
          ctr: insights.ctr,
          cpc: insights.cpc,
          reach: insights.reach,
          conversions: insights.conversions
        }
      };

      const messages = [
        {
          role: 'user',
          content: `Please analyze my Facebook campaign data and answer this question: "${userMessage}"\n\nCurrent metrics:\n- Spend: $${insights.spend || 0}\n- Impressions: ${insights.impressions || 0}\n- Clicks: ${insights.clicks || 0}\n- CTR: ${insights.ctr || 0}%\n- CPC: $${insights.cpc || 0}\n- Reach: ${insights.reach || 0}\n- Conversions: ${insights.conversions || 0}`
        }
      ];

      const { data, error } = await supabase.functions.invoke('chat-gpt', {
        body: { messages, context }
      });

      if (error) {
        throw new Error(error.message || 'Failed to get AI response');
      }

      if (data?.response) {
        setChatHistory(prev => [...prev, {
          type: 'ai',
          message: data.response,
          timestamp: new Date()
        }]);
      } else {
        throw new Error('No response received from AI');
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast({
        title: "AI Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
      
      setChatHistory(prev => [...prev, {
        type: 'ai',
        message: "I apologize, but I'm having trouble analyzing your data right now. Please ensure your Facebook integration is properly connected and try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsAnalyzing(false);
    }
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
              AI-Powered Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">Connect your Facebook account to get AI-powered insights and analysis.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compact AI Insights */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-purple-600" />
              AI Insights
              <Badge className="bg-green-100 text-green-700 text-xs">ChatGPT</Badge>
            </CardTitle>
            <Button 
              onClick={generateAIInsights}
              disabled={isGeneratingInsights}
              size="sm"
              className="text-xs"
            >
              {isGeneratingInsights ? 'Analyzing...' : 'Generate Insights'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {aiInsights.length > 0 ? (
            <div className="space-y-2">
              {aiInsights.map((insight) => (
                <div
                  key={insight.id}
                  className={`border-l-4 p-3 rounded-r-lg ${getInsightColor(insight.priority)} transition-all duration-200`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2 flex-1">
                      {getInsightIcon(insight.type)}
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                      {getPriorityBadge(insight.priority)}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)}
                      className="h-6 w-6 p-0"
                    >
                      {expandedInsight === insight.id ? 
                        <ChevronUp className="h-3 w-3" /> : 
                        <ChevronDown className="h-3 w-3" />
                      }
                    </Button>
                  </div>
                  
                  <p className="text-xs text-gray-700 mb-2">{insight.description}</p>
                  
                  {expandedInsight === insight.id && insight.actionable && insight.actionable.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-600 mb-1">Actions:</p>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {insight.actionable.map((action, index) => (
                          <li key={index} className="flex items-start gap-1">
                            <Zap className="h-2.5 w-2.5 mt-0.5 flex-shrink-0 text-blue-500" />
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Brain className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-3">Get AI-powered insights for your campaign</p>
              <Button 
                onClick={generateAIInsights}
                disabled={isGeneratingInsights}
                size="sm"
              >
                {isGeneratingInsights ? 'Generating...' : 'Generate AI Insights'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced AI Chat Interface */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            AI Analysis Chat
            <Badge className="bg-blue-100 text-blue-700 text-xs">GPT-4o Mini</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Chat History */}
            {chatHistory.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-gray-50 rounded-lg">
                {chatHistory.map((message, index) => (
                  <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      message.type === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-800 border'
                    }`}>
                      <p className="whitespace-pre-wrap">{message.message}</p>
                      <p className={`text-xs mt-1 ${message.type === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {isAnalyzing && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-800 border px-3 py-2 rounded-lg text-sm">
                      <p>Analyzing your data...</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Questions */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Quick Questions:</p>
              <div className="flex flex-wrap gap-1">
                {[
                  "Optimize my campaigns",
                  "Scale suggestions", 
                  "Audience quality",
                  "Cost efficiency"
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
                    className="text-xs h-7"
                  >
                    {quickQuestion}
                  </Button>
                ))}
              </div>
            </div>

            {/* Question Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Ask about your campaign performance..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleAskQuestion()}
                disabled={isAnalyzing}
                className="text-sm"
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
