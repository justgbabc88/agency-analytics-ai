import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Settings,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useSyncHealth } from '@/hooks/useSyncHealth';
import { useProjects } from '@/hooks/useProjects';
import { format } from 'date-fns';
// import { AlertConfigurationDialog } from './AlertConfigurationDialog';
// import { SyncMetricsChart } from './SyncMetricsChart';

export const SyncHealthDashboard: React.FC = () => {
  const { projects, selectedProjectId } = useProjects();
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const {
    healthSummary,
    activeIncidents,
    alertConfigs,
    isLoading,
    isCheckingHealth,
    triggerHealthCheck,
    resolveIncident,
    refetchAll
  } = useSyncHealth();

  const [showAlertConfig, setShowAlertConfig] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select a project to view sync health</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sync Health Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor integration health and manage alerts for {selectedProject.name}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchAll()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerHealthCheck({})}
            disabled={isCheckingHealth}
          >
            <Activity className="h-4 w-4 mr-2" />
            Run Health Check
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedPlatform('');
              setShowAlertConfig(true);
            }}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure Alerts
          </Button>
        </div>
      </div>

      {/* Active Incidents Alert */}
      {activeIncidents && activeIncidents.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {activeIncidents.length} active incident{activeIncidents.length > 1 ? 's' : ''} require attention
              </span>
              <Button variant="outline" size="sm" onClick={() => refetchAll()}>
                View Details
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="alerts">Alert Config</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Platform Health Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {healthSummary.map((platform) => (
              <Card key={platform.platform} className="relative">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium capitalize">
                    {platform.platform} Health
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(platform.status)}
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(platform.status)}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Health Score</span>
                        <span className="font-medium">{platform.latest_health_score}%</span>
                      </div>
                      <Progress 
                        value={platform.latest_health_score} 
                        className="h-2 mt-1"
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Data Quality</span>
                        <span className="font-medium">{platform.latest_data_quality}%</span>
                      </div>
                      <Progress 
                        value={platform.latest_data_quality} 
                        className="h-2 mt-1"
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Last Check</span>
                      <span>{format(new Date(platform.last_check), 'MMM d, HH:mm')}</span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => triggerHealthCheck({ platform: platform.platform })}
                      disabled={isCheckingHealth}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Check Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Recent Activity</span>
              </CardTitle>
              <CardDescription>
                Latest sync health metrics and incidents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                <p>Metrics visualization coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Health Metrics</CardTitle>
              <CardDescription>
                Detailed sync performance and data quality metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4" />
                <p>Detailed metrics coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Incidents</CardTitle>
              <CardDescription>
                Current sync issues requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeIncidents && activeIncidents.length > 0 ? (
                <div className="space-y-4">
                  {activeIncidents.map((incident) => (
                    <div key={incident.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge variant={getSeverityVariant(incident.severity)}>
                            {incident.severity}
                          </Badge>
                          <span className="font-medium">{incident.title}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveIncident(incident.id)}
                        >
                          Resolve
                        </Button>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        {incident.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Platform: {incident.platform}</span>
                        <span>Triggered: {format(new Date(incident.triggered_at), 'MMM d, HH:mm')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No active incidents</p>
                  <p className="text-sm">All integrations are running smoothly</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alert Configurations</CardTitle>
              <CardDescription>
                Manage thresholds and notification settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  onClick={() => {
                    setSelectedPlatform('');
                    setShowAlertConfig(true);
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Add New Alert
                </Button>

                {alertConfigs && alertConfigs.length > 0 ? (
                  <div className="space-y-3">
                    {alertConfigs.map((config) => (
                      <div key={config.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{config.platform}</Badge>
                              <span className="font-medium">{config.alert_type}</span>
                              <Badge variant={config.is_enabled ? 'default' : 'secondary'}>
                                {config.is_enabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Trigger when {config.threshold_operator.replace('_', ' ')} {config.threshold_value}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedPlatform(config.platform);
                              setShowAlertConfig(true);
                            }}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-12 w-12 mx-auto mb-4" />
                    <p>No alert configurations</p>
                    <p className="text-sm">Set up alerts to monitor sync health</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alert Configuration Dialog - Coming Soon */}
    </div>
  );
};