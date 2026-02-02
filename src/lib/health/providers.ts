// Health provider API utilities for Oura and Whoop

import type { HealthProvider, HealthConnection } from '@/types/database'

// Oura API types
interface OuraSleepData {
  id: string
  day: string
  score: number | null
  timestamp: string
  contributors: {
    deep_sleep: number
    efficiency: number
    latency: number
    rem_sleep: number
    restfulness: number
    timing: number
    total_sleep: number
  }
}

interface OuraDailySleep {
  id: string
  day: string
  score: number | null
  timestamp: string
}

interface OuraSleepPeriod {
  id: string
  day: string
  bedtime_start: string
  bedtime_end: string
  total_sleep_duration: number // seconds
  awake_time: number // seconds
  light_sleep_duration: number // seconds
  rem_sleep_duration: number // seconds
  deep_sleep_duration: number // seconds
  average_heart_rate: number
  lowest_heart_rate: number
  average_hrv: number
  respiratory_rate: number
}

interface OuraDailyActivity {
  id: string
  day: string
  score: number | null
  steps: number
  active_calories: number
  total_calories: number
  equivalent_walking_distance: number // meters
}

// Whoop API types
interface WhoopSleepData {
  id: number
  user_id: number
  start: string
  end: string
  score: {
    stage_summary: {
      total_in_bed_time_milli: number
      total_awake_time_milli: number
      total_light_sleep_time_milli: number
      total_slow_wave_sleep_time_milli: number // deep
      total_rem_sleep_time_milli: number
    }
    sleep_needed: {
      baseline_milli: number
    }
    respiratory_rate: number
    sleep_performance_percentage: number // this is essentially the score
    sleep_efficiency_percentage: number
  }
}

interface WhoopRecoveryData {
  cycle_id: number
  sleep_id: number
  user_id: number
  created_at: string
  updated_at: string
  score: {
    user_calibrating: boolean
    recovery_score: number
    resting_heart_rate: number
    hrv_rmssd_milli: number // HRV in milliseconds
  }
}

// Debug info for troubleshooting API responses
export interface HealthSyncDebug {
  queriedDate: string
  sleepPeriodsCount: number
  sleepPeriods: Array<{ day: string; hrs: number }>
  activityDataCount: number
}

// Normalized sleep data that we store
export interface NormalizedSleepData {
  date: string // YYYY-MM-DD
  sleepScore: number | null
  sleepStart: string | null // HH:MM format
  sleepEnd: string | null // HH:MM format
  sleepHours: number | null
  sleepInBedMinutes: number | null
  sleepAwakeMinutes: number | null
  sleepRemMinutes: number | null
  sleepCoreMinutes: number | null // light sleep
  sleepDeepMinutes: number | null
  hrv: number | null
  restingHr: number | null
  respiratoryRate: number | null
  steps: number | null // Only from Oura
  source: HealthProvider
  _debug?: HealthSyncDebug // Optional debug info
}

// Refresh an Oura access token
export async function refreshOuraToken(connection: HealthConnection): Promise<{
  accessToken: string
  refreshToken: string
  expiresAt: string
} | null> {
  const clientId = process.env.OURA_CLIENT_ID
  const clientSecret = process.env.OURA_CLIENT_SECRET

  if (!clientId || !clientSecret || !connection.refresh_token) {
    return null
  }

  try {
    const response = await fetch('https://api.ouraring.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    })

    if (!response.ok) {
      console.error('Failed to refresh Oura token:', await response.text())
      return null
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    }
  } catch (error) {
    console.error('Error refreshing Oura token:', error)
    return null
  }
}

// Refresh a Whoop access token
export async function refreshWhoopToken(connection: HealthConnection): Promise<{
  accessToken: string
  refreshToken: string
  expiresAt: string
} | null> {
  const clientId = process.env.WHOOP_CLIENT_ID
  const clientSecret = process.env.WHOOP_CLIENT_SECRET

  if (!clientId || !clientSecret || !connection.refresh_token) {
    return null
  }

  try {
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const response = await fetch('https://api.prod.whoop.com/oauth/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token,
      }).toString(),
    })

    if (!response.ok) {
      console.error('Failed to refresh Whoop token:', await response.text())
      return null
    }

    const data = await response.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    }
  } catch (error) {
    console.error('Error refreshing Whoop token:', error)
    return null
  }
}

