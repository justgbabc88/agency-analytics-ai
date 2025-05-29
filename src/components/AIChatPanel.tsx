
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Bot, User, Lightbulb, TrendingUp } from "lucide-react";
import { useState } from "react";

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

const initialMessages: Message[] = [
  {
    id: '1',
    type: 'ai',
    content: "Hi! I'm your AI marketing assistant. I can analyze your dashboard data and provide insights. What would you like to know about your campaigns?",
    timestamp: new Date(),
    suggestions: quickQuestions.slice(0, 2)
  }
];

export const AIChatPanel = ({ className }: AIChatPanelProps) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

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
    
    if (lowerQuestion.includes('roas') || lowerQuestion.includes('declining')) {
      return "Your ROAS has declined by 5.3% to 3.6. This is primarily due to increased ad costs (+$6,000) while revenue growth slowed. I recommend: 1) Review and pause underperforming ad sets, 2) Test new creative variations, 3) Optimize targeting to focus on higher-converting audiences.";
    }
    
    if (lowerQuestion.includes('conversion') || lowerQuestion.includes('improve')) {
      return "Your current conversion rate is 6.8%. To improve it, consider: 1) A/B testing your landing pages, 2) Optimizing your checkout flow, 3) Adding social proof elements, 4) Implementing exit-intent popups. Your book-call funnel has the highest conversion rate at 12.3%.";
    }
    
    if (lowerQuestion.includes('funnel') || lowerQuestion.includes('performing')) {
      return "Based on your data, the Book Call funnel is performing best with a 12.3% conversion rate and $4,200 revenue per visitor. The Low Ticket funnel has the highest volume but lower conversion at 4.8%. Consider scaling the Book Call funnel or applying its strategies to other funnels.";
    }
    
    return "I can help you analyze your marketing data. Try asking about specific metrics like ROAS, conversion rates, or funnel performance. I can also provide optimization recommendations based on your current data.";
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
