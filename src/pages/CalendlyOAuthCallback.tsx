
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const CalendlyOAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state'); // This is the projectId
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        toast({
          title: "Connection Failed", 
          description: `OAuth error: ${error}`,
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      if (!code || !state) {
        console.error('Missing code or state parameter');
        toast({
          title: "Connection Failed",
          description: "Missing authorization code or project ID",
          variant: "destructive"
        });
        navigate('/');
        return;
      }

      try {
        console.log('Processing Calendly OAuth callback...');
        
        const { data, error: functionError } = await supabase.functions.invoke('calendly-oauth', {
          body: { 
            action: 'handle_callback',
            code,
            projectId: state
          }
        });

        if (functionError) {
          throw new Error(functionError.message);
        }

        console.log('Calendly connection successful');
        toast({
          title: "Connected Successfully",
          description: "Your Calendly account has been connected",
        });

        // Redirect back to main page
        navigate('/');
        
      } catch (error) {
        console.error('Callback processing error:', error);
        toast({
          title: "Connection Failed",
          description: error.message || "Failed to complete Calendly connection",
          variant: "destructive"
        });
        navigate('/');
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Connecting to Calendly...</h2>
        <p className="text-gray-600">Please wait while we complete the connection.</p>
      </div>
    </div>
  );
};

export default CalendlyOAuthCallback;
