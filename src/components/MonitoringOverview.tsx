import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Zap,
  Settings
} from 'lucide-react';
import { SyncHealthDashboard } from './SyncHealthDashboard';
import { TimezoneHandler } from './TimezoneHandler';

export const MonitoringOverview: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Monitoring</h1>
        <p className="text-muted-foreground">
          Comprehensive monitoring and management for your data integrations
        </p>
      </div>

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="health" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Sync Health</span>
          </TabsTrigger>
          <TabsTrigger value="timezone" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Timezone Management</span>
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>System Overview</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <SyncHealthDashboard />
        </TabsContent>

        <TabsContent value="timezone">
          <TimezoneHandler />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* System Status Cards */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Status</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Operational</div>
                <p className="text-xs text-muted-foreground">All systems running normally</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Syncs</CardTitle>
                <Activity className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">Platforms syncing data</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">98%</div>
                <p className="text-xs text-muted-foreground">Average quality score</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Active incidents</p>
              </CardContent>
            </Card>
          </div>

          {/* Feature Overview */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Enhanced Monitoring</span>
                </CardTitle>
                <CardDescription>
                  Real-time health monitoring and intelligent alerting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Real-time Health Monitoring</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Intelligent Alerting</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Performance Analytics</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Automated Recovery</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Monitoring
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Timezone Handling</span>
                </CardTitle>
                <CardDescription>
                  Advanced timezone-aware data synchronization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Server-side Timezone Context</span>
                    <Badge variant="default">Implemented</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Timezone Validation</span>
                    <Badge variant="default">Implemented</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cross-integration Consistency</span>
                    <Badge variant="default">Implemented</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Performance Optimization</span>
                    <Badge variant="default">Implemented</Badge>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full">
                  <Clock className="h-4 w-4 mr-2" />
                  Manage Timezones
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};