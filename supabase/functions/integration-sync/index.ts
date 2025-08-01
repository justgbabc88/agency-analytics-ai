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

    let { access_token, refresh_token, location_id } = integrationData.data;
    
    // Check if we need to refresh the token
    const tokenExpired = await testToken(access_token, location_id);
    
    if (tokenExpired && refresh_token) {
      console.log('🔄 Access token expired, attempting to refresh...');
      const refreshResult = await refreshGHLToken(refresh_token);
      
      if (refreshResult.success) {
        console.log('✅ Token refreshed successfully');
        // Update the token in the database
        const { error: updateError } = await supabase
          .from('project_integration_data')
          .update({
            data: {
              ...integrationData.data,
              access_token: refreshResult.access_token,
              refresh_token: refreshResult.refresh_token
            }
          })
          .eq('project_id', projectId)
          .eq('platform', platform);
          
        if (updateError) {
          console.error('❌ Failed to update token in database:', updateError);
        } else {
          // Use the new token
          access_token = refreshResult.access_token;
        }
      } else {
        console.error('❌ Failed to refresh token:', refreshResult.error);
        
        // Check if this is an invalid grant error (token expired/revoked)
        if (refreshResult.error?.includes('invalid_grant') || refreshResult.error?.includes('invalid')) {
          // Mark the integration as disconnected
          await supabase
            .from('project_integrations')
            .update({ is_connected: false })
            .eq('project_id', projectId)
            .eq('platform', platform);
            
          return new Response(
            JSON.stringify({ 
              error: 'GHL connection expired. Please reconnect your GHL account.',
              code: 'TOKEN_EXPIRED',
              requiresReconnection: true
            }),
            { 
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        } else {
          return new Response(
            JSON.stringify({ 
              error: 'Authentication failed. Please try again or reconnect your GHL account.',
              details: refreshResult.error
            }),
            { 
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }
    }

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
  console.log(`📝 Starting submissions sync for project: ${projectId}`);
  let totalSynced = 0;
  
  try {
    // Calculate date range for last 2 weeks
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    console.log(`📝 Syncing submissions from ${twoWeeksAgo.toISOString()} to now`);
    
    // Try multiple pages to get more submissions
    let allSubmissions: any[] = [];
    let hasMore = true;
    let page = 1;
    const maxPages = 100; // Allow up to 10,000 submissions (100 pages × 100 per page)
    
    while (hasMore && page <= maxPages) {
      console.log(`📝 Fetching page ${page}...`);
      
      try {
        // Try the working API endpoint with page parameter
        const response = await fetch(`https://services.leadconnectorhq.com/forms/submissions?locationId=${locationId}&limit=100&page=${page}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.log(`📝 API returned ${response.status} for page ${page}`);
          if (page === 1) {
            // If first page fails, try without page parameter
            const fallbackResponse = await fetch(`https://services.leadconnectorhq.com/forms/submissions?locationId=${locationId}`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Version': '2021-07-28',
                'Content-Type': 'application/json',
              },
            });
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              allSubmissions = fallbackData.submissions || [];
              console.log(`📝 Fallback: Found ${allSubmissions.length} submissions`);
            }
          }
          break;
        }

        const data = await response.json();
        const submissions = data.submissions || [];
        
        console.log(`📝 Page ${page}: Found ${submissions.length} submissions`);
        
        if (submissions.length === 0) {
          hasMore = false;
        } else {
          allSubmissions = [...allSubmissions, ...submissions];
          
          // If we got less than 100, we're probably at the end
          if (submissions.length < 100) {
            hasMore = false;
          }
        }
        
        page++;
        
      } catch (pageError) {
        console.error(`❌ Error fetching page ${page}:`, pageError);
        break;
      }
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

    // Process submissions in batches to avoid timeouts
    const batchSize = 50;
    let totalSynced = 0;
    
    console.log(`📝 Processing ${relevantSubmissions.length} submissions in batches of ${batchSize}`);
    
    for (let i = 0; i < relevantSubmissions.length; i += batchSize) {
      const batch = relevantSubmissions.slice(i, i + batchSize);
      console.log(`📝 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(relevantSubmissions.length/batchSize)} (${batch.length} submissions)`);
      
      // Prepare batch data
      const batchData = batch.map(submission => ({
        project_id: projectId,
        form_id: submission.formId,
        submission_id: submission.id,
        contact_name: submission.name || null,
        contact_email: submission.email || null,
        contact_phone: submission.phone || null,
        form_data: submission.others || submission,
        submitted_at: submission.createdAt || submission.created_at || new Date().toISOString(),
      }));
      
      // Batch upsert
      const { error, count } = await supabase
        .from('ghl_form_submissions')
        .upsert(batchData, {
          onConflict: 'project_id,submission_id'
        });

      if (!error) {
        totalSynced += batch.length;
        console.log(`✅ Synced batch: ${batch.length} submissions`);
      } else {
        console.error('❌ Error syncing batch:', error);
        // Continue with next batch even if one fails
      }
    }

    return totalSynced;
  } catch (error) {
    console.error('❌ Submissions sync error:', error);
    return 0;
  }
}

// Test if the token is valid
async function testToken(accessToken: string, locationId: string): Promise<boolean> {
  try {
    // Try a simple API call to see if the token is still valid
    const response = await fetch(`https://services.leadconnectorhq.com/locations/${locationId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
    });
    
    // If we get a 401, the token is expired
    return response.status === 401;
  } catch (error) {
    console.error('❌ Error testing token:', error);
    // If there's an error, assume token is expired to be safe
    return true;
  }
}

// Refresh GHL token
async function refreshGHLToken(refreshToken: string): Promise<{ 
  success: boolean; 
  access_token?: string; 
  refresh_token?: string;
  error?: string;
}> {
  try {
    const clientId = Deno.env.get('GHL_CLIENT_ID');
    const clientSecret = Deno.env.get('GHL_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      return { success: false, error: 'OAuth client credentials missing' };
    }
    
    const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }).toString()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { 
        success: false, 
        error: `Token refresh failed: ${response.status} ${errorText}` 
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken
    };
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}