'use client'

import { useState } from 'react'
import { subDays } from 'date-fns'
import { useEntries } from '@/lib/hooks/useEntries'
import { useStats } from '@/lib/hooks/useStats'
import { formatDateForInput } from '@/lib/utils/dates'
import { DateRangePicker } from '@/components/layout/DateRangePicker'
import { UserSelector } from '@/components/layout/UserSelector'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { MoodChart } from '@/components/dashboard/MoodChart'
import { WorkLocationChart } from '@/components/dashboard/WorkLocationChart'
import { HabitsGrid } from '@/components/dashboard/HabitsGrid'
import { AlcoholTracker } from '@/components/dashboard/AlcoholTracker'
import { EventsTracker } from '@/components/dashboard/EventsTracker'
import { MovementChart } from '@/components/dashboard/MovementChart'
import type { Profile } from '@/types/database'
import { Loader2 } from 'lucide-react'

interface DashboardClientProps {
  currentUser: Profile
  users: { id: string; display_name: string }[]
}

export function DashboardClient({ currentUser, users }: DashboardClientProps) {
  const [selectedUserId, setSelectedUserId] = useState(currentUser.id)
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: subDays(new Date(), 1),
  })

  const { data: entries, isLoading } = useEntries({
    userId: selectedUserId,
    startDate: formatDateForInput(dateRange.start),
    endDate: formatDateForInput(dateRange.end),
  })

  const stats = useStats(entries)

  const selectedUser = users.find((u) => u.id === selectedUserId)

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            {selectedUser?.display_name || 'Your'} health metrics and habits
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {users.length > 1 && currentUser.is_admin && (
            <UserSelector
              users={users}
              selectedUserId={selectedUserId}
              onUserChange={setSelectedUserId}
              className="w-full sm:w-48"
            />
          )}
          <DateRangePicker
            startDate={dateRange.start}
            endDate={dateRange.end}
            onRangeChange={(start, end) => setDateRange({ start, end })}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <SummaryCards
            moodAverage={stats.moodStats.average}
            moodTrend={stats.moodStats.trend}
            healthScore={stats.healthScore}
            busyScore={stats.busyScore}
            totalDays={stats.totalDays}
          />

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MoodChart entries={entries || []} />
            <WorkLocationChart entries={entries || []} />
          </div>

          {/* Habits Grid */}
          <HabitsGrid entries={entries || []} showDays={7} />

          {/* Lower Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AlcoholTracker entries={entries || []} />
            <MovementChart entries={entries || []} />
          </div>

          {/* Events Tracker */}
          <EventsTracker entries={entries || []} />
        </>
      )}
    </div>
  )
}
