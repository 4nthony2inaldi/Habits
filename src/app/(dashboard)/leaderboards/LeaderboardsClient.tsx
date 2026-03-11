'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears, parseISO, getDate, getMonth, getDaysInMonth } from 'date-fns'
import type { Profile } from '@/types/database'
import { Beer, Footprints, ChevronLeft, ChevronRight, EyeOff } from 'lucide-react'
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
  const currentMonth = isCurrentPeriod && viewMode === 'yearly' ? getMonth(new Date()) : 11

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

  // Calculate cumulative drinks chart data
  const drinksChartData = useMemo(() => {
    if (!leaderboardUsers || !entries || drinksLeaderboard.length === 0) return []

    const usersWhoshareDrinks = leaderboardUsers.filter((u) => u.share_drinks)

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

      for (let day = 1; day <= currentDayOfMonth; day++) {
        const point: Record<string, number | string> = { day }

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
      // Yearly view: group by month
      const byUserAndMonth = new Map<string, Map<number, number>>()

      entries.forEach((entry) => {
        if (!usersWhoshareDrinks.some((u) => u.id === entry.user_id)) return
        const monthOfYear = getMonth(parseISO(entry.entry_date))
        const total = (entry.beers || 0) + (entry.seltzers || 0) + (entry.wine || 0) +
          (entry.liquor || 0) + (entry.shots || 0)

        if (!byUserAndMonth.has(entry.user_id)) {
          byUserAndMonth.set(entry.user_id, new Map())
        }
        const existing = byUserAndMonth.get(entry.user_id)!.get(monthOfYear) || 0
        byUserAndMonth.get(entry.user_id)!.set(monthOfYear, existing + total)
      })

      // Build chart data
      const cumulativeSums = new Map<string, number>()
      drinksLeaderboard.forEach((user) => cumulativeSums.set(user.userId, 0))

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const data: Record<string, number | string>[] = []

      for (let month = 0; month <= currentMonth; month++) {
        const point: Record<string, number | string> = { month: monthNames[month] }

        drinksLeaderboard.forEach((user) => {
          const userMonths = byUserAndMonth.get(user.userId)
          const monthlyValue = userMonths?.get(month) || 0
          const prevSum = cumulativeSums.get(user.userId) || 0
          const newSum = prevSum + monthlyValue
          cumulativeSums.set(user.userId, newSum)
          point[user.displayName] = newSum
        })

        data.push(point)
      }

      return data
    }
  }, [leaderboardUsers, entries, drinksLeaderboard, currentDayOfMonth, currentMonth, viewMode])

  // Calculate cumulative steps chart data
  const stepsChartData = useMemo(() => {
    if (!leaderboardUsers || !entries || stepsLeaderboard.length === 0) return []

    const usersWhoshareSteps = leaderboardUsers.filter((u) => u.share_steps)

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

      for (let day = 1; day <= currentDayOfMonth; day++) {
        const point: Record<string, number | string> = { day }

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
      // Yearly view: group by month
      const byUserAndMonth = new Map<string, Map<number, number>>()

      entries.forEach((entry) => {
        if (!usersWhoshareSteps.some((u) => u.id === entry.user_id)) return
        if (entry.steps === null) return
        const monthOfYear = getMonth(parseISO(entry.entry_date))

        if (!byUserAndMonth.has(entry.user_id)) {
          byUserAndMonth.set(entry.user_id, new Map())
        }
        const existing = byUserAndMonth.get(entry.user_id)!.get(monthOfYear) || 0
        byUserAndMonth.get(entry.user_id)!.set(monthOfYear, existing + entry.steps)
      })

      // Build chart data
      const cumulativeSums = new Map<string, number>()
      stepsLeaderboard.forEach((user) => cumulativeSums.set(user.userId, 0))

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const data: Record<string, number | string>[] = []

      for (let month = 0; month <= currentMonth; month++) {
        const point: Record<string, number | string> = { month: monthNames[month] }

        stepsLeaderboard.forEach((user) => {
          const userMonths = byUserAndMonth.get(user.userId)
          const monthlyValue = userMonths?.get(month) || 0
          const prevSum = cumulativeSums.get(user.userId) || 0
          const newSum = prevSum + monthlyValue
          cumulativeSums.set(user.userId, newSum)
          point[user.displayName] = newSum
        })

        data.push(point)
      }

      return data
    }
  }, [leaderboardUsers, entries, stepsLeaderboard, currentDayOfMonth, currentMonth, viewMode])

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
            {viewMode === 'monthly' ? 'Monthly' : 'Yearly'} rankings for opted-in participants
          </p>
        </div>
        <div className="flex items-center gap-4">
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
                {viewMode === 'monthly' ? 'Monthly' : 'Yearly'} Drinks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {drinksLeaderboard.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  No participants yet this {viewMode === 'monthly' ? 'month' : 'year'}
                </p>
              ) : (
                <div className="space-y-2">
                  {drinksLeaderboard.map((entry, index) => (
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
                      <span className="font-bold text-gray-900">{entry.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cumulative Drinks Chart */}
          {drinksChartData.length > 0 && (
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
                        dataKey={viewMode === 'monthly' ? 'day' : 'month'}
                        tick={{ fontSize: 10 }}
                        stroke="#9ca3af"
                        tickFormatter={viewMode === 'monthly'
                          ? (day) => day === 1 || day % 5 === 0 ? String(day) : ''
                          : undefined
                        }
                      />
                      <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" width={35} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        labelFormatter={(label) => viewMode === 'monthly' ? `Day ${label}` : label}
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
        </div>

        {/* Steps Leaderboard */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Footprints className="h-5 w-5 text-blue-500" />
                Average Daily Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stepsLeaderboard.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  No participants yet this {viewMode === 'monthly' ? 'month' : 'year'}
                </p>
              ) : (
                <div className="space-y-2">
                  {stepsLeaderboard.map((entry, index) => (
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
                        {entry.value.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cumulative Steps Chart */}
          {stepsChartData.length > 0 && (
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
                        dataKey={viewMode === 'monthly' ? 'day' : 'month'}
                        tick={{ fontSize: 10 }}
                        stroke="#9ca3af"
                        tickFormatter={viewMode === 'monthly'
                          ? (day) => day === 1 || day % 5 === 0 ? String(day) : ''
                          : undefined
                        }
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
                        labelFormatter={(label) => viewMode === 'monthly' ? `Day ${label}` : label}
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
        </div>
      </div>
    </div>
  )
}
