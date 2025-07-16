
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Bot, User, Lightbulb, TrendingUp, AlertTriangle, Brain } from "lucide-react";
import { useState } from "react";
import { useGoogleSheetsData } from "@/hooks/useGoogleSheetsData";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { subDays, startOfDay, endOfDay } from "date-fns";

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
  dateRange?: { from: Date; to: Date };
}

const quickQuestions = [
  "How is my Facebook campaign performing?",
  "What's my current conversion rate?",
  "How can I improve my ROAS?",
  "Show me my booking trends",
  "What are my top optimization opportunities?",
  "How many leads did I get this week?",
];

export const AIChatPanel = ({ className, dateRange }: AIChatPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { syncedData, calculateMetricsFromSyncedData } = useGoogleSheetsData();
  const { selectedProjectId } = useProjects();

  // Default date range to last 7 days if not provided
  const defaultDateRange = dateRange || {
    from: startOfDay(subDays(new Date(), 6)),
    to: endOfDay(new Date())
  };

  // Initialize with welcome message
  useState(() => {
    const welcomeMessage: Message = {
      id: '1',
      type: 'ai',
      content: selectedProjectId ? 
        "Hi! I'm your AI Marketing Assistant. I have access to your Facebook ads, Calendly bookings, form submissions, and tracking data. What would you like to analyze or optimize?" :
        "Hi! I'm your AI Marketing Assistant. Please select a project from the navbar to get personalized insights based on your campaign data!",
      timestamp: new Date(),
      suggestions: selectedProjectId ? quickQuestions.slice(0, 3) : []
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

    try {
      // Call the enhanced ChatGPT function
      const { data, error } = await supabase.functions.invoke('chat-gpt', {
        body: { 
          messages: [
            { role: 'user', content: content }
          ],
          context: {
            type: 'marketing_analysis',
            hasGoogleSheets: !!syncedData,
            currentMetrics: calculateMetricsFromSyncedData()
          },
          projectId: selectedProjectId,
          dateRange: defaultDateRange
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to get AI response');
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.response || "I'm sorry, I couldn't process your request right now. Please try again.",
        timestamp: new Date(),
        suggestions: generateSuggestions(content)
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I'm experiencing some technical difficulties. Please try again in a moment. In the meantime, you can check your data in the other tabs.",
        timestamp: new Date(),
        suggestions: quickQuestions.slice(0, 2)
      };
      
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const generateSuggestions = (question: string): string[] => {
    const lowerQuestion = question.toLowerCase();
    
    // Return relevant follow-up questions based on the user's question
    if (lowerQuestion.includes('facebook') || lowerQuestion.includes('ads')) {
      return ["What's my campaign CTR?", "How can I reduce my CPC?"];
    }
    if (lowerQuestion.includes('conversion') || lowerQuestion.includes('booking')) {
      return ["Show me booking trends", "What's affecting my conversion rate?"];
    }
    if (lowerQuestion.includes('lead') || lowerQuestion.includes('form')) {
      return ["How many leads this month?", "What's my cost per lead?"];
    }
    
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
          <Badge variant="secondary" className="ml-auto">GPT-4.1</Badge>
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
            {quickQuestions.slice(0, 3).map((question, index) => (
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
              placeholder="Ask anything about your marketing data..."
              className="flex-1"
              disabled={isTyping}
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
