
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context, projectId, dateRange } = await req.json();

    console.log('Enhanced ChatGPT request received:', { 
      messagesCount: messages?.length, 
      context: context?.type,
      projectId,
      dateRange 
    });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create Supabase client for data access
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Gather relevant context based on the user's question
    const userQuestion = messages[messages.length - 1]?.content?.toLowerCase() || '';
    let enhancedContext = { ...context };

    if (projectId && supabaseUrl && supabaseServiceKey) {
      // Determine what data to fetch based on the question
      const needsFacebookData = userQuestion.includes('facebook') || userQuestion.includes('ads') || 
                               userQuestion.includes('campaign') || userQuestion.includes('cpc') || 
                               userQuestion.includes('cpm') || userQuestion.includes('roas');
      
      const needsCalendlyData = userQuestion.includes('booking') || userQuestion.includes('call') || 
                               userQuestion.includes('calendly') || userQuestion.includes('appointment');
      
      const needsFormData = userQuestion.includes('lead') || userQuestion.includes('form') || 
                           userQuestion.includes('submission') || userQuestion.includes('conversion');
      
      const needsTrackingData = userQuestion.includes('event') || userQuestion.includes('tracking') || 
                               userQuestion.includes('pixel') || userQuestion.includes('analytics');

      // Fetch Facebook/Integration data
      if (needsFacebookData) {
        try {
          const { data: integrationData } = await supabase
            .from('project_integration_data')
            .select('*')
            .eq('project_id', projectId)
            .eq('platform', 'facebook')
            .order('synced_at', { ascending: false })
            .limit(1);
          
          if (integrationData && integrationData.length > 0) {
            enhancedContext.facebookData = integrationData[0].data;
          }
        } catch (error) {
          console.log('Could not fetch Facebook data:', error);
        }
      }

      // Fetch Calendly data
      if (needsCalendlyData) {
        try {
          const { data: calendlyEvents } = await supabase
            .from('calendly_events')
            .select('*')
            .eq('project_id', projectId)
            .gte('created_at', dateRange?.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .lte('created_at', dateRange?.to || new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(100);
          
          if (calendlyEvents && calendlyEvents.length > 0) {
            enhancedContext.calendlyData = {
              totalBookings: calendlyEvents.length,
              events: calendlyEvents.slice(0, 10) // Recent events
            };
          }
        } catch (error) {
          console.log('Could not fetch Calendly data:', error);
        }
      }

      // Fetch GHL Form data
      if (needsFormData) {
        try {
          const { data: formSubmissions } = await supabase
            .from('ghl_form_submissions')
            .select('*')
            .eq('project_id', projectId)
            .gte('submitted_at', dateRange?.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .lte('submitted_at', dateRange?.to || new Date().toISOString())
            .order('submitted_at', { ascending: false })
            .limit(100);
          
          if (formSubmissions && formSubmissions.length > 0) {
            enhancedContext.formData = {
              totalSubmissions: formSubmissions.length,
              recentSubmissions: formSubmissions.slice(0, 5)
            };
          }
        } catch (error) {
          console.log('Could not fetch form data:', error);
        }
      }

      // Fetch tracking events
      if (needsTrackingData) {
        try {
          const { data: trackingEvents } = await supabase
            .from('tracking_events')
            .select('event_type, count(*)')
            .eq('project_id', projectId)
            .gte('created_at', dateRange?.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .lte('created_at', dateRange?.to || new Date().toISOString());
          
          if (trackingEvents && trackingEvents.length > 0) {
            enhancedContext.trackingData = trackingEvents;
          }
        } catch (error) {
          console.log('Could not fetch tracking data:', error);
        }
      }
    }

    // Create intelligent system message based on available context
    let systemMessage = `You are an expert marketing analytics AI assistant. You help marketers analyze their campaign data, optimize performance, and provide actionable insights.

Available Data Context:`;

    if (enhancedContext.facebookData) {
      systemMessage += '\n- Facebook Ads data (campaigns, performance metrics, spend, ROAS)';
    }
    if (enhancedContext.calendlyData) {
      systemMessage += '\n- Calendly booking data (appointments, conversion rates)';
    }
    if (enhancedContext.formData) {
      systemMessage += '\n- Form submission data (leads, conversion metrics)';
    }
    if (enhancedContext.trackingData) {
      systemMessage += '\n- Website tracking events (user behavior, conversions)';
    }

    systemMessage += `

Instructions:
- Analyze the provided data to answer the user's specific question
- Provide actionable, data-driven recommendations
- Use specific numbers and metrics from the actual data when available
- If data is limited, explain what additional data would be helpful
- Keep responses conversational but professional
- Focus on practical optimization opportunities
- Suggest next steps the user can take

Current Context Data: ${JSON.stringify(enhancedContext, null, 2)}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemMessage },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Enhanced ChatGPT response generated successfully');

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in enhanced chat-gpt function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
