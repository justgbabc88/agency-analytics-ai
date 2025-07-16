import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  projectId: string;
  platform: string;
  syncType?: 'forms' | 'submissions' | 'both';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Sync function called');
    const requestBody = await req.text();
    console.log('📨 Request body:', requestBody);
    
    const { projectId, platform, syncType = 'both' }: RequestBody = JSON.parse(requestBody);
    
    console.log(`🔄 Starting sync for project: ${projectId}, platform: ${platform}, type: ${syncType}`);

    if (!projectId || !platform) {
      return new Response(
        JSON.stringify({ error: 'Project ID and platform are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get OAuth tokens
    const { data: integrationData, error: integrationError } = await supabase
      .from('project_integration_data')
      .select('data')
      .eq('project_id', projectId)
      .eq('platform', platform)
      .single();

    if (integrationError || !integrationData) {
      console.error('❌ No integration data found:', integrationError);
      return new Response(
        JSON.stringify({ error: 'Integration not connected' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { access_token, location_id } = integrationData.data;

    if (!access_token || !location_id) {
      console.error('❌ Missing access token or location ID');
      return new Response(
        JSON.stringify({ error: 'Invalid integration data' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let syncResults = { forms: 0, submissions: 0 };

    // Sync forms if requested
    if (syncType === 'forms' || syncType === 'both') {
      console.log('📋 Syncing forms...');
      const formsResult = await syncForms(supabase, projectId, access_token, location_id);
      syncResults.forms = formsResult;
      console.log(`📋 Forms sync completed: ${formsResult} forms synced`);
    }

    // Sync submissions if requested (after forms are synced)
    if (syncType === 'submissions' || syncType === 'both') {
      console.log('📝 Syncing submissions...');
      const submissionsResult = await syncSubmissions(supabase, projectId, access_token, location_id);
      syncResults.submissions = submissionsResult;
      console.log(`📝 Submissions sync completed: ${submissionsResult} submissions synced`);
    }

    // Update last sync time
    await supabase
      .from('project_integrations')
      .update({ last_sync: new Date().toISOString() })
      .eq('project_id', projectId)
      .eq('platform', platform);

    console.log(`✅ Sync completed: ${syncResults.forms} forms, ${syncResults.submissions} submissions`);

    return new Response(
      JSON.stringify({ 
        success: true,
        results: syncResults,
        message: `Synced ${syncResults.forms} forms and ${syncResults.submissions} submissions`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to sync data' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function syncForms(supabase: any, projectId: string, accessToken: string, locationId: string): Promise<number> {
  try {
    // Fetch forms from GHL API
    const response = await fetch(`https://services.leadconnectorhq.com/forms/?locationId=${locationId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ GHL Forms API error:', response.status, errorText);
      return 0;
    }

    const data = await response.json();
    console.log('📋 GHL Forms API response:', JSON.stringify(data, null, 2));
    
    const forms = data.forms || [];
    console.log(`📋 Found ${forms.length} forms to sync`);

    // Store forms in database
    let syncedCount = 0;
    for (const form of forms) {
      console.log('📋 Syncing form:', JSON.stringify(form, null, 2));
      
      const { error } = await supabase
        .from('ghl_forms')
        .upsert({
          project_id: projectId,
          form_id: form.id,
          form_name: form.name,
          form_url: form.url || null,
          is_active: true,
        }, {
          onConflict: 'project_id,form_id'
        });

      if (!error) {
        syncedCount++;
        console.log(`✅ Synced form: ${form.name} (${form.id})`);
      } else {
        console.error('❌ Error syncing form:', error);
      }
    }

    console.log(`📋 Total forms synced: ${syncedCount}`);
    return syncedCount;
  } catch (error) {
    console.error('❌ Forms sync error:', error);
    return 0;
  }
}

async function syncSubmissions(supabase: any, projectId: string, accessToken: string, locationId: string): Promise<number> {
  try {
    // Calculate date range for last 2 weeks
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    console.log(`📝 Syncing submissions from ${twoWeeksAgo.toISOString()} to now`);
    
    // Try multiple pagination approaches for GHL API
    let allSubmissions: any[] = [];
    let hasMore = true;
    let page = 1;
    let nextCursor = null;
    const limit = 100;
    
    while (hasMore && page <= 50) { // Safety limit to prevent infinite loops
      console.log(`📝 Fetching page ${page}...`);
      
      // Try different API endpoints and pagination methods
      const endpoints = [
        // API v2 endpoint (newer)
        {
          url: `https://rest.gohighlevel.com/v1/forms/submissions`,
          params: new URLSearchParams({
            locationId,
            limit: limit.toString(),
            page: page.toString()
          }),
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
          }
        },
        // Try with cursor if we have one
        ...(nextCursor ? [{
          url: `https://rest.gohighlevel.com/v1/forms/submissions`,
          params: new URLSearchParams({
            locationId,
            limit: limit.toString(),
            cursor: nextCursor
          }),
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
          }
        }] : []),
        // Fallback to old API with different parameters
        {
          url: `https://services.leadconnectorhq.com/forms/submissions`,
          params: new URLSearchParams({
            locationId,
            limit: limit.toString(),
            page: page.toString()
          }),
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
          }
        }
      ];
      
      let responseData = null;
      let submissions = [];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`📝 Trying endpoint: ${endpoint.url}?${endpoint.params.toString()}`);
          
          const response = await fetch(`${endpoint.url}?${endpoint.params.toString()}`, {
            headers: endpoint.headers,
          });

          if (response.ok) {
            responseData = await response.json();
            submissions = responseData.submissions || responseData.data || [];
            
            console.log(`📝 Success! Found ${submissions.length} submissions from ${endpoint.url}`);
            
            // Check for next page indicators
            nextCursor = responseData.nextCursor || responseData.nextPageToken || responseData.next;
            
            break; // Success, exit endpoint loop
          } else {
            const errorText = await response.text();
            console.log(`📝 Endpoint failed: ${endpoint.url} - ${response.status}: ${errorText}`);
          }
        } catch (error) {
          console.log(`📝 Endpoint error: ${endpoint.url} - ${error.message}`);
        }
      }
      
      // If no endpoint worked, stop
      if (!responseData || submissions.length === 0) {
        console.log(`📝 No more submissions found on page ${page}`);
        hasMore = false;
        break;
      }
      
      allSubmissions = [...allSubmissions, ...submissions];
      console.log(`📝 Page ${page}: Added ${submissions.length} submissions (total: ${allSubmissions.length})`);
      
      // Check if we should continue
      if (submissions.length < limit && !nextCursor) {
        console.log(`📝 Reached end of submissions (got ${submissions.length} < ${limit})`);
        hasMore = false;
      }
      
      page++;
    }
    
    console.log(`📝 Total submissions fetched: ${allSubmissions.length}`);
    
    // Log sample submission structure
    if (allSubmissions.length > 0) {
      console.log('📝 Sample submission structure:', JSON.stringify(allSubmissions[0], null, 2));
    }

    // Get all tracked forms for this project
    const { data: trackedForms, error: formsError } = await supabase
      .from('ghl_forms')
      .select('form_id, form_name')
      .eq('project_id', projectId)
      .eq('is_active', true);

    console.log('📝 Tracked forms query result:', { trackedForms, formsError, projectId });

    if (formsError || !trackedForms?.length) {
      console.log('📝 No forms to sync submissions for');
      return 0;
    }

    const trackedFormIds = trackedForms.map(f => f.form_id);
    console.log('📝 Tracked form IDs:', trackedFormIds);
    
    // Filter submissions for tracked forms and within the last 2 weeks
    const relevantSubmissions = allSubmissions.filter((s: any) => {
      if (!trackedFormIds.includes(s.formId)) return false;
      
      // Parse the submission date
      const submissionDate = new Date(s.createdAt || s.created_at);
      
      // Check if it's within the last 2 weeks
      const isWithinTimeRange = submissionDate >= twoWeeksAgo;
      
      return isWithinTimeRange;
    });

    console.log(`📝 Found ${relevantSubmissions.length} relevant submissions for tracked forms within last 2 weeks`);

    let totalSynced = 0;

    // Store submissions in database
    for (const submission of relevantSubmissions) {
      console.log('📝 Syncing submission:', JSON.stringify(submission, null, 2));
      
      const { error } = await supabase
        .from('ghl_form_submissions')
        .upsert({
          project_id: projectId,
          form_id: submission.formId,
          submission_id: submission.id,
          contact_name: submission.name || null,
          contact_email: submission.email || null,
          contact_phone: submission.phone || null,
          form_data: submission.others || submission,
          submitted_at: submission.createdAt || submission.created_at || new Date().toISOString(),
        }, {
          onConflict: 'project_id,submission_id'
        });

      if (!error) {
        totalSynced++;
        console.log(`✅ Synced submission: ${submission.id}`);
      } else {
        console.error('❌ Error syncing submission:', error);
      }
    }

    return totalSynced;
  } catch (error) {
    console.error('❌ Submissions sync error:', error);
    return 0;
  }
}