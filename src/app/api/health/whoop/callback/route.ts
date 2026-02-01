import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Whoop OAuth2 callback handler
// Exchanges authorization code for access token and stores connection

const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token'
const WHOOP_CLIENT_ID = process.env.WHOOP_CLIENT_ID
const WHOOP_CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET
const WHOOP_REDIRECT_URI = process.env.WHOOP_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/health/whoop/callback`

interface WhoopTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

interface WhoopUserResponse {
  user_id: number
  email: string
  first_name: string
  last_name: string
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors from Whoop
    if (error) {
      console.error('Whoop OAuth error:', error)
      return NextResponse.redirect(new URL(`/settings?error=whoop_${error}`, request.url))
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/settings?error=missing_oauth_params', request.url))
    }

    if (!WHOOP_CLIENT_ID || !WHOOP_CLIENT_SECRET) {
      console.error('Whoop OAuth credentials not configured')
      return NextResponse.redirect(new URL('/settings?error=whoop_not_configured', request.url))
    }

    // Verify state parameter matches cookie
    const storedState = request.cookies.get('whoop_oauth_state')?.value
    if (!storedState || storedState !== state) {
      console.error('State mismatch in Whoop OAuth callback')
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
    // Whoop uses Basic auth for token exchange
    const basicAuth = Buffer.from(`${WHOOP_CLIENT_ID}:${WHOOP_CLIENT_SECRET}`).toString('base64')

    const tokenResponse = await fetch(WHOOP_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: WHOOP_REDIRECT_URI,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Failed to exchange Whoop token:', errorText)
      return NextResponse.redirect(new URL('/settings?error=token_exchange_failed', request.url))
    }

    const tokenData: WhoopTokenResponse = await tokenResponse.json()

    // Get Whoop user info
    let whoopUserId: string | null = null
    try {
      const userResponse = await fetch('https://api.prod.whoop.com/developer/v1/user/profile/basic', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      })
      if (userResponse.ok) {
        const userData: WhoopUserResponse = await userResponse.json()
        whoopUserId = userData.user_id.toString()
      }
    } catch (e) {
      console.warn('Failed to fetch Whoop user info:', e)
    }

    // Calculate token expiry
    const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString()

    // Parse scopes from response
    const scopes = tokenData.scope ? tokenData.scope.split(' ') : ['read:profile', 'read:sleep', 'read:recovery', 'read:cycles', 'read:workout', 'offline']

    // Store or update the health connection
    const { error: upsertError } = await supabase
      .from('health_connections')
      .upsert({
        user_id: user.id,
        provider: 'whoop',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: tokenExpiresAt,
        scopes,
        provider_user_id: whoopUserId,
        last_sync_status: 'pending',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      })

    if (upsertError) {
      console.error('Failed to store Whoop connection:', upsertError)
      return NextResponse.redirect(new URL('/settings?error=storage_failed', request.url))
    }

    // Clear state cookie and redirect to settings with success
    const response = NextResponse.redirect(new URL('/settings?success=whoop_connected', request.url))
    response.cookies.delete('whoop_oauth_state')

    return response
  } catch (error) {
    console.error('Error in Whoop OAuth callback:', error)
    return NextResponse.redirect(new URL('/settings?error=oauth_failed', request.url))
  }
}
