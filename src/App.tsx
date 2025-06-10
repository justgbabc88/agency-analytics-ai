
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
import Tracking from "./pages/Tracking"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { GoogleOAuthCallback } from './components/GoogleOAuthCallback';
import CalendlyOAuthCallback from "@/pages/CalendlyOAuthCallback";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import { Navbar } from "./components/Navbar";

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <AppSidebar />
              <div className="flex-1 flex flex-col min-w-0">
                <Navbar />
                <main className="flex-1 p-0">
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/facebook-ads" element={<Index />} />
                    <Route path="/predictions" element={<Index />} />
                    <Route path="/ai-assistant" element={<Index />} />
                    <Route path="/alerts" element={<Index />} />
                    <Route path="/integrations" element={<Integrations />} />
                    <Route path="/tracking" element={<Tracking />} />
                    <Route path="/google-oauth-callback" element={<GoogleOAuthCallback />} />
                    <Route path="/calendly-callback" element={<CalendlyOAuthCallback />} />
                  </Routes>
                </main>
              </div>
            </div>
          </SidebarProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
