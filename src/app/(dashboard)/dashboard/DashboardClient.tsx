'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { subDays, startOfYear } from 'date-fns'
import { useEntries } from '@/lib/hooks/useEntries'
import { useStats } from '@/lib/hooks/useStats'
import { formatDateForInput, getAvailableYears, getAvailableMonths, getEarliestDate } from '@/lib/utils/dates'
import { createClient } from '@/lib/supabase/client'
import { DateRangePicker } from '@/components/layout/DateRangePicker'
import { UserSelector } from '@/components/layout/UserSelector'
import { SummaryCards } from '@/components/dashboard/SummaryCards'
import { DashboardGrid } from '@/components/dashboard/DashboardGrid'
import { DashboardCustomizer, getWidgetConfig } from '@/components/dashboard/DashboardCustomizer'
import type { DashboardWidgetConfig, GridLayouts } from '@/components/dashboard/DashboardCustomizer'
import type { Profile } from '@/types/database'
import { Loader2, Sparkles, Plus } from 'lucide-react'
import Link from 'next/link'
import { useDashboardControls } from '@/lib/context/DashboardControlsContext'
import { YearWrapped, WrappedPeriod } from '@/components/dashboard/YearWrapped'
import { getYear, getMonth, getQuarter, subMonths, subQuarters, parseISO } from 'date-fns'

interface WrappedConfig {
  show: boolean
  period: WrappedPeriod
  year?: number
  month?: number
  quarter?: number
}

interface DashboardClientProps {
  currentUser: Profile
  users: { id: string; display_name: string }[]
}

