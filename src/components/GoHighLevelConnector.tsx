import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle, Plus, Trash2, RefreshCw, Link } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GoHighLevelConnectorProps {
  projectId?: string;
  isConnected: boolean;
  onConnectionChange: (connected: boolean) => void;
}

interface GHLForm {
  id: string;
  form_id: string;
  form_name: string;
  form_url?: string;
  is_active: boolean;
}

interface GHLFormSubmission {
  id: string;
  form_id: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  submitted_at: string;
}

export const GoHighLevelConnector = ({ 
  projectId, 
  isConnected, 
  onConnectionChange 
}: GoHighLevelConnectorProps) => {
  const [forms, setForms] = useState<GHLForm[]>([]);
  const [submissions, setSubmissions] = useState<GHLFormSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isConnected && projectId) {
      loadForms();
      loadSubmissions();
      loadLastSync();
    }
  }, [isConnected, projectId]);

  const loadForms = async () => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase
        .from('ghl_forms')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForms(data || []);
    } catch (error) {
      console.error('Failed to load forms:', error);
    }
  };

  const loadSubmissions = async () => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase
        .from('ghl_form_submissions')
        .select('*')
        .eq('project_id', projectId)
        .order('submitted_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    }
  };

  const loadLastSync = async () => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase
        .from('project_integrations')
        .select('last_sync')
        .eq('project_id', projectId)
        .eq('platform', 'ghl')
        .single();

      if (error) throw error;
      setLastSync(data?.last_sync || null);
    } catch (error) {
      console.error('Failed to load last sync:', error);
    }
  };

  const handleOAuthConnect = async () => {
    if (!projectId) return;

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('integration-oauth', {
        body: {
          projectId,
          platform: 'ghl'
        }
      });

      if (error) throw error;

      // Open OAuth URL in popup
      const popup = window.open(
        data.authUrl,
        'oauth-popup',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      // Monitor popup for completion
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          // Refresh connection status
          setTimeout(() => {
            loadForms();
            loadSubmissions();
            loadLastSync();
            onConnectionChange(true);
          }, 1000);
        }
      }, 1000);

      toast({
        title: "OAuth Started",
        description: "Please complete the authorization in the popup window",
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate OAuth",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (syncType: 'forms' | 'submissions' | 'both' = 'both') => {
    if (!projectId) return;

    console.log('🔄 Starting sync with:', { projectId, syncType });
    setSyncing(true);

    try {
      console.log('📞 Calling integration-sync function...');
      const { data, error } = await supabase.functions.invoke('integration-sync', {
        body: {
          projectId,
          platform: 'ghl',
          syncType
        }
      });

      console.log('📨 Sync response:', { data, error });

      if (error) {
        console.error('❌ Sync error:', error);
        throw error;
      }

      console.log('✅ Sync successful, reloading data...');
      await loadForms();
      await loadSubmissions();
      await loadLastSync();

      toast({
        title: "Sync Complete",
        description: data?.message || "Data synchronized successfully",
      });

    } catch (error) {
      console.error('❌ Sync failed:', error);
      toast({
        title: "Error",
        description: "Failed to sync data",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteForm = async (formId: string) => {
    if (!projectId) return;

    try {
      const { error } = await supabase
        .from('ghl_forms')
        .delete()
        .eq('id', formId);

      if (error) throw error;

      await loadForms();
      
      toast({
        title: "Form Removed",
        description: "GHL form has been removed from tracking",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove form",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = async () => {
    if (!projectId) return;

    try {
      const { error } = await supabase
        .from('project_integrations')
        .update({ is_connected: false })
        .eq('project_id', projectId)
        .eq('platform', 'ghl');

      if (error) throw error;

      onConnectionChange(false);
      setForms([]);
      setSubmissions([]);
      setLastSync(null);

      toast({
        title: "Disconnected",
        description: "Go High Level integration has been disconnected",
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect integration",
        variant: "destructive",
      });
    }
  };

  if (!projectId) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Please select a project to configure Go High Level.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Go High Level Integration
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                Connected
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isConnected ? (
          <div className="text-center py-8">
            <Link className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Connect Go High Level</h3>
            <p className="text-gray-600 mb-6">
              Connect your Go High Level account to automatically sync forms and submissions.
            </p>
            <Button onClick={handleOAuthConnect} disabled={loading}>
              {loading ? "Connecting..." : "Connect with OAuth"}
            </Button>
          </div>
        ) : (
          <>
            {/* Connection Status & Actions */}
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Connected to Go High Level</p>
                  {lastSync && (
                    <p className="text-sm text-green-600">
                      Last sync: {new Date(lastSync).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleSync()}
                  disabled={syncing}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>
                <Button
                  onClick={handleDisconnect}
                  variant="outline"
                  size="sm"
                >
                  Disconnect
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handleSync('forms')}
                disabled={syncing}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Sync Forms
              </Button>
              <Button
                onClick={() => handleSync('submissions')}
                disabled={syncing}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Sync Submissions
              </Button>
            </div>
          </>
        )}

        {/* Tracked Forms */}
        {forms.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Tracked Forms</h4>
            <div className="space-y-2">
              {forms.map((form) => (
                <div key={form.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{form.form_name}</p>
                    <p className="text-sm text-gray-500">ID: {form.form_id}</p>
                    {form.form_url && (
                      <p className="text-sm text-gray-500">URL: {form.form_url}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteForm(form.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Submissions */}
        {submissions.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium">Recent Submissions</h4>
            <div className="space-y-2">
              {submissions.map((submission) => (
                <div key={submission.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {submission.contact_name || 'Anonymous'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {submission.contact_email || 'No email'}
                      </p>
                      {submission.contact_phone && (
                        <p className="text-sm text-gray-500">
                          {submission.contact_phone}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        Form: {submission.form_id}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(submission.submitted_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {forms.length === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-500">No forms configured yet. Add a form above to start tracking submissions.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};