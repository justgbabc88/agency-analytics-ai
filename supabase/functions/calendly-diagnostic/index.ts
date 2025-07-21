import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log(`🚀 Diagnostic function started - ${new Date().toISOString()}`)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('📥 Parsing request body...')
    const body = await req.json()
    console.log('✅ Request body:', JSON.stringify(body))
    
    const { userTimezone, projectId, dates } = body
    
    if (!projectId) {
      throw new Error('Missing projectId in request')
    }
    
    console.log(`🔍 Starting diagnostic for project: ${projectId}`)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    console.log('✅ Supabase client created')

    // First, let's see if we can query the database at all
    console.log('🔍 Testing database connection...')
    const { count: testCount, error: testError } = await supabase
      .from('calendly_events')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
    
    if (testError) {
      console.error('❌ Database test failed:', testError)
      throw new Error(`Database test failed: ${testError.message}`)
    }
    
    console.log(`✅ Database connection OK. Total events in DB: ${testCount}`)

    // Try to get integration data
    console.log('🔍 Getting access token...')
    const { data: tokenRecord, error: tokenError } = await supabase
      .from('project_integration_data')
      .select('data')
      .eq('platform', 'calendly')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (tokenError) {
      console.error('❌ Token query failed:', tokenError)
      throw new Error(`Token query failed: ${tokenError.message}`)
    }
    
    if (!tokenRecord) {
      throw new Error('No token record found in project_integration_data')
    }
    
    const accessToken = tokenRecord?.data?.access_token
    
    if (!accessToken) {
      console.error('❌ No access token in data:', tokenRecord.data)
      throw new Error('No access token found in project integration data')
    }

    console.log('✅ Access token retrieved successfully')

    // Just return database stats for now to see if the function works
    const summary = {
      july16: { apiCount: 'N/A', dbCount: testCount || 0 },
      july17: { apiCount: 'N/A', dbCount: testCount || 0 },
      missingEvents: 0,
      totalApiEvents: 'N/A',
      message: 'Basic diagnostic complete - function working'
    }
    
    console.log('✅ Diagnostic complete:', summary)

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary,
        message: `Basic diagnostic complete - DB has ${testCount} total events`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Calendly diagnostic error:', error)
    console.error('❌ Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: `Diagnostic failed: ${error.message}`,
        stack: error.stack,
        success: false
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})