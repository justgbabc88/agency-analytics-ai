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
    const { projectId, platform, syncType = 'both' }: RequestBody = await req.json();
    
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
    }

    // Sync submissions if requested
    if (syncType === 'submissions' || syncType === 'both') {
      console.log('📝 Syncing submissions...');
      const submissionsResult = await syncSubmissions(supabase, projectId, access_token, location_id);
      syncResults.submissions = submissionsResult;
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
    const response = await fetch(`https://services.leadconnectorhq.com/forms/`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Version': '2021-07-28',
      },
    });

    if (!response.ok) {
      console.error('❌ GHL API error:', await response.text());
      return 0;
    }

    const data = await response.json();
    const forms = data.forms || [];

    console.log(`📋 Found ${forms.length} forms to sync`);

    // Store forms in database
    let syncedCount = 0;
    for (const form of forms) {
      const { error } = await supabase
        .from('ghl_forms')
        .upsert({
          project_id: projectId,
          form_id: form.id,
          form_name: form.name,
          form_url: form.url || null,
          is_active: true,
        });

      if (!error) {
        syncedCount++;
      } else {
        console.error('❌ Error syncing form:', error);
      }
    }

    return syncedCount;
  } catch (error) {
    console.error('❌ Forms sync error:', error);
    return 0;
  }
}

async function syncSubmissions(supabase: any, projectId: string, accessToken: string, locationId: string): Promise<number> {
  try {
    // Get all tracked forms for this project
    const { data: trackedForms, error: formsError } = await supabase
      .from('ghl_forms')
      .select('form_id')
      .eq('project_id', projectId)
      .eq('is_active', true);

    if (formsError || !trackedForms?.length) {
      console.log('📝 No forms to sync submissions for');
      return 0;
    }

    let totalSynced = 0;

    // Sync submissions for each form
    for (const form of trackedForms) {
      try {
        const response = await fetch(`https://services.leadconnectorhq.com/forms/submissions`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Version': '2021-07-28',
          },
        });

        if (!response.ok) {
          console.error(`❌ GHL API error for form ${form.form_id}:`, await response.text());
          continue;
        }

        const data = await response.json();
        const submissions = data.submissions || [];

        // Filter submissions for this specific form
        const formSubmissions = submissions.filter((s: any) => s.formId === form.form_id);

        console.log(`📝 Found ${formSubmissions.length} submissions for form ${form.form_id}`);

        // Store submissions in database
        for (const submission of formSubmissions) {
          const { error } = await supabase
            .from('ghl_form_submissions')
            .upsert({
              project_id: projectId,
              form_id: form.form_id,
              submission_id: submission.id,
              contact_name: submission.name || null,
              contact_email: submission.email || null,
              contact_phone: submission.phone || null,
              form_data: submission.others || null,
              submitted_at: submission.createdAt || new Date().toISOString(),
            });

          if (!error) {
            totalSynced++;
          } else {
            console.error('❌ Error syncing submission:', error);
          }
        }
      } catch (error) {
        console.error(`❌ Error syncing submissions for form ${form.form_id}:`, error);
      }
    }

    return totalSynced;
  } catch (error) {
    console.error('❌ Submissions sync error:', error);
    return 0;
  }
}