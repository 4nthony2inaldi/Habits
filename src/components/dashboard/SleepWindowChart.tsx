'use client'

import { useMemo, useState } from 'react'
import { format, parseISO, subDays, getMonth } from 'date-fns'
import type { DailyEntryWithRelations } from '@/types/database'
import { Moon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SleepWindowChartProps {
  entries: DailyEntryWithRelations[]
  allEntries: DailyEntryWithRelations[]
  title?: string
  subtitle?: string
}

type ViewMode = '7day' | 'monthly'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Convert HH:MM:SS time to minutes since 6PM (our chart start)
// Returns a value where 0 = 6PM, 360 = midnight, 720 = 6AM, 1080 = noon
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  // Convert to minutes since midnight
  const totalMinutes = hours * 60 + minutes
  // Shift so 6PM (18:00) is 0
  // Times from 6PM-midnight: 18:00 -> 0, 23:59 -> 359
  // Times from midnight-6PM next day: 00:00 -> 360, 12:00 -> 1080
  if (totalMinutes >= 18 * 60) {
    // 6PM or later same day
    return totalMinutes - 18 * 60
  } else {
    // Before 6PM = next day
    return totalMinutes + 6 * 60
  }
}

// Total chart span: 6PM to 2PM next day = 20 hours
const CHART_START = 0 // 6PM
const CHART_END = 20 * 60 // 2PM next day (20 hours from 6PM)

// Format minutes back to time string for display
function minutesToTimeLabel(minutes: number): string {
  // Convert back from our shifted scale
  const actualMinutes = (minutes + 18 * 60) % (24 * 60)
  const hours = Math.floor(actualMinutes / 60)
  const mins = Math.round(actualMinutes % 60)
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  if (mins === 0) {
    return `${displayHours}${ampm}`
  }
  return `${displayHours}:${mins.toString().padStart(2, '0')}${ampm}`
}

interface SleepBar {
  start: number // minutes from 6PM
  end: number // minutes from 6PM
  date: string
}

