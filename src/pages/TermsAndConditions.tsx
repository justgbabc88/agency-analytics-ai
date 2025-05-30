import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsAndConditions = () => {
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

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Terms and Conditions</CardTitle>
            <p className="text-center text-gray-600">Effective Date: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using the AI Marketing Dashboard service provided by Quantum Sync LLC ("we," "our," 
                or "us"), you accept and agree to be bound by the terms and provision of this agreement. If you do 
                not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
              <p>
                The AI Marketing Dashboard is a web-based application that provides marketing analytics, campaign 
                monitoring, predictive insights, and integration with various marketing platforms including Google 
                Sheets, Facebook Ads, and other third-party services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
              <h3 className="text-lg font-medium mb-2">3.1 Account Creation</h3>
              <p>
                To use our Service, you must create an account by providing accurate and complete information. 
                You are responsible for maintaining the confidentiality of your account credentials.
              </p>
              
              <h3 className="text-lg font-medium mb-2 mt-4">3.2 Account Responsibility</h3>
              <p>
                You are responsible for all activities that occur under your account and for maintaining the 
                security of your account password.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Upload or transmit malicious code or harmful content</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Use the Service for any unlawful or prohibited purpose</li>
                <li>Interfere with or disrupt the Service or servers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Third-Party Integrations</h2>
              <p>
                Our Service may integrate with third-party platforms and services. Your use of these integrations 
                is subject to the terms and conditions of those third-party services. We are not responsible for 
                the availability, accuracy, or content of third-party services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Data and Privacy</h2>
              <p>
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use 
                of the Service, to understand our practices regarding the collection and use of your information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Intellectual Property</h2>
              <p>
                The Service and its original content, features, and functionality are and will remain the exclusive 
                property of Quantum Sync LLC and its licensors. The Service is protected by copyright, trademark, 
                and other laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Subscription and Payment</h2>
              <h3 className="text-lg font-medium mb-2">8.1 Paid Subscriptions</h3>
              <p>
                Some parts of the Service are billed on a subscription basis. You will be billed in advance on a 
                recurring basis according to your chosen subscription plan.
              </p>
              
              <h3 className="text-lg font-medium mb-2 mt-4">8.2 Refunds</h3>
              <p>
                Refund requests will be considered on a case-by-case basis. Generally, all fees are non-refundable.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Disclaimer of Warranties</h2>
              <p>
                The Service is provided on an "as is" and "as available" basis. Quantum Sync LLC expressly disclaims 
                all warranties of any kind, whether express or implied, including but not limited to the implied 
                warranties of merchantability, fitness for a particular purpose, and non-infringement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Limitation of Liability</h2>
              <p>
                In no event shall Quantum Sync LLC, its directors, employees, partners, agents, suppliers, or 
                affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, 
                including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Termination</h2>
              <p>
                We may terminate or suspend your account and bar access to the Service immediately, without prior 
                notice or liability, under our sole discretion, for any reason whatsoever and without limitation, 
                including but not limited to a breach of the Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Governing Law</h2>
              <p>
                These Terms shall be interpreted and governed by the laws of the State of [Your State], without 
                regard to conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">13. Changes to Terms</h2>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a 
                revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">14. Contact Information</h2>
              <p>
                If you have any questions about these Terms and Conditions, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg mt-2">
                <p><strong>Quantum Sync LLC</strong></p>
                <p>Email: justin@automaticdesigns.co</p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsAndConditions;
