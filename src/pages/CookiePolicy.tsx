
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CookiePolicy = () => {
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
            <CardTitle className="text-3xl font-bold text-center">Cookie Policy</CardTitle>
            <p className="text-center text-gray-600">Effective Date: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. What Are Cookies</h2>
              <p>
                Cookies are small text files that are placed on your computer or mobile device when you visit 
                our website. They are widely used to make websites work more efficiently and provide information 
                to website owners.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. How We Use Cookies</h2>
              <p>We use cookies for several purposes:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Essential Cookies:</strong> Required for the website to function properly</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our website</li>
                <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
                <li><strong>Performance Cookies:</strong> Improve website speed and performance</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Types of Cookies We Use</h2>
              
              <h3 className="text-lg font-medium mb-2 mt-4">3.1 Strictly Necessary Cookies</h3>
              <p>
                These cookies are essential for the website to function and cannot be switched off. They are 
                usually set in response to actions made by you such as setting privacy preferences, logging 
                in, or filling in forms.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">3.2 Analytics Cookies</h3>
              <p>
                These cookies allow us to count visits and traffic sources so we can measure and improve 
                the performance of our site. They help us know which pages are most popular and see how 
                visitors move around the site.
              </p>

              <h3 className="text-lg font-medium mb-2 mt-4">3.3 Functional Cookies</h3>
              <p>
                These cookies enable the website to provide enhanced functionality and personalization. 
                They may be set by us or by third-party providers whose services we have added to our pages.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Third-Party Cookies</h2>
              <p>
                Some cookies on our site are set by third-party services that appear on our pages. We use 
                services like Google Analytics to help us analyze website usage and improve our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Managing Cookies</h2>
              <p>
                You can control and/or delete cookies as you wish. You can delete all cookies that are 
                already on your computer and you can set most browsers to prevent them from being placed.
              </p>
              <p className="mt-2">
                However, if you do this, you may have to manually adjust some preferences every time you 
                visit a site and some services and functionalities may not work.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Browser Settings</h2>
              <p>Most web browsers allow you to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>See what cookies you have and delete them individually</li>
                <li>Block third-party cookies</li>
                <li>Block cookies from specific sites</li>
                <li>Block all cookies</li>
                <li>Delete all cookies when you close your browser</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Updates to This Policy</h2>
              <p>
                We may update this Cookie Policy from time to time to reflect changes in our practices 
                or for other operational, legal, or regulatory reasons.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Contact Us</h2>
              <p>
                If you have any questions about our use of cookies, please contact us at:
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

export default CookiePolicy;
