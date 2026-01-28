'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import type { Profile, DailyEntryWithRelations } from '@/types/database'
import { calculateTotalDrinks } from '@/lib/utils/calculations'
import { Trophy, Beer, Footprints, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react'

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

export function LeaderboardsClient({ currentUser }: LeaderboardsClientProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const supabase = createClient()

  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')
  const monthLabel = format(selectedMonth, 'MMMM yyyy')

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

  // Fetch entries for the month for all leaderboard users
  const { data: entries } = useQuery({
    queryKey: ['leaderboard-entries', monthStart, monthEnd],
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
        .gte('entry_date', monthStart)
        .lte('entry_date', monthEnd)

      if (error) throw error
      return data
    },
    enabled: !!leaderboardUsers,
  })

  // Calculate drinks leaderboard
  const drinksLeaderboard: LeaderboardEntry[] = (() => {
    if (!leaderboardUsers || !entries) return []

    const usersWhoshareDrinks = leaderboardUsers.filter((u) => u.share_drinks)
    const drinksByUser = new Map<string, number>()

    entries.forEach((entry) => {
      if (!usersWhoshareDrinks.some((u) => u.id === entry.user_id)) return
      const total = (entry.beers || 0) + (entry.seltzers || 0) + (entry.wine || 0) +
        (entry.liquor || 0) + (entry.shots || 0) * 1.5
      drinksByUser.set(entry.user_id, (drinksByUser.get(entry.user_id) || 0) + total)
    })

    return usersWhoshareDrinks
      .map((user) => ({
        userId: user.id,
        displayName: user.leaderboard_anonymous ? 'Anonymous' : user.display_name,
        value: Math.round((drinksByUser.get(user.id) || 0) * 10) / 10,
        rank: 0,
        isAnonymous: user.leaderboard_anonymous,
        isCurrentUser: user.id === currentUser.id,
      }))
      .sort((a, b) => b.value - a.value)
      .map((entry, index) => ({ ...entry, rank: index + 1 }))
  })()

  // Calculate steps leaderboard
  const stepsLeaderboard: LeaderboardEntry[] = (() => {
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
  })()

  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedMonth((current) =>
      direction === 'prev' ? subMonths(current, 1) : subMonths(current, -1)
    )
  }

  const isCurrentMonth =
    format(selectedMonth, 'yyyy-MM') === format(new Date(), 'yyyy-MM')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leaderboards</h1>
          <p className="text-gray-600">Monthly rankings for opted-in participants</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center font-medium">{monthLabel}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth('next')}
            disabled={isCurrentMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Beer className="h-5 w-5 text-amber-500" />
              Monthly Drinks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {drinksLeaderboard.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                No participants yet this month
              </p>
            ) : (
              <div className="space-y-2">
                {drinksLeaderboard.map((entry) => (
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

        {/* Steps Leaderboard */}
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
                No participants yet this month
              </p>
            ) : (
              <div className="space-y-2">
                {stepsLeaderboard.map((entry) => (
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
      </div>
    </div>
  )
}