export function DashboardClient({ currentUser, users }: DashboardClientProps) {
  const [selectedUserId, setSelectedUserId] = useState(currentUser.id)
  const [dateRange, setDateRange] = useState({
    start: startOfYear(new Date()),
    end: subDays(new Date(), 1),
  })
  const [widgetConfig, setWidgetConfig] = useState<DashboardWidgetConfig>(() =>
    getWidgetConfig(currentUser)
  )
  const [showWrappedPicker, setShowWrappedPicker] = useState(false)
  const [wrappedConfig, setWrappedConfig] = useState<WrappedConfig>({ show: false, period: 'year' })
  const [pickerPeriodType, setPickerPeriodType] = useState<WrappedPeriod>('year')
  const [mobilePortalContainer, setMobilePortalContainer] = useState<HTMLElement | null>(null)
  const { controlsCollapsed } = useDashboardControls()

  // Find the mobile portal container in the header
  useEffect(() => {
    const container = document.getElementById('mobile-dashboard-controls')
    setMobilePortalContainer(container)
  }, [])

  // Helper to launch wrapped with specific config
  const launchWrapped = (period: WrappedPeriod, year?: number, month?: number, quarter?: number) => {
    setWrappedConfig({ show: true, period, year, month, quarter })
    setShowWrappedPicker(false)
  }

  const { data: entries, isLoading } = useEntries({
    userId: selectedUserId,
    startDate: formatDateForInput(dateRange.start),
    endDate: formatDateForInput(dateRange.end),
  })

  // Fetch all entries for EventsTracker (Days Since widget should always use all-time data)
  const { data: allEntries } = useEntries({
    userId: selectedUserId,
    // No date filters - get all entries
  })

  const stats = useStats(entries)
  const selectedUser = users.find((u) => u.id === selectedUserId)

  // Compute available years, months, and earliest date from all entries
  const { availableYears, availableMonths, earliestDate } = useMemo(() => {
    if (!allEntries || allEntries.length === 0) {
      return { availableYears: [], availableMonths: [], earliestDate: null }
    }
    const entryDates = allEntries.map(e => e.entry_date)
    return {
      availableYears: getAvailableYears(entryDates),
      availableMonths: getAvailableMonths(entryDates),
      earliestDate: getEarliestDate(entryDates),
    }
  }, [allEntries])

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

  // Dashboard controls element - rendered in header on mobile, inline on desktop
  const dashboardControls = !controlsCollapsed && (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
      {users.length > 1 && currentUser.is_admin && (
        <UserSelector
          users={users}
          selectedUserId={selectedUserId}
          onUserChange={setSelectedUserId}
          className="w-24 sm:w-28 h-9"
        />
      )}
      <Link
        href="/entry"
        className="inline-flex items-center justify-center h-9 w-9 sm:w-auto sm:px-3 text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 rounded-md transition-colors"
        title="Log entry"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline ml-1.5">Log</span>
      </Link>
      <DateRangePicker
        startDate={dateRange.start}
        endDate={dateRange.end}
        onRangeChange={(start, end) => setDateRange({ start, end })}
        availableYears={availableYears}
        availableMonths={availableMonths}
        earliestDate={earliestDate}
      />
      <DashboardCustomizer
        profile={currentUser}
        config={widgetConfig}
        onConfigChange={setWidgetConfig}
      />
      <button
        onClick={() => setShowWrappedPicker(true)}
        className="inline-flex items-center justify-center h-9 w-9 sm:w-auto sm:px-3 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 rounded-md hover:from-purple-600 hover:to-pink-600 transition-all shadow-sm"
        title="View your wrapped"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline ml-1.5">Wrapped</span>
      </button>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Mobile: render controls in header via portal */}
      {mobilePortalContainer && dashboardControls && createPortal(
        dashboardControls,
        mobilePortalContainer
      )}

      {/* Desktop: render controls inline (hidden on mobile since they're in header) */}
      <div className="hidden md:block">
        {dashboardControls}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards - collapsible */}
          {!controlsCollapsed && (
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
          )}

          {/* Draggable Widget Grid */}
          <DashboardGrid
            entries={entries || []}
            allEntries={allEntries || []}
            dateRange={dateRange}
            config={widgetConfig}
            profile={currentUser}
            onLayoutChange={handleLayoutChange}
            locked={widgetConfig.gridLocked}
          />
        </>
      )}

      {/* Wrapped Period Picker Modal */}
      {showWrappedPicker && (() => {
        // Generate available periods from entries
        const entryDates = (allEntries || []).map(e => parseISO(e.entry_date))
        const years = [...new Set(entryDates.map(d => getYear(d)))].sort((a, b) => b - a)
        const quarters = [...new Set(entryDates.map(d => `${getYear(d)}-Q${getQuarter(d)}`))]
          .sort((a, b) => b.localeCompare(a))
          .slice(0, 12) // Last 12 quarters
        const months = [...new Set(entryDates.map(d => `${getYear(d)}-${String(getMonth(d)).padStart(2, '0')}`))]
          .sort((a, b) => b.localeCompare(a))
          .slice(0, 18) // Last 18 months

        return (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-sm w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                View Wrapped
              </h2>

              {/* Period type tabs */}
              <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {(['year', 'quarter', 'month'] as WrappedPeriod[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setPickerPeriodType(type)}
                    className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                      pickerPeriodType === type
                        ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {type === 'year' ? '📅 Year' : type === 'quarter' ? '📊 Quarter' : '📆 Month'}
                  </button>
                ))}
              </div>

              {/* Period options */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {pickerPeriodType === 'year' && years.map((yr) => (
                  <button
                    key={yr}
                    onClick={() => launchWrapped('year', yr)}
                    className="w-full p-3 text-left rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-all"
                  >
                    {yr} Year in Review
                  </button>
                ))}

                {pickerPeriodType === 'quarter' && quarters.map((q) => {
                  const [yr, qNum] = q.split('-Q')
                  return (
                    <button
                      key={q}
                      onClick={() => launchWrapped('quarter', parseInt(yr), undefined, parseInt(qNum))}
                      className="w-full p-3 text-left rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-all"
                    >
                      Q{qNum} {yr}
                    </button>
                  )
                })}

                {pickerPeriodType === 'month' && months.map((m) => {
                  const [yr, mon] = m.split('-').map(Number)
                  const date = new Date(yr, mon, 1)
                  return (
                    <button
                      key={m}
                      onClick={() => launchWrapped('month', yr, mon)}
                      className="w-full p-3 text-left rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-700 dark:hover:text-purple-300 transition-all"
                    >
                      {new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date)}
                    </button>
                  )
                })}

                {((pickerPeriodType === 'year' && years.length === 0) ||
                  (pickerPeriodType === 'quarter' && quarters.length === 0) ||
                  (pickerPeriodType === 'month' && months.length === 0)) && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No data available for this period type
                  </p>
                )}
              </div>

              <button
                onClick={() => setShowWrappedPicker(false)}
                className="w-full mt-4 p-2 text-gray-500 dark:text-gray-400 text-sm hover:text-gray-700 dark:hover:text-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )
      })()}

      {/* Wrapped Modal */}
      {wrappedConfig.show && (
        <YearWrapped
          entries={allEntries || []}
          profile={currentUser}
          period={wrappedConfig.period}
          year={wrappedConfig.year}
          month={wrappedConfig.month}
          quarter={wrappedConfig.quarter}
          onClose={() => setWrappedConfig({ ...wrappedConfig, show: false })}
        />
      )}
    </div>
  )
}
