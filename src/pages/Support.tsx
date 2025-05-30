
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mail, MessageCircle, Book, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Support = () => {
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
          <h1 className="text-3xl font-bold text-center mb-4">Support Center</h1>
          <p className="text-center text-gray-600 max-w-2xl mx-auto">
            Get help with your AI Marketing Dashboard. We're here to support your success.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Get personalized help from our support team. We typically respond within 24 hours.
              </p>
              <Button className="w-full">
                <a href="mailto:justin@automaticdesigns.co" className="flex items-center gap-2">
                  Contact Support
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                Documentation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Browse our comprehensive guides and tutorials to get the most out of your dashboard.
              </p>
              <Button variant="outline" className="w-full" onClick={() => navigate('/documentation')}>
                View Documentation
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">How do I connect my Google Sheets?</h3>
              <p className="text-gray-600">
                Navigate to the Integrations section and click "Connect Google Sheets". You'll be prompted 
                to authorize access to your Google account.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I export my data?</h3>
              <p className="text-gray-600">
                Yes, you can export your analytics data in various formats including CSV and PDF reports 
                from the dashboard.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How often is data updated?</h3>
              <p className="text-gray-600">
                Data is updated in real-time for most integrations. Some platforms may have slight delays 
                depending on their API limitations.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Is my data secure?</h3>
              <p className="text-gray-600">
                Yes, we use enterprise-grade security measures to protect your data. All data is encrypted 
                in transit and at rest.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Support;
