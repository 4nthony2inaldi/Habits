import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Whoop OAuth2 authorization endpoint
// Redirects user to Whoop to authorize the connection

const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth'
const WHOOP_CLIENT_ID = process.env.WHOOP_CLIENT_ID
const WHOOP_REDIRECT_URI = process.env.WHOOP_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/health/whoop/callback`

// Scopes for Whoop API - we need sleep and recovery data
// Note: Whoop does NOT provide steps data
const WHOOP_SCOPES = [
  'read:profile',     // User profile
  'read:sleep',       // Sleep data
  'read:recovery',    // Recovery data
  'read:cycles',      // Physiological cycles
  'read:workout',     // Workout data
  'offline',          // Refresh token
].join(' ')

export async function GET(request: NextRequest) {
  try {
    if (!WHOOP_CLIENT_ID) {
      console.error('WHOOP_CLIENT_ID not configured')
      return NextResponse.redirect(new URL('/settings?error=whoop_not_configured', request.url))
    }

    // Verify user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.redirect(new URL('/login?redirect=/settings', request.url))
    }

    // Generate state parameter for CSRF protection (includes user ID)
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now(),
      nonce: crypto.randomUUID(),
    })).toString('base64url')

    // Store state in a cookie for verification in callback
    const response = NextResponse.redirect(
      `${WHOOP_AUTH_URL}?` + new URLSearchParams({
        client_id: WHOOP_CLIENT_ID,
        redirect_uri: WHOOP_REDIRECT_URI,
        response_type: 'code',
        scope: WHOOP_SCOPES,
        state,
      }).toString()
    )

    // Set state cookie (expires in 10 minutes)
    response.cookies.set('whoop_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Error initiating Whoop OAuth:', error)
    return NextResponse.redirect(new URL('/settings?error=oauth_failed', request.url))
  }
}
