import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, AlertCircle, Plus, Trash2, RefreshCw, Link as LinkIcon, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GHLBulkSync } from './GHLBulkSync';

interface GoHighLevelConnectorProps {
  projectId?: string;
  isConnected: boolean;
  onConnectionChange: (connected: boolean) => void;
  selectedFormIds?: string[];
  onFormSelectionChange?: (formIds: string[]) => void;
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
  onConnectionChange,
  selectedFormIds = [],
  onFormSelectionChange
}: GoHighLevelConnectorProps) => {
  const [forms, setForms] = useState<GHLForm[]>([]);
  const [submissions, setSubmissions] = useState<GHLFormSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialization effect - only initialize if forms are loaded and no forms are selected yet
  useEffect(() => {
    if (forms.length > 0 && onFormSelectionChange && selectedFormIds.length === 0) {
      console.log('Initializing form selection with active forms');
      const activeFormIds = forms.filter(form => form.is_active).map(form => form.form_id);
      onFormSelectionChange(activeFormIds);
    }
  }, [forms, onFormSelectionChange, selectedFormIds]);

  // Load forms and submissions when connected
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
      
      console.log('🔍 [GoHighLevelConnector] Forms loaded:', {
        total: data?.length || 0,
        selectedFormIds: selectedFormIds || []
      });
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

      const popup = window.open(
        data.authUrl,
        'oauth-popup',
        'width=600,height=700,scrollbars=yes,resizable=yes'
      );

      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
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

    setSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke('integration-sync', {
        body: {
          projectId,
          platform: 'ghl',
          syncType
        }
      });

      if (error) throw error;

      await loadForms();
      await loadSubmissions();
      await loadLastSync();

      toast({
        title: "Sync Complete",
        description: data?.message || "Data synchronized successfully",
      });

    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to sync data: ${error.message || 'Unknown error'}`,
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

  const handleFormSelection = (formId: string, checked: boolean) => {
    if (!onFormSelectionChange) return;
    
    // Use the callback to update the selection
    const formIdsArray = [...selectedFormIds];
    const newSelection = checked
      ? [...formIdsArray, formId]
      : formIdsArray.filter(id => id !== formId);
    
    console.log('🔍 Form selection changed:', { formId, checked, newSelection });
    onFormSelectionChange(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onFormSelectionChange) return;
    
    // If all active forms are already selected, clear the selection
    // Otherwise, select all active forms
    const activeFormIds = forms.filter(form => form.is_active).map(form => form.form_id);
    const newSelection = formIdsArray.length === activeFormCount ? [] : activeFormIds;
    
    console.log('🔍 Select all forms:', { checked, newSelection });
    onFormSelectionChange(newSelection);
  };

  // Return early if no project selected
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

  // Safe access to form IDs
  const formIdsArray = selectedFormIds || [];
  const activeFormCount = forms.filter(f => f.is_active).length;

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
            <LinkIcon className="h-12 w-12 text-primary mx-auto mb-4" />
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
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Tracked Forms</h4>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={formIdsArray.length === activeFormCount && activeFormCount > 0}
                  onCheckedChange={() => handleSelectAll(formIdsArray.length === activeFormCount)}
                />
                <Label htmlFor="select-all" className="text-sm">
                  Select All
                </Label>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Select which forms to include in metrics calculations ({formIdsArray.length} selected)
            </p>
            <div className="space-y-2">
              {forms.map((form) => (
                <div key={form.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3 flex-1">
                    <Checkbox
                      id={`form-${form.form_id}`}
                      checked={formIdsArray.includes(form.form_id)}
                      onCheckedChange={(checked) => handleFormSelection(form.form_id, checked as boolean)}
                      disabled={!form.is_active}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{form.form_name}</p>
                      <p className="text-sm text-gray-500">ID: {form.form_id}</p>
                      {form.form_url && (
                        <p className="text-sm text-gray-500">URL: {form.form_url}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={form.is_active ? "text-green-600 border-green-600" : "text-gray-500 border-gray-300"}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {form.is_active ? "Active" : "Inactive"}
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

        {/* Bulk Import Section */}
        {isConnected && (
          <div className="space-y-4">
            <div className="border-t pt-6">
              <GHLBulkSync projectId={projectId} />
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