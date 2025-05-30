
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, Lock, Eye, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GdprCompliance = () => {
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

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">GDPR Compliance</CardTitle>
            <p className="text-center text-gray-600">
              Your data protection rights under the General Data Protection Regulation
            </p>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Right to Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                You have the right to request copies of your personal data. We may charge a small fee for this service.
              </p>
              <Button variant="outline" className="w-full">
                Request Data Access
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Right to Rectification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                You have the right to request that we correct any information you believe is inaccurate or incomplete.
              </p>
              <Button variant="outline" className="w-full">
                Update My Data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Right to Erasure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                You have the right to request that we erase your personal data, under certain conditions.
              </p>
              <Button variant="destructive" className="w-full">
                Delete My Data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Right to Object
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                You have the right to object to our processing of your personal data, under certain conditions.
              </p>
              <Button variant="outline" className="w-full">
                Object to Processing
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your GDPR Rights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h3 className="text-lg font-semibold mb-2">Data Portability</h3>
              <p className="text-gray-600">
                You have the right to request that we transfer the data that we have collected to another 
                organization, or directly to you, under certain conditions.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Right to Restrict Processing</h3>
              <p className="text-gray-600">
                You have the right to request that we restrict the processing of your personal data, 
                under certain conditions.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Automated Decision Making</h3>
              <p className="text-gray-600">
                You have the right not to be subject to a decision based solely on automated processing, 
                including profiling, which produces legal effects concerning you or similarly significantly affects you.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Data Protection Officer</h3>
              <p className="text-gray-600">
                If you have any concerns about our data protection practices, you can contact our Data 
                Protection Officer at justin@automaticdesigns.co.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">Supervisory Authority</h3>
              <p className="text-gray-600">
                You have the right to lodge a complaint with a supervisory authority if you believe that 
                our processing of your personal data violates the GDPR.
              </p>
            </section>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Contact Us</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              For any GDPR-related requests or questions, please contact us:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p><strong>Quantum Sync LLC</strong></p>
              <p>Email: justin@automaticdesigns.co</p>
              <p>Subject: GDPR Request</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GdprCompliance;
