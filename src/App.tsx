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

import Home from "./pages/Home"
import Projects from "./pages/Projects"
import Integrations from "./pages/Integrations"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import GoogleOAuthCallback from './components/GoogleOAuthCallback';
import CalendlyOAuthCallback from "@/pages/CalendlyOAuthCallback";

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/google-oauth-callback" element={<GoogleOAuthCallback />} />
            <Route path="/calendly-callback" element={<CalendlyOAuthCallback />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
