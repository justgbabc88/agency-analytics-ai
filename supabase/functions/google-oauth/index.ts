
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OAuthRequest {
  action: 'get_auth_url' | 'exchange_code' | 'list_sheets' | 'get_sheet_data'
  code?: string
  accessToken?: string
  spreadsheetId?: string
  range?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    let requestData: OAuthRequest

    console.log(`Processing ${req.method} request to ${req.url}`)

    if (req.method === 'POST') {
      const text = await req.text()
      console.log('Raw request body:', text)
      
      if (!text || text.trim() === '') {
        throw new Error('Request body is required for POST requests')
      }
      
      try {
        requestData = JSON.parse(text)
        console.log('Parsed request data:', requestData)
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError)
        throw new Error('Invalid JSON in request body')
      }
    } else {
      // Handle GET requests with URL parameters
      const url = new URL(req.url)
      const action = url.searchParams.get('action')
      if (!action) {
        throw new Error('Action parameter is required')
      }
      requestData = { 
        action: action as OAuthRequest['action'],
        code: url.searchParams.get('code') || undefined,
        accessToken: url.searchParams.get('accessToken') || undefined,
        spreadsheetId: url.searchParams.get('spreadsheetId') || undefined,
        range: url.searchParams.get('range') || undefined
      }
      console.log('GET request data:', requestData)
    }

    const { action, code, accessToken, spreadsheetId, range } = requestData

    if (!action) {
      throw new Error('Action parameter is required')
    }

    // Actions that require authentication
    const authRequiredActions = ['list_sheets', 'get_sheet_data']
    
    if (authRequiredActions.includes(action)) {
      // Check for authorization header for protected actions
      const authHeader = req.headers.get('authorization')
      if (!authHeader) {
        throw new Error('Authentication required for this action')
      }
      
      // Verify the JWT token
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !user) {
        throw new Error('Invalid authentication token')
      }
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const redirectUri = `${new URL(req.url).origin}/google-oauth-callback`

    console.log('Using redirect URI:', redirectUri)
    console.log('Client ID configured:', !!clientId)
    console.log('Client Secret configured:', !!clientSecret)

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your Supabase secrets.')
    }

    console.log(`Processing action: ${action}`)

    let result: any = {}

    switch (action) {
      case 'get_auth_url':
        const scopes = [
          'https://www.googleapis.com/auth/spreadsheets.readonly',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ].join(' ')
        
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${clientId}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=${encodeURIComponent(scopes)}&` +
          `access_type=offline&` +
          `prompt=consent`
        
        console.log('Generated auth URL successfully')
        result = { authUrl }
        break

      case 'exchange_code':
        if (!code) throw new Error('Authorization code required')
        
        console.log('Exchanging authorization code for tokens')
        
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
          }),
        })

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text()
          console.error('Token exchange failed:', errorText)
          throw new Error('Failed to exchange authorization code')
        }

        const tokens = await tokenResponse.json()
        console.log('Token exchange successful')
        
        // Get user info
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { 'Authorization': `Bearer ${tokens.access_token}` }
        })
        
        if (!userResponse.ok) {
          throw new Error('Failed to fetch user information')
        }
        
        const userInfo = await userResponse.json()
        console.log('User info retrieved successfully')
        
        result = { 
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          userInfo 
        }
        break

      case 'list_sheets':
        if (!accessToken) throw new Error('Access token required')
        
        console.log('Fetching Google Sheets list')
        
        const sheetsResponse = await fetch(
          'https://www.googleapis.com/drive/v3/files?q=mimeType="application/vnd.google-apps.spreadsheet"&fields=files(id,name,webViewLink)',
          {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        )

        if (!sheetsResponse.ok) {
          const errorText = await sheetsResponse.text()
          console.error('Failed to fetch sheets:', errorText)
          throw new Error('Failed to fetch Google Sheets')
        }

        const sheetsData = await sheetsResponse.json()
        console.log(`Found ${sheetsData.files?.length || 0} sheets`)
        result = { sheets: sheetsData.files || [] }
        break

      case 'get_sheet_data':
        if (!accessToken || !spreadsheetId) {
          throw new Error('Access token and spreadsheet ID required')
        }
        
        console.log(`Fetching data for spreadsheet: ${spreadsheetId}`)
        
        // Get spreadsheet metadata
        const metadataResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        )

        if (!metadataResponse.ok) {
          const errorText = await metadataResponse.text()
          console.error('Failed to fetch metadata:', errorText)
          throw new Error('Failed to fetch spreadsheet metadata')
        }

        const metadata = await metadataResponse.json()
        const firstSheet = metadata.sheets?.[0]?.properties?.title || 'Sheet1'
        console.log(`First sheet name: ${firstSheet}`)
        
        // Get header row to determine columns
        const headerResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${firstSheet}!1:1`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        )

        if (!headerResponse.ok) {
          console.error('Failed to fetch sheet headers')
          throw new Error('Failed to fetch sheet headers')
        }

        const headerData = await headerResponse.json()
        const columns = headerData.values?.[0] || []
        console.log(`Found ${columns.length} columns`)

        // Get data if range is specified
        let data = []
        if (range) {
          console.log(`Fetching data for range: ${range}`)
          const dataResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
            {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            }
          )

          if (dataResponse.ok) {
            const sheetData = await dataResponse.json()
            data = sheetData.values || []
            console.log(`Retrieved ${data.length} rows of data`)
          }
        }

        result = { 
          spreadsheetId,
          title: metadata.properties?.title,
          columns,
          data,
          sheets: metadata.sheets?.map((sheet: any) => ({
            title: sheet.properties.title,
            sheetId: sheet.properties.sheetId
          })) || []
        }
        break

      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Google OAuth error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
