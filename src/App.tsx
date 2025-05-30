
import React from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster as Sonner } from "@/components/ui/sonner"
import Footer from "@/components/Footer"

import Index from "@/pages/Index"
import AuthPage from "@/pages/auth"
import NotFound from "@/pages/NotFound"
import PrivacyPolicy from "@/pages/PrivacyPolicy"
import TermsAndConditions from "@/pages/TermsAndConditions"
import Integrations from "@/pages/Integrations"
import Support from "@/pages/Support"
import Documentation from "@/pages/Documentation"
import CookiePolicy from "@/pages/CookiePolicy"
import GdprCompliance from "@/pages/GdprCompliance"
import LawEnforcementPolicy from "@/pages/LawEnforcementPolicy"
import { GoogleOAuthCallbackPage } from "@/pages/GoogleOAuthCallback"

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="min-h-screen flex flex-col">
          <BrowserRouter>
            <div className="flex-1">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
                <Route path="/integrations" element={<Integrations />} />
                <Route path="/support" element={<Support />} />
                <Route path="/documentation" element={<Documentation />} />
                <Route path="/cookie-policy" element={<CookiePolicy />} />
                <Route path="/gdpr-compliance" element={<GdprCompliance />} />
                <Route path="/law-enforcement-policy" element={<LawEnforcementPolicy />} />
                <Route path="/google-oauth-callback" element={<GoogleOAuthCallbackPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            <Footer />
          </BrowserRouter>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
