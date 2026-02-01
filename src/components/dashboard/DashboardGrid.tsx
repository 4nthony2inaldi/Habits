'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Responsive } from 'react-grid-layout'
import type { DailyEntryWithRelations, Profile } from '@/types/database'
import type { DashboardWidgetConfig, WidgetKey, GridLayouts, GridLayoutItem, WidgetTitleConfig } from './DashboardCustomizer'
import { widgetLabels, defaultGridLayouts, getVisibleWidgets, defaultWidgetTitles } from './DashboardCustomizer'

import { MoodChart } from './MoodChart'
import { WorkLocationChart } from './WorkLocationChart'
import { HabitsGrid } from './HabitsGrid'
import { HabitsScore } from './HabitsScore'
import { AlcoholTracker } from './AlcoholTracker'
import { AlcoholCalendar } from './AlcoholCalendar'
import { AlcoholStats } from './AlcoholStats'
import { AlcoholByType } from './AlcoholByType'
import { YearOverYearDrinks } from './YearOverYearDrinks'
import { YearOverYearSteps } from './YearOverYearSteps'
import { MovementChart } from './MovementChart'
import { EventsTracker } from './EventsTracker'
import { TravelWidget } from './TravelWidget'

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
  allEntries: DailyEntryWithRelations[] // All-time entries for EventsTracker
  dateRange: { start: Date; end: Date }
  config: DashboardWidgetConfig
  profile: Profile
  onLayoutChange: (layouts: GridLayouts) => void
  locked?: boolean
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
        // Always use minW/minH of 1 - ignore any saved constraints
        minW: 1,
        minH: 1,
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
  allEntries,
  dateRange,
  config,
  profile,
  onLayoutChange,
  locked = false,
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

  const getWidgetTitle = (key: WidgetKey): WidgetTitleConfig => {
    return config.widgetTitles?.[key] || defaultWidgetTitles[key]
  }

  const renderWidget = (key: WidgetKey) => {
    const titles = getWidgetTitle(key)
    switch (key) {
      case 'moodChart':
        return <MoodChart entries={entries} title={titles.title} subtitle={titles.subtitle} />
      case 'workLocationChart':
        return <WorkLocationChart entries={entries} title={titles.title} subtitle={titles.subtitle} />
      case 'habitsGrid':
        return (
          <HabitsGrid
            entries={allEntries}
            dateRange={dateRange}
            showDays={7}
            selectedHabits={config.selectedHabits}
            title={titles.title}
            subtitle={titles.subtitle}
          />
        )
      case 'habitsScore':
        return (
          <HabitsScore
            entries={allEntries}
            dateRange={dateRange}
            selectedHabits={config.selectedHabits}
            title={titles.title}
            subtitle={titles.subtitle}
          />
        )
      case 'alcoholTracker':
        return <AlcoholTracker entries={entries} title={titles.title} subtitle={titles.subtitle} />
      case 'alcoholCalendar':
        return <AlcoholCalendar entries={entries} title={titles.title} subtitle={titles.subtitle} />
      case 'alcoholStats':
        return <AlcoholStats entries={allEntries} selectedMetrics={config.selectedAlcoholMetrics} title={titles.title} subtitle={titles.subtitle} />
      case 'alcoholByType':
        return <AlcoholByType entries={entries} title={titles.title} subtitle={titles.subtitle} />
      case 'drinksYearOverYear':
        return <YearOverYearDrinks entries={allEntries} title={titles.title} subtitle={titles.subtitle} />
      case 'stepsYearOverYear':
        return <YearOverYearSteps entries={allEntries} title={titles.title} subtitle={titles.subtitle} />
      case 'movementChart':
        return <MovementChart entries={entries} title={titles.title} subtitle={titles.subtitle} />
      case 'eventsTracker':
        // Use allEntries so "days since" is always calculated from all-time data
        return <EventsTracker entries={allEntries} dateRange={dateRange} selectedEvents={config.selectedEvents} fieldGroupings={profile.field_groupings as import('@/types/forms').FieldGroupings | null} title={titles.title} subtitle={titles.subtitle} />
      case 'travelWidget':
        return <TravelWidget entries={entries} allEntries={allEntries} profile={profile} title={titles.title} subtitle={titles.subtitle} />
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

  // When locked, render a CSS Grid that matches react-grid-layout positioning
  // This completely bypasses the library's touch event handling while preserving layout
  if (locked) {
    // Determine which breakpoint to use based on container width
    const breakpoint = containerWidth >= 1200 ? 'lg' : containerWidth >= 996 ? 'md' : 'sm'
    const cols = 12
    const rowHeight = 60
    const margin = 16

    // Calculate the maximum row needed for the grid
    let maxRow = 0
    visibleWidgets.forEach((key) => {
      const layout = config.gridLayouts[breakpoint][key] || defaultGridLayouts[breakpoint][key]
      const endRow = layout.y + layout.h
      if (endRow > maxRow) maxRow = endRow
    })

    // Calculate column width based on container width
    const totalMarginWidth = margin * (cols + 1)
    const columnWidth = (containerWidth - totalMarginWidth) / cols

    return (
      <div
        ref={containerRef}
        className="relative"
        style={{
          height: maxRow * rowHeight + (maxRow + 1) * margin,
        }}
      >
        {visibleWidgets.map((key) => {
          const layout = config.gridLayouts[breakpoint][key] || defaultGridLayouts[breakpoint][key]

          // Calculate position and size to match react-grid-layout
          const left = margin + layout.x * (columnWidth + margin)
          const top = margin + layout.y * (rowHeight + margin)
          const width = layout.w * columnWidth + (layout.w - 1) * margin
          const height = layout.h * rowHeight + (layout.h - 1) * margin

          return (
            <div
              key={key}
              className="absolute bg-white rounded-lg shadow-sm border border-gray-200"
              style={{
                left,
                top,
                width,
                height,
              }}
            >
              {renderWidget(key)}
            </div>
          )
        })}
      </div>
    )
  }

  // When unlocked, use the full react-grid-layout
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
        isResizable={!locked}
        isDraggable={!locked}
        margin={[16, 16]}
      >
        {visibleWidgets.map((key) => (
          <div key={key} className="bg-white rounded-lg shadow-sm border border-gray-200 relative group">
            {/* Drag handle pill - positioned at top center, appears on hover (hidden when locked) */}
            {!locked && (
              <div className="widget-drag-handle absolute top-1 left-1/2 -translate-x-1/2 z-10 cursor-move px-3 py-1 rounded-full bg-gray-100/80 hover:bg-gray-200/90 transition-all opacity-0 group-hover:opacity-100">
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                  <div className="w-1 h-1 rounded-full bg-gray-400" />
                </div>
              </div>
            )}
            {/* Widget content - fills entire container, no scrolling */}
            <div className="h-full">
              {renderWidget(key)}
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  )
}
