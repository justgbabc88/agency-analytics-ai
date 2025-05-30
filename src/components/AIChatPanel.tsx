
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Bot, User, Lightbulb, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useGoogleSheetsData } from "@/hooks/useGoogleSheetsData";

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  suggestions?: string[];
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

  // Initialize with welcome message
  useState(() => {
    const currentMetrics = calculateMetricsFromSyncedData();
    const welcomeMessage: Message = {
      id: '1',
      type: 'ai',
      content: currentMetrics ? 
        `Hi! I'm your AI marketing assistant. I can see you have ${currentMetrics.dataRows} data points in your dashboard with a current ROAS of ${currentMetrics.roas.toFixed(2)}. What would you like to know about your campaigns?` :
        "Hi! I'm your AI marketing assistant. Connect your Google Sheets to get personalized insights, or ask me general marketing questions!",
      timestamp: new Date(),
      suggestions: quickQuestions.slice(0, 2)
    };
    setMessages([welcomeMessage]);
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

    if (lowerQuestion.includes('roas') || lowerQuestion.includes('declining')) {
      const roasStatus = currentMetrics.roas > 3 ? 'strong' : currentMetrics.roas > 2 ? 'moderate' : 'concerning';
      return `Your current ROAS is ${currentMetrics.roas.toFixed(2)}, which is ${roasStatus}. With ${currentMetrics.cost.toLocaleString()} in ad spend generating ${currentMetrics.revenue.toLocaleString()} in revenue, I recommend: 1) Analyze your top-performing campaigns and scale them, 2) Pause campaigns with ROAS below 2.0, 3) Test new creative variations for underperforming ads.`;
    }
    
    if (lowerQuestion.includes('conversion') || lowerQuestion.includes('improve')) {
      return `Your current conversion rate is ${currentMetrics.conversionRate.toFixed(1)}% with ${currentMetrics.conversions.toLocaleString()} conversions from ${currentMetrics.clicks.toLocaleString()} clicks. To improve: 1) A/B test your landing pages, 2) Optimize your checkout flow, 3) Add urgency and social proof elements, 4) Review your traffic quality and targeting.`;
    }
    
    if (lowerQuestion.includes('funnel') || lowerQuestion.includes('performing')) {
      const ctr = currentMetrics.clicks > 0 ? (currentMetrics.clicks / currentMetrics.impressions) * 100 : 0;
      return `Based on your ${currentMetrics.dataRows} data points: Your CTR is ${ctr.toFixed(2)}%, conversion rate is ${currentMetrics.conversionRate.toFixed(1)}%, and ROAS is ${currentMetrics.roas.toFixed(2)}. Focus on scaling campaigns with ROAS above 3.0 and optimizing those below 2.0.`;
    }

    if (lowerQuestion.includes('optimization') || lowerQuestion.includes('opportunities')) {
      const suggestions = [];
      if (currentMetrics.roas < 3) suggestions.push("Improve ROAS by optimizing targeting");
      if (currentMetrics.conversionRate < 5) suggestions.push("Test landing page variations");
      if (currentMetrics.ctr < 2) suggestions.push("Refresh ad creatives");
      
      return `Based on your current metrics, here are optimization opportunities: ${suggestions.join(', ')}. Your current performance: ROAS ${currentMetrics.roas.toFixed(2)}, Conversion Rate ${currentMetrics.conversionRate.toFixed(1)}%, ${currentMetrics.conversions} total conversions.`;
    }
    
    return `I can help you analyze your marketing data. Your current metrics show: ROAS of ${currentMetrics.roas.toFixed(2)}, ${currentMetrics.conversions.toLocaleString()} conversions, and ${currentMetrics.conversionRate.toFixed(1)}% conversion rate. Try asking about specific optimization strategies or performance comparisons.`;
  };

  const generateSuggestions = (question: string): string[] => {
    return quickQuestions.filter(q => !q.toLowerCase().includes(question.toLowerCase().split(' ')[0])).slice(0, 2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          AI Assistant
          <Badge variant="secondary" className="ml-auto">Beta</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-96 flex flex-col">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  message.type === 'ai' ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  {message.type === 'ai' ? (
                    <Bot className="h-4 w-4 text-blue-600" />
                  ) : (
                    <User className="h-4 w-4 text-gray-600" />
                  )}
                </div>
                <div className={`max-w-[80%] ${message.type === 'user' ? 'text-right' : ''}`}>
                  <div className={`p-3 rounded-lg ${
                    message.type === 'ai' 
                      ? 'bg-gray-50 border' 
                      : 'bg-blue-600 text-white'
                  }`}>
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
