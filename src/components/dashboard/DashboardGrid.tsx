'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Responsive } from 'react-grid-layout'
import type { DailyEntryWithRelations, Profile } from '@/types/database'
import type { DashboardWidgetConfig, WidgetKey, GridLayouts, GridLayoutItem } from './DashboardCustomizer'
import { widgetLabels, defaultGridLayouts, getVisibleWidgets } from './DashboardCustomizer'

import { MoodChart } from './MoodChart'
import { WorkLocationChart } from './WorkLocationChart'
import { HabitsGrid } from './HabitsGrid'
import { AlcoholTracker } from './AlcoholTracker'
import { AlcoholCalendar } from './AlcoholCalendar'
import { AlcoholStats } from './AlcoholStats'
import { AlcoholByType } from './AlcoholByType'
import { MovementChart } from './MovementChart'
import { EventsTracker } from './EventsTracker'

// Type definitions for react-grid-layout
interface Layout {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}

interface Layouts {
  lg?: Layout[]
  md?: Layout[]
  sm?: Layout[]
  [key: string]: Layout[] | undefined
}

// Cast to allow additional props that TypeScript types might be missing
const ResponsiveGridLayout = Responsive as React.ComponentType<{
  className?: string
  layouts?: Layouts
  breakpoints?: Record<string, number>
  cols?: Record<string, number>
  rowHeight?: number
  width: number
  onLayoutChange?: (currentLayout: Layout[], allLayouts: Layouts) => void
  draggableHandle?: string
  resizeHandles?: string[]
  compactType?: 'vertical' | 'horizontal' | null
  preventCollision?: boolean
  isResizable?: boolean
  isDraggable?: boolean
  margin?: [number, number]
  children?: React.ReactNode
}>

interface DashboardGridProps {
  entries: DailyEntryWithRelations[]
  config: DashboardWidgetConfig
  profile: Profile
  onLayoutChange: (layouts: GridLayouts) => void
}

// Convert our GridLayouts format to react-grid-layout Layouts format
function toRGLLayouts(gridLayouts: GridLayouts, visibleWidgets: WidgetKey[]): Layouts {
  const result: Layouts = { lg: [], md: [], sm: [] }

  for (const breakpoint of ['lg', 'md', 'sm'] as const) {
    result[breakpoint] = visibleWidgets.map((key) => {
      const item = gridLayouts[breakpoint][key] || defaultGridLayouts[breakpoint][key]
      return {
        i: key,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: item.minW || 2,
        minH: item.minH || 2,
      }
    })
  }

  return result
}

// Convert react-grid-layout Layouts back to our format
function fromRGLLayouts(layouts: Layouts, currentLayouts: GridLayouts): GridLayouts {
  const result: GridLayouts = { ...currentLayouts }

  for (const breakpoint of ['lg', 'md', 'sm'] as const) {
    if (layouts[breakpoint]) {
      const bpLayout: Record<WidgetKey, GridLayoutItem> = { ...currentLayouts[breakpoint] }
      for (const item of layouts[breakpoint]) {
        const key = item.i as WidgetKey
        bpLayout[key] = {
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          minW: item.minW,
          minH: item.minH,
        }
      }
      result[breakpoint] = bpLayout
    }
  }

  return result
}

export function DashboardGrid({
  entries,
  config,
  profile,
  onLayoutChange,
}: DashboardGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(1200)

  // Measure container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth)
      }
    }

    updateWidth()

    // Use ResizeObserver for responsive width updates
    const resizeObserver = new ResizeObserver(updateWidth)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [])

  const visibleWidgets = useMemo(() => getVisibleWidgets(config), [config])

  const layouts = useMemo(
    () => toRGLLayouts(config.gridLayouts, visibleWidgets),
    [config.gridLayouts, visibleWidgets]
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLayoutChange = useCallback(
    (currentLayout: any, allLayouts: any) => {
      if (allLayouts && typeof allLayouts === 'object') {
        const newGridLayouts = fromRGLLayouts(allLayouts as Layouts, config.gridLayouts)
        onLayoutChange(newGridLayouts)
      }
    },
    [config.gridLayouts, onLayoutChange]
  )

  const renderWidget = (key: WidgetKey) => {
    switch (key) {
      case 'moodChart':
        return <MoodChart entries={entries} />
      case 'workLocationChart':
        return <WorkLocationChart entries={entries} />
      case 'habitsGrid':
        return (
          <HabitsGrid
            entries={entries}
            showDays={7}
            selectedHabits={config.selectedHabits}
          />
        )
      case 'alcoholTracker':
        return <AlcoholTracker entries={entries} />
      case 'alcoholCalendar':
        return <AlcoholCalendar entries={entries} />
      case 'alcoholStats':
        return <AlcoholStats entries={entries} />
      case 'alcoholByType':
        return <AlcoholByType entries={entries} />
      case 'movementChart':
        return <MovementChart entries={entries} />
      case 'eventsTracker':
        return <EventsTracker entries={entries} selectedEvents={config.selectedEvents} />
      default:
        return null
    }
  }

  if (visibleWidgets.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No widgets enabled. Use the Customize button to add widgets.
      </div>
    )
  }

  return (
    <div ref={containerRef}>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 12, sm: 12 }}
        rowHeight={60}
        width={containerWidth}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".widget-drag-handle"
        resizeHandles={['se', 'sw', 'ne', 'nw']}
        compactType="vertical"
        preventCollision={false}
        isResizable={true}
        isDraggable={true}
        margin={[16, 16]}
      >
        {visibleWidgets.map((key) => (
          <div key={key} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Drag handle */}
            <div className="widget-drag-handle h-6 bg-gray-50 border-b border-gray-100 cursor-move flex items-center justify-center hover:bg-gray-100 transition-colors">
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-gray-300" />
                <div className="w-1 h-1 rounded-full bg-gray-300" />
                <div className="w-1 h-1 rounded-full bg-gray-300" />
              </div>
            </div>
            {/* Widget content */}
            <div className="h-[calc(100%-24px)] overflow-auto">
              {renderWidget(key)}
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  )
}
