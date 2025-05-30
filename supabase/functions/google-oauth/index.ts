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
  console.log(`Processing ${req.method} request to ${req.url}`)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    let requestData: OAuthRequest

    if (req.method === 'POST') {
      try {
        requestData = await req.json()
        console.log('Parsed request data:', JSON.stringify(requestData, null, 2))
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError)
        throw new Error(`Invalid JSON in request body: ${parseError.message}`)
      }
    } else {
      throw new Error('Only POST requests are supported')
    }

    const { action, code, accessToken, spreadsheetId, range } = requestData

    if (!action) {
      console.error('No action provided in request')
      throw new Error('Action parameter is required')
    }

    console.log(`Processing action: ${action}`)

    // Actions that require authentication
    const authRequiredActions = ['list_sheets', 'get_sheet_data']
    
    if (authRequiredActions.includes(action)) {
      const authHeader = req.headers.get('authorization')
      console.log('Auth header present:', !!authHeader)
      
      if (!authHeader) {
        throw new Error('Authentication required for this action')
      }
      
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)
      
      if (authError || !user) {
        console.error('Auth error:', authError)
        throw new Error('Invalid authentication token')
      }
      
      console.log('User authenticated:', user.id)
    }

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    
    console.log('Google credentials check:')
    console.log('- Client ID configured:', !!clientId)
    console.log('- Client Secret configured:', !!clientSecret)

    if (!clientId || !clientSecret) {
      console.error('Missing Google OAuth credentials')
      throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your Supabase secrets.')
    }

    // Use the app domain for redirect URI instead of Supabase domain
    const url = new URL(req.url)
    const origin = req.headers.get('origin') || `${url.protocol}//${url.host}`
    const redirectUri = `${origin}/google-oauth-callback`
    console.log('Using redirect URI:', redirectUri)

    let result: any = {}

    switch (action) {
      case 'get_auth_url':
        console.log('Generating Google OAuth URL...')
        
        const scopes = [
          'https://www.googleapis.com/auth/spreadsheets.readonly',
          'https://www.googleapis.com/auth/drive.readonly',
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
        if (!code) {
          console.error('No authorization code provided')
          throw new Error('Authorization code required')
        }
        
        console.log('Exchanging authorization code for tokens...')
        
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

        console.log('Token exchange response status:', tokenResponse.status)

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text()
          console.error('Token exchange failed:', errorText)
          throw new Error(`Failed to exchange authorization code: ${errorText}`)
        }

        const tokens = await tokenResponse.json()
        console.log('Token exchange successful, fetching user info...')
        
        // Get user info
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { 'Authorization': `Bearer ${tokens.access_token}` }
        })
        
        if (!userResponse.ok) {
          const errorText = await userResponse.text()
          console.error('Failed to fetch user info:', errorText)
          throw new Error('Failed to fetch user information')
        }
        
        const userInfo = await userResponse.json()
        console.log('User info retrieved successfully:', userInfo.email)
        
        result = { 
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          userInfo 
        }
        break

      case 'list_sheets':
        if (!accessToken) {
          console.error('No access token provided for list_sheets')
          throw new Error('Access token required')
        }
        
        console.log('Fetching Google Sheets list...')
        
        const sheetsResponse = await fetch(
          'https://www.googleapis.com/drive/v3/files?q=mimeType="application/vnd.google-apps.spreadsheet"&fields=files(id,name,webViewLink)',
          {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        )

        console.log('Sheets API response status:', sheetsResponse.status)

        if (!sheetsResponse.ok) {
          const errorText = await sheetsResponse.text()
          console.error('Failed to fetch sheets:', errorText)
          throw new Error(`Failed to fetch Google Sheets: ${errorText}`)
        }

        const sheetsData = await sheetsResponse.json()
        console.log(`Found ${sheetsData.files?.length || 0} sheets`)
        result = { sheets: sheetsData.files || [] }
        break

      case 'get_sheet_data':
        if (!accessToken || !spreadsheetId) {
          console.error('Missing required parameters for get_sheet_data')
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
          throw new Error(`Failed to fetch spreadsheet metadata: ${errorText}`)
        }

        const metadata = await metadataResponse.json()
        const firstSheet = metadata.sheets?.[0]?.properties?.title || 'Sheet1'
        console.log(`First sheet name: ${firstSheet}`)
        
        // Get header row to determine columns
        const quotedSheetName = firstSheet.includes(' ') || firstSheet.includes("'") 
          ? `'${firstSheet.replace(/'/g, "''")}'` 
          : firstSheet
      
        const headerResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${quotedSheetName}!1:1`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        )

        if (!headerResponse.ok) {
          const headerError = await headerResponse.text()
          console.error('Failed to fetch sheet headers:', headerError)
          throw new Error('Failed to fetch sheet headers')
        }

        const headerData = await headerResponse.json()
        const columns = headerData.values?.[0] || []
        console.log(`Found ${columns.length} columns`)

        // Get data if range is specified
        let data = []
        if (range) {
          console.log(`Fetching data for range: ${range}`)
          
          // Parse the range to extract sheet name and cell range
          let formattedRange = range
          if (range.includes('!')) {
            const [sheetName, cellRange] = range.split('!')
            const quotedName = sheetName.includes(' ') || sheetName.includes("'")
              ? `'${sheetName.replace(/'/g, "''")}'`
              : sheetName
            formattedRange = `${quotedName}!${cellRange}`
          }
          
          console.log(`Using formatted range: ${formattedRange}`)
          
          const dataResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${formattedRange}`,
            {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            }
          )

          if (dataResponse.ok) {
            const sheetData = await dataResponse.json()
            data = sheetData.values || []
            console.log(`Retrieved ${data.length} rows of data`)
          } else {
            const dataError = await dataResponse.text()
            console.error('Failed to fetch sheet data:', dataError)
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
        console.error(`Unknown action: ${action}`)
        throw new Error(`Unknown action: ${action}`)
    }

    console.log('Request processed successfully, returning result')
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Google OAuth error:', error)
    console.error('Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
