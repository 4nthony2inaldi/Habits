'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils/cn'
import { format, parseISO, eachDayOfInterval, getMonth, getYear } from 'date-fns'
import type { DailyEntryWithRelations } from '@/types/database'
import { calculateTotalDrinks } from '@/lib/utils/calculations'

interface AlcoholCalendarProps {
  entries: DailyEntryWithRelations[]
  title?: string
  subtitle?: string
}

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function getDrinkColor(drinks: number): string {
  if (drinks === 0) return 'bg-gray-100'
  if (drinks <= 1) return 'bg-purple-100'
  if (drinks <= 2) return 'bg-purple-200'
  if (drinks <= 4) return 'bg-purple-300'
  if (drinks <= 6) return 'bg-purple-400 text-white'
  return 'bg-purple-600 text-white'
}

interface MonthData {
  month: string
  monthShort: string
  monthNum: number
  year: number
  weeks: { days: { date: string; drinks: number; dayOfWeek: number; bestPart: string | null; notes: string | null }[] }[]
  monthTotal: number
}

export function AlcoholCalendar({ entries, title = 'When Drinking', subtitle }: AlcoholCalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(4)

  // Determine number of columns based on container width
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      // Each month needs approximately 200px (7 days * ~28px + gaps)
      if (width < 220) setColumns(1)
      else if (width < 420) setColumns(2)
      else if (width < 620) setColumns(3)
      else setColumns(4)
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const calendarData = useMemo(() => {
    // Create a map of entries by date with full info
    const entriesByDate = new Map<string, { drinks: number; bestPart: string | null; notes: string | null }>()
    entries.forEach((entry) => {
      const drinks = calculateTotalDrinks(entry)
      entriesByDate.set(entry.entry_date, {
        drinks,
        bestPart: entry.best_part || null,
        notes: entry.notes || null,
      })
    })

    if (entries.length === 0) return []

    // Get date range from entries
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
    )
    const startDate = parseISO(sortedEntries[0].entry_date)
    const endDate = parseISO(sortedEntries[sortedEntries.length - 1].entry_date)

    // Group by month
    const months: MonthData[] = []

    let currentMonth = -1
    let currentYear = -1
    let currentWeeks: { days: { date: string; drinks: number; dayOfWeek: number; bestPart: string | null; notes: string | null }[] }[] = []
    let currentWeek: { date: string; drinks: number; dayOfWeek: number; bestPart: string | null; notes: string | null }[] = []
    let monthTotal = 0

    const allDays = eachDayOfInterval({ start: startDate, end: endDate })

    allDays.forEach((day) => {
      const month = getMonth(day)
      const year = getYear(day)
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayOfWeek = day.getDay()
      const entryData = entriesByDate.get(dateStr)
      const drinks = entryData?.drinks ?? -1
      const bestPart = entryData?.bestPart ?? null
      const notes = entryData?.notes ?? null

      // New month
      if (month !== currentMonth || year !== currentYear) {
        if (currentWeek.length > 0) {
          currentWeeks.push({ days: currentWeek })
        }
        if (currentWeeks.length > 0) {
          months.push({
            month: MONTHS[currentMonth],
            monthShort: MONTHS_SHORT[currentMonth],
            monthNum: currentMonth,
            year: currentYear,
            weeks: currentWeeks,
            monthTotal,
          })
        }
        currentMonth = month
        currentYear = year
        currentWeeks = []
        currentWeek = []
        monthTotal = 0
      }

      // New week (Sunday)
      if (dayOfWeek === 0 && currentWeek.length > 0) {
        currentWeeks.push({ days: currentWeek })
        currentWeek = []
      }

      if (drinks > 0) monthTotal += drinks
      currentWeek.push({ date: dateStr, drinks, dayOfWeek, bestPart, notes })
    })

    // Push remaining data
    if (currentWeek.length > 0) {
      currentWeeks.push({ days: currentWeek })
    }
    if (currentWeeks.length > 0) {
      months.push({
        month: MONTHS[currentMonth],
        monthShort: MONTHS_SHORT[currentMonth],
        monthNum: currentMonth,
        year: currentYear,
        weeks: currentWeeks,
        monthTotal,
      })
    }

    return months.reverse() // Most recent first
  }, [entries])

  if (entries.length === 0) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No data available for this period
        </div>
      </div>
    )
  }

  // Render a single month with compact header
  const renderMonth = (monthData: MonthData) => (
    <div key={`${monthData.month}-${monthData.year}`} className="flex-shrink-0">
      {/* Compact month header - all on one row */}
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-sm font-semibold text-gray-800">
          {columns <= 2 ? monthData.monthShort : monthData.month}
        </span>
        <span className="text-xs text-gray-500">{monthData.year}</span>
        <span className="text-xs text-gray-400 ml-auto">{Math.round(monthData.monthTotal)}</span>
      </div>

      {/* Day headers */}
      <div className="flex gap-1 mb-1">
        {DAYS.map((day, i) => (
          <div key={i} className="w-6 h-5 text-center text-[10px] text-gray-400">
            {day}
          </div>
        ))}
      </div>

      {/* Weeks */}
      <div className="space-y-1">
        {monthData.weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="flex gap-1">
            {/* Pad beginning of week */}
            {week.days[0] && week.days[0].dayOfWeek > 0 &&
              Array.from({ length: week.days[0].dayOfWeek }).map((_, i) => (
                <div key={`pad-${i}`} className="w-6 h-6" />
              ))
            }

            {week.days.map((day) => {
              const tooltipLines = [format(parseISO(day.date), 'MMM d, yyyy')]
              if (day.drinks >= 0) tooltipLines.push(`${day.drinks} drinks`)
              else tooltipLines.push('No entry')
              if (day.bestPart) tooltipLines.push(`"${day.bestPart}"`)
              if (day.notes) tooltipLines.push(`Notes: ${day.notes}`)

              return (
                <div
                  key={day.date}
                  className={cn(
                    'w-6 h-6 rounded text-[9px] flex items-center justify-center font-medium cursor-default',
                    day.drinks < 0 ? 'bg-gray-50 text-gray-300' : getDrinkColor(day.drinks)
                  )}
                  title={tooltipLines.join('\n')}
                >
                  {day.drinks > 0 ? Math.round(day.drinks) : ''}
                </div>
              )
            })}

            {/* Pad end of week */}
            {week.days[week.days.length - 1] && week.days[week.days.length - 1].dayOfWeek < 6 &&
              Array.from({ length: 6 - week.days[week.days.length - 1].dayOfWeek }).map((_, i) => (
                <div key={`pad-end-${i}`} className="w-6 h-6" />
              ))
            }
          </div>
        ))}
      </div>
    </div>
  )

  // Dynamic grid classes based on column count
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns] || 'grid-cols-4'

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>

      {/* Responsive grid - fills available space */}
      <div ref={containerRef} className="flex-1 min-h-0 overflow-auto scrollbar-hidden">
        <div className={cn('grid gap-4 auto-rows-min', gridClass)}>
          {calendarData.slice(0, columns * 3).map(renderMonth)}
        </div>
      </div>
    </div>
  )
}
