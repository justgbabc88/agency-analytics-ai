import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle, Plus, Trash2 } from "lucide-react";
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
  const [newFormId, setNewFormId] = useState('');
  const [newFormName, setNewFormName] = useState('');
  const [newFormUrl, setNewFormUrl] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (projectId) {
      const projectUrl = `https://iqxvtfupjjxjkbajgcve.supabase.co/functions/v1/ghl-webhook?project_id=${projectId}`;
      setWebhookUrl(projectUrl);
    }
  }, [projectId]);

  useEffect(() => {
    if (isConnected && projectId) {
      loadForms();
      loadSubmissions();
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

  const handleAddForm = async () => {
    if (!projectId || !newFormId || !newFormName) {
      toast({
        title: "Error",
        description: "Please fill in Form ID and Form Name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('ghl_forms')
        .insert({
          project_id: projectId,
          form_id: newFormId,
          form_name: newFormName,
          form_url: newFormUrl || null,
          is_active: true
        });

      if (error) throw error;

      setNewFormId('');
      setNewFormName('');
      setNewFormUrl('');
      await loadForms();
      
      toast({
        title: "Form Added",
        description: "GHL form has been added for tracking",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add form",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: "Copied",
      description: "Webhook URL copied to clipboard",
    });
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
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Go High Level Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Webhook URL Section */}
        <div className="space-y-2">
          <Label htmlFor="webhook-url">Webhook URL</Label>
          <div className="flex gap-2">
            <Input
              id="webhook-url"
              value={webhookUrl}
              readOnly
              className="font-mono text-sm"
            />
            <Button onClick={copyWebhookUrl} variant="outline" size="sm">
              Copy
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Add this webhook URL to your Go High Level workflows to track form submissions.
          </p>
        </div>

        {/* Add Form Section */}
        <div className="space-y-4">
          <h4 className="font-medium">Add Form to Track</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="form-id">Form ID</Label>
              <Input
                id="form-id"
                value={newFormId}
                onChange={(e) => setNewFormId(e.target.value)}
                placeholder="Enter GHL form ID"
              />
            </div>
            <div>
              <Label htmlFor="form-name">Form Name</Label>
              <Input
                id="form-name"
                value={newFormName}
                onChange={(e) => setNewFormName(e.target.value)}
                placeholder="Enter form display name"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="form-url">Form URL (Optional)</Label>
            <Input
              id="form-url"
              value={newFormUrl}
              onChange={(e) => setNewFormUrl(e.target.value)}
              placeholder="Enter form URL"
            />
          </div>
          <Button 
            onClick={handleAddForm} 
            disabled={loading || !newFormId || !newFormName}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Form
          </Button>
        </div>

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