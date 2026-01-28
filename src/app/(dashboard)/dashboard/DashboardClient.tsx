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
import { DashboardCustomizer, getWidgetConfig, getOrderedVisibleWidgets } from '@/components/dashboard/DashboardCustomizer'
import type { DashboardWidgetConfig, WidgetKey } from '@/components/dashboard/DashboardCustomizer'
import type { Profile, DailyEntryWithRelations } from '@/types/database'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface DashboardClientProps {
  currentUser: Profile
  users: { id: string; display_name: string }[]
}

// Widget component mapping
const widgetComponents: Record<WidgetKey, React.ComponentType<{ entries: DailyEntryWithRelations[] }>> = {
  moodChart: MoodChart,
  workLocationChart: WorkLocationChart,
  habitsGrid: ({ entries }) => <HabitsGrid entries={entries} showDays={7} />,
  alcoholTracker: AlcoholTracker,
  movementChart: MovementChart,
  eventsTracker: EventsTracker,
}

export function DashboardClient({ currentUser, users }: DashboardClientProps) {
  const [selectedUserId, setSelectedUserId] = useState(currentUser.id)
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: subDays(new Date(), 1),
  })
  const [widgetConfig, setWidgetConfig] = useState<DashboardWidgetConfig>(() =>
    getWidgetConfig(currentUser)
  )

  const { data: entries, isLoading } = useEntries({
    userId: selectedUserId,
    startDate: formatDateForInput(dateRange.start),
    endDate: formatDateForInput(dateRange.end),
  })

  const stats = useStats(entries)
  const selectedUser = users.find((u) => u.id === selectedUserId)

  // Get ordered visible widgets
  const orderedWidgets = getOrderedVisibleWidgets(widgetConfig)

  // Render widget with proper sizing
  const renderWidget = (key: WidgetKey) => {
    const Component = widgetComponents[key]
    const settings = widgetConfig[key]

    return (
      <div
        key={key}
        className={cn(
          settings.size === 'full' ? 'lg:col-span-2' : 'lg:col-span-1',
          'col-span-1'
        )}
      >
        <Component entries={entries || []} />
      </div>
    )
  }

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
          <DashboardCustomizer
            profile={currentUser}
            config={widgetConfig}
            onConfigChange={setWidgetConfig}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards - always shown */}
          <SummaryCards
            moodAverage={stats.moodStats.average}
            moodTrend={stats.moodStats.trend}
            healthScore={stats.healthScore}
            busyScore={stats.busyScore}
            totalDays={stats.totalDays}
          />

          {/* Dynamic Widget Grid */}
          {orderedWidgets.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {orderedWidgets.map(renderWidget)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
