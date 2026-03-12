'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, parseISO, getDate, getDaysInMonth, differenceInDays, eachDayOfInterval } from 'date-fns'
import type { Profile } from '@/types/database'
import { Beer, Footprints, ChevronLeft, ChevronRight, EyeOff, Trophy, TrendingUp } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface LeaderboardsClientProps {
  currentUser: Profile
}

type LeaderboardEntry = {
  userId: string
  displayName: string
  value: number
  rank: number
  isAnonymous: boolean
  isCurrentUser: boolean
}

type ViewMode = 'monthly' | 'yearly'
type ScoringMode = 'volume' | 'match'
type DrinksMatchDirection = 'fewer' | 'more'

// Colors for different users
const USER_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f97316', // orange
  '#9333ea', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#eab308', // yellow
]

export function LeaderboardsClient({ currentUser }: LeaderboardsClientProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  const [scoringMode, setScoringMode] = useState<ScoringMode>('volume')
  const [drinksMatchDirection, setDrinksMatchDirection] = useState<DrinksMatchDirection>('fewer')
  const supabase = createClient()

  // Date range calculations based on view mode
  const dateStart = viewMode === 'monthly'
    ? format(startOfMonth(selectedDate), 'yyyy-MM-dd')
    : format(startOfYear(selectedDate), 'yyyy-MM-dd')
  const dateEnd = viewMode === 'monthly'
    ? format(endOfMonth(selectedDate), 'yyyy-MM-dd')
    : format(endOfYear(selectedDate), 'yyyy-MM-dd')
  const periodLabel = viewMode === 'monthly'
    ? format(selectedDate, 'MMMM yyyy')
    : format(selectedDate, 'yyyy')
  const daysInMonth = getDaysInMonth(selectedDate)
  const isCurrentPeriod = viewMode === 'monthly'
    ? format(selectedDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM')
    : format(selectedDate, 'yyyy') === format(new Date(), 'yyyy')
  const currentDayOfMonth = isCurrentPeriod && viewMode === 'monthly' ? getDate(new Date()) : daysInMonth

  // For yearly view, calculate the current day of year for the selected year
  const yearStart = startOfYear(selectedDate)
  const yearEnd = isCurrentPeriod ? new Date() : endOfYear(selectedDate)
  const daysInPeriod = differenceInDays(yearEnd, yearStart) + 1

  // Fetch all users who opted into leaderboards
  const { data: leaderboardUsers } = useQuery({
    queryKey: ['leaderboard-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, share_drinks, share_steps, leaderboard_anonymous')
        .or('share_drinks.eq.true,share_steps.eq.true')

      if (error) throw error
      return data
    },
  })

  // Create stable color mapping by userId (consistent across both charts)
  const userColorMap = useMemo(() => {
    if (!leaderboardUsers) return new Map<string, string>()
    const map = new Map<string, string>()
    // Sort by id to ensure consistent ordering
    const sortedUsers = [...leaderboardUsers].sort((a, b) => a.id.localeCompare(b.id))
    sortedUsers.forEach((user, index) => {
      map.set(user.id, USER_COLORS[index % USER_COLORS.length])
    })
    return map
  }, [leaderboardUsers])

  // Fetch entries for the period for all leaderboard users
  const { data: entries } = useQuery({
    queryKey: ['leaderboard-entries', dateStart, dateEnd, viewMode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_entries')
        .select(`
          user_id,
          entry_date,
          beers,
          seltzers,
          wine,
          liquor,
          shots,
          steps
        `)
        .gte('entry_date', dateStart)
        .lte('entry_date', dateEnd)

      if (error) throw error
      return data
    },
    enabled: !!leaderboardUsers,
  })

  // Calculate drinks leaderboard
  const drinksLeaderboard: LeaderboardEntry[] = useMemo(() => {
    if (!leaderboardUsers || !entries) return []

    const usersWhoshareDrinks = leaderboardUsers.filter((u) => u.share_drinks)
    const drinksByUser = new Map<string, number>()

    entries.forEach((entry) => {
      if (!usersWhoshareDrinks.some((u) => u.id === entry.user_id)) return
      const total = (entry.beers || 0) + (entry.seltzers || 0) + (entry.wine || 0) +
        (entry.liquor || 0) + (entry.shots || 0)
      drinksByUser.set(entry.user_id, (drinksByUser.get(entry.user_id) || 0) + total)
    })

    return usersWhoshareDrinks
      .map((user) => ({
        userId: user.id,
        displayName: user.leaderboard_anonymous ? 'Anonymous' : user.display_name,
        value: drinksByUser.get(user.id) || 0,
        rank: 0,
        isAnonymous: user.leaderboard_anonymous,
        isCurrentUser: user.id === currentUser.id,
      }))
      .sort((a, b) => b.value - a.value)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))
  }, [leaderboardUsers, entries, currentUser.id])

  // Calculate steps leaderboard
  const stepsLeaderboard: LeaderboardEntry[] = useMemo(() => {
    if (!leaderboardUsers || !entries) return []

    const usersWhoshareSteps = leaderboardUsers.filter((u) => u.share_steps)
    const stepsByUser = new Map<string, { total: number; days: number }>()

    entries.forEach((entry) => {
      if (!usersWhoshareSteps.some((u) => u.id === entry.user_id)) return
      if (entry.steps === null || entry.steps === 0) return

      const current = stepsByUser.get(entry.user_id) || { total: 0, days: 0 }
      stepsByUser.set(entry.user_id, {
        total: current.total + entry.steps,
        days: current.days + 1,
      })
    })

    return usersWhoshareSteps
      .map((user) => {
        const data = stepsByUser.get(user.id)
        return {
          userId: user.id,
          displayName: user.leaderboard_anonymous ? 'Anonymous' : user.display_name,
          value: data ? Math.round(data.total / data.days) : 0,
          rank: 0,
          isAnonymous: user.leaderboard_anonymous,
          isCurrentUser: user.id === currentUser.id,
        }
      })
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))
  }, [leaderboardUsers, entries, currentUser.id])

  // Calculate match points for drinks
  const drinksMatchPoints = useMemo(() => {
    if (!leaderboardUsers || !entries) return { leaderboard: [], dailyData: [] }

    const usersWhoShareDrinks = leaderboardUsers.filter((u) => u.share_drinks)

    // Group entries by date
    const entriesByDate = new Map<string, { userId: string; value: number }[]>()

    entries.forEach((entry) => {
      if (!usersWhoShareDrinks.some((u) => u.id === entry.user_id)) return
      const total = (entry.beers || 0) + (entry.seltzers || 0) + (entry.wine || 0) +
        (entry.liquor || 0) + (entry.shots || 0)

      // Only include if they logged something (even 0 counts if entry exists)
      const existing = entriesByDate.get(entry.entry_date) || []
      existing.push({ userId: entry.user_id, value: total })
      entriesByDate.set(entry.entry_date, existing)
    })

    // Calculate match points per day per user
    const matchPointsByUser = new Map<string, number>()
    const dailyRankings: { date: string; rankings: { userId: string; displayName: string; value: number; rank: number; points: number }[] }[] = []

    usersWhoShareDrinks.forEach((u) => matchPointsByUser.set(u.id, 0))

    // Sort dates chronologically
    const sortedDates = [...entriesByDate.keys()].sort()

    sortedDates.forEach((date) => {
      const dayEntries = entriesByDate.get(date)!

      // Sort based on direction: fewer = lower is better, more = higher is better
      const sorted = drinksMatchDirection === 'fewer'
        ? [...dayEntries].sort((a, b) => a.value - b.value)
        : [...dayEntries].sort((a, b) => b.value - a.value)

      // Assign ranks with tie handling
      const ranked: { userId: string; value: number; rank: number }[] = []
      let currentRank = 1

      for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i].value !== sorted[i - 1].value) {
          currentRank = i + 1
        }
        ranked.push({ ...sorted[i], rank: currentRank })
      }

      // Calculate points for each participant
      // Points = number of people you beat (with fractional splits for ties)
      const n = ranked.length
      const dayRankings: { userId: string; displayName: string; value: number; rank: number; points: number }[] = []

      ranked.forEach((entry) => {
        // For ties, we need to split points with tied participants
        const tiedWith = ranked.filter((other) => other.rank === entry.rank)

        // Calculate average points for this rank group
        // E.g., if 2 people tie for 2nd out of 5, they split what 2nd and 3rd would get
        let totalPointsForTiedGroup = 0
        const tiedCount = tiedWith.length
        for (let offset = 0; offset < tiedCount; offset++) {
          const positionRank = entry.rank + offset
          totalPointsForTiedGroup += Math.max(0, n - positionRank)
        }
        const points = totalPointsForTiedGroup / tiedCount

        matchPointsByUser.set(entry.userId, (matchPointsByUser.get(entry.userId) || 0) + points)

        const user = usersWhoShareDrinks.find((u) => u.id === entry.userId)
        dayRankings.push({
          userId: entry.userId,
          displayName: user?.leaderboard_anonymous ? 'Anonymous' : (user?.display_name || 'Unknown'),
          value: entry.value,
          rank: entry.rank,
          points,
        })
      })

      dailyRankings.push({ date, rankings: dayRankings })
    })

    // Build leaderboard sorted by total match points
    const leaderboard: LeaderboardEntry[] = usersWhoShareDrinks
      .map((user) => ({
        userId: user.id,
        displayName: user.leaderboard_anonymous ? 'Anonymous' : user.display_name,
        value: matchPointsByUser.get(user.id) || 0,
        rank: 0,
        isAnonymous: user.leaderboard_anonymous,
        isCurrentUser: user.id === currentUser.id,
      }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))

    return { leaderboard, dailyData: dailyRankings }
  }, [leaderboardUsers, entries, currentUser.id, drinksMatchDirection])

  // Calculate match points for steps
  const stepsMatchPoints = useMemo(() => {
    if (!leaderboardUsers || !entries) return { leaderboard: [], dailyData: [] }

    const usersWhoShareSteps = leaderboardUsers.filter((u) => u.share_steps)

    // Group entries by date - only include days where steps were logged (not null)
    const entriesByDate = new Map<string, { userId: string; value: number }[]>()

    entries.forEach((entry) => {
      if (!usersWhoShareSteps.some((u) => u.id === entry.user_id)) return
      if (entry.steps === null) return // Unlogged doesn't count

      const existing = entriesByDate.get(entry.entry_date) || []
      existing.push({ userId: entry.user_id, value: entry.steps })
      entriesByDate.set(entry.entry_date, existing)
    })

    // Calculate match points per day per user
    const matchPointsByUser = new Map<string, number>()
    const dailyRankings: { date: string; rankings: { userId: string; displayName: string; value: number; rank: number; points: number }[] }[] = []

    usersWhoShareSteps.forEach((u) => matchPointsByUser.set(u.id, 0))

    // Sort dates chronologically
    const sortedDates = [...entriesByDate.keys()].sort()

    sortedDates.forEach((date) => {
      const dayEntries = entriesByDate.get(date)!

      // For steps, HIGHER is better
      const sorted = [...dayEntries].sort((a, b) => b.value - a.value)

      // Assign ranks with tie handling
      const ranked: { userId: string; value: number; rank: number }[] = []
      let currentRank = 1

      for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i].value !== sorted[i - 1].value) {
          currentRank = i + 1
        }
        ranked.push({ ...sorted[i], rank: currentRank })
      }

      // Calculate points for each participant
      const n = ranked.length
      const dayRankings: { userId: string; displayName: string; value: number; rank: number; points: number }[] = []

      ranked.forEach((entry) => {
        const tiedWith = ranked.filter((other) => other.rank === entry.rank)
        const tiedCount = tiedWith.length

        // Calculate average points for this rank group
        let totalPointsForTiedGroup = 0
        for (let offset = 0; offset < tiedCount; offset++) {
          const positionRank = entry.rank + offset
          totalPointsForTiedGroup += Math.max(0, n - positionRank)
        }
        const points = totalPointsForTiedGroup / tiedCount

        matchPointsByUser.set(entry.userId, (matchPointsByUser.get(entry.userId) || 0) + points)

        const user = usersWhoShareSteps.find((u) => u.id === entry.userId)
        dayRankings.push({
          userId: entry.userId,
          displayName: user?.leaderboard_anonymous ? 'Anonymous' : (user?.display_name || 'Unknown'),
          value: entry.value,
          rank: entry.rank,
          points,
        })
      })

      dailyRankings.push({ date, rankings: dayRankings })
    })

    // Build leaderboard sorted by total match points
    const leaderboard: LeaderboardEntry[] = usersWhoShareSteps
      .map((user) => ({
        userId: user.id,
        displayName: user.leaderboard_anonymous ? 'Anonymous' : user.display_name,
        value: matchPointsByUser.get(user.id) || 0,
        rank: 0,
        isAnonymous: user.leaderboard_anonymous,
        isCurrentUser: user.id === currentUser.id,
      }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))

    return { leaderboard, dailyData: dailyRankings }
  }, [leaderboardUsers, entries, currentUser.id])

  // Prepare daily points heatmap data
  const drinksHeatmapData = useMemo(() => {
    if (drinksMatchPoints.dailyData.length === 0) return []

    return drinksMatchPoints.dailyData.map((day) => ({
      date: day.date,
      dateFormatted: format(parseISO(day.date), 'MMM d'),
      rankings: day.rankings.sort((a, b) => a.rank - b.rank),
    }))
  }, [drinksMatchPoints])

  const stepsHeatmapData = useMemo(() => {
    if (stepsMatchPoints.dailyData.length === 0) return []

    return stepsMatchPoints.dailyData.map((day) => ({
      date: day.date,
      dateFormatted: format(parseISO(day.date), 'MMM d'),
      rankings: day.rankings.sort((a, b) => a.rank - b.rank),
    }))
  }, [stepsMatchPoints])

  // Calculate cumulative drinks chart data
  const drinksChartData = useMemo(() => {
    if (!leaderboardUsers || !entries || drinksLeaderboard.length === 0) return []

    const usersWhoshareDrinks = leaderboardUsers.filter((u) => u.share_drinks)

    // Find the most recent logged date from entries
    let maxLoggedDate: Date | null = null
    entries.forEach((entry) => {
      const date = parseISO(entry.entry_date)
      if (!maxLoggedDate || date > maxLoggedDate) {
        maxLoggedDate = date
      }
    })

    if (viewMode === 'monthly') {
      // Group entries by user and day
      const byUserAndDay = new Map<string, Map<number, number>>()

      entries.forEach((entry) => {
        if (!usersWhoshareDrinks.some((u) => u.id === entry.user_id)) return
        const dayOfMonth = getDate(parseISO(entry.entry_date))
        const total = (entry.beers || 0) + (entry.seltzers || 0) + (entry.wine || 0) +
          (entry.liquor || 0) + (entry.shots || 0)

        if (!byUserAndDay.has(entry.user_id)) {
          byUserAndDay.set(entry.user_id, new Map())
        }
        const existing = byUserAndDay.get(entry.user_id)!.get(dayOfMonth) || 0
        byUserAndDay.get(entry.user_id)!.set(dayOfMonth, existing + total)
      })

      // Build chart data
      const cumulativeSums = new Map<string, number>()
      drinksLeaderboard.forEach((user) => cumulativeSums.set(user.userId, 0))

      const data: Record<string, number | string>[] = []
      const monthStart = startOfMonth(selectedDate)

      // Use most recent logged day instead of today for current period
      const maxDayOfMonth = isCurrentPeriod && maxLoggedDate ? getDate(maxLoggedDate) : currentDayOfMonth

      for (let day = 1; day <= maxDayOfMonth; day++) {
        const dayDate = new Date(monthStart)
        dayDate.setDate(day)
        const point: Record<string, number | string> = { day, date: format(dayDate, 'MMM d') }

        drinksLeaderboard.forEach((user) => {
          const userDays = byUserAndDay.get(user.userId)
          const dailyValue = userDays?.get(day) || 0
          const prevSum = cumulativeSums.get(user.userId) || 0
          const newSum = prevSum + dailyValue
          cumulativeSums.set(user.userId, newSum)
          point[user.displayName] = newSum
        })

        data.push(point)
      }

      return data
    } else {
      // Yearly view: daily accumulation
      const byUserAndDate = new Map<string, Map<string, number>>()

      entries.forEach((entry) => {
        if (!usersWhoshareDrinks.some((u) => u.id === entry.user_id)) return
        const total = (entry.beers || 0) + (entry.seltzers || 0) + (entry.wine || 0) +
          (entry.liquor || 0) + (entry.shots || 0)

        const entryDate = format(parseISO(entry.entry_date), 'yyyy-MM-dd')
        if (!byUserAndDate.has(entry.user_id)) {
          byUserAndDate.set(entry.user_id, new Map())
        }
        const existing = byUserAndDate.get(entry.user_id)!.get(entryDate) || 0
        byUserAndDate.get(entry.user_id)!.set(entryDate, existing + total)
      })

      // Build chart data - daily from start of year
      const cumulativeSums = new Map<string, number>()
      drinksLeaderboard.forEach((user) => cumulativeSums.set(user.userId, 0))

      // Use most recent logged date instead of today for current period
      const chartEndDate = isCurrentPeriod && maxLoggedDate ? maxLoggedDate : yearEnd
      const allDays = eachDayOfInterval({ start: yearStart, end: chartEndDate })
      const data: Record<string, number | string>[] = []

      allDays.forEach((date, index) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const point: Record<string, number | string> = { day: index + 1, date: format(date, 'MMM d') }

        drinksLeaderboard.forEach((user) => {
          const userDates = byUserAndDate.get(user.userId)
          const dailyValue = userDates?.get(dateStr) || 0
          const prevSum = cumulativeSums.get(user.userId) || 0
          const newSum = prevSum + dailyValue
          cumulativeSums.set(user.userId, newSum)
          point[user.displayName] = newSum
        })

        data.push(point)
      })

      return data
    }
  }, [leaderboardUsers, entries, drinksLeaderboard, currentDayOfMonth, viewMode, yearStart, yearEnd, selectedDate, isCurrentPeriod])

  // Calculate cumulative steps chart data
  const stepsChartData = useMemo(() => {
    if (!leaderboardUsers || !entries || stepsLeaderboard.length === 0) return []

    const usersWhoshareSteps = leaderboardUsers.filter((u) => u.share_steps)

    // Find the most recent logged date from entries
    let maxLoggedDate: Date | null = null
    entries.forEach((entry) => {
      const date = parseISO(entry.entry_date)
      if (!maxLoggedDate || date > maxLoggedDate) {
        maxLoggedDate = date
      }
    })

    if (viewMode === 'monthly') {
      // Group entries by user and day
      const byUserAndDay = new Map<string, Map<number, number>>()

      entries.forEach((entry) => {
        if (!usersWhoshareSteps.some((u) => u.id === entry.user_id)) return
        if (entry.steps === null) return
        const dayOfMonth = getDate(parseISO(entry.entry_date))

        if (!byUserAndDay.has(entry.user_id)) {
          byUserAndDay.set(entry.user_id, new Map())
        }
        const existing = byUserAndDay.get(entry.user_id)!.get(dayOfMonth) || 0
        byUserAndDay.get(entry.user_id)!.set(dayOfMonth, existing + entry.steps)
      })

      // Build chart data
      const cumulativeSums = new Map<string, number>()
      stepsLeaderboard.forEach((user) => cumulativeSums.set(user.userId, 0))

      const data: Record<string, number | string>[] = []
      const monthStart = startOfMonth(selectedDate)

      // Use most recent logged day instead of today for current period
      const maxDayOfMonth = isCurrentPeriod && maxLoggedDate ? getDate(maxLoggedDate) : currentDayOfMonth

      for (let day = 1; day <= maxDayOfMonth; day++) {
        const dayDate = new Date(monthStart)
        dayDate.setDate(day)
        const point: Record<string, number | string> = { day, date: format(dayDate, 'MMM d') }

        stepsLeaderboard.forEach((user) => {
          const userDays = byUserAndDay.get(user.userId)
          const dailyValue = userDays?.get(day) || 0
          const prevSum = cumulativeSums.get(user.userId) || 0
          const newSum = prevSum + dailyValue
          cumulativeSums.set(user.userId, newSum)
          point[user.displayName] = newSum
        })

        data.push(point)
      }

      return data
    } else {
      // Yearly view: daily accumulation
      const byUserAndDate = new Map<string, Map<string, number>>()

      entries.forEach((entry) => {
        if (!usersWhoshareSteps.some((u) => u.id === entry.user_id)) return
        if (entry.steps === null) return

        const entryDate = format(parseISO(entry.entry_date), 'yyyy-MM-dd')
        if (!byUserAndDate.has(entry.user_id)) {
          byUserAndDate.set(entry.user_id, new Map())
        }
        const existing = byUserAndDate.get(entry.user_id)!.get(entryDate) || 0
        byUserAndDate.get(entry.user_id)!.set(entryDate, existing + entry.steps)
      })

      // Build chart data - daily from start of year
      const cumulativeSums = new Map<string, number>()
      stepsLeaderboard.forEach((user) => cumulativeSums.set(user.userId, 0))

      // Use most recent logged date instead of today for current period
      const chartEndDate = isCurrentPeriod && maxLoggedDate ? maxLoggedDate : yearEnd
      const allDays = eachDayOfInterval({ start: yearStart, end: chartEndDate })
      const data: Record<string, number | string>[] = []

      allDays.forEach((date, index) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const point: Record<string, number | string> = { day: index + 1, date: format(date, 'MMM d') }

        stepsLeaderboard.forEach((user) => {
          const userDates = byUserAndDate.get(user.userId)
          const dailyValue = userDates?.get(dateStr) || 0
          const prevSum = cumulativeSums.get(user.userId) || 0
          const newSum = prevSum + dailyValue
          cumulativeSums.set(user.userId, newSum)
          point[user.displayName] = newSum
        })

        data.push(point)
      })

      return data
    }
  }, [leaderboardUsers, entries, stepsLeaderboard, currentDayOfMonth, viewMode, yearStart, yearEnd, selectedDate, isCurrentPeriod])

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (viewMode === 'monthly') {
      setSelectedDate((current) =>
        direction === 'prev' ? subMonths(current, 1) : subMonths(current, -1)
      )
    } else {
      setSelectedDate((current) =>
        direction === 'prev' ? subYears(current, 1) : subYears(current, -1)
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leaderboards</h1>
          <p className="text-gray-600">
            {scoringMode === 'match'
              ? `${viewMode === 'monthly' ? 'Monthly' : 'Yearly'} match play - earn points for each person you beat daily`
              : `${viewMode === 'monthly' ? 'Monthly' : 'Yearly'} rankings for opted-in participants`}
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {/* Scoring Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={scoringMode === 'volume' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setScoringMode('volume')}
              className="h-8 px-3 gap-1.5"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Volume
            </Button>
            <Button
              variant={scoringMode === 'match' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setScoringMode('match')}
              className="h-8 px-3 gap-1.5"
            >
              <Trophy className="h-3.5 w-3.5" />
              Match Play
            </Button>
          </div>
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'monthly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('monthly')}
              className="h-8 px-3"
            >
              Monthly
            </Button>
            <Button
              variant={viewMode === 'yearly' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('yearly')}
              className="h-8 px-3"
            >
              Yearly
            </Button>
          </div>
          {/* Period Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigatePeriod('prev')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center font-medium">{periodLabel}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigatePeriod('next')}
              disabled={isCurrentPeriod}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {!currentUser.share_drinks && !currentUser.share_steps && (
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="py-4">
            <p className="text-sm text-purple-700">
              You're not currently participating in any leaderboards. Go to{' '}
              <a href="/settings" className="underline font-medium">Settings</a> to opt in!
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Drinks Leaderboard */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Beer className="h-5 w-5 text-amber-500" />
                {scoringMode === 'match' ? 'Drinks Match Points' : `${viewMode === 'monthly' ? 'Monthly' : 'Yearly'} Drinks`}
                {scoringMode === 'match' && (
                  <button
                    onClick={() => setDrinksMatchDirection(d => d === 'fewer' ? 'more' : 'fewer')}
                    className="text-xs font-normal text-gray-500 ml-1 hover:text-gray-700 hover:underline cursor-pointer"
                  >
                    ({drinksMatchDirection === 'fewer' ? 'fewer' : 'more'} drinks wins)
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(scoringMode === 'volume' ? drinksLeaderboard : drinksMatchPoints.leaderboard).length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  No participants yet this {viewMode === 'monthly' ? 'month' : 'year'}
                </p>
              ) : (
                <div className="space-y-2">
                  {(scoringMode === 'volume' ? drinksLeaderboard : drinksMatchPoints.leaderboard).map((entry) => (
                    <div
                      key={entry.userId}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg',
                        entry.isCurrentUser ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center font-bold',
                            entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                            entry.rank === 2 ? 'bg-gray-200 text-gray-700' :
                            entry.rank === 3 ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-500'
                          )}
                        >
                          {entry.rank}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: userColorMap.get(entry.userId) || USER_COLORS[0] }}
                          />
                          <span className={cn(
                            'font-medium',
                            entry.isCurrentUser ? 'text-purple-700' : 'text-gray-700'
                          )}>
                            {entry.displayName}
                          </span>
                          {entry.isAnonymous && (
                            <EyeOff className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                      </div>
                      <span className="font-bold text-gray-900">
                        {scoringMode === 'match'
                          ? entry.value % 1 === 0 ? entry.value : entry.value.toFixed(1)
                          : entry.value}
                        {scoringMode === 'match' && <span className="text-xs text-gray-500 ml-1">pts</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Volume Mode: Cumulative Drinks Chart */}
          {scoringMode === 'volume' && drinksChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Cumulative Drinks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={drinksChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 10 }}
                        stroke="#9ca3af"
                        tickFormatter={(day) => {
                          if (viewMode === 'monthly') {
                            return day === 1 || day % 5 === 0 ? String(day) : ''
                          }
                          return day === 1 || day % 30 === 0 ? String(day) : ''
                        }}
                      />
                      <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={35} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelFormatter={(_, payload) => {
                          if (payload && payload.length > 0 && payload[0]?.payload?.date) {
                            return payload[0].payload.date
                          }
                          return `Day ${_}`
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                      {drinksLeaderboard.map((user) => (
                        <Line
                          key={user.userId}
                          type="monotone"
                          dataKey={user.displayName}
                          stroke={userColorMap.get(user.userId) || USER_COLORS[0]}
                          strokeWidth={user.isCurrentUser ? 2.5 : 1.5}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Match Mode: Daily Points Heatmap (Transposed) */}
          {scoringMode === 'match' && drinksHeatmapData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Daily Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  {(() => {
                    // Sort days descending (most recent first)
                    const days = [...drinksHeatmapData].reverse()
                    // Users already sorted by total points (high to low)
                    const users = drinksMatchPoints.leaderboard
                    return (
                      <table className="border-collapse w-full">
                        <thead>
                          <tr>
                            <th className="text-[10px] text-gray-400 font-normal pr-2 text-left sticky left-0 bg-white" />
                            {users.map((user) => (
                              <th key={user.userId} className="text-[10px] text-gray-500 font-medium px-1 pb-1 min-w-[40px]">
                                {user.displayName.split(' ')[0]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {/* Totals row */}
                          <tr className="border-b border-gray-200">
                            <td className="text-[10px] text-gray-600 font-medium pr-2 whitespace-nowrap text-left sticky left-0 bg-white py-1">Total</td>
                            {users.map((user) => (
                              <td key={user.userId} className="px-1 py-1 text-center">
                                <span className="text-[10px] font-bold text-gray-700">
                                  {user.value % 1 === 0 ? user.value : user.value.toFixed(1)}
                                </span>
                              </td>
                            ))}
                          </tr>
                          {/* Daily rows */}
                          {days.map((day) => (
                            <tr key={day.date}>
                              <td className="text-[9px] text-gray-500 pr-2 whitespace-nowrap text-left sticky left-0 bg-white">{format(parseISO(day.date), 'M/d')}</td>
                              {users.map((user) => {
                                const r = day.rankings.find((r) => r.userId === user.userId)
                                if (!r) return <td key={user.userId} className="px-1 py-0.5"><div className="w-7 h-6" /></td>
                                const maxPoints = day.rankings.length - 1
                                const intensity = maxPoints > 0 ? r.points / maxPoints : 0.5
                                return (
                                  <td key={user.userId} className="px-1 py-0.5">
                                    <div
                                      className="w-7 h-6 rounded text-[9px] font-medium flex items-center justify-center mx-auto"
                                      style={{
                                        backgroundColor: `rgba(34, 197, 94, ${0.15 + intensity * 0.7})`,
                                        color: intensity > 0.5 ? 'white' : '#166534',
                                      }}
                                      title={`${r.displayName}: ${r.points % 1 === 0 ? r.points : r.points.toFixed(1)} pts (${r.value} drinks)`}
                                    >
                                      {r.points % 1 === 0 ? r.points : r.points.toFixed(1)}
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Steps Leaderboard */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Footprints className="h-5 w-5 text-blue-500" />
                {scoringMode === 'match' ? 'Steps Match Points' : 'Average Daily Steps'}
                {scoringMode === 'match' && (
                  <span className="text-xs font-normal text-gray-500 ml-1">(more steps wins)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(scoringMode === 'volume' ? stepsLeaderboard : stepsMatchPoints.leaderboard).length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  No participants yet this {viewMode === 'monthly' ? 'month' : 'year'}
                </p>
              ) : (
                <div className="space-y-2">
                  {(scoringMode === 'volume' ? stepsLeaderboard : stepsMatchPoints.leaderboard).map((entry) => (
                    <div
                      key={entry.userId}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg',
                        entry.isCurrentUser ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center font-bold',
                            entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                            entry.rank === 2 ? 'bg-gray-200 text-gray-700' :
                            entry.rank === 3 ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-500'
                          )}
                        >
                          {entry.rank}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: userColorMap.get(entry.userId) || USER_COLORS[0] }}
                          />
                          <span className={cn(
                            'font-medium',
                            entry.isCurrentUser ? 'text-purple-700' : 'text-gray-700'
                          )}>
                            {entry.displayName}
                          </span>
                          {entry.isAnonymous && (
                            <EyeOff className="h-3 w-3 text-gray-400" />
                          )}
                        </div>
                      </div>
                      <span className="font-bold text-gray-900">
                        {scoringMode === 'match'
                          ? (entry.value % 1 === 0 ? entry.value : entry.value.toFixed(1))
                          : entry.value.toLocaleString()}
                        {scoringMode === 'match' && <span className="text-xs text-gray-500 ml-1">pts</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Volume Mode: Cumulative Steps Chart */}
          {scoringMode === 'volume' && stepsChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Cumulative Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stepsChartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 10 }}
                        stroke="#9ca3af"
                        tickFormatter={(day) => {
                          if (viewMode === 'monthly') {
                            return day === 1 || day % 5 === 0 ? String(day) : ''
                          }
                          return day === 1 || day % 30 === 0 ? String(day) : ''
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        stroke="#9ca3af"
                        width={45}
                        tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelFormatter={(_, payload) => {
                          if (payload && payload.length > 0 && payload[0]?.payload?.date) {
                            return payload[0].payload.date
                          }
                          return `Day ${_}`
                        }}
                        formatter={(value) => [typeof value === 'number' ? value.toLocaleString() : '0', '']}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} iconSize={10} />
                      {stepsLeaderboard.map((user) => (
                        <Line
                          key={user.userId}
                          type="monotone"
                          dataKey={user.displayName}
                          stroke={userColorMap.get(user.userId) || USER_COLORS[0]}
                          strokeWidth={user.isCurrentUser ? 2.5 : 1.5}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Match Mode: Daily Points Heatmap (Transposed) */}
          {scoringMode === 'match' && stepsHeatmapData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Daily Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  {(() => {
                    // Sort days descending (most recent first)
                    const days = [...stepsHeatmapData].reverse()
                    // Users already sorted by total points (high to low)
                    const users = stepsMatchPoints.leaderboard
                    return (
                      <table className="border-collapse w-full">
                        <thead>
                          <tr>
                            <th className="text-[10px] text-gray-400 font-normal pr-2 text-left sticky left-0 bg-white" />
                            {users.map((user) => (
                              <th key={user.userId} className="text-[10px] text-gray-500 font-medium px-1 pb-1 min-w-[40px]">
                                {user.displayName.split(' ')[0]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {/* Totals row */}
                          <tr className="border-b border-gray-200">
                            <td className="text-[10px] text-gray-600 font-medium pr-2 whitespace-nowrap text-left sticky left-0 bg-white py-1">Total</td>
                            {users.map((user) => (
                              <td key={user.userId} className="px-1 py-1 text-center">
                                <span className="text-[10px] font-bold text-gray-700">
                                  {user.value % 1 === 0 ? user.value : user.value.toFixed(1)}
                                </span>
                              </td>
                            ))}
                          </tr>
                          {/* Daily rows */}
                          {days.map((day) => (
                            <tr key={day.date}>
                              <td className="text-[9px] text-gray-500 pr-2 whitespace-nowrap text-left sticky left-0 bg-white">{format(parseISO(day.date), 'M/d')}</td>
                              {users.map((user) => {
                                const r = day.rankings.find((r) => r.userId === user.userId)
                                if (!r) return <td key={user.userId} className="px-1 py-0.5"><div className="w-7 h-6" /></td>
                                const maxPoints = day.rankings.length - 1
                                const intensity = maxPoints > 0 ? r.points / maxPoints : 0.5
                                return (
                                  <td key={user.userId} className="px-1 py-0.5">
                                    <div
                                      className="w-7 h-6 rounded text-[9px] font-medium flex items-center justify-center mx-auto"
                                      style={{
                                        backgroundColor: `rgba(59, 130, 246, ${0.15 + intensity * 0.7})`,
                                        color: intensity > 0.5 ? 'white' : '#1e40af',
                                      }}
                                      title={`${r.displayName}: ${r.points % 1 === 0 ? r.points : r.points.toFixed(1)} pts (${r.value.toLocaleString()} steps)`}
                                    >
                                      {r.points % 1 === 0 ? r.points : r.points.toFixed(1)}
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
