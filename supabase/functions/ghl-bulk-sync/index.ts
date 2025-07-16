import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkSyncRequest {
  project_id: string;
  location_id: string;
  api_key: string;
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string
  batch_size?: number;
}

interface GHLFormSubmission {
  id: string;
  form_id: string;
  contact_id?: string;
  submission_id: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  form_data: any;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      project_id,
      location_id,
      api_key,
      start_date,
      end_date,
      batch_size = 100
    }: BulkSyncRequest = await req.json();

    console.log(`🚀 Starting GHL bulk sync for project: ${project_id}`);
    console.log(`📅 Date range: ${start_date || 'all'} to ${end_date || 'all'}`);
    console.log(`📦 Batch size: ${batch_size}`);

    if (!project_id || !location_id || !api_key) {
      return new Response(
        JSON.stringify({ error: 'project_id, location_id, and api_key are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Step 1: Get all forms for the location
    console.log('📋 Fetching forms from GHL API...');
    const forms = await fetchAllForms(location_id, api_key);
    console.log(`📋 Found ${forms.length} forms`);

    // Step 2: Sync forms to database
    await syncFormsToDatabase(project_id, forms);

    // Step 3: Get all submissions for each form
    let totalSubmissions = 0;
    let processedSubmissions = 0;
    let duplicateSubmissions = 0;
    let errorSubmissions = 0;

    const syncResults = {
      total_forms: forms.length,
      synced_forms: 0,
      total_submissions: 0,
      processed_submissions: 0,
      duplicate_submissions: 0,
      error_submissions: 0,
      start_time: new Date().toISOString(),
      end_time: '',
      duration_seconds: 0
    };

    const startTime = Date.now();

    for (const form of forms) {
      try {
        console.log(`📝 Processing form: ${form.name} (${form.id})`);
        
        const formSubmissions = await fetchAllSubmissionsForForm(
          location_id,
          form.id,
          api_key,
          start_date,
          end_date
        );

        totalSubmissions += formSubmissions.length;
        console.log(`📝 Found ${formSubmissions.length} submissions for form: ${form.name}`);

        // Process submissions in batches
        const batches = chunkArray(formSubmissions, batch_size);
        
        for (const batch of batches) {
          const batchResults = await processBatch(project_id, batch);
          processedSubmissions += batchResults.processed;
          duplicateSubmissions += batchResults.duplicates;
          errorSubmissions += batchResults.errors;
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        syncResults.synced_forms++;
        
      } catch (error) {
        console.error(`❌ Error processing form ${form.name}:`, error);
        errorSubmissions++;
      }
    }

    const endTime = Date.now();
    const durationSeconds = Math.round((endTime - startTime) / 1000);

    syncResults.total_submissions = totalSubmissions;
    syncResults.processed_submissions = processedSubmissions;
    syncResults.duplicate_submissions = duplicateSubmissions;
    syncResults.error_submissions = errorSubmissions;
    syncResults.end_time = new Date().toISOString();
    syncResults.duration_seconds = durationSeconds;

    console.log(`🎉 Bulk sync completed in ${durationSeconds} seconds`);
    console.log(`📊 Results: ${processedSubmissions} processed, ${duplicateSubmissions} duplicates, ${errorSubmissions} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Bulk sync completed successfully',
        results: syncResults
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Bulk sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function fetchAllForms(locationId: string, apiKey: string) {
  const response = await fetch(
    `https://services.leadconnectorhq.com/locations/${locationId}/forms/`,
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch forms: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.forms || [];
}

async function fetchAllSubmissionsForForm(
  locationId: string,
  formId: string,
  apiKey: string,
  startDate?: string,
  endDate?: string
) {
  const submissions: any[] = [];
  let startAfter = '';
  let hasMore = true;

  while (hasMore) {
    try {
      let url = `https://services.leadconnectorhq.com/locations/${locationId}/forms/${formId}/submissions?limit=100`;
      
      if (startAfter) {
        url += `&startAfter=${startAfter}`;
      }
      
      if (startDate) {
        url += `&startDate=${startDate}`;
      }
      
      if (endDate) {
        url += `&endDate=${endDate}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch submissions: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const pageSubmissions = data.submissions || [];
      
      submissions.push(...pageSubmissions);
      
      // Check if there are more pages
      hasMore = data.meta?.nextPageUrl || (pageSubmissions.length === 100);
      
      if (hasMore && pageSubmissions.length > 0) {
        startAfter = pageSubmissions[pageSubmissions.length - 1].id;
      } else {
        hasMore = false;
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`Error fetching submissions for form ${formId}:`, error);
      hasMore = false;
    }
  }

  return submissions;
}

async function syncFormsToDatabase(projectId: string, forms: any[]) {
  const formRecords = forms.map(form => ({
    project_id: projectId,
    form_id: form.id,
    form_name: form.name,
    form_url: form.url || null,
    is_active: true
  }));

  // Use upsert to handle duplicates
  const { error } = await supabase
    .from('ghl_forms')
    .upsert(formRecords, { 
      onConflict: 'project_id,form_id',
      ignoreDuplicates: false 
    });

  if (error) {
    console.error('Error upserting forms:', error);
    throw error;
  }

  console.log(`✅ Synced ${forms.length} forms to database`);
}

async function processBatch(projectId: string, submissions: any[]) {
  let processed = 0;
  let duplicates = 0;
  let errors = 0;

  const submissionRecords = submissions.map(submission => ({
    project_id: projectId,
    form_id: submission.form_id || submission.formId,
    submission_id: submission.id,
    contact_name: submission.contact_name || submission.contactName || 
                  submission.name || submission.first_name || null,
    contact_email: submission.contact_email || submission.contactEmail || 
                   submission.email || null,
    contact_phone: submission.contact_phone || submission.contactPhone || 
                   submission.phone || null,
    form_data: submission,
    submitted_at: submission.submitted_at || submission.submittedAt || 
                  submission.created_at || submission.createdAt || 
                  new Date().toISOString()
  }));

  try {
    // Use upsert to handle duplicates gracefully
    const { data, error } = await supabase
      .from('ghl_form_submissions')
      .upsert(submissionRecords, { 
        onConflict: 'submission_id',
        ignoreDuplicates: true 
      })
      .select('id');

    if (error) {
      console.error('Batch processing error:', error);
      errors = submissions.length;
    } else {
      const insertedCount = data?.length || 0;
      processed = insertedCount;
      duplicates = submissions.length - insertedCount;
    }

  } catch (error) {
    console.error('Batch processing exception:', error);
    errors = submissions.length;
  }

  return { processed, duplicates, errors };
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}