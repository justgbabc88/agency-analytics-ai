import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    console.log(`🔔 GHL Webhook received: ${req.method} ${req.url}`);
    
    const url = new URL(req.url);
    const projectId = url.searchParams.get('project_id');
    
    if (!projectId) {
      console.error('❌ Missing project_id parameter');
      return new Response(
        JSON.stringify({ error: 'project_id parameter is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📋 Processing webhook for project: ${projectId}`);

    // Parse the request body
    const body = await req.json();
    console.log('📄 Webhook payload:', JSON.stringify(body, null, 2));

    // Validate required fields
    const formId = body.form_id || body.formId;
    const submissionId = body.submission_id || body.submissionId || body.id;
    
    if (!formId) {
      console.error('❌ Missing form_id in webhook payload');
      return new Response(
        JSON.stringify({ error: 'form_id is required in webhook payload' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if this form is being tracked
    const { data: trackedForm, error: formError } = await supabase
      .from('ghl_forms')
      .select('*')
      .eq('project_id', projectId)
      .eq('form_id', formId)
      .eq('is_active', true)
      .maybeSingle();

    if (formError) {
      console.error('❌ Error checking tracked forms:', formError);
      return new Response(
        JSON.stringify({ error: 'Error checking tracked forms' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!trackedForm) {
      console.log(`⚠️ Form ${formId} is not being tracked for project ${projectId}`);
      return new Response(
        JSON.stringify({ message: 'Form not tracked', form_id: formId }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`✅ Form ${formId} is being tracked: ${trackedForm.form_name}`);

    // Extract contact information
    const contactName = body.contact_name || body.contactName || body.name || 
                       body.first_name || body.firstName || null;
    const contactEmail = body.contact_email || body.contactEmail || body.email || null;
    const contactPhone = body.contact_phone || body.contactPhone || body.phone || null;

    // Check if this submission already exists
    if (submissionId) {
      const { data: existingSubmission } = await supabase
        .from('ghl_form_submissions')
        .select('id')
        .eq('submission_id', submissionId)
        .maybeSingle();

      if (existingSubmission) {
        console.log(`⚠️ Submission ${submissionId} already exists, skipping`);
        return new Response(
          JSON.stringify({ message: 'Submission already processed' }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Insert the form submission
    const submissionData = {
      project_id: projectId,
      form_id: formId,
      submission_id: submissionId || `ghl_${Date.now()}`,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      form_data: body,
      submitted_at: body.submitted_at || body.submittedAt || new Date().toISOString()
    };

    const { error: insertError } = await supabase
      .from('ghl_form_submissions')
      .insert(submissionData);

    if (insertError) {
      console.error('❌ Error inserting submission:', insertError);
      return new Response(
        JSON.stringify({ error: 'Error saving submission' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🎉 Successfully processed GHL form submission for form: ${trackedForm.form_name}`);
    
    // Also create a tracking event for better attribution
    try {
      await supabase.functions.invoke('track-event', {
        body: {
          project_id: projectId,
          event_type: 'form_submission',
          event_name: 'ghl_form_submission',
          page_url: trackedForm.form_url || `ghl-form-${formId}`,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          contact_name: contactName,
          custom_data: {
            form_id: formId,
            form_name: trackedForm.form_name,
            submission_id: submissionData.submission_id,
            source: 'go_high_level'
          }
        }
      });
      
      console.log('📈 Tracking event created successfully');
    } catch (trackingError) {
      console.error('⚠️ Error creating tracking event:', trackingError);
      // Don't fail the webhook if tracking fails
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Form submission processed successfully',
        form_name: trackedForm.form_name,
        submission_id: submissionData.submission_id
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});