// Fetch sleep and activity data from Oura for a specific date
export async function fetchOuraData(accessToken: string, date: string): Promise<NormalizedSleepData | null> {
  try {
    // Calculate date range for sleep period lookup
    // Sleep periods are indexed by bedtime START date, so a Jan 31 wake-up is under Jan 30
    const targetDate = new Date(date + 'T12:00:00Z') // Use noon to avoid timezone issues
    const prevDate = new Date(targetDate)
    prevDate.setDate(prevDate.getDate() - 1)
    const prevDateStr = prevDate.toISOString().split('T')[0]

    // Also try next day for activity in case of timezone issues
    const nextDate = new Date(targetDate)
    nextDate.setDate(nextDate.getDate() + 1)
    const nextDateStr = nextDate.toISOString().split('T')[0]

    // Fetch daily sleep score for the target date
    const sleepResponse = await fetch(
      `https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${date}&end_date=${date}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    // Fetch detailed sleep periods - query a wider range to find the data
    // We'll query from 2 days before to the target date to see what comes back
    const twoDaysAgo = new Date(targetDate)
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0]

    const sleepPeriodsResponse = await fetch(
      `https://api.ouraring.com/v2/usercollection/sleep?start_date=${twoDaysAgoStr}&end_date=${date}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    // Fetch daily activity (for steps) - try a range to catch timezone issues
    const activityResponse = await fetch(
      `https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${prevDateStr}&end_date=${nextDateStr}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (!sleepResponse.ok || !sleepPeriodsResponse.ok || !activityResponse.ok) {
      console.error('Failed to fetch Oura data')
      return null
    }

    const sleepData = await sleepResponse.json()
    const sleepPeriodsData = await sleepPeriodsResponse.json()
    const activityData = await activityResponse.json()

    // Debug logging
    console.log('Oura API responses:', {
      date,
      prevDateStr,
      nextDateStr,
      sleepDataCount: sleepData.data?.length ?? 0,
      sleepPeriodsCount: sleepPeriodsData.data?.length ?? 0,
      activityDataCount: activityData.data?.length ?? 0,
      activityDays: activityData.data?.map((a: OuraDailyActivity) => ({ day: a.day, steps: a.steps })),
    })

    const dailySleep: OuraDailySleep | undefined = sleepData.data?.[0]

    // Find activity data for the target date
    const activities: OuraDailyActivity[] = activityData.data || []
    const dailyActivity: OuraDailyActivity | undefined = activities.find(a => a.day === date) || activities[0]

    console.log('Selected activity:', dailyActivity ? { day: dailyActivity.day, steps: dailyActivity.steps } : null)

    // Find the sleep period that ended on the target date (main overnight sleep)
    // Sleep periods have bedtime_end which is the wake-up time
    const sleepPeriods: OuraSleepPeriod[] = sleepPeriodsData.data || []

    // Log all sleep periods for debugging
    console.log('Sleep periods:', sleepPeriods.map(sp => ({
      day: sp.day,
      bedtime_end: sp.bedtime_end,
      total_sleep_sec: sp.total_sleep_duration,
      total_sleep_hrs: Math.round(sp.total_sleep_duration / 3600 * 100) / 100,
    })))

    // Filter sleep periods to find the one for the night BEFORE the target date
    // (i.e., went to bed on prevDate, woke up on targetDate)
    const matchingPeriods = sleepPeriods.filter(sp => sp.day === prevDateStr)

    // If multiple periods on that day (naps), take the longest one (main sleep)
    const sleepPeriod: OuraSleepPeriod | undefined = matchingPeriods.length > 0
      ? matchingPeriods.reduce((longest, current) =>
          (current.total_sleep_duration > longest.total_sleep_duration) ? current : longest
        )
      : undefined

    console.log('Selected sleep period:', sleepPeriod ? {
      day: sleepPeriod.day,
      total_sleep_hrs: Math.round(sleepPeriod.total_sleep_duration / 3600 * 100) / 100,
    } : null)

    // Store raw ISO timestamps - client will format in browser timezone
    const sleepStart: string | null = sleepPeriod?.bedtime_start ?? null
    const sleepEnd: string | null = sleepPeriod?.bedtime_end ?? null

    return {
      date,
      sleepScore: dailySleep?.score ?? null,
      sleepStart,
      sleepEnd,
      sleepHours: sleepPeriod ? Math.round(sleepPeriod.total_sleep_duration / 3600 * 100) / 100 : null,
      sleepInBedMinutes: sleepPeriod ? Math.round((sleepPeriod.total_sleep_duration + sleepPeriod.awake_time) / 60) : null,
      sleepAwakeMinutes: sleepPeriod ? Math.round(sleepPeriod.awake_time / 60) : null,
      sleepRemMinutes: sleepPeriod ? Math.round(sleepPeriod.rem_sleep_duration / 60) : null,
      sleepCoreMinutes: sleepPeriod ? Math.round(sleepPeriod.light_sleep_duration / 60) : null,
      sleepDeepMinutes: sleepPeriod ? Math.round(sleepPeriod.deep_sleep_duration / 60) : null,
      hrv: sleepPeriod ? Math.round(sleepPeriod.average_hrv) : null,
      restingHr: sleepPeriod ? sleepPeriod.lowest_heart_rate : null,
      respiratoryRate: sleepPeriod ? Math.round(sleepPeriod.respiratory_rate * 10) / 10 : null,
      steps: dailyActivity?.steps ?? null,
      source: 'oura',
      _debug: {
        queriedDate: `sleep:${twoDaysAgoStr}-${date}, activity:${prevDateStr}-${nextDateStr}`,
        sleepPeriodsCount: sleepPeriods.length,
        sleepPeriods: sleepPeriods.map(sp => ({
          day: sp.day,
          hrs: Math.round(sp.total_sleep_duration / 3600 * 100) / 100,
        })),
        activityDataCount: activities.length,
      },
    }
  } catch (error) {
    console.error('Error fetching Oura data:', error)
    return null
  }
}

// Fetch sleep data from Whoop for a specific date
export async function fetchWhoopData(accessToken: string, date: string): Promise<NormalizedSleepData | null> {
  try {
    // Whoop uses start/end timestamps for date filtering
    const startDate = `${date}T00:00:00.000Z`
    const endDate = `${date}T23:59:59.999Z`

    // Fetch sleep data
    const sleepResponse = await fetch(
      `https://api.prod.whoop.com/developer/v1/activity/sleep?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    // Fetch recovery data (contains HRV and resting HR)
    const recoveryResponse = await fetch(
      `https://api.prod.whoop.com/developer/v1/recovery?start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (!sleepResponse.ok) {
      console.error('Failed to fetch Whoop sleep data:', await sleepResponse.text())
      return null
    }

    const sleepData = await sleepResponse.json()
    const sleepRecord: WhoopSleepData | undefined = sleepData.records?.[0]

    let recoveryRecord: WhoopRecoveryData | undefined
    if (recoveryResponse.ok) {
      const recoveryData = await recoveryResponse.json()
      recoveryRecord = recoveryData.records?.[0]
    }

    if (!sleepRecord) {
      return null
    }

    // Extract sleep times
    const startTime = new Date(sleepRecord.start)
    const endTime = new Date(sleepRecord.end)
    const sleepStart = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`
    const sleepEnd = `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`

    const stages = sleepRecord.score.stage_summary
    const totalSleepMilli = stages.total_light_sleep_time_milli + stages.total_slow_wave_sleep_time_milli + stages.total_rem_sleep_time_milli

    return {
      date,
      sleepScore: sleepRecord.score.sleep_performance_percentage ? Math.round(sleepRecord.score.sleep_performance_percentage) : null,
      sleepStart,
      sleepEnd,
      sleepHours: Math.round(totalSleepMilli / 3600000 * 100) / 100,
      sleepInBedMinutes: Math.round(stages.total_in_bed_time_milli / 60000),
      sleepAwakeMinutes: Math.round(stages.total_awake_time_milli / 60000),
      sleepRemMinutes: Math.round(stages.total_rem_sleep_time_milli / 60000),
      sleepCoreMinutes: Math.round(stages.total_light_sleep_time_milli / 60000),
      sleepDeepMinutes: Math.round(stages.total_slow_wave_sleep_time_milli / 60000),
      hrv: recoveryRecord?.score.hrv_rmssd_milli ? Math.round(recoveryRecord.score.hrv_rmssd_milli) : null,
      restingHr: recoveryRecord?.score.resting_heart_rate ? Math.round(recoveryRecord.score.resting_heart_rate) : null,
      respiratoryRate: sleepRecord.score.respiratory_rate ? Math.round(sleepRecord.score.respiratory_rate * 10) / 10 : null,
      steps: null, // Whoop doesn't track steps
      source: 'whoop',
    }
  } catch (error) {
    console.error('Error fetching Whoop data:', error)
    return null
  }
}
