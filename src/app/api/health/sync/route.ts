import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

interface SyncRequest {
  token: string
  steps: number
  date?: string // YYYY-MM-DD format, defaults to today
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SyncRequest

    // Validate required fields
    if (!body.token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400 }
      )
    }

    if (typeof body.steps !== 'number' || body.steps < 0) {
      return NextResponse.json(
        { error: 'Invalid steps value - must be a non-negative number' },
        { status: 400 }
      )
    }

    // Parse and validate date
    let entryDate: string
    if (body.date) {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
        return NextResponse.json(
          { error: 'Invalid date format - use YYYY-MM-DD' },
          { status: 400 }
        )
      }
      entryDate = body.date
    } else {
      // Default to today in UTC
      entryDate = new Date().toISOString().split('T')[0]
    }

    // Use service client to bypass RLS
    const supabase = await createServiceClient()

    // Find user by sync token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('health_sync_token', body.token)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Invalid sync token' },
        { status: 401 }
      )
    }

    // Check if entry exists for this date
    const { data: existingEntry } = await supabase
      .from('daily_entries')
      .select('id, steps')
      .eq('user_id', profile.id)
      .eq('entry_date', entryDate)
      .single()

    let result
    if (existingEntry) {
      // Update existing entry
      const { data, error } = await supabase
        .from('daily_entries')
        .update({ steps: body.steps })
        .eq('id', existingEntry.id)
        .select('id, entry_date, steps')
        .single()

      if (error) {
        console.error('Error updating entry:', error)
        return NextResponse.json(
          { error: 'Failed to update entry' },
          { status: 500 }
        )
      }
      result = { ...data, action: 'updated', previous_steps: existingEntry.steps }
    } else {
      // Create new entry with just steps
      const { data, error } = await supabase
        .from('daily_entries')
        .insert({
          user_id: profile.id,
          entry_date: entryDate,
          steps: body.steps,
        })
        .select('id, entry_date, steps')
        .single()

      if (error) {
        console.error('Error creating entry:', error)
        return NextResponse.json(
          { error: 'Failed to create entry' },
          { status: 500 }
        )
      }
      result = { ...data, action: 'created' }
    }

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error in health sync:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support GET for easy testing from Shortcuts
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const token = searchParams.get('token')
  const steps = searchParams.get('steps')
  const date = searchParams.get('date')

  if (!token || !steps) {
    return NextResponse.json(
      { error: 'Missing required parameters: token and steps' },
      { status: 400 }
    )
  }

  // Create a fake request body and call the POST handler logic
  const fakeBody: SyncRequest = {
    token,
    steps: parseInt(steps, 10),
    date: date || undefined,
  }

  // Validate steps
  if (isNaN(fakeBody.steps) || fakeBody.steps < 0) {
    return NextResponse.json(
      { error: 'Invalid steps value - must be a non-negative number' },
      { status: 400 }
    )
  }

  // Parse and validate date
  let entryDate: string
  if (fakeBody.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fakeBody.date)) {
      return NextResponse.json(
        { error: 'Invalid date format - use YYYY-MM-DD' },
        { status: 400 }
      )
    }
    entryDate = fakeBody.date
  } else {
    entryDate = new Date().toISOString().split('T')[0]
  }

  try {
    const supabase = await createServiceClient()

    // Find user by sync token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('health_sync_token', fakeBody.token)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Invalid sync token' },
        { status: 401 }
      )
    }

    // Check if entry exists for this date
    const { data: existingEntry } = await supabase
      .from('daily_entries')
      .select('id, steps')
      .eq('user_id', profile.id)
      .eq('entry_date', entryDate)
      .single()

    let result
    if (existingEntry) {
      const { data, error } = await supabase
        .from('daily_entries')
        .update({ steps: fakeBody.steps })
        .eq('id', existingEntry.id)
        .select('id, entry_date, steps')
        .single()

      if (error) {
        return NextResponse.json(
          { error: 'Failed to update entry' },
          { status: 500 }
        )
      }
      result = { ...data, action: 'updated', previous_steps: existingEntry.steps }
    } else {
      const { data, error } = await supabase
        .from('daily_entries')
        .insert({
          user_id: profile.id,
          entry_date: entryDate,
          steps: fakeBody.steps,
        })
        .select('id, entry_date, steps')
        .single()

      if (error) {
        return NextResponse.json(
          { error: 'Failed to create entry' },
          { status: 500 }
        )
      }
      result = { ...data, action: 'created' }
    }

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error in health sync:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
