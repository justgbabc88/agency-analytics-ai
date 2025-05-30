
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, FileText, Scale, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LawEnforcementPolicy = () => {
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
            <CardTitle className="text-3xl font-bold text-center flex items-center justify-center gap-2">
              <Scale className="h-8 w-8" />
              Law Enforcement Request Policy
            </CardTitle>
            <p className="text-center text-gray-600">
              Our procedures for handling requests from public authorities and law enforcement
            </p>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Legal Review Process
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                All requests from public authorities undergo mandatory legal review to ensure compliance with applicable laws and user privacy rights.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm text-gray-600">
                <li>Review of request validity and legal basis</li>
                <li>Verification of requesting authority credentials</li>
                <li>Assessment of jurisdictional authority</li>
                <li>Evaluation of scope and necessity</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Data Minimization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                We adhere to strict data minimization principles when responding to lawful requests for user information.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm text-gray-600">
                <li>Disclose only the minimum information necessary</li>
                <li>Limit scope to specific users and time periods</li>
                <li>Exclude irrelevant or excessive data</li>
                <li>Provide data in least intrusive format possible</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Request Processing Procedures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                1. Initial Review (24-48 hours)
              </h3>
              <p className="text-gray-600 mb-2">
                Upon receiving a request from law enforcement or public authorities, we conduct an immediate preliminary review:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600">
                <li>Verify the authenticity and authority of the requesting party</li>
                <li>Confirm proper legal documentation (warrant, subpoena, court order)</li>
                <li>Assess jurisdictional validity</li>
                <li>Document receipt and assign tracking number</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">2. Legal Analysis (3-5 business days)</h3>
              <p className="text-gray-600 mb-2">
                Our legal team conducts a comprehensive analysis of each request:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600">
                <li>Review legal basis and applicable laws</li>
                <li>Evaluate constitutional and privacy implications</li>
                <li>Assess proportionality and necessity</li>
                <li>Determine if challenge or clarification is warranted</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">3. Challenge Process</h3>
              <p className="text-gray-600 mb-2">
                When appropriate, we challenge requests that may be:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600">
                <li>Overly broad or lacking specificity</li>
                <li>Lacking proper legal authority</li>
                <li>Violating user privacy rights</li>
                <li>Inconsistent with applicable law</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">4. Data Production</h3>
              <p className="text-gray-600 mb-2">
                For valid requests, we produce data following strict protocols:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600">
                <li>Extract only specifically requested information</li>
                <li>Apply data minimization principles</li>
                <li>Redact irrelevant or protected information</li>
                <li>Provide data in secure, documented format</li>
              </ul>
            </section>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Documentation and Transparency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <section>
              <h3 className="text-lg font-semibold mb-2">Request Documentation</h3>
              <p className="text-gray-600">
                We maintain comprehensive records of all law enforcement requests, including:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600 mt-2">
                <li>Date and time of request receipt</li>
                <li>Requesting authority and contact information</li>
                <li>Legal basis and supporting documentation</li>
                <li>Scope of information requested</li>
                <li>Our legal analysis and decision rationale</li>
                <li>Information provided (if any) and justification</li>
                <li>Any challenges or objections raised</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-2">User Notification</h3>
              <p className="text-gray-600">
                Unless prohibited by law or court order, we strive to notify affected users about requests for their data, providing:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600 mt-2">
                <li>Notice of the request (when legally permissible)</li>
                <li>Information about what data was requested</li>
                <li>Our response to the request</li>
                <li>User's rights and available legal remedies</li>
              </ul>
            </section>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Types of Requests We Handle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Criminal Investigations</h4>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
                  <li>Search warrants</li>
                  <li>Criminal subpoenas</li>
                  <li>Court orders</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Civil Proceedings</h4>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
                  <li>Civil subpoenas</li>
                  <li>Discovery requests</li>
                  <li>Regulatory inquiries</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Emergency Requests</h4>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
                  <li>Imminent danger situations</li>
                  <li>Child safety concerns</li>
                  <li>Terrorism investigations</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Administrative</h4>
                <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
                  <li>Tax investigations</li>
                  <li>Regulatory compliance</li>
                  <li>Administrative subpoenas</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Law enforcement agencies and public authorities should direct requests to:
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p><strong>Quantum Sync LLC - Legal Department</strong></p>
              <p>Email: justin@automaticdesigns.co</p>
              <p>Subject: Law Enforcement Request - [Case Number]</p>
              <p className="mt-2 text-sm text-gray-600">
                <strong>Note:</strong> Requests must include proper legal documentation and be sent from official law enforcement email addresses or through official legal channels.
              </p>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>For Emergency Requests:</strong> Contact us immediately at justin@automaticdesigns.co with "EMERGENCY REQUEST" in the subject line. Emergency requests will be processed within 2 hours during business hours.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LawEnforcementPolicy;
