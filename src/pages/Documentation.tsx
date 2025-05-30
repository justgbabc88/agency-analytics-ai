
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BookOpen, Settings, BarChart, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Documentation = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-4">Documentation</h1>
          <p className="text-center text-gray-600 max-w-2xl mx-auto">
            Learn how to use the AI Marketing Dashboard to optimize your marketing campaigns and drive better results.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Getting Started
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium">Quick Start Guide</h4>
                <p className="text-sm text-gray-600">Set up your first dashboard in minutes</p>
              </div>
              <div>
                <h4 className="font-medium">Account Setup</h4>
                <p className="text-sm text-gray-600">Configure your profile and preferences</p>
              </div>
              <div>
                <h4 className="font-medium">First Integration</h4>
                <p className="text-sm text-gray-600">Connect your first data source</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium">Google Sheets Integration</h4>
                <p className="text-sm text-gray-600">Connect and sync your spreadsheet data</p>
              </div>
              <div>
                <h4 className="font-medium">Facebook Ads Setup</h4>
                <p className="text-sm text-gray-600">Import your Facebook advertising metrics</p>
              </div>
              <div>
                <h4 className="font-medium">API Configuration</h4>
                <p className="text-sm text-gray-600">Set up custom API connections</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Analytics & Reporting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium">Understanding Metrics</h4>
                <p className="text-sm text-gray-600">Learn about key performance indicators</p>
              </div>
              <div>
                <h4 className="font-medium">Custom Dashboards</h4>
                <p className="text-sm text-gray-600">Create personalized analytics views</p>
              </div>
              <div>
                <h4 className="font-medium">Export Options</h4>
                <p className="text-sm text-gray-600">Download reports and share insights</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                AI Features
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <h4 className="font-medium">Predictive Analytics</h4>
                <p className="text-sm text-gray-600">Forecast trends and performance</p>
              </div>
              <div>
                <h4 className="font-medium">Smart Insights</h4>
                <p className="text-sm text-gray-600">AI-powered recommendations</p>
              </div>
              <div>
                <h4 className="font-medium">Automated Alerts</h4>
                <p className="text-sm text-gray-600">Set up intelligent notifications</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Need More Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Can't find what you're looking for? Our support team is here to help you succeed.
            </p>
            <Button onClick={() => navigate('/support')}>
              Contact Support
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Documentation;
