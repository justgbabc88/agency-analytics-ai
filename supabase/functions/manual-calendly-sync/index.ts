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

    console.log('🔧 Manual Calendly sync triggered')

    // Call the calendly-sync-gaps function with the correct parameters
    const { data, error } = await supabaseClient.functions.invoke('calendly-sync-gaps', {
      body: { 
        triggerReason: 'manual_sync',
        specificProjectId: '382c6666-c24d-4de1-b449-3858a46fbed3'
      }
    })

    if (error) {
      console.error('❌ Error calling sync function:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to trigger sync', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('✅ Sync function response:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Calendly sync triggered successfully',
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