import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { startOfMonth, subDays, format, eachDayOfInterval } from 'date-fns'

// Verify request is from Vercel Cron or has valid secret
function isAuthorized(request: NextRequest): boolean {
  // Vercel Cron sends this header
  const authHeader = request.headers.get('authorization')
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true
  }
  // Also allow manual trigger with secret query param (for testing)
  const url = new URL(request.url)
  if (url.searchParams.get('secret') === process.env.CRON_SECRET) {
    return true
  }
  // If no CRON_SECRET is set, allow in development
  if (!process.env.CRON_SECRET && process.env.NODE_ENV === 'development') {
    return true
  }
  return false
}

type UserWithEntries = {
  id: string
  display_name: string
  leaderboard_anonymous: boolean
  share_drinks: boolean
  share_steps: boolean
}

type DailyEntry = {
  user_id: string
  entry_date: string
  beers: number
  seltzers: number
  wine: number
  liquor: number
  shots: number
  steps: number | null
}

function calculateTotalDrinks(entry: DailyEntry): number {
  return (entry.beers || 0) + (entry.seltzers || 0) + (entry.wine || 0) + (entry.liquor || 0) + (entry.shots || 0)
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`.replace('.0k', 'k')
  }
  return num.toString()
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const webhookUrl = process.env.SLACK_LEADERBOARD_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json({ error: 'SLACK_LEADERBOARD_WEBHOOK_URL not configured' }, { status: 500 })
  }

  try {
    const supabase = await createServiceClient()

    const today = new Date()
    const yesterday = subDays(today, 1)
    const monthStart = startOfMonth(today)

    const yesterdayStr = format(yesterday, 'yyyy-MM-dd')
    const monthStartStr = format(monthStart, 'yyyy-MM-dd')
    const todayStr = format(today, 'yyyy-MM-dd')

    // Fetch users who opted into leaderboards
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, display_name, leaderboard_anonymous, share_drinks, share_steps')
      .or('share_drinks.eq.true,share_steps.eq.true')

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ message: 'No users opted into leaderboards' }, { status: 200 })
    }

    const userIds = users.map(u => u.id)

    // Fetch entries for the month
    const { data: entries, error: entriesError } = await supabase
      .from('daily_entries')
      .select('user_id, entry_date, beers, seltzers, wine, liquor, shots, steps')
      .in('user_id', userIds)
      .gte('entry_date', monthStartStr)
      .lt('entry_date', todayStr)

    if (entriesError) {
      console.error('Error fetching entries:', entriesError)
      return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
    }

    // Build user lookup
    const userMap = new Map<string, UserWithEntries>()
    users.forEach(u => userMap.set(u.id, u))

    // Get display name (respecting anonymity)
    const getDisplayName = (userId: string): string => {
      const user = userMap.get(userId)
      if (!user) return 'Unknown'
      return user.leaderboard_anonymous ? 'Anonymous' : user.display_name
    }

    // Yesterday's data
    const yesterdayEntries = (entries || []).filter(e => e.entry_date === yesterdayStr)

    const yesterdayDrinks: { name: string; value: number }[] = []
    const yesterdaySteps: { name: string; value: number }[] = []

    users.forEach(user => {
      const entry = yesterdayEntries.find(e => e.user_id === user.id)
      const name = getDisplayName(user.id)

      if (user.share_drinks) {
        const drinks = entry ? calculateTotalDrinks(entry) : 0
        yesterdayDrinks.push({ name, value: drinks })
      }

      if (user.share_steps && entry?.steps != null) {
        yesterdaySteps.push({ name, value: entry.steps })
      }
    })

    // Sort yesterday: drinks high to low, steps high to low
    yesterdayDrinks.sort((a, b) => b.value - a.value)
    yesterdaySteps.sort((a, b) => b.value - a.value)

    // MTD totals
    const drinksTotals = new Map<string, number>()
    const stepsTotals = new Map<string, number>()

    users.forEach(user => {
      if (user.share_drinks) drinksTotals.set(user.id, 0)
      if (user.share_steps) stepsTotals.set(user.id, 0)
    })

    ;(entries || []).forEach(entry => {
      if (drinksTotals.has(entry.user_id)) {
        drinksTotals.set(entry.user_id, (drinksTotals.get(entry.user_id) || 0) + calculateTotalDrinks(entry))
      }
      if (stepsTotals.has(entry.user_id) && entry.steps != null) {
        stepsTotals.set(entry.user_id, (stepsTotals.get(entry.user_id) || 0) + entry.steps)
      }
    })

    // Calculate match points
    const drinksMatchPoints = new Map<string, number>()
    const stepsMatchPoints = new Map<string, number>()

    users.forEach(user => {
      if (user.share_drinks) drinksMatchPoints.set(user.id, 0)
      if (user.share_steps) stepsMatchPoints.set(user.id, 0)
    })

    // Get all days in the period up to yesterday
    const daysInPeriod = eachDayOfInterval({ start: monthStart, end: yesterday })

    daysInPeriod.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayEntries = (entries || []).filter(e => e.entry_date === dateStr)

      // Drinks match points (more drinks = more points = wins)
      const drinksForDay: { userId: string; value: number }[] = []
      users.filter(u => u.share_drinks).forEach(user => {
        const entry = dayEntries.find(e => e.user_id === user.id)
        drinksForDay.push({ userId: user.id, value: entry ? calculateTotalDrinks(entry) : 0 })
      })

      // Sort by drinks descending (most drinks gets most points)
      drinksForDay.sort((a, b) => b.value - a.value)
      drinksForDay.forEach((item, index) => {
        const points = drinksForDay.length - 1 - index // First place gets most points
        drinksMatchPoints.set(item.userId, (drinksMatchPoints.get(item.userId) || 0) + points)
      })

      // Steps match points (more steps = more points)
      const stepsForDay: { userId: string; value: number }[] = []
      users.filter(u => u.share_steps).forEach(user => {
        const entry = dayEntries.find(e => e.user_id === user.id)
        if (entry?.steps != null) {
          stepsForDay.push({ userId: user.id, value: entry.steps })
        }
      })

      stepsForDay.sort((a, b) => b.value - a.value)
      stepsForDay.forEach((item, index) => {
        const points = stepsForDay.length - 1 - index
        stepsMatchPoints.set(item.userId, (stepsMatchPoints.get(item.userId) || 0) + points)
      })
    })

    // Build MTD rankings
    const drinksRanking = Array.from(drinksTotals.entries())
      .map(([userId, volume]) => ({
        name: getDisplayName(userId),
        volume,
        matchPts: drinksMatchPoints.get(userId) || 0,
      }))
      .sort((a, b) => b.volume - a.volume) // Most drinks first

    const stepsRanking = Array.from(stepsTotals.entries())
      .map(([userId, total]) => ({
        name: getDisplayName(userId),
        total,
        matchPts: stepsMatchPoints.get(userId) || 0,
      }))
      .sort((a, b) => b.total - a.total) // Most steps first

    // Find leaders for match points
    const drinksMatchLeader = [...drinksRanking].sort((a, b) => b.matchPts - a.matchPts)[0]
    const stepsMatchLeader = [...stepsRanking].sort((a, b) => b.matchPts - a.matchPts)[0]

    // Format Slack message
    const dateDisplay = format(yesterday, 'EEE MMM d')
    const monthDisplay = format(today, 'MMMM')

    // Yesterday section
    const yesterdayDrinksStr = yesterdayDrinks.map(d => `${d.name}: ${d.value}`).join('  ')
    const yesterdayStepsStr = yesterdaySteps.map(s => `${s.name}: ${formatNumber(s.value)}`).join('  ')

    // MTD rankings
    const formatRankingRow = (rank: number, name: string, volume: string, matchPts: number, isMatchLeader: boolean) => {
      const fire = isMatchLeader ? ' :fire:' : ''
      return `${rank}. ${name.padEnd(12)} ${volume.padStart(8)}   ${matchPts}${fire}`
    }

    const drinksRows = drinksRanking.slice(0, 10).map((r, i) =>
      formatRankingRow(i + 1, r.name, r.volume.toString(), r.matchPts, r.name === drinksMatchLeader?.name)
    )

    const stepsRows = stepsRanking.slice(0, 10).map((r, i) =>
      formatRankingRow(i + 1, r.name, formatNumber(r.total), r.matchPts, r.name === stepsMatchLeader?.name)
    )

    const message = `
:bar_chart: Daily Leaderboard — ${dateDisplay}

┌─ YESTERDAY ─────────────────────────┐
│ :beer: ${yesterdayDrinksStr || 'No data'}
│ :athletic_shoe: ${yesterdayStepsStr || 'No data'}
└─────────────────────────────────────┘

┌─ ${monthDisplay.toUpperCase()} RANKINGS ────────────────────┐
│                                     │
│ :beer: DRINKS        Volume   Match Pts │
${drinksRows.map(r => `│ ${r}`).join('\n') || '│ No participants'}
│                                     │
│ :athletic_shoe: STEPS         Total    Match Pts │
${stepsRows.map(r => `│ ${r}`).join('\n') || '│ No participants'}
└─────────────────────────────────────┘
`.trim()

    // Send to Slack
    const slackResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    })

    if (!slackResponse.ok) {
      const errorText = await slackResponse.text()
      console.error('Slack webhook error:', errorText)
      return NextResponse.json({ error: 'Failed to send to Slack', details: errorText }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Leaderboard sent to Slack',
      preview: message,
    })

  } catch (error) {
    console.error('Error in daily leaderboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
