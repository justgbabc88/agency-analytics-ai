
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface MetricConfig {
  id: string;
  label: string;
  category: string;
  visible: boolean;
  color: string;
}

const defaultMetrics: MetricConfig[] = [
  { id: 'revenue', label: 'Total Revenue', category: 'Financial', visible: true, color: '#10B981' },
  { id: 'roas', label: 'ROAS', category: 'Financial', visible: true, color: '#3B82F6' },
  { id: 'spend', label: 'Ad Spend', category: 'Financial', visible: true, color: '#EF4444' },
  { id: 'visitors', label: 'Total Visitors', category: 'Traffic', visible: true, color: '#8B5CF6' },
  { id: 'leads', label: 'Leads Generated', category: 'Conversion', visible: true, color: '#F59E0B' },
  { id: 'conversion_rate', label: 'Conversion Rate', category: 'Conversion', visible: true, color: '#06B6D4' },
  { id: 'cpc', label: 'Cost Per Click', category: 'Cost', visible: false, color: '#F97316' },
  { id: 'cpl', label: 'Cost Per Lead', category: 'Cost', visible: false, color: '#84CC16' },
  { id: 'email_open_rate', label: 'Email Open Rate', category: 'Email', visible: true, color: '#EC4899' },
  { id: 'email_ctr', label: 'Email CTR', category: 'Email', visible: true, color: '#6366F1' },
];

interface MetricCustomizerProps {
  onMetricsChange: (metrics: MetricConfig[]) => void;
  className?: string;
}

export const MetricCustomizer = ({ onMetricsChange, className }: MetricCustomizerProps) => {
  const [metrics, setMetrics] = useState<MetricConfig[]>(defaultMetrics);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleMetric = (metricId: string) => {
    const updatedMetrics = metrics.map(metric => 
      metric.id === metricId ? { ...metric, visible: !metric.visible } : metric
    );
    setMetrics(updatedMetrics);
    onMetricsChange(updatedMetrics);
  };

  const visibleMetrics = metrics.filter(m => m.visible);
  const categories = [...new Set(metrics.map(m => m.category))];

  if (!isExpanded) {
    return (
      <div className={className}>
        <Button 
          variant="outline" 
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Customize Metrics ({visibleMetrics.length})
        </Button>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Metric Configuration
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-gray-600">Visible metrics:</span>
          {visibleMetrics.map(metric => (
            <Badge key={metric.id} variant="secondary" className="text-xs">
              {metric.label}
            </Badge>
          ))}
        </div>

        {categories.map(category => (
          <div key={category} className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">{category}</h4>
            <div className="space-y-2 ml-4">
              {metrics
                .filter(metric => metric.category === category)
                .map(metric => (
                  <div key={metric.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={metric.id}
                      checked={metric.visible}
                      onCheckedChange={() => toggleMetric(metric.id)}
                    />
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: metric.color }}
                      />
                      <label
                        htmlFor={metric.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {metric.label}
                      </label>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
