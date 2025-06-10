
import React from 'react';
import { AIChatPanel } from "@/components/AIChatPanel";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";

const AIAssistant = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Assistant</h1>
            <p className="text-gray-600 mt-1">Get AI-powered insights and recommendations for your campaigns</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Chat Panel */}
          <AIChatPanel />

          {/* AI Insights Panel */}
          <AIInsightsPanel />
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
