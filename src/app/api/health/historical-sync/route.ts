import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  fetchOuraData,
  refreshOuraToken,
  type NormalizedSleepData,
} from '@/lib/health/providers'
import type { HealthConnection } from '@/types/database'

// Sync historical data from Oura for a range of dates
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
    const days = body.days as number | undefined

    if (!days || days < 1 || days > 365) {
      return NextResponse.json({ error: 'Invalid days. Must be between 1 and 365' }, { status: 400 })
    }

    // Get the user's Oura connection
    const { data: connection, error: connectionError } = await supabase
      .from('health_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'oura')
      .single()

    if (connectionError || !connection) {
      return NextResponse.json({ error: 'No Oura connection found' }, { status: 404 })
    }

    // Check if token needs refresh
    let accessToken = connection.access_token
    const tokenExpiry = connection.token_expires_at ? new Date(connection.token_expires_at) : null
    const now = new Date()

    if (tokenExpiry && tokenExpiry.getTime() - now.getTime() < 300000) {
      const refreshResult = await refreshOuraToken(connection as HealthConnection)

      if (refreshResult) {
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
        return NextResponse.json({ error: 'Failed to refresh access token. Please reconnect.' }, { status: 401 })
      }
    }

    // Generate date range (from `days` ago to yesterday)
    const dates: string[] = []
    for (let i = days; i >= 1; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
    }

    // Sync each date
    const results = {
      total: dates.length,
      synced: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      details: [] as Array<{ date: string; status: string; sleepHours?: number; steps?: number }>,
    }

    for (const date of dates) {
      try {
        const healthData: NormalizedSleepData | null = await fetchOuraData(accessToken, date)

        if (!healthData) {
          results.skipped++
          results.details.push({ date, status: 'no_data' })
          continue
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
          health_data_source: 'oura',
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

        let entryId: string
        if (existingEntry) {
          // Update existing entry
          await supabase
            .from('daily_entries')
            .update(updateData)
            .eq('id', existingEntry.id)

          entryId = existingEntry.id
          results.updated++
        } else {
          // Create new entry
          const { data: newEntry, error } = await supabase
            .from('daily_entries')
            .insert({
              user_id: user.id,
              entry_date: date,
              ...updateData,
            })
            .select('id')
            .single()

          if (error || !newEntry) {
            results.errors++
            results.details.push({ date, status: 'error' })
            continue
          }
          entryId = newEntry.id
          results.created++
        }

        // Auto-add sleep_8hrs habit if sleep hours >= 8
        if (healthData.sleepHours !== null && healthData.sleepHours >= 8) {
          const { data: existingHabit } = await supabase
            .from('healthy_habits')
            .select('id')
            .eq('entry_id', entryId)
            .eq('habit_type', 'sleep_8hrs')
            .single()

          if (!existingHabit) {
            await supabase
              .from('healthy_habits')
              .insert({
                entry_id: entryId,
                habit_type: 'sleep_8hrs',
              })
          }
        }

        results.synced++
        results.details.push({
          date,
          status: existingEntry ? 'updated' : 'created',
          sleepHours: healthData.sleepHours ?? undefined,
          steps: healthData.steps ?? undefined,
        })

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (err) {
        console.error(`Error syncing ${date}:`, err)
        results.errors++
        results.details.push({ date, status: 'error' })
      }
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
      ...results,
    })
  } catch (error) {
    console.error('Error in historical sync:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
