import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { HabitType, EventType } from '@/types/database'

interface ImportEntry {
  entry_date: string
  mood_score?: number | null
  work_location?: string | null
  beers?: number
  seltzers?: number
  wine?: number
  liquor?: number
  shots?: number
  coffee?: number
  steps?: number | null
  screen_time?: number | null
  sex?: number
  breakfast_location?: string | null
  lunch_location?: string | null
  dinner_location?: string | null
  city_wake?: string | null
  miles_wake?: number | null
  city_noon?: string | null
  miles_noon?: number | null
  city_sleep?: string | null
  miles_sleep?: number | null
  best_part?: string | null
  notes?: string | null
  habits?: string[]
  events?: string[]
}

export async function POST(request: NextRequest) {
  try {
    // Verify the caller is an admin using regular client
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { userId, entries, overwriteExisting } = await request.json() as {
      userId: string
      entries: ImportEntry[]
      overwriteExisting: boolean
    }

    if (!userId || !entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: 'User ID and entries array are required' },
        { status: 400 }
      )
    }

    // Use service client to bypass RLS for admin imports
    const serviceClient = await createServiceClient()

    const result = {
      success: 0,
      errors: [] as string[],
      skipped: 0,
    }

    for (const entry of entries) {
      try {
        // Check if entry already exists for this date
        const { data: existing } = await serviceClient
          .from('daily_entries')
          .select('id')
          .eq('user_id', userId)
          .eq('entry_date', entry.entry_date)
          .single()

        if (existing && !overwriteExisting) {
          result.skipped++
          continue
        }

        // Prepare entry data (exclude habits and events)
        const { habits, events, ...entryData } = entry
        const insertData = {
          ...entryData,
          user_id: userId,
        }

        let entryId: string

        if (existing && overwriteExisting) {
          // Update existing entry
          const { error: updateError } = await serviceClient
            .from('daily_entries')
            .update(insertData)
            .eq('id', existing.id)

          if (updateError) throw updateError
          entryId = existing.id

          // Delete existing habits and events
          await serviceClient.from('healthy_habits').delete().eq('entry_id', entryId)
          await serviceClient.from('life_events').delete().eq('entry_id', entryId)
        } else {
          // Insert new entry
          const { data: newEntry, error: insertError } = await serviceClient
            .from('daily_entries')
            .insert(insertData)
            .select('id')
            .single()

          if (insertError) throw insertError
          entryId = newEntry.id
        }

        // Insert habits
        if (habits && habits.length > 0) {
          const habitInserts = habits.map(habit => ({
            entry_id: entryId,
            habit_type: habit as HabitType,
          }))
          await serviceClient.from('healthy_habits').insert(habitInserts)
        }

        // Insert events
        if (events && events.length > 0) {
          const eventInserts = events.map(event => ({
            entry_id: entryId,
            event_type: event as EventType,
          }))
          await serviceClient.from('life_events').insert(eventInserts)
        }

        result.success++
      } catch (error) {
        result.errors.push(
          `${entry.entry_date}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in admin import:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
