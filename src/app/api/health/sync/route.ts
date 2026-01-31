import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

interface SyncRequest {
  token: string
  steps?: number
  sleep?: number // Hours of sleep
  miles?: number // Walking + running distance in miles
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

    // At least one health metric must be provided
    const hasSteps = typeof body.steps === 'number'
    const hasSleep = typeof body.sleep === 'number'
    const hasMiles = typeof body.miles === 'number'

    if (!hasSteps && !hasSleep && !hasMiles) {
      return NextResponse.json(
        { error: 'At least one health metric (steps, sleep, or miles) is required' },
        { status: 400 }
      )
    }

    // Validate each metric if provided
    if (hasSteps && body.steps! < 0) {
      return NextResponse.json(
        { error: 'Invalid steps value - must be a non-negative number' },
        { status: 400 }
      )
    }

    if (hasSleep && (body.sleep! < 0 || body.sleep! > 24)) {
      return NextResponse.json(
        { error: 'Invalid sleep value - must be between 0 and 24 hours' },
        { status: 400 }
      )
    }

    if (hasMiles && body.miles! < 0) {
      return NextResponse.json(
        { error: 'Invalid miles value - must be a non-negative number' },
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
      .select('id, steps, sleep_hours, miles_walked')
      .eq('user_id', profile.id)
      .eq('entry_date', entryDate)
      .single()

    // Build update object with only provided fields
    const updateData: Record<string, number> = {}
    if (hasSteps) updateData.steps = body.steps!
    if (hasSleep) updateData.sleep_hours = body.sleep!
    if (hasMiles) updateData.miles_walked = body.miles!

    let result
    if (existingEntry) {
      // Update existing entry
      const { data, error } = await supabase
        .from('daily_entries')
        .update(updateData)
        .eq('id', existingEntry.id)
        .select('id, entry_date, steps, sleep_hours, miles_walked')
        .single()

      if (error) {
        console.error('Error updating entry:', error)
        return NextResponse.json(
          { error: 'Failed to update entry' },
          { status: 500 }
        )
      }
      result = {
        ...data,
        action: 'updated',
        previous: {
          steps: existingEntry.steps,
          sleep_hours: existingEntry.sleep_hours,
          miles_walked: existingEntry.miles_walked,
        },
      }
    } else {
      // Create new entry with provided health data
      const { data, error } = await supabase
        .from('daily_entries')
        .insert({
          user_id: profile.id,
          entry_date: entryDate,
          ...updateData,
        })
        .select('id, entry_date, steps, sleep_hours, miles_walked')
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
  const stepsParam = searchParams.get('steps')
  const sleepParam = searchParams.get('sleep')
  const milesParam = searchParams.get('miles')
  const date = searchParams.get('date')

  if (!token) {
    return NextResponse.json(
      { error: 'Missing required parameter: token' },
      { status: 400 }
    )
  }

  // At least one health metric must be provided
  if (!stepsParam && !sleepParam && !milesParam) {
    return NextResponse.json(
      { error: 'At least one health metric (steps, sleep, or miles) is required' },
      { status: 400 }
    )
  }

  // Build request body with provided parameters
  const body: SyncRequest = {
    token,
    date: date || undefined,
  }

  // Parse and validate each metric if provided
  if (stepsParam) {
    const steps = parseInt(stepsParam, 10)
    if (isNaN(steps) || steps < 0) {
      return NextResponse.json(
        { error: 'Invalid steps value - must be a non-negative number' },
        { status: 400 }
      )
    }
    body.steps = steps
  }

  if (sleepParam) {
    const sleep = parseFloat(sleepParam)
    if (isNaN(sleep) || sleep < 0 || sleep > 24) {
      return NextResponse.json(
        { error: 'Invalid sleep value - must be between 0 and 24 hours' },
        { status: 400 }
      )
    }
    body.sleep = sleep
  }

  if (milesParam) {
    const miles = parseFloat(milesParam)
    if (isNaN(miles) || miles < 0) {
      return NextResponse.json(
        { error: 'Invalid miles value - must be a non-negative number' },
        { status: 400 }
      )
    }
    body.miles = miles
  }

  const hasSteps = typeof body.steps === 'number'
  const hasSleep = typeof body.sleep === 'number'
  const hasMiles = typeof body.miles === 'number'

  // Parse and validate date
  let entryDate: string
  if (body.date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
      return NextResponse.json(
        { error: 'Invalid date format - use YYYY-MM-DD' },
        { status: 400 }
      )
    }
    entryDate = body.date
  } else {
    entryDate = new Date().toISOString().split('T')[0]
  }

  try {
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
      .select('id, steps, sleep_hours, miles_walked')
      .eq('user_id', profile.id)
      .eq('entry_date', entryDate)
      .single()

    // Build update object with only provided fields
    const updateData: Record<string, number> = {}
    if (hasSteps) updateData.steps = body.steps!
    if (hasSleep) updateData.sleep_hours = body.sleep!
    if (hasMiles) updateData.miles_walked = body.miles!

    let result
    if (existingEntry) {
      const { data, error } = await supabase
        .from('daily_entries')
        .update(updateData)
        .eq('id', existingEntry.id)
        .select('id, entry_date, steps, sleep_hours, miles_walked')
        .single()

      if (error) {
        return NextResponse.json(
          { error: 'Failed to update entry' },
          { status: 500 }
        )
      }
      result = {
        ...data,
        action: 'updated',
        previous: {
          steps: existingEntry.steps,
          sleep_hours: existingEntry.sleep_hours,
          miles_walked: existingEntry.miles_walked,
        },
      }
    } else {
      const { data, error } = await supabase
        .from('daily_entries')
        .insert({
          user_id: profile.id,
          entry_date: entryDate,
          ...updateData,
        })
        .select('id, entry_date, steps, sleep_hours, miles_walked')
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
