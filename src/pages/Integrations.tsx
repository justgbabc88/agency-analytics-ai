
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProjectSelector } from '@/components/ProjectSelector';
import { IntegrationsPanel } from '@/components/IntegrationsPanel';

const Integrations = () => {
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
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
          <h1 className="text-3xl font-bold text-center mb-4">Integrations</h1>
          <p className="text-center text-gray-600 max-w-2xl mx-auto">
            Connect your favorite marketing platforms and tools to get comprehensive analytics and insights.
          </p>
        </div>

        {/* Project Selection */}
        <div className="mb-6">
          <div className="max-w-md mx-auto">
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onProjectChange={setSelectedProjectId}
            />
          </div>
        </div>

        {/* Integrations Panel */}
        <IntegrationsPanel projectId={selectedProjectId} />
      </div>
    </div>
  );
};

export default Integrations;
