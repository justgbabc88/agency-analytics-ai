
import React from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

import Index from "./pages/Index"
import Integrations from "./pages/Integrations"
import Settings from "./pages/Settings"
import AuthPage from "./pages/auth"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { GoogleOAuthCallback } from './components/GoogleOAuthCallback';
import CalendlyOAuthCallback from "@/pages/CalendlyOAuthCallback";
import { ProtectedRoute } from './components/ProtectedRoute';

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/integrations" element={
              <ProtectedRoute>
                <Integrations />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/google-oauth-callback" element={<GoogleOAuthCallback />} />
            <Route path="/calendly-callback" element={<CalendlyOAuthCallback />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
