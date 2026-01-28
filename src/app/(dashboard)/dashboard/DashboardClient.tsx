'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { subDays } from 'date-fns'
import { ResponsiveGridLayout, type Layout, type LayoutItem, type ResponsiveLayouts } from 'react-grid-layout'
import { useEntries } from '@/lib/hooks/useEntries'
import { useStats } from '@/lib/hooks/useStats'
import { useWidgetLayout } from '@/lib/hooks/useWidgetLayout'
import { formatDateForInput } from '@/lib/utils/dates'
import { DateRangePicker } from '@/components/layout/DateRangePicker'
import { UserSelector } from '@/components/layout/UserSelector'
import { MoodChart } from '@/components/dashboard/MoodChart'
import { WorkLocationChart } from '@/components/dashboard/WorkLocationChart'
import { HabitsGrid } from '@/components/dashboard/HabitsGrid'
import { AlcoholTracker } from '@/components/dashboard/AlcoholTracker'
import { EventsTracker } from '@/components/dashboard/EventsTracker'
import { MovementChart } from '@/components/dashboard/MovementChart'
import {
  MoodScoreWidget,
  HealthScoreWidget,
  BusyScoreWidget,
  WidgetWrapper,
  AddWidgetPanel,
} from '@/components/dashboard/widgets'
import { Button } from '@/components/ui/button'
import type { Profile } from '@/types/database'
import type { WidgetType } from '@/lib/widgets/config'
import { GRID_COLS, GRID_ROW_HEIGHT, GRID_MARGIN } from '@/lib/widgets/config'
import { Loader2, Settings, X, RotateCcw } from 'lucide-react'

import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

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
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const { data: entries, isLoading } = useEntries({
    userId: selectedUserId,
    startDate: formatDateForInput(dateRange.start),
    endDate: formatDateForInput(dateRange.end),
  })

  const stats = useStats(entries)

  const {
    layout,
    isEditMode,
    isLoaded,
    setIsEditMode,
    updateLayout,
    addWidget,
    removeWidget,
    resetLayout,
    getAvailableWidgets,
  } = useWidgetLayout()

  const selectedUser = users.find((u) => u.id === selectedUserId)

  const handleLayoutChange = useCallback(
    (currentLayout: Layout, allLayouts: ResponsiveLayouts) => {
      if (isEditMode && allLayouts.lg) {
        updateLayout([...allLayouts.lg])
      }
    },
    [isEditMode, updateLayout]
  )

  const renderWidget = useCallback(
    (widgetId: WidgetType) => {
      switch (widgetId) {
        case 'mood-score':
          return (
            <MoodScoreWidget
              moodAverage={stats.moodStats.average}
              moodTrend={stats.moodStats.trend}
            />
          )
        case 'health-score':
          return <HealthScoreWidget healthScore={stats.healthScore} />
        case 'busy-score':
          return <BusyScoreWidget busyScore={stats.busyScore} />
        case 'mood-chart':
          return <MoodChart entries={entries || []} />
        case 'work-location':
          return <WorkLocationChart entries={entries || []} />
        case 'habits-grid':
          return <HabitsGrid entries={entries || []} showDays={7} />
        case 'alcohol-tracker':
          return <AlcoholTracker entries={entries || []} />
        case 'movement-chart':
          return <MovementChart entries={entries || []} />
        case 'events-tracker':
          return <EventsTracker entries={entries || []} />
        default:
          return null
      }
    },
    [entries, stats]
  )

  const layouts = useMemo(
    () => ({
      lg: layout,
      md: layout.map((l) => ({ ...l, w: Math.min(l.w, 4), x: l.x % 4 })),
      sm: layout.map((l) => ({ ...l, w: Math.min(l.w, 2), x: 0 })),
      xs: layout.map((l) => ({ ...l, w: 1, x: 0 })),
    }),
    [layout]
  )

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
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
        </div>
      </div>

      {/* Widget customization toolbar */}
      <div className="flex items-center justify-between py-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {isEditMode && (
            <>
              <AddWidgetPanel
                availableWidgets={getAvailableWidgets()}
                onAddWidget={addWidget}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={resetLayout}
                className="gap-2 text-gray-600"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </>
          )}
        </div>
        <Button
          variant={isEditMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsEditMode(!isEditMode)}
          className="gap-2"
        >
          {isEditMode ? (
            <>
              <X className="h-4 w-4" />
              Done
            </>
          ) : (
            <>
              <Settings className="h-4 w-4" />
              Customize
            </>
          )}
        </Button>
      </div>

      <div ref={containerRef}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : containerWidth > 0 ? (
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
            cols={{ lg: GRID_COLS, md: 4, sm: 2, xs: 1 }}
            rowHeight={GRID_ROW_HEIGHT}
            margin={GRID_MARGIN}
            width={containerWidth}
            dragConfig={{
              enabled: isEditMode,
              handle: '.drag-handle',
            }}
            resizeConfig={{
              enabled: isEditMode,
              handles: ['se', 'sw', 'ne', 'nw'],
            }}
            onLayoutChange={handleLayoutChange}
          >
            {layout.map((item) => (
              <div key={item.i} className="widget-container">
                <WidgetWrapper
                  widgetId={item.i}
                  isEditMode={isEditMode}
                  onRemove={removeWidget}
                >
                  {renderWidget(item.i)}
                </WidgetWrapper>
              </div>
            ))}
          </ResponsiveGridLayout>
        ) : null}
      </div>
    </div>
  )
}
