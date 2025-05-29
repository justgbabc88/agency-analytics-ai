
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncRequest {
  platform: string
  apiKeys: Record<string, string>
  agencyId: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { platform, apiKeys, agencyId }: SyncRequest = await req.json()

    console.log(`Syncing data for platform: ${platform}`)

    let syncResult: any = {}

    switch (platform) {
      case 'facebook_ads':
        syncResult = await syncFacebookAds(apiKeys)
        break
      case 'clickfunnels':
        syncResult = await syncClickFunnels(apiKeys)
        break
      case 'gohighlevel':
        syncResult = await syncGoHighLevel(apiKeys)
        break
      case 'activecampaign':
        syncResult = await syncActiveCampaign(apiKeys)
        break
      case 'google_sheets':
        syncResult = await syncGoogleSheets(apiKeys)
        break
      default:
        throw new Error(`Unsupported platform: ${platform}`)
    }

    // Store the synced data in the database
    const { error: insertError } = await supabase
      .from('integration_data')
      .upsert({
        agency_id: agencyId,
        platform,
        data: syncResult,
        synced_at: new Date().toISOString()
      })

    if (insertError) throw insertError

    // Update the integration status
    const { error: updateError } = await supabase
      .from('integrations')
      .upsert({
        agency_id: agencyId,
        platform,
        is_connected: true,
        last_sync: new Date().toISOString()
      })

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ success: true, data: syncResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function syncFacebookAds(apiKeys: Record<string, string>) {
  const { access_token, app_id } = apiKeys
  
  const response = await fetch(
    `https://graph.facebook.com/v18.0/me/adaccounts?access_token=${access_token}&fields=name,account_status,insights{spend,impressions,clicks,conversions}`
  )
  
  if (!response.ok) {
    throw new Error('Failed to fetch Facebook Ads data')
  }
  
  const data = await response.json()
  console.log('Facebook Ads data synced:', data.data?.length || 0, 'accounts')
  
  return {
    accounts: data.data || [],
    synced_at: new Date().toISOString()
  }
}

async function syncClickFunnels(apiKeys: Record<string, string>) {
  const { api_key, subdomain } = apiKeys
  
  const response = await fetch(
    `https://${subdomain}.myclickfunnels.com/api/v2/funnels`,
    {
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json'
      }
    }
  )
  
  if (!response.ok) {
    throw new Error('Failed to fetch ClickFunnels data')
  }
  
  const data = await response.json()
  console.log('ClickFunnels data synced:', data.funnels?.length || 0, 'funnels')
  
  return {
    funnels: data.funnels || [],
    synced_at: new Date().toISOString()
  }
}

async function syncGoHighLevel(apiKeys: Record<string, string>) {
  const { api_key, location_id } = apiKeys
  
  const response = await fetch(
    `https://rest.gohighlevel.com/v1/contacts?locationId=${location_id}`,
    {
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json'
      }
    }
  )
  
  if (!response.ok) {
    throw new Error('Failed to fetch GoHighLevel data')
  }
  
  const data = await response.json()
  console.log('GoHighLevel data synced:', data.contacts?.length || 0, 'contacts')
  
  return {
    contacts: data.contacts || [],
    synced_at: new Date().toISOString()
  }
}

async function syncActiveCampaign(apiKeys: Record<string, string>) {
  const { api_key, api_url } = apiKeys
  
  const response = await fetch(
    `${api_url}/api/3/campaigns`,
    {
      headers: {
        'Api-Token': api_key,
        'Content-Type': 'application/json'
      }
    }
  )
  
  if (!response.ok) {
    throw new Error('Failed to fetch ActiveCampaign data')
  }
  
  const data = await response.json()
  console.log('ActiveCampaign data synced:', data.campaigns?.length || 0, 'campaigns')
  
  return {
    campaigns: data.campaigns || [],
    synced_at: new Date().toISOString()
  }
}

async function syncGoogleSheets(apiKeys: Record<string, string>) {
  const { client_id, client_secret } = apiKeys
  
  // For Google Sheets, we would typically use OAuth2 flow
  // This is a simplified version for demonstration
  console.log('Google Sheets sync initiated with OAuth credentials')
  
  return {
    sheets: [],
    message: 'Google Sheets requires OAuth2 flow completion',
    synced_at: new Date().toISOString()
  }
}
