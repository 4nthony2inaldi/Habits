import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Oura OAuth2 callback handler
// Exchanges authorization code for access token and stores connection

const OURA_TOKEN_URL = 'https://api.ouraring.com/oauth/token'
const OURA_CLIENT_ID = process.env.OURA_CLIENT_ID
const OURA_CLIENT_SECRET = process.env.OURA_CLIENT_SECRET
const OURA_REDIRECT_URI = process.env.OURA_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/health/oura/callback`

interface OuraTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

interface OuraUserResponse {
  id: string
  email: string
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors from Oura
    if (error) {
      console.error('Oura OAuth error:', error)
      return NextResponse.redirect(new URL(`/settings?error=oura_${error}`, request.url))
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/settings?error=missing_oauth_params', request.url))
    }

    if (!OURA_CLIENT_ID || !OURA_CLIENT_SECRET) {
      console.error('Oura OAuth credentials not configured')
      return NextResponse.redirect(new URL('/settings?error=oura_not_configured', request.url))
    }

    // Verify state parameter matches cookie
    const storedState = request.cookies.get('oura_oauth_state')?.value
    if (!storedState || storedState !== state) {
      console.error('State mismatch in Oura OAuth callback')
      return NextResponse.redirect(new URL('/settings?error=invalid_state', request.url))
    }

    // Decode state to get user ID
    let stateData: { userId: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
    } catch {
      return NextResponse.redirect(new URL('/settings?error=invalid_state', request.url))
    }

    // Check state isn't too old (10 minutes)
    if (Date.now() - stateData.timestamp > 600000) {
      return NextResponse.redirect(new URL('/settings?error=state_expired', request.url))
    }

    // Verify user is still authenticated and matches state
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || user.id !== stateData.userId) {
      return NextResponse.redirect(new URL('/login?redirect=/settings', request.url))
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch(OURA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: OURA_REDIRECT_URI,
        client_id: OURA_CLIENT_ID,
        client_secret: OURA_CLIENT_SECRET,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Failed to exchange Oura token:', errorText)
      return NextResponse.redirect(new URL('/settings?error=token_exchange_failed', request.url))
    }

    const tokenData: OuraTokenResponse = await tokenResponse.json()

    // Get Oura user info
    let ouraUserId: string | null = null
    try {
      const userResponse = await fetch('https://api.ouraring.com/v2/usercollection/personal_info', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      })
      if (userResponse.ok) {
        const userData: OuraUserResponse = await userResponse.json()
        ouraUserId = userData.id
      }
    } catch (e) {
      console.warn('Failed to fetch Oura user info:', e)
    }

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

    // Store or update the health connection
    const { error: upsertError } = await supabase
      .from('health_connections')
      .upsert({
        user_id: user.id,
        provider: 'oura',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: tokenExpiresAt,
        scopes: ['daily', 'personal', 'heartrate', 'sleep', 'workout'],
        provider_user_id: ouraUserId,
        last_sync_status: 'pending',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      })

    if (upsertError) {
      console.error('Failed to store Oura connection:', upsertError)
      return NextResponse.redirect(new URL('/settings?error=storage_failed', request.url))
    }

    // Clear state cookie and redirect to settings with success
    const response = NextResponse.redirect(new URL('/settings?success=oura_connected', request.url))
    response.cookies.delete('oura_oauth_state')

    return response
  } catch (error) {
    console.error('Error in Oura OAuth callback:', error)
    return NextResponse.redirect(new URL('/settings?error=oauth_failed', request.url))
  }
}
