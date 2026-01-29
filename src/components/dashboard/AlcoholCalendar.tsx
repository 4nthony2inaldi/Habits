'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils/cn'
import { format, parseISO, eachDayOfInterval, getMonth, getYear } from 'date-fns'
import type { DailyEntryWithRelations } from '@/types/database'
import { calculateTotalDrinks } from '@/lib/utils/calculations'

interface AlcoholCalendarProps {
  entries: DailyEntryWithRelations[]
}

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
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
  monthNum: number
  year: number
  weeks: { days: { date: string; drinks: number; dayOfWeek: number }[] }[]
  monthTotal: number
}

export function AlcoholCalendar({ entries }: AlcoholCalendarProps) {
  const calendarData = useMemo(() => {
    // Create a map of entries by date
    const entriesByDate = new Map<string, number>()
    entries.forEach((entry) => {
      const drinks = calculateTotalDrinks(entry)
      entriesByDate.set(entry.entry_date, drinks)
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
    let currentWeeks: { days: { date: string; drinks: number; dayOfWeek: number }[] }[] = []
    let currentWeek: { date: string; drinks: number; dayOfWeek: number }[] = []
    let monthTotal = 0

    const allDays = eachDayOfInterval({ start: startDate, end: endDate })

    allDays.forEach((day) => {
      const month = getMonth(day)
      const year = getYear(day)
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayOfWeek = day.getDay()
      const drinks = entriesByDate.get(dateStr) ?? -1

      // New month
      if (month !== currentMonth || year !== currentYear) {
        if (currentWeek.length > 0) {
          currentWeeks.push({ days: currentWeek })
        }
        if (currentWeeks.length > 0) {
          months.push({
            month: MONTHS[currentMonth],
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
      currentWeek.push({ date: dateStr, drinks, dayOfWeek })
    })

    // Push remaining data
    if (currentWeek.length > 0) {
      currentWeeks.push({ days: currentWeek })
    }
    if (currentWeeks.length > 0) {
      months.push({
        month: MONTHS[currentMonth],
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
        <h3 className="text-lg font-semibold text-gray-900 mb-3">When Drinking</h3>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No data available for this period
        </div>
      </div>
    )
  }

  // Render a single month
  const renderMonth = (monthData: MonthData) => (
    <div key={`${monthData.month}-${monthData.year}`} className="flex-shrink-0">
      {/* Month header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {monthData.month} {monthData.year}
        </span>
        <span className="text-xs text-gray-500">
          {Math.round(monthData.monthTotal)} drinks
        </span>
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

            {week.days.map((day) => (
              <div
                key={day.date}
                className={cn(
                  'w-6 h-6 rounded text-[9px] flex items-center justify-center font-medium',
                  day.drinks < 0 ? 'bg-gray-50 text-gray-300' : getDrinkColor(day.drinks)
                )}
                title={`${day.date}: ${day.drinks < 0 ? 'No entry' : day.drinks + ' drinks'}`}
              >
                {day.drinks > 0 ? Math.round(day.drinks) : ''}
              </div>
            ))}

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

  return (
    <div className="h-full flex flex-col p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">When Drinking</h3>

      {/* Responsive grid - fills available space */}
      <div className="flex-1 min-h-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min">
          {calendarData.map(renderMonth)}
        </div>
      </div>

      {/* Legend - compact */}
      <div className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t">
        <span className="text-xs text-gray-500">Less</span>
        <div className="w-3 h-3 rounded bg-gray-100" />
        <div className="w-3 h-3 rounded bg-purple-100" />
        <div className="w-3 h-3 rounded bg-purple-200" />
        <div className="w-3 h-3 rounded bg-purple-300" />
        <div className="w-3 h-3 rounded bg-purple-400" />
        <div className="w-3 h-3 rounded bg-purple-600" />
        <span className="text-xs text-gray-500">More</span>
      </div>
    </div>
  )
}
