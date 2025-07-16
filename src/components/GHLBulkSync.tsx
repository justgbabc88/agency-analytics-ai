import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Download, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GHLBulkSyncProps {
  projectId: string;
}

interface SyncResults {
  total_forms: number;
  synced_forms: number;
  total_submissions: number;
  processed_submissions: number;
  duplicate_submissions: number;
  error_submissions: number;
  duration_seconds: number;
}

export const GHLBulkSync = ({ projectId }: GHLBulkSyncProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [locationId, setLocationId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [batchSize, setBatchSize] = useState('100');
  const [results, setResults] = useState<SyncResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBulkSync = async () => {
    if (!apiKey.trim() || !locationId.trim()) {
      toast.error('API Key and Location ID are required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      console.log('🚀 Starting GHL bulk sync...');
      
      const { data, error: functionError } = await supabase.functions.invoke('ghl-bulk-sync', {
        body: {
          project_id: projectId,
          location_id: locationId.trim(),
          api_key: apiKey.trim(),
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          batch_size: parseInt(batchSize) || 100
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Failed to sync GHL data');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setResults(data.results);
      toast.success(`Bulk sync completed! Processed ${data.results.processed_submissions} submissions`);
      
    } catch (err) {
      console.error('Bulk sync error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during bulk sync';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          GHL Bulk Import
        </CardTitle>
        <CardDescription>
          Import historical form submissions from GoHighLevel. This will fetch all existing submissions
          from your GHL location and sync them to your project.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Before using:</strong> Make sure you have a valid GHL API key with access to forms and submissions. 
            This process may take several minutes for large datasets.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">GHL API Key *</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Your GHL API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationId">Location ID *</Label>
            <Input
              id="locationId"
              placeholder="Your GHL location ID"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date (Optional)</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End Date (Optional)</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="batchSize">Batch Size</Label>
            <Input
              id="batchSize"
              type="number"
              placeholder="100"
              value={batchSize}
              onChange={(e) => setBatchSize(e.target.value)}
              disabled={isLoading}
              min="10"
              max="500"
            />
          </div>
        </div>

        <Button
          onClick={handleBulkSync}
          disabled={isLoading || !apiKey.trim() || !locationId.trim()}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Syncing... This may take several minutes
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Start Bulk Import
            </>
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {results && (
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                Sync Completed Successfully
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-semibold text-green-800">Forms Synced</div>
                  <div className="text-green-600">{results.synced_forms} / {results.total_forms}</div>
                </div>
                <div>
                  <div className="font-semibold text-green-800">Submissions Processed</div>
                  <div className="text-green-600">{results.processed_submissions.toLocaleString()}</div>
                </div>
                <div>
                  <div className="font-semibold text-green-800">Duplicates Skipped</div>
                  <div className="text-green-600">{results.duplicate_submissions.toLocaleString()}</div>
                </div>
                <div>
                  <div className="font-semibold text-green-800">Duration</div>
                  <div className="text-green-600">{formatDuration(results.duration_seconds)}</div>
                </div>
              </div>
              
              {results.error_submissions > 0 && (
                <Alert variant="destructive" className="mt-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {results.error_submissions} submissions failed to process. Check the logs for details.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="text-xs text-green-600 mt-2">
                Total submissions found: {results.total_submissions.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Tips:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Leave dates empty to import all historical data</li>
            <li>Larger batch sizes are faster but use more memory</li>
            <li>The sync automatically handles duplicates</li>
            <li>Forms are synced first, then submissions for each form</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};