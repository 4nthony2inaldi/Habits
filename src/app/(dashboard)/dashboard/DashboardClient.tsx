'use client'

import { useState, useCallback } from 'react'
import { subDays } from 'date-fns'
import { useEntries } from '@/lib/hooks/useEntries'
import { useStats } from '@/lib/hooks/useStats'
import { formatDateForInput } from '@/lib/utils/dates'
import { createClient } from '@/lib/supabase/client'
import { DateRangePicker } from '@/components/layout/DateRangePicker'
import { UserSelector } from '@/components/layout/UserSelector'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { DashboardGrid } from '@/components/dashboard/DashboardGrid'
import { DashboardCustomizer, getWidgetConfig } from '@/components/dashboard/DashboardCustomizer'
import type { DashboardWidgetConfig, GridLayouts } from '@/components/dashboard/DashboardCustomizer'
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

  // Handle layout changes from drag/resize
  const handleLayoutChange = useCallback(
    async (newLayouts: GridLayouts) => {
      const newConfig = { ...widgetConfig, gridLayouts: newLayouts }
      setWidgetConfig(newConfig)

      // Save to database
      try {
        const supabase = createClient()
        await supabase
          .from('profiles')
          .update({
            custom_metrics: newConfig as unknown as Record<string, unknown>,
          })
          .eq('id', currentUser.id)
      } catch (error) {
        console.error('Failed to save layout:', error)
      }
    },
    [widgetConfig, currentUser.id]
  )

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
          {/* Summary Cards */}
          <SummaryCards
            moodAverage={stats.moodStats.average}
            moodTrend={stats.moodStats.trend}
            healthScore={stats.healthScore}
            busyScore={stats.busyScore}
            totalDays={stats.totalDays}
            showHappy={widgetConfig.kpiVisibility.happyKpi}
            showHealthy={widgetConfig.kpiVisibility.healthyKpi}
            showBusy={widgetConfig.kpiVisibility.busyKpi}
          />

          {/* Draggable Widget Grid */}
          <DashboardGrid
            entries={entries || []}
            config={widgetConfig}
            profile={currentUser}
            onLayoutChange={handleLayoutChange}
          />
        </>
      )}
    </div>
  )
}
