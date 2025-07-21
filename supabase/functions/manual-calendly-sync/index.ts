
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request body to extract timezone if provided
    const body = await req.json().catch(() => ({}));
    const { userTimezone, projectId } = body;

    console.log('🔧 Manual Calendly sync triggered with timezone awareness:', {
      userTimezone: userTimezone || 'UTC (default)',
      projectId: projectId || 'all projects'
    });

    // Call the calendly-sync-gaps function with timezone
    const { data, error } = await supabaseClient.functions.invoke('calendly-sync-gaps', {
      body: { 
        manual_trigger: true,
        userTimezone: userTimezone || 'UTC',
        specificProjectId: projectId
      }
    })

    if (error) {
      console.error('❌ Error calling sync function:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to trigger sync', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Timezone-aware sync function response:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Calendly sync triggered successfully with timezone support',
        timezone: userTimezone || 'UTC',
        result: data 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Manual sync error:', error)
    return new Response(
      JSON.stringify({ error: 'Manual sync failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
