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
    
    // Test the access token first
    console.log('🔍 Testing access token with simple API call...')
    try {
      const testResponse = await fetch('https://api.calendly.com/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!testResponse.ok) {
        const errorText = await testResponse.text()
        console.error('❌ Access token test failed:', testResponse.status, errorText)
        throw new Error(`Access token invalid: ${testResponse.status} ${errorText}`)
      }
      
      const userData = await testResponse.json()
      console.log('✅ Access token is valid')
      console.log(`👤 User: ${userData.resource?.name}`)
      console.log(`🏢 Organization: ${userData.resource?.current_organization}`)
      
      // For now, just return token validation success
      const summary = {
        july16: { apiCount: 'Token validated', dbCount: testCount || 0 },
        july17: { apiCount: 'Token validated', dbCount: testCount || 0 },
        missingEvents: 0,
        totalApiEvents: 'Token test successful',
        message: 'Access token validation successful',
        userInfo: userData.resource?.name,
        organization: userData.resource?.current_organization
      }
      
      console.log('✅ Token validation complete:', summary)

      return new Response(
        JSON.stringify({ 
          success: true, 
          summary,
          message: `Access token is valid for user: ${userData.resource?.name}`
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
      
    } catch (tokenError) {
      console.error('❌ Token test failed:', tokenError)
      throw new Error(`Token validation failed: ${tokenError.message}`)
    }

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