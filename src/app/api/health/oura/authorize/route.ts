import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Oura OAuth2 authorization endpoint
// Redirects user to Oura to authorize the connection

const OURA_AUTH_URL = 'https://cloud.ouraring.com/oauth/authorize'
const OURA_CLIENT_ID = process.env.OURA_CLIENT_ID
const OURA_REDIRECT_URI = process.env.OURA_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/health/oura/callback`

// Scopes for Oura API - we need daily activity (steps) and sleep data
const OURA_SCOPES = [
  'daily',      // Daily activity, readiness, sleep scores
  'personal',   // Personal info (for user ID)
  'heartrate',  // Heart rate data
  'sleep',      // Sleep data including stages
  'workout',    // Workout data
].join(' ')

export async function GET(request: NextRequest) {
  try {
    if (!OURA_CLIENT_ID) {
      console.error('OURA_CLIENT_ID not configured')
      return NextResponse.redirect(new URL('/settings?error=oura_not_configured', request.url))
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
      `${OURA_AUTH_URL}?` + new URLSearchParams({
        client_id: OURA_CLIENT_ID,
        redirect_uri: OURA_REDIRECT_URI,
        response_type: 'code',
        scope: OURA_SCOPES,
        state,
      }).toString()
    )

    // Set state cookie (expires in 10 minutes)
    response.cookies.set('oura_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Error initiating Oura OAuth:', error)
    return NextResponse.redirect(new URL('/settings?error=oauth_failed', request.url))
  }
}
