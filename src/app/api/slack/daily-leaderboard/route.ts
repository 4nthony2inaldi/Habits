import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { startOfMonth, startOfYear, subDays, format, eachDayOfInterval } from 'date-fns'

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
    const yearStart = startOfYear(today)

    const yesterdayStr = format(yesterday, 'yyyy-MM-dd')
    const monthStartStr = format(monthStart, 'yyyy-MM-dd')
    const yearStartStr = format(yearStart, 'yyyy-MM-dd')
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

    // Fetch entries for the year (includes MTD)
    const { data: entries, error: entriesError } = await supabase
      .from('daily_entries')
      .select('user_id, entry_date, beers, seltzers, wine, liquor, shots, steps')
      .in('user_id', userIds)
      .gte('entry_date', yearStartStr)
      .lt('entry_date', todayStr)

    if (entriesError) {
      console.error('Error fetching entries:', entriesError)
      return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 })
    }

    // Build user lookup
    const userMap = new Map<string, UserWithEntries>()
    users.forEach(u => userMap.set(u.id, u))

    // Get display name (respecting anonymity) - use last name only for shorter display
    const getDisplayName = (userId: string): string => {
      const user = userMap.get(userId)
      if (!user) return 'Unknown'
      if (user.leaderboard_anonymous) return 'Anonymous'
      const parts = user.display_name.trim().split(/\s+/)
      return parts.length > 1 ? parts[parts.length - 1] : user.display_name
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
        if (drinks > 0) {
          yesterdayDrinks.push({ name, value: drinks })
        }
      }

      if (user.share_steps && entry?.steps != null) {
        yesterdaySteps.push({ name, value: entry.steps })
      }
    })

    // Sort yesterday: drinks high to low, steps high to low
    yesterdayDrinks.sort((a, b) => b.value - a.value)
    yesterdaySteps.sort((a, b) => b.value - a.value)

    // Split entries into MTD and YTD
    const mtdEntries = (entries || []).filter(e => e.entry_date >= monthStartStr)
    const ytdEntries = entries || []

    // MTD totals
    const mtdDrinksTotals = new Map<string, number>()
    const mtdStepsTotals = new Map<string, number>()
    // YTD totals
    const ytdDrinksTotals = new Map<string, number>()
    const ytdStepsTotals = new Map<string, number>()

    users.forEach(user => {
      if (user.share_drinks) {
        mtdDrinksTotals.set(user.id, 0)
        ytdDrinksTotals.set(user.id, 0)
      }
      if (user.share_steps) {
        mtdStepsTotals.set(user.id, 0)
        ytdStepsTotals.set(user.id, 0)
      }
    })

    // Calculate MTD totals
    mtdEntries.forEach(entry => {
      if (mtdDrinksTotals.has(entry.user_id)) {
        mtdDrinksTotals.set(entry.user_id, (mtdDrinksTotals.get(entry.user_id) || 0) + calculateTotalDrinks(entry))
      }
      if (mtdStepsTotals.has(entry.user_id) && entry.steps != null) {
        mtdStepsTotals.set(entry.user_id, (mtdStepsTotals.get(entry.user_id) || 0) + entry.steps)
      }
    })

    // Calculate YTD totals
    ytdEntries.forEach(entry => {
      if (ytdDrinksTotals.has(entry.user_id)) {
        ytdDrinksTotals.set(entry.user_id, (ytdDrinksTotals.get(entry.user_id) || 0) + calculateTotalDrinks(entry))
      }
      if (ytdStepsTotals.has(entry.user_id) && entry.steps != null) {
        ytdStepsTotals.set(entry.user_id, (ytdStepsTotals.get(entry.user_id) || 0) + entry.steps)
      }
    })

    // Calculate match points (MTD and YTD)
    const mtdDrinksMatchPoints = new Map<string, number>()
    const mtdStepsMatchPoints = new Map<string, number>()
    const ytdDrinksMatchPoints = new Map<string, number>()
    const ytdStepsMatchPoints = new Map<string, number>()

    users.forEach(user => {
      if (user.share_drinks) {
        mtdDrinksMatchPoints.set(user.id, 0)
        ytdDrinksMatchPoints.set(user.id, 0)
      }
      if (user.share_steps) {
        mtdStepsMatchPoints.set(user.id, 0)
        ytdStepsMatchPoints.set(user.id, 0)
      }
    })

    // Get all days in each period
    const mtdDays = eachDayOfInterval({ start: monthStart, end: yesterday })
    const ytdDays = eachDayOfInterval({ start: yearStart, end: yesterday })

    // Helper to calculate match points with tie handling
    const calculateMatchPoints = (
      participants: { userId: string; value: number }[],
      higherWins: boolean // true = higher value wins, false = lower value wins
    ): Map<string, number> => {
      const points = new Map<string, number>()
      if (participants.length === 0) return points

      // Sort: if higherWins, descending; otherwise ascending
      const sorted = [...participants].sort((a, b) =>
        higherWins ? b.value - a.value : a.value - b.value
      )

      // Assign ranks with tie handling
      const ranked: { userId: string; value: number; rank: number }[] = []
      let currentRank = 1
      for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i].value !== sorted[i - 1].value) {
          currentRank = i + 1
        }
        ranked.push({ ...sorted[i], rank: currentRank })
      }

      // Calculate points with fractional splits for ties
      const n = ranked.length
      ranked.forEach((entry) => {
        const tiedWith = ranked.filter((other) => other.rank === entry.rank)
        let totalPointsForTiedGroup = 0
        const tiedCount = tiedWith.length
        for (let offset = 0; offset < tiedCount; offset++) {
          const positionRank = entry.rank + offset
          totalPointsForTiedGroup += Math.max(0, n - positionRank)
        }
        const pts = totalPointsForTiedGroup / tiedCount
        points.set(entry.userId, pts)
      })

      return points
    }

    // Calculate match points for all YTD days (MTD is a subset)
    ytdDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayEntries = (entries || []).filter(e => e.entry_date === dateStr)
      const isInMtd = dateStr >= monthStartStr

      // Drinks: only include users who logged an entry (not defaulting to 0)
      const drinksForDay: { userId: string; value: number }[] = []
      users.filter(u => u.share_drinks).forEach(user => {
        const entry = dayEntries.find(e => e.user_id === user.id)
        if (entry) {
          drinksForDay.push({ userId: user.id, value: calculateTotalDrinks(entry) })
        }
      })

      const drinksPoints = calculateMatchPoints(drinksForDay, true) // higher drinks wins
      drinksPoints.forEach((pts, userId) => {
        ytdDrinksMatchPoints.set(userId, (ytdDrinksMatchPoints.get(userId) || 0) + pts)
        if (isInMtd) {
          mtdDrinksMatchPoints.set(userId, (mtdDrinksMatchPoints.get(userId) || 0) + pts)
        }
      })

      // Steps: only include users who logged steps
      const stepsForDay: { userId: string; value: number }[] = []
      users.filter(u => u.share_steps).forEach(user => {
        const entry = dayEntries.find(e => e.user_id === user.id)
        if (entry?.steps != null) {
          stepsForDay.push({ userId: user.id, value: entry.steps })
        }
      })

      const stepsPoints = calculateMatchPoints(stepsForDay, true) // higher steps wins
      stepsPoints.forEach((pts, userId) => {
        ytdStepsMatchPoints.set(userId, (ytdStepsMatchPoints.get(userId) || 0) + pts)
        if (isInMtd) {
          mtdStepsMatchPoints.set(userId, (mtdStepsMatchPoints.get(userId) || 0) + pts)
        }
      })
    })

    // Build MTD rankings
    const mtdDrinksRanking = Array.from(mtdDrinksTotals.entries())
      .map(([userId, volume]) => ({
        name: getDisplayName(userId),
        volume,
        matchPts: mtdDrinksMatchPoints.get(userId) || 0,
      }))
      .sort((a, b) => b.volume - a.volume)

    const mtdStepsRanking = Array.from(mtdStepsTotals.entries())
      .map(([userId, total]) => ({
        name: getDisplayName(userId),
        total,
        matchPts: mtdStepsMatchPoints.get(userId) || 0,
      }))
      .sort((a, b) => b.total - a.total)

    // Build YTD rankings
    const ytdDrinksRanking = Array.from(ytdDrinksTotals.entries())
      .map(([userId, volume]) => ({
        name: getDisplayName(userId),
        volume,
        matchPts: ytdDrinksMatchPoints.get(userId) || 0,
      }))
      .sort((a, b) => b.volume - a.volume)

    const ytdStepsRanking = Array.from(ytdStepsTotals.entries())
      .map(([userId, total]) => ({
        name: getDisplayName(userId),
        total,
        matchPts: ytdStepsMatchPoints.get(userId) || 0,
      }))
      .sort((a, b) => b.total - a.total)

    // Find leaders for match points
    const mtdDrinksMatchLeader = [...mtdDrinksRanking].sort((a, b) => b.matchPts - a.matchPts)[0]
    const mtdStepsMatchLeader = [...mtdStepsRanking].sort((a, b) => b.matchPts - a.matchPts)[0]
    const ytdDrinksMatchLeader = [...ytdDrinksRanking].sort((a, b) => b.matchPts - a.matchPts)[0]
    const ytdStepsMatchLeader = [...ytdStepsRanking].sort((a, b) => b.matchPts - a.matchPts)[0]

    // Format Slack message
    const dateDisplay = format(yesterday, 'EEE MMM d')
    const monthDisplay = format(today, 'MMMM')
    const yearDisplay = format(today, 'yyyy')

    // Yesterday section
    const yesterdayDrinksStr = yesterdayDrinks
      .map(d => `${d.name} ${d.value}`)
      .join(' · ')

    const yesterdayStepsStr = yesterdaySteps
      .map(s => `${s.name} ${formatNumber(s.value)}`)
      .join(' · ')

    // Ranking position
    const getPosition = (rank: number): string => {
      return `${rank}.`
    }

    // Format ranking rows helper
    const formatRankingRows = (
      ranking: { name: string; volume?: number; total?: number; matchPts: number }[],
      matchLeader: { name: string } | undefined,
      type: 'drinks' | 'steps'
    ) => {
      return ranking.map((r, i) => {
        const position = getPosition(i + 1)
        const fire = r.name === matchLeader?.name ? ' :fire:' : ''
        const value = type === 'drinks' ? `${r.volume} drinks` : `${formatNumber(r.total || 0)} steps`
        return `${position} *${r.name}* — ${value}, ${r.matchPts} pts${fire}`
      })
    }

    const mtdDrinksRows = formatRankingRows(mtdDrinksRanking, mtdDrinksMatchLeader, 'drinks')
    const ytdDrinksRows = formatRankingRows(ytdDrinksRanking, ytdDrinksMatchLeader, 'drinks')
    const mtdStepsRows = formatRankingRows(mtdStepsRanking, mtdStepsMatchLeader, 'steps')
    const ytdStepsRows = formatRankingRows(ytdStepsRanking, ytdStepsMatchLeader, 'steps')

    const message = `:bar_chart: *Daily Leaderboard — ${dateDisplay}*

*Yesterday*
:beer: ${yesterdayDrinksStr || 'No data'}
:athletic_shoe: ${yesterdayStepsStr || 'No data'}


:beer: *Drinks — ${monthDisplay}*
${mtdDrinksRows.join('\n') || 'No participants'}

:beer: *Drinks — ${yearDisplay} YTD*
${ytdDrinksRows.join('\n') || 'No participants'}


:athletic_shoe: *Steps — ${monthDisplay}*
${mtdStepsRows.join('\n') || 'No participants'}

:athletic_shoe: *Steps — ${yearDisplay} YTD*
${ytdStepsRows.join('\n') || 'No participants'}`

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
