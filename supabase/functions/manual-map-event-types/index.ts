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

    const { projectId } = await req.json()
    
    console.log('🔧 Manual event type mapping for project:', projectId)

    // Event types discovered from your Calendly account
    const eventTypes = [
      {
        uri: 'https://api.calendly.com/event_types/fbcf1864-a886-4d0e-8d10-e66faffeb522',
        name: '30 Minute Meeting (Nicholas)'
      },
      {
        uri: 'https://api.calendly.com/event_types/baeb813e-82ba-4312-a44b-517a4eeac0e6',
        name: '30 Minute Meeting (Bruno)'
      },
      {
        uri: 'https://api.calendly.com/event_types/1cfa1a40-97f0-45bf-98d2-02a9df0d993e',
        name: '30 Minute Meeting (Jake)'
      },
      {
        uri: 'https://api.calendly.com/event_types/750fc13d-0603-4c62-a0cd-826292f05c24',
        name: '30 Minute Meeting (Matthew)'
      },
      {
        uri: 'https://api.calendly.com/event_types/AGCO2HHTXRCXCB4J',
        name: '60 Minute Meeting'
      },
      {
        uri: 'https://api.calendly.com/event_types/DEHL2DDWWRBXBAU5',
        name: 'Henderson Advantage Call (Instagram)'
      },
      {
        uri: 'https://api.calendly.com/event_types/GHCM2HBXSWDUHF4F',
        name: 'Henderson Advantage Call (SO)'
      },
      {
        uri: 'https://api.calendly.com/event_types/74796519-c841-4f8a-9af3-b2ea851ec745',
        name: 'Henderson Advantage Call (SO) v2'
      }
    ]

    let mappingsCreated = 0

    for (const eventType of eventTypes) {
      const { error } = await supabaseClient
        .from('calendly_event_mappings')
        .upsert({
          project_id: projectId,
          calendly_event_type_id: eventType.uri,
          event_type_name: eventType.name,
          is_active: true
        }, {
          onConflict: 'project_id,calendly_event_type_id'
        })

      if (error) {
        console.error('❌ Error creating mapping for', eventType.name, ':', error)
      } else {
        console.log('✅ Created/updated mapping for:', eventType.name)
        mappingsCreated++
      }
    }

    console.log(`📋 Created ${mappingsCreated} event type mappings`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${mappingsCreated} event type mappings`,
        mappingsCreated 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Manual mapping error:', error)
    return new Response(
      JSON.stringify({ error: 'Manual mapping failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})