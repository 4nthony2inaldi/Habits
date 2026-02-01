import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  fetchOuraData,
  fetchWhoopData,
  refreshOuraToken,
  refreshWhoopToken,
  type NormalizedSleepData,
} from '@/lib/health/providers'
import type { HealthProvider, HealthConnection } from '@/types/database'

// Sync data from a health provider for the authenticated user
// Optionally specify a date (defaults to yesterday)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const provider = body.provider as HealthProvider | undefined
    let date = body.date as string | undefined

    if (!provider || !['oura', 'whoop'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider. Must be "oura" or "whoop"' }, { status: 400 })
    }

    // Default to yesterday if no date provided
    if (!date) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      date = yesterday.toISOString().split('T')[0]
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }

    // Get the user's connection for this provider
    const { data: connection, error: connectionError } = await supabase
      .from('health_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: `No ${provider} connection found` }, { status: 404 })
    }

    // Check if token needs refresh (within 5 minutes of expiry)
    let accessToken = connection.access_token
    const tokenExpiry = connection.token_expires_at ? new Date(connection.token_expires_at) : null
    const now = new Date()

    if (tokenExpiry && tokenExpiry.getTime() - now.getTime() < 300000) {
      // Token expires within 5 minutes, refresh it
      let refreshResult: { accessToken: string; refreshToken: string; expiresAt: string } | null = null

      if (provider === 'oura') {
        refreshResult = await refreshOuraToken(connection as HealthConnection)
      } else if (provider === 'whoop') {
        refreshResult = await refreshWhoopToken(connection as HealthConnection)
      }

      if (refreshResult) {
        // Update stored tokens
        await supabase
          .from('health_connections')
          .update({
            access_token: refreshResult.accessToken,
            refresh_token: refreshResult.refreshToken,
            token_expires_at: refreshResult.expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id)

        accessToken = refreshResult.accessToken
      } else {
        // Failed to refresh token
        await supabase
          .from('health_connections')
          .update({
            last_sync_status: 'error',
            last_sync_error: 'Failed to refresh access token',
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id)

        return NextResponse.json({ error: 'Failed to refresh access token. Please reconnect.' }, { status: 401 })
      }
    }

    // Fetch data from the provider
    let healthData: NormalizedSleepData | null = null

    if (provider === 'oura') {
      healthData = await fetchOuraData(accessToken, date)
    } else if (provider === 'whoop') {
      healthData = await fetchWhoopData(accessToken, date)
    }

    if (!healthData) {
      await supabase
        .from('health_connections')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'error',
          last_sync_error: `No data available for ${date}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connection.id)

      return NextResponse.json({ error: `No data available from ${provider} for ${date}` }, { status: 404 })
    }

    // Check if entry exists for this date
    const { data: existingEntry } = await supabase
      .from('daily_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('entry_date', date)
      .single()

    // Build update data
    const updateData: Record<string, unknown> = {
      health_data_source: provider,
    }

    if (healthData.sleepScore !== null) updateData.sleep_score = healthData.sleepScore
    if (healthData.sleepStart !== null) updateData.sleep_start = healthData.sleepStart
    if (healthData.sleepEnd !== null) updateData.sleep_end = healthData.sleepEnd
    if (healthData.sleepHours !== null) updateData.sleep_hours = healthData.sleepHours
    if (healthData.sleepInBedMinutes !== null) updateData.sleep_in_bed_minutes = healthData.sleepInBedMinutes
    if (healthData.sleepAwakeMinutes !== null) updateData.sleep_awake_minutes = healthData.sleepAwakeMinutes
    if (healthData.sleepRemMinutes !== null) updateData.sleep_rem_minutes = healthData.sleepRemMinutes
    if (healthData.sleepCoreMinutes !== null) updateData.sleep_core_minutes = healthData.sleepCoreMinutes
    if (healthData.sleepDeepMinutes !== null) updateData.sleep_deep_minutes = healthData.sleepDeepMinutes
    if (healthData.hrv !== null) updateData.hrv = healthData.hrv
    if (healthData.restingHr !== null) updateData.resting_hr = healthData.restingHr
    if (healthData.respiratoryRate !== null) updateData.respiratory_rate = healthData.respiratoryRate
    if (healthData.steps !== null) updateData.steps = healthData.steps

    let result
    if (existingEntry) {
      // Update existing entry
      const { data, error } = await supabase
        .from('daily_entries')
        .update(updateData)
        .eq('id', existingEntry.id)
        .select('id, entry_date')
        .single()

      if (error) {
        throw new Error(`Failed to update entry: ${error.message}`)
      }
      result = { ...data, action: 'updated' }
    } else {
      // Create new entry
      const { data, error } = await supabase
        .from('daily_entries')
        .insert({
          user_id: user.id,
          entry_date: date,
          ...updateData,
        })
        .select('id, entry_date')
        .single()

      if (error) {
        throw new Error(`Failed to create entry: ${error.message}`)
      }
      result = { ...data, action: 'created' }
    }

    // Update connection sync status
    await supabase
      .from('health_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'success',
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    return NextResponse.json({
      success: true,
      provider,
      date,
      ...result,
      data: healthData,
    })
  } catch (error) {
    console.error('Error in provider sync:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check connection status and manually trigger sync
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all connections for the user
    const { data: connections, error } = await supabase
      .from('health_connections')
      .select('id, provider, provider_user_id, last_sync_at, last_sync_status, last_sync_error, created_at')
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    return NextResponse.json({
      connections: connections || [],
    })
  } catch (error) {
    console.error('Error fetching health connections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to disconnect a provider
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const provider = body.provider as HealthProvider | undefined

    if (!provider || !['oura', 'whoop'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
    }

    // Delete the connection
    const { error } = await supabase
      .from('health_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, provider })
  } catch (error) {
    console.error('Error disconnecting provider:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect provider' },
      { status: 500 }
    )
  }
}
