
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Bell, Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";


interface Alert {
  id: string;
  metric: string;
  condition: 'below' | 'above';
  threshold: number;
  isActive: boolean;
  lastTriggered?: Date;
  currentValue?: number;
  isTriggered?: boolean;
}

const availableMetrics = [
  { value: 'conversionRate', label: 'Conversion Rate (%)' },
  { value: 'roas', label: 'ROAS' },
  { value: 'revenue', label: 'Daily Revenue ($)' },
  { value: 'conversions', label: 'Daily Conversions' },
  { value: 'cost', label: 'Daily Ad Spend ($)' },
  { value: 'cpc', label: 'Cost Per Click ($)' },
  { value: 'ctr', label: 'Click Through Rate (%)' },
];

export const AlertSystem = () => {
  
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      metric: 'conversionRate',
      condition: 'below',
      threshold: 3.0,
      isActive: true,
      lastTriggered: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: '2',
      metric: 'roas',
      condition: 'below',
      threshold: 2.5,
      isActive: true,
    },
  ]);

  const [newAlert, setNewAlert] = useState({
    metric: '',
    condition: 'below' as 'below' | 'above',
    threshold: 0,
  });

  // Get current metrics and check alerts
  const currentMetrics = null;

  // Update alerts with current values and trigger status
  useEffect(() => {
    if (currentMetrics) {
      setAlerts(prevAlerts => 
        prevAlerts.map(alert => {
          const currentValue = currentMetrics[alert.metric as keyof typeof currentMetrics] as number || 0;
          const isTriggered = alert.condition === 'below' 
            ? currentValue < alert.threshold 
            : currentValue > alert.threshold;
          
          return {
            ...alert,
            currentValue,
            isTriggered: isTriggered && alert.isActive,
            lastTriggered: isTriggered && alert.isActive ? new Date() : alert.lastTriggered
          };
        })
      );
    }
  }, [currentMetrics]);

  const addAlert = () => {
    if (!newAlert.metric || newAlert.threshold <= 0) return;

    const alert: Alert = {
      id: Date.now().toString(),
      metric: newAlert.metric,
      condition: newAlert.condition,
      threshold: newAlert.threshold,
      isActive: true,
    };

    setAlerts([...alerts, alert]);
    setNewAlert({ metric: '', condition: 'below', threshold: 0 });
  };

  const removeAlert = (id: string) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  const toggleAlert = (id: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, isActive: !alert.isActive } : alert
    ));
  };

  const getMetricLabel = (value: string) => {
    return availableMetrics.find(m => m.value === value)?.label || value;
  };

  const formatMetricValue = (value: number, metric: string) => {
    if (metric.includes('Rate') || metric === 'ctr') {
      return `${value.toFixed(1)}%`;
    }
    if (metric.includes('cost') || metric.includes('revenue') || metric.includes('cpc')) {
      return `$${value.toFixed(2)}`;
    }
    if (metric === 'roas') {
      return value.toFixed(2);
    }
    return Math.round(value).toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Performance Alerts
          {currentMetrics && (
            <Badge variant="outline" className="ml-2">
              Live Data Connected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing Alerts */}
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 border rounded-lg ${
                alert.isTriggered ? 'bg-red-50 border-red-200' :
                alert.isActive ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-1 rounded ${
                    alert.isTriggered ? 'bg-red-100' :
                    alert.isActive ? 'bg-orange-100' : 'bg-gray-100'
                  }`}>
                    <AlertTriangle className={`h-4 w-4 ${
                      alert.isTriggered ? 'text-red-600' :
                      alert.isActive ? 'text-orange-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">
                      {getMetricLabel(alert.metric)} {alert.condition} {alert.threshold}
                      {alert.metric.includes('Rate') || alert.metric === 'ctr' ? '%' : 
                       alert.metric === 'roas' ? '' :
                       alert.metric.includes('cost') || alert.metric.includes('revenue') || alert.metric.includes('cpc') ? '$' : ''}
                    </p>
                    {alert.currentValue !== undefined && (
                      <p className="text-sm text-gray-600">
                        Current: {formatMetricValue(alert.currentValue, alert.metric)}
                      </p>
                    )}
                    {alert.isTriggered && (
                      <p className="text-sm text-red-600 font-medium">
                        ⚠️ Alert triggered now!
                      </p>
                    )}
                    {alert.lastTriggered && !alert.isTriggered && (
                      <p className="text-sm text-gray-500">
                        Last triggered: {alert.lastTriggered.toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    alert.isTriggered ? "destructive" :
                    alert.isActive ? "default" : "secondary"
                  }>
                    {alert.isTriggered ? 'Triggered' : alert.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAlert(alert.id)}
                  >
                    {alert.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAlert(alert.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Current Metrics Display */}
        {currentMetrics && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Current Metrics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-gray-600">Conversion Rate</div>
                <div className="font-medium">{currentMetrics.conversionRate.toFixed(1)}%</div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-gray-600">ROAS</div>
                <div className="font-medium">{currentMetrics.roas.toFixed(2)}</div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-gray-600">Revenue</div>
                <div className="font-medium">${currentMetrics.revenue.toLocaleString()}</div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-gray-600">Cost</div>
                <div className="font-medium">${currentMetrics.cost.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Add New Alert */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Alert
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select
              value={newAlert.metric}
              onValueChange={(value) => setNewAlert({ ...newAlert, metric: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                {availableMetrics.map((metric) => (
                  <SelectItem key={metric.value} value={metric.value}>
                    {metric.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={newAlert.condition}
              onValueChange={(value: 'below' | 'above') => setNewAlert({ ...newAlert, condition: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="below">Falls below</SelectItem>
                <SelectItem value="above">Goes above</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Threshold"
              value={newAlert.threshold || ''}
              onChange={(e) => setNewAlert({ ...newAlert, threshold: parseFloat(e.target.value) || 0 })}
            />

            <Button onClick={addAlert} disabled={!newAlert.metric || newAlert.threshold <= 0}>
              Add Alert
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
