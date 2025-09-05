
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ApiKeyMigrationNotice } from '@/components/ApiKeyMigrationNotice';

const Integrations = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-6">
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

        <ApiKeyMigrationNotice />

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-4">Integrations</h1>
          <p className="text-center text-gray-600 max-w-2xl mx-auto">
            Connect your favorite marketing platforms and tools to get comprehensive analytics and insights.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Google Sheets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Connect your Google Sheets to import and analyze your marketing data in real-time.
              </p>
              <Button className="w-full">
                Connect Google Sheets
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Facebook Ads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Import your Facebook Ads performance data for comprehensive campaign analysis.
              </p>
              <Button className="w-full">
                Connect Facebook Ads
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Google Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Sync your Google Analytics data to track website performance and conversions.
              </p>
              <Button className="w-full" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Shopify
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Connect your Shopify store to track e-commerce metrics and sales funnels.
              </p>
              <Button className="w-full" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Stripe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Integrate Stripe to monitor payment processing and revenue metrics.
              </p>
              <Button className="w-full" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Webhooks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Set up custom webhooks to receive real-time data from any platform.
              </p>
              <Button className="w-full" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Integrations;
