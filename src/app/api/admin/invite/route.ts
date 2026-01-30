import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function POST(request: NextRequest) {
  try {
    // Check if requester is authenticated and is an admin
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { email, displayName, dashboardConfig } = body

    if (!email || !displayName) {
      return NextResponse.json(
        { error: 'Email and display name are required' },
        { status: 400 }
      )
    }

    // Use service client to create user
    const serviceClient = await createServiceClient()
    const temporaryPassword = generateTemporaryPassword()

    // Create auth user
    const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm email since this is admin invite
      user_metadata: {
        display_name: displayName,
        needs_password_reset: true,
      },
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      )
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // Wait a moment for any database trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 500))

    // Update the profile that was created by trigger (or create if it doesn't exist)
    // First try to update existing profile
    const { data: existingProfile } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('id', newUser.user.id)
      .single()

    let profileError
    if (existingProfile) {
      // Profile exists (created by trigger), update it
      const { error } = await serviceClient
        .from('profiles')
        .update({
          email: email,
          display_name: displayName,
          is_admin: false,
          share_drinks: true,
          share_steps: true,
          leaderboard_anonymous: false,
          reminder_enabled: false,
          streak_warnings_enabled: true,
          weekly_digest_enabled: false,
          hidden_fields: [],
          custom_habits: [],
          // Copy the admin's dashboard config so new user has same layout
          custom_metrics: dashboardConfig || {},
        })
        .eq('id', newUser.user.id)
      profileError = error
    } else {
      // No profile exists, insert one
      const { error } = await serviceClient
        .from('profiles')
        .insert({
          id: newUser.user.id,
          email: email,
          display_name: displayName,
          is_admin: false,
          share_drinks: true,
          share_steps: true,
          leaderboard_anonymous: false,
          reminder_enabled: false,
          streak_warnings_enabled: true,
          weekly_digest_enabled: false,
          hidden_fields: [],
          custom_habits: [],
          custom_metrics: dashboardConfig || {},
        })
      profileError = error
    }

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // Clean up: delete the auth user since profile creation failed
      await serviceClient.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json(
        { error: `Failed to create user profile: ${profileError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: email,
        displayName: displayName,
      },
      temporaryPassword,
    })
  } catch (error) {
    console.error('Error in invite user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
