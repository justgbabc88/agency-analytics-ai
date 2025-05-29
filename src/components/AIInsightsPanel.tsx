
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAIInsights } from "@/hooks/useAIInsights";
import { Brain, AlertTriangle, TrendingUp, Lightbulb, Check } from "lucide-react";

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'alert': return <AlertTriangle className="h-4 w-4" />;
    case 'optimization': return <TrendingUp className="h-4 w-4" />;
    case 'recommendation': return <Lightbulb className="h-4 w-4" />;
    default: return <Brain className="h-4 w-4" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical': return 'bg-red-100 text-red-700';
    case 'high': return 'bg-orange-100 text-orange-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    case 'low': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

export const AIInsightsPanel = () => {
  const { insights, markAsRead } = useAIInsights();

  const unreadInsights = insights?.filter(insight => !insight.is_read) || [];
  const recentInsights = insights?.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-blue-600" />
          AI Insights
          {unreadInsights.length > 0 && (
            <Badge variant="destructive">{unreadInsights.length} new</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentInsights.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No insights available yet. AI will analyze your data and provide recommendations.
          </p>
        ) : (
          recentInsights.map((insight) => (
            <div
              key={insight.id}
              className={`p-4 border rounded-lg ${
                !insight.is_read ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getInsightIcon(insight.insight_type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{insight.title}</h4>
                      <Badge className={getPriorityColor(insight.priority)} variant="secondary">
                        {insight.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(insight.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {!insight.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAsRead.mutate(insight.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
