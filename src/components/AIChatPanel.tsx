
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Bot, User, Lightbulb, TrendingUp, AlertTriangle, Brain } from "lucide-react";
import { useState } from "react";
import { useGoogleSheetsData } from "@/hooks/useGoogleSheetsData";

interface Message {
  id: string;
  type: 'user' | 'ai' | 'insight';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

interface AIChatPanelProps {
  className?: string;
}

const quickQuestions = [
  "Why is my ROAS declining?",
  "How can I improve conversion rates?",
  "What's the best performing funnel?",
  "Show me optimization opportunities",
];

export const AIChatPanel = ({ className }: AIChatPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { syncedData, calculateMetricsFromSyncedData } = useGoogleSheetsData();

  // Generate AI insights based on current data
  const generateDataInsights = () => {
    const currentMetrics = calculateMetricsFromSyncedData();
    if (!currentMetrics || !syncedData) return [];

    const insights: Message[] = [];

    // ROAS Analysis
    if (currentMetrics.roas < 2) {
      insights.push({
        id: `insight-roas-${Date.now()}`,
        type: 'insight',
        content: `⚠️ Critical Alert: Your ROAS of ${currentMetrics.roas.toFixed(2)} is below the healthy threshold of 2.0. With $${currentMetrics.cost.toLocaleString()} in ad spend, you need immediate optimization to improve profitability.`,
        timestamp: new Date(),
        priority: 'critical'
      });
    } else if (currentMetrics.roas > 4) {
      insights.push({
        id: `insight-roas-${Date.now()}`,
        type: 'insight',
        content: `🎯 Excellent Performance: Your ROAS of ${currentMetrics.roas.toFixed(2)} is outstanding! Consider scaling your budget to maximize this strong performance.`,
        timestamp: new Date(),
        priority: 'high'
      });
    }

    // Conversion Rate Analysis
    if (currentMetrics.conversionRate < 2) {
      insights.push({
        id: `insight-conv-${Date.now()}`,
        type: 'insight',
        content: `📊 Optimization Opportunity: Your conversion rate of ${currentMetrics.conversionRate.toFixed(1)}% is below average. Focus on landing page optimization and audience targeting to improve results.`,
        timestamp: new Date(),
        priority: 'high'
      });
    }

    // Data Quality Insight
    if (currentMetrics.dataRows > 0) {
      insights.push({
        id: `insight-data-${Date.now()}`,
        type: 'insight',
        content: `📈 Data Analysis: Analyzing ${currentMetrics.dataRows} data points. Your current performance shows ${currentMetrics.conversions.toLocaleString()} conversions with a ${currentMetrics.conversionRate.toFixed(1)}% conversion rate. Total revenue: $${currentMetrics.revenue.toLocaleString()}.`,
        timestamp: new Date(),
        priority: 'medium'
      });
    }

    return insights;
  };

  // Initialize with welcome message and insights
  useState(() => {
    const currentMetrics = calculateMetricsFromSyncedData();
    const insights = generateDataInsights();
    
    const welcomeMessage: Message = {
      id: '1',
      type: 'ai',
      content: currentMetrics ? 
        `Hi! I'm your AI Marketing Assistant. I've analyzed your campaign data and found some key insights. You have ${currentMetrics.dataRows} data points with a current ROAS of ${currentMetrics.roas.toFixed(2)} and conversion rate of ${currentMetrics.conversionRate.toFixed(1)}%. What would you like to optimize?` :
        "Hi! I'm your AI Marketing Assistant. Connect your Google Sheets to get personalized insights and recommendations based on your campaign data!",
      timestamp: new Date(),
      suggestions: quickQuestions.slice(0, 2)
    };
    
    setMessages([welcomeMessage, ...insights]);
  });

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: generateAIResponse(content),
        timestamp: new Date(),
        suggestions: generateSuggestions(content)
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (question: string): string => {
    const lowerQuestion = question.toLowerCase();
    const currentMetrics = calculateMetricsFromSyncedData();
    
    if (!currentMetrics) {
      return "I'd love to help you analyze your campaign data! Please connect your Google Sheets in the Integrations tab to get personalized insights based on your actual performance metrics.";
    }

    // Enhanced responses based on actual data trends
    if (lowerQuestion.includes('roas') || lowerQuestion.includes('declining')) {
      const roasStatus = currentMetrics.roas > 4 ? 'excellent' : currentMetrics.roas > 3 ? 'strong' : currentMetrics.roas > 2 ? 'moderate' : 'concerning';
      const recommendations = currentMetrics.roas < 2 ? 
        'URGENT: 1) Pause campaigns with ROAS below 1.5, 2) Analyze your best-performing ads and scale them, 3) Review your targeting - you may be too broad' :
        currentMetrics.roas < 3 ?
        '1) Optimize your highest-traffic keywords, 2) Test new ad creatives, 3) Improve landing page conversion rates' :
        '1) Scale your budget on top performers, 2) Test premium audiences, 3) Expand to similar products';
      
      return `Your current ROAS of ${currentMetrics.roas.toFixed(2)} is ${roasStatus}. With $${currentMetrics.cost.toLocaleString()} in spend generating $${currentMetrics.revenue.toLocaleString()} revenue from ${currentMetrics.dataRows} data points. ${recommendations}`;
    }
    
    if (lowerQuestion.includes('conversion') || lowerQuestion.includes('improve')) {
      const conversionAnalysis = currentMetrics.conversionRate > 5 ? 
        'Your conversion rate is strong! Focus on scaling traffic while maintaining quality.' :
        currentMetrics.conversionRate > 3 ?
        'Your conversion rate is decent but has room for improvement.' :
        'Your conversion rate needs immediate attention.';
        
      return `${conversionAnalysis} Current rate: ${currentMetrics.conversionRate.toFixed(1)}% (${currentMetrics.conversions.toLocaleString()} conversions from ${currentMetrics.clicks.toLocaleString()} clicks). Recommendations: 1) A/B test headlines and CTAs, 2) Reduce form fields, 3) Add social proof and urgency, 4) Optimize for mobile users.`;
    }
    
    if (lowerQuestion.includes('funnel') || lowerQuestion.includes('performing')) {
      const ctr = currentMetrics.clicks > 0 ? (currentMetrics.clicks / currentMetrics.impressions) * 100 : 0;
      const performance = currentMetrics.roas > 3 && currentMetrics.conversionRate > 3 ? 'excellent' : 
                         currentMetrics.roas > 2 && currentMetrics.conversionRate > 2 ? 'good' : 'needs improvement';
      
      return `Funnel Performance Analysis: ${performance}. CTR: ${ctr.toFixed(2)}%, Conversion Rate: ${currentMetrics.conversionRate.toFixed(1)}%, ROAS: ${currentMetrics.roas.toFixed(2)}. ${currentMetrics.roas > 3 ? 'Scale your top campaigns and test similar audiences.' : 'Focus on improving your weakest metrics first - start with the lowest ROAS campaigns.'}`;
    }

    if (lowerQuestion.includes('optimization') || lowerQuestion.includes('opportunities')) {
      const opportunities = [];
      if (currentMetrics.roas < 3) opportunities.push(`Improve ROAS (currently ${currentMetrics.roas.toFixed(2)})`);
      if (currentMetrics.conversionRate < 5) opportunities.push(`Optimize conversion rate (currently ${currentMetrics.conversionRate.toFixed(1)}%)`);
      if (currentMetrics.ctr < 2) opportunities.push('Improve ad creative performance');
      
      const priorityAction = currentMetrics.roas < 2 ? 'URGENT: Fix ROAS first' : 
                            currentMetrics.conversionRate < 2 ? 'Focus on conversion optimization' :
                            'Scale your best performers';
      
      return `Top optimization opportunities: ${opportunities.join(', ')}. Priority: ${priorityAction}. Your data shows ${currentMetrics.dataRows} touchpoints with $${currentMetrics.revenue.toLocaleString()} total revenue. Next steps: Focus on the metric that will have the biggest revenue impact.`;
    }
    
    return `Based on your ${currentMetrics.dataRows} data points: ROAS ${currentMetrics.roas.toFixed(2)}, ${currentMetrics.conversions.toLocaleString()} conversions at ${currentMetrics.conversionRate.toFixed(1)}% rate. ${currentMetrics.roas > 3 ? 'Strong performance - consider scaling!' : currentMetrics.roas > 2 ? 'Good foundation - optimize for growth.' : 'Needs improvement - focus on ROAS first.'} What specific area would you like to improve?`;
  };

  const generateSuggestions = (question: string): string[] => {
    return quickQuestions.filter(q => !q.toLowerCase().includes(question.toLowerCase().split(' ')[0])).slice(0, 2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const getInsightIcon = (type: string, priority?: string) => {
    if (type === 'insight') {
      return priority === 'critical' ? <AlertTriangle className="h-4 w-4 text-red-600" /> :
             priority === 'high' ? <TrendingUp className="h-4 w-4 text-orange-600" /> :
             <Brain className="h-4 w-4 text-blue-600" />;
    }
    return type === 'ai' ? <Bot className="h-4 w-4 text-blue-600" /> : <User className="h-4 w-4 text-gray-600" />;
  };

  const getInsightBgColor = (type: string, priority?: string) => {
    if (type === 'insight') {
      return priority === 'critical' ? 'bg-red-50 border-red-200' :
             priority === 'high' ? 'bg-orange-50 border-orange-200' :
             'bg-blue-50 border-blue-200';
    }
    return type === 'ai' ? 'bg-gray-50 border' : 'bg-blue-600 text-white';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          AI Assistant
          <Badge variant="secondary" className="ml-auto">Live Data</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-96 flex flex-col">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === 'ai' || message.type === 'insight' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {getInsightIcon(message.type, message.priority)}
                </div>
                <div className={`max-w-[80%] ${message.type === 'user' ? 'text-right' : ''}`}>
                  <div className={`p-3 rounded-lg ${getInsightBgColor(message.type, message.priority)}`}>
                    <p className="text-sm">{message.content}</p>
                  </div>
                  {message.suggestions && (
                    <div className="mt-2 space-y-1">
                      {message.suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className="text-xs h-6 px-2 text-blue-600 hover:bg-blue-50"
                          onClick={() => handleSendMessage(suggestion)}
                        >
                          <Lightbulb className="h-3 w-3 mr-1" />
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
                <div className="bg-gray-50 border p-3 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap gap-1">
            {quickQuestions.slice(0, 2).map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="text-xs h-6"
                onClick={() => handleSendMessage(question)}
              >
                {question}
              </Button>
            ))}
          </div>
          
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about your marketing data..."
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={!inputValue.trim() || isTyping}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};
