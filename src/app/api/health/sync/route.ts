import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getTodayInEST } from '@/lib/utils/dates'

// Raw sleep sample from Apple Health via iOS Shortcuts
interface SleepSample {
  'Start Date'?: string
  'End Date'?: string
  startDate?: string
  endDate?: string
  Value?: string
  value?: string
}

interface SyncRequest {
  token: string
  steps?: number
  sleep?: number // Hours of sleep (legacy, kept for backwards compatibility)
  miles?: number // Walking + running distance in miles
  date?: string // YYYY-MM-DD format, defaults to today
  // Individual sleep stages (in minutes)
  sleep_in_bed?: number
  sleep_awake?: number
  sleep_rem?: number
  sleep_core?: number
  sleep_deep?: number
  // Raw sleep samples from Apple Health (alternative to individual stages)
  sleep_samples?: SleepSample[]
}

// Parse raw sleep samples and calculate duration per stage (in minutes)
function parseSleepSamples(samples: SleepSample[]): {
  sleep_in_bed: number
  sleep_awake: number
  sleep_rem: number
  sleep_core: number
  sleep_deep: number
} {
  const result = {
    sleep_in_bed: 0,
    sleep_awake: 0,
    sleep_rem: 0,
    sleep_core: 0,
    sleep_deep: 0,
  }

  for (const sample of samples) {
    // Handle different property name formats from Shortcuts
    const startStr = sample['Start Date'] || sample.startDate
    const endStr = sample['End Date'] || sample.endDate
    const value = sample.Value || sample.value

    if (!startStr || !endStr || !value) continue

    const startDate = new Date(startStr)
    const endDate = new Date(endStr)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) continue

    // Calculate duration in minutes
    const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000)
    if (durationMinutes <= 0) continue

    // Map Apple Health sleep stage values to our fields
    // Apple Health uses: InBed, Awake, AsleepREM, AsleepCore, AsleepDeep
    // Shortcuts may show: In Bed, Awake, REM, Core, Deep
    const normalizedValue = value.toLowerCase().replace(/\s+/g, '')

    if (normalizedValue === 'inbed' || normalizedValue === 'in bed') {
      result.sleep_in_bed += durationMinutes
    } else if (normalizedValue === 'awake') {
      result.sleep_awake += durationMinutes
    } else if (normalizedValue === 'asleeprem' || normalizedValue === 'rem' || normalizedValue === 'remsleep') {
      result.sleep_rem += durationMinutes
    } else if (normalizedValue === 'asleepcore' || normalizedValue === 'core' || normalizedValue === 'coresleep') {
      result.sleep_core += durationMinutes
    } else if (normalizedValue === 'asleepdeep' || normalizedValue === 'deep' || normalizedValue === 'deepsleep') {
      result.sleep_deep += durationMinutes
    }
  }

  return result
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

    // Parse raw sleep samples if provided
    let parsedSleepStages: ReturnType<typeof parseSleepSamples> | null = null
    if (Array.isArray(body.sleep_samples) && body.sleep_samples.length > 0) {
      parsedSleepStages = parseSleepSamples(body.sleep_samples)
    }

    // At least one health metric must be provided
    const hasSteps = typeof body.steps === 'number'
    const hasSleep = typeof body.sleep === 'number'
    const hasMiles = typeof body.miles === 'number'
    const hasSleepInBed = typeof body.sleep_in_bed === 'number'
    const hasSleepAwake = typeof body.sleep_awake === 'number'
    const hasSleepRem = typeof body.sleep_rem === 'number'
    const hasSleepCore = typeof body.sleep_core === 'number'
    const hasSleepDeep = typeof body.sleep_deep === 'number'
    const hasAnySleepStage = hasSleepInBed || hasSleepAwake || hasSleepRem || hasSleepCore || hasSleepDeep
    const hasParsedSleepStages = parsedSleepStages !== null

    if (!hasSteps && !hasSleep && !hasMiles && !hasAnySleepStage && !hasParsedSleepStages) {
      return NextResponse.json(
        { error: 'At least one health metric (steps, sleep, miles, or sleep stages) is required' },
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

    // Validate sleep stages (in minutes, max 24 hours = 1440 minutes)
    const maxSleepMinutes = 1440
    if (hasSleepInBed && (body.sleep_in_bed! < 0 || body.sleep_in_bed! > maxSleepMinutes)) {
      return NextResponse.json(
        { error: 'Invalid sleep_in_bed value - must be between 0 and 1440 minutes' },
        { status: 400 }
      )
    }
    if (hasSleepAwake && (body.sleep_awake! < 0 || body.sleep_awake! > maxSleepMinutes)) {
      return NextResponse.json(
        { error: 'Invalid sleep_awake value - must be between 0 and 1440 minutes' },
        { status: 400 }
      )
    }
    if (hasSleepRem && (body.sleep_rem! < 0 || body.sleep_rem! > maxSleepMinutes)) {
      return NextResponse.json(
        { error: 'Invalid sleep_rem value - must be between 0 and 1440 minutes' },
        { status: 400 }
      )
    }
    if (hasSleepCore && (body.sleep_core! < 0 || body.sleep_core! > maxSleepMinutes)) {
      return NextResponse.json(
        { error: 'Invalid sleep_core value - must be between 0 and 1440 minutes' },
        { status: 400 }
      )
    }
    if (hasSleepDeep && (body.sleep_deep! < 0 || body.sleep_deep! > maxSleepMinutes)) {
      return NextResponse.json(
        { error: 'Invalid sleep_deep value - must be between 0 and 1440 minutes' },
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
      // Default to today in EST
      entryDate = getTodayInEST()
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
      .select('id, steps, sleep_hours, miles_walked, sleep_in_bed_minutes, sleep_awake_minutes, sleep_rem_minutes, sleep_core_minutes, sleep_deep_minutes')
      .eq('user_id', profile.id)
      .eq('entry_date', entryDate)
      .single()

    // Build update object with only provided fields
    const updateData: Record<string, number> = {}
    if (hasSteps) updateData.steps = body.steps!
    if (hasSleep) updateData.sleep_hours = body.sleep!
    if (hasMiles) updateData.miles_walked = body.miles!

    // Use parsed sleep stages if provided, otherwise use individual fields
    if (parsedSleepStages) {
      updateData.sleep_in_bed_minutes = parsedSleepStages.sleep_in_bed
      updateData.sleep_awake_minutes = parsedSleepStages.sleep_awake
      updateData.sleep_rem_minutes = parsedSleepStages.sleep_rem
      updateData.sleep_core_minutes = parsedSleepStages.sleep_core
      updateData.sleep_deep_minutes = parsedSleepStages.sleep_deep
    } else {
      if (hasSleepInBed) updateData.sleep_in_bed_minutes = body.sleep_in_bed!
      if (hasSleepAwake) updateData.sleep_awake_minutes = body.sleep_awake!
      if (hasSleepRem) updateData.sleep_rem_minutes = body.sleep_rem!
      if (hasSleepCore) updateData.sleep_core_minutes = body.sleep_core!
      if (hasSleepDeep) updateData.sleep_deep_minutes = body.sleep_deep!
    }

    const selectFields = 'id, entry_date, steps, sleep_hours, miles_walked, sleep_in_bed_minutes, sleep_awake_minutes, sleep_rem_minutes, sleep_core_minutes, sleep_deep_minutes'

    let result
    if (existingEntry) {
      // Update existing entry
      const { data, error } = await supabase
        .from('daily_entries')
        .update(updateData)
        .eq('id', existingEntry.id)
        .select(selectFields)
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
          sleep_in_bed_minutes: existingEntry.sleep_in_bed_minutes,
          sleep_awake_minutes: existingEntry.sleep_awake_minutes,
          sleep_rem_minutes: existingEntry.sleep_rem_minutes,
          sleep_core_minutes: existingEntry.sleep_core_minutes,
          sleep_deep_minutes: existingEntry.sleep_deep_minutes,
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
        .select(selectFields)
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
  // Sleep stage params (in minutes)
  const sleepInBedParam = searchParams.get('sleep_in_bed')
  const sleepAwakeParam = searchParams.get('sleep_awake')
  const sleepRemParam = searchParams.get('sleep_rem')
  const sleepCoreParam = searchParams.get('sleep_core')
  const sleepDeepParam = searchParams.get('sleep_deep')

  if (!token) {
    return NextResponse.json(
      { error: 'Missing required parameter: token' },
      { status: 400 }
    )
  }

  // At least one health metric must be provided
  const hasAnySleepStageParam = sleepInBedParam || sleepAwakeParam || sleepRemParam || sleepCoreParam || sleepDeepParam
  if (!stepsParam && !sleepParam && !milesParam && !hasAnySleepStageParam) {
    return NextResponse.json(
      { error: 'At least one health metric (steps, sleep, miles, or sleep stages) is required' },
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

  // Parse and validate sleep stage params (in minutes, max 1440)
  const maxSleepMinutes = 1440
  if (sleepInBedParam) {
    const val = parseInt(sleepInBedParam, 10)
    if (isNaN(val) || val < 0 || val > maxSleepMinutes) {
      return NextResponse.json(
        { error: 'Invalid sleep_in_bed value - must be between 0 and 1440 minutes' },
        { status: 400 }
      )
    }
    body.sleep_in_bed = val
  }
  if (sleepAwakeParam) {
    const val = parseInt(sleepAwakeParam, 10)
    if (isNaN(val) || val < 0 || val > maxSleepMinutes) {
      return NextResponse.json(
        { error: 'Invalid sleep_awake value - must be between 0 and 1440 minutes' },
        { status: 400 }
      )
    }
    body.sleep_awake = val
  }
  if (sleepRemParam) {
    const val = parseInt(sleepRemParam, 10)
    if (isNaN(val) || val < 0 || val > maxSleepMinutes) {
      return NextResponse.json(
        { error: 'Invalid sleep_rem value - must be between 0 and 1440 minutes' },
        { status: 400 }
      )
    }
    body.sleep_rem = val
  }
  if (sleepCoreParam) {
    const val = parseInt(sleepCoreParam, 10)
    if (isNaN(val) || val < 0 || val > maxSleepMinutes) {
      return NextResponse.json(
        { error: 'Invalid sleep_core value - must be between 0 and 1440 minutes' },
        { status: 400 }
      )
    }
    body.sleep_core = val
  }
  if (sleepDeepParam) {
    const val = parseInt(sleepDeepParam, 10)
    if (isNaN(val) || val < 0 || val > maxSleepMinutes) {
      return NextResponse.json(
        { error: 'Invalid sleep_deep value - must be between 0 and 1440 minutes' },
        { status: 400 }
      )
    }
    body.sleep_deep = val
  }

  const hasSteps = typeof body.steps === 'number'
  const hasSleep = typeof body.sleep === 'number'
  const hasMiles = typeof body.miles === 'number'
  const hasSleepInBed = typeof body.sleep_in_bed === 'number'
  const hasSleepAwake = typeof body.sleep_awake === 'number'
  const hasSleepRem = typeof body.sleep_rem === 'number'
  const hasSleepCore = typeof body.sleep_core === 'number'
  const hasSleepDeep = typeof body.sleep_deep === 'number'

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
    // Default to today in EST
    entryDate = getTodayInEST()
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

    const selectFields = 'id, entry_date, steps, sleep_hours, miles_walked, sleep_in_bed_minutes, sleep_awake_minutes, sleep_rem_minutes, sleep_core_minutes, sleep_deep_minutes'

    // Check if entry exists for this date
    const { data: existingEntry } = await supabase
      .from('daily_entries')
      .select(selectFields)
      .eq('user_id', profile.id)
      .eq('entry_date', entryDate)
      .single()

    // Build update object with only provided fields
    const updateData: Record<string, number> = {}
    if (hasSteps) updateData.steps = body.steps!
    if (hasSleep) updateData.sleep_hours = body.sleep!
    if (hasMiles) updateData.miles_walked = body.miles!
    if (hasSleepInBed) updateData.sleep_in_bed_minutes = body.sleep_in_bed!
    if (hasSleepAwake) updateData.sleep_awake_minutes = body.sleep_awake!
    if (hasSleepRem) updateData.sleep_rem_minutes = body.sleep_rem!
    if (hasSleepCore) updateData.sleep_core_minutes = body.sleep_core!
    if (hasSleepDeep) updateData.sleep_deep_minutes = body.sleep_deep!

    let result
    if (existingEntry) {
      const { data, error } = await supabase
        .from('daily_entries')
        .update(updateData)
        .eq('id', existingEntry.id)
        .select(selectFields)
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
          sleep_in_bed_minutes: existingEntry.sleep_in_bed_minutes,
          sleep_awake_minutes: existingEntry.sleep_awake_minutes,
          sleep_rem_minutes: existingEntry.sleep_rem_minutes,
          sleep_core_minutes: existingEntry.sleep_core_minutes,
          sleep_deep_minutes: existingEntry.sleep_deep_minutes,
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
        .select(selectFields)
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
