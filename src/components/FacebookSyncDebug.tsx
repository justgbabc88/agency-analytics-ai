import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAgency } from '@/hooks/useAgency';
import { useSecureApiKeys } from '@/hooks/useSecureApiKeys';
import { useToast } from '@/hooks/use-toast';

export const FacebookSyncDebug = () => {
  const { agency } = useAgency();
  const { getApiKeys } = useSecureApiKeys();
  const { toast } = useToast();

  const runDebug = async () => {
    if (!agency) {
      toast({
        title: "Error",
        description: "No agency found",
        variant: "destructive"
      });
      return;
    }

    const facebookKeys = getApiKeys('facebook');
    if (!facebookKeys.access_token || !facebookKeys.selected_ad_account_id) {
      toast({
        title: "Error", 
        description: "Facebook API keys not found",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Running Facebook sync debug...');
      
      const { data, error } = await supabase.functions.invoke('facebook-sync-debug', {
        body: {
          agencyId: agency.id,
          accessToken: facebookKeys.access_token,
          adAccountId: facebookKeys.selected_ad_account_id
        }
      });

      if (error) {
        console.error('Debug function error:', error);
        toast({
          title: "Debug Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        console.log('Debug completed:', data);
        toast({
          title: "Debug Complete",
          description: "Check browser console and edge function logs for detailed results"
        });
      }
    } catch (error) {
      console.error('Debug request failed:', error);
      toast({
        title: "Request Failed",
        description: "Failed to run debug function",
        variant: "destructive"
      });
    }
  };

  const forceFullSync = async () => {
    if (!agency) {
      toast({
        title: "Error",
        description: "No agency found",
        variant: "destructive"
      });
      return;
    }

    const facebookKeys = getApiKeys('facebook');
    if (!facebookKeys.access_token || !facebookKeys.selected_ad_account_id) {
      toast({
        title: "Error", 
        description: "Facebook API keys not found",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Running forced full Facebook sync...');
      
      const { data, error } = await supabase.functions.invoke('facebook-force-sync', {
        body: {
          agencyId: agency.id,
          accessToken: facebookKeys.access_token,
          adAccountId: facebookKeys.selected_ad_account_id
        }
      });

      if (error) {
        console.error('Force sync error:', error);
        toast({
          title: "Force Sync Error",
          description: error.message,
          variant: "destructive"
        });
      } else {
        console.log('Force sync completed:', data);
        toast({
          title: "Force Sync Complete",
          description: `Successfully synced ${data.dailyInsightsCount} days of data`,
        });
      }
    } catch (error) {
      console.error('Force sync request failed:', error);
      toast({
        title: "Request Failed",
        description: "Failed to run force sync",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Facebook Sync Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={runDebug} className="w-full" variant="outline">
            Run Debug Analysis
          </Button>
          <Button onClick={forceFullSync} className="w-full" variant="default">
            Force Full Sync (30 days)
          </Button>
          <p className="text-sm text-muted-foreground">
            Debug analyzes what's wrong. Force sync bypasses the smart logic and directly fetches all data from Facebook.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};