export function SleepWindowChart({
  entries,
  allEntries,
  title = 'Sleep Window',
  subtitle,
}: SleepWindowChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('7day')

  // Process data for 7-day view
  const sevenDayData = useMemo(() => {
    const today = new Date()
    const days: { label: string; date: string; bar: SleepBar | null }[] = []

    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i)
      const dateStr = format(date, 'yyyy-MM-dd')
      const entry = entries.find(e => e.entry_date === dateStr)

      let bar: SleepBar | null = null
      if (entry?.sleep_start && entry?.sleep_end) {
        bar = {
          start: timeToMinutes(entry.sleep_start),
          end: timeToMinutes(entry.sleep_end),
          date: dateStr,
        }
      }

      days.push({
        label: format(date, 'EEE'),
        date: dateStr,
        bar,
      })
    }

    return days
  }, [entries])

  // Process data for monthly view (12 months, each with overlaid days)
  const monthlyData = useMemo(() => {
    const currentYear = new Date().getFullYear()

    // Group entries by month
    const monthBars: SleepBar[][] = Array.from({ length: 12 }, () => [])

    allEntries.forEach(entry => {
      if (!entry.sleep_start || !entry.sleep_end) return

      const entryDate = parseISO(entry.entry_date)
      const entryYear = entryDate.getFullYear()

      // Only include current year
      if (entryYear !== currentYear) return

      const month = getMonth(entryDate)
      monthBars[month].push({
        start: timeToMinutes(entry.sleep_start),
        end: timeToMinutes(entry.sleep_end),
        date: entry.entry_date,
      })
    })

    return monthBars.map((bars, index) => ({
      label: MONTH_LABELS[index],
      bars,
    }))
  }, [allEntries])

  // Calculate average sleep times for reference lines
  const averages = useMemo(() => {
    let totalStart = 0
    let totalEnd = 0
    let count = 0

    if (viewMode === '7day') {
      sevenDayData.forEach(day => {
        if (day.bar) {
          totalStart += day.bar.start
          totalEnd += day.bar.end
          count++
        }
      })
    } else {
      monthlyData.forEach(month => {
        month.bars.forEach(bar => {
          totalStart += bar.start
          totalEnd += bar.end
          count++
        })
      })
    }

    if (count === 0) return null

    return {
      avgStart: totalStart / count,
      avgEnd: totalEnd / count,
    }
  }, [viewMode, sevenDayData, monthlyData])

  // Convert minutes to percentage position on chart
  const toPercent = (minutes: number) => {
    return ((minutes - CHART_START) / (CHART_END - CHART_START)) * 100
  }

  const hasData = viewMode === '7day'
    ? sevenDayData.some(d => d.bar !== null)
    : monthlyData.some(m => m.bars.length > 0)

  if (!hasData) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Moon className="h-5 w-5 text-indigo-400" />
            {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No sleep data available
        </div>
      </div>
    )
  }

  const rows = viewMode === '7day' ? sevenDayData : monthlyData

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header with view toggle */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Moon className="h-5 w-5 text-indigo-400" />
            {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex rounded-md border border-gray-200 overflow-hidden">
          <button
            onClick={() => setViewMode('7day')}
            className={cn(
              'px-2 py-1 text-xs font-medium transition-colors',
              viewMode === '7day'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            )}
          >
            7 Day
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={cn(
              'px-2 py-1 text-xs font-medium transition-colors border-l border-gray-200',
              viewMode === 'monthly'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            )}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Main chart with labels and bars */}
        <div className="flex-1 min-h-0 flex">
          {/* Y-axis labels */}
          <div className="w-8 flex flex-col justify-between py-1 flex-shrink-0">
            {rows.map((row, index) => (
              <div key={index} className="flex items-center justify-end pr-2 text-xs text-gray-500" style={{ height: `${100 / rows.length}%` }}>
                {row.label}
              </div>
            ))}
          </div>

          {/* Chart area with bars */}
          <div className="flex-1 relative">
            {/* Reference lines */}
            {averages && (
              <>
                <div
                  className="absolute top-0 bottom-0 w-px border-l border-dashed border-gray-400 z-10"
                  style={{ left: `${toPercent(averages.avgStart)}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-px border-l border-dashed border-gray-400 z-10"
                  style={{ left: `${toPercent(averages.avgEnd)}%` }}
                />
              </>
            )}

            {/* Rows */}
            <div className="h-full flex flex-col justify-between py-1">
              {viewMode === '7day' ? (
                // 7-day view: one row per day
                sevenDayData.map((day) => (
                  <div key={day.date} className="relative bg-slate-700/60 rounded-sm mx-0.5" style={{ height: `${Math.max(100 / 7 - 2, 8)}%` }}>
                    {day.bar && (
                      <div
                        className="absolute top-0.5 bottom-0.5 rounded-sm"
                        style={{
                          left: `${toPercent(day.bar.start)}%`,
                          width: `${toPercent(day.bar.end) - toPercent(day.bar.start)}%`,
                          backgroundColor: 'rgba(253, 245, 230, 0.85)',
                        }}
                      />
                    )}
                  </div>
                ))
              ) : (
                // Monthly view: one row per month with overlaid bars
                monthlyData.map((month) => (
                  <div key={month.label} className="relative bg-slate-700/60 rounded-sm mx-0.5" style={{ height: `${Math.max(100 / 12 - 1, 6)}%` }}>
                    {month.bars.map((bar) => (
                      <div
                        key={bar.date}
                        className="absolute top-0.5 bottom-0.5 rounded-sm"
                        style={{
                          left: `${toPercent(bar.start)}%`,
                          width: `${toPercent(bar.end) - toPercent(bar.start)}%`,
                          backgroundColor: 'rgba(253, 245, 230, 0.12)',
                        }}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* X-axis labels */}
        <div className="flex mt-1 pt-1">
          <div className="w-8 flex-shrink-0" />
          <div className="flex-1 relative h-4">
            {/* Start label */}
            <span className="absolute left-0 text-xs text-gray-500">
              {minutesToTimeLabel(CHART_START)}
            </span>
            {/* Average time labels */}
            {averages && (
              <>
                <span
                  className="absolute text-xs text-gray-600 font-medium -translate-x-1/2"
                  style={{ left: `${toPercent(averages.avgStart)}%` }}
                >
                  {minutesToTimeLabel(averages.avgStart)}
                </span>
                <span
                  className="absolute text-xs text-gray-600 font-medium -translate-x-1/2"
                  style={{ left: `${toPercent(averages.avgEnd)}%` }}
                >
                  {minutesToTimeLabel(averages.avgEnd)}
                </span>
              </>
            )}
            {/* End label */}
            <span className="absolute right-0 text-xs text-gray-500">
              {minutesToTimeLabel(CHART_END)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
