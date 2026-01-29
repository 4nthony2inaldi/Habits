'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, subMonths, getMonth, getYear } from 'date-fns'
import type { DailyEntryWithRelations } from '@/types/database'
import { calculateTotalDrinks } from '@/lib/utils/calculations'

interface AlcoholCalendarProps {
  entries: DailyEntryWithRelations[]
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getDrinkColor(drinks: number): string {
  if (drinks === 0) return 'bg-gray-100'
  if (drinks <= 1) return 'bg-purple-100'
  if (drinks <= 2) return 'bg-purple-200'
  if (drinks <= 4) return 'bg-purple-300'
  if (drinks <= 6) return 'bg-purple-400 text-white'
  return 'bg-purple-600 text-white'
}

function getDrinkColorHex(drinks: number): string {
  if (drinks === 0) return '#f3f4f6'
  if (drinks <= 1) return '#f3e8ff'
  if (drinks <= 2) return '#e9d5ff'
  if (drinks <= 4) return '#d8b4fe'
  if (drinks <= 6) return '#a78bfa'
  return '#7c3aed'
}

export function AlcoholCalendar({ entries }: AlcoholCalendarProps) {
  const calendarData = useMemo(() => {
    // Create a map of entries by date
    const entriesByDate = new Map<string, number>()
    entries.forEach((entry) => {
      const drinks = calculateTotalDrinks(entry)
      entriesByDate.set(entry.entry_date, drinks)
    })

    // Group by month and week
    if (entries.length === 0) return []

    // Get date range from entries
    const sortedEntries = [...entries].sort(
      (a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
    )
    const startDate = parseISO(sortedEntries[0].entry_date)
    const endDate = parseISO(sortedEntries[sortedEntries.length - 1].entry_date)

    // Group by month
    const months: {
      month: string
      year: number
      weeks: { days: { date: string; drinks: number; dayOfWeek: number }[] }[]
    }[] = []

    let currentMonth = -1
    let currentYear = -1
    let currentWeeks: { days: { date: string; drinks: number; dayOfWeek: number }[] }[] = []
    let currentWeek: { date: string; drinks: number; dayOfWeek: number }[] = []

    const allDays = eachDayOfInterval({ start: startDate, end: endDate })

    allDays.forEach((day) => {
      const month = getMonth(day)
      const year = getYear(day)
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayOfWeek = day.getDay()
      const drinks = entriesByDate.get(dateStr) ?? -1 // -1 means no entry

      // New month
      if (month !== currentMonth || year !== currentYear) {
        if (currentWeek.length > 0) {
          currentWeeks.push({ days: currentWeek })
        }
        if (currentWeeks.length > 0) {
          months.push({
            month: MONTHS[currentMonth],
            year: currentYear,
            weeks: currentWeeks,
          })
        }
        currentMonth = month
        currentYear = year
        currentWeeks = []
        currentWeek = []
      }

      // New week (Sunday)
      if (dayOfWeek === 0 && currentWeek.length > 0) {
        currentWeeks.push({ days: currentWeek })
        currentWeek = []
      }

      currentWeek.push({ date: dateStr, drinks, dayOfWeek })
    })

    // Push remaining data
    if (currentWeek.length > 0) {
      currentWeeks.push({ days: currentWeek })
    }
    if (currentWeeks.length > 0) {
      months.push({
        month: MONTHS[currentMonth],
        year: currentYear,
        weeks: currentWeeks,
      })
    }

    return months.reverse() // Most recent first
  }, [entries])

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Drinking Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No data available for this period
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">When Drinking</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="flex gap-1 mb-2 pl-16">
          {DAYS.map((day) => (
            <div key={day} className="w-7 text-center text-[10px] text-gray-500">
              {day}
            </div>
          ))}
          <div className="w-10 text-center text-[10px] text-gray-500 font-medium">
            Total
          </div>
        </div>

        {/* Calendar grid */}
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {calendarData.map((monthData, monthIdx) => (
            <div key={`${monthData.month}-${monthData.year}`}>
              {monthData.weeks.map((week, weekIdx) => {
                const weekTotal = week.days.reduce((sum, d) => sum + (d.drinks > 0 ? d.drinks : 0), 0)
                return (
                  <div key={weekIdx} className="flex gap-1 items-center">
                    {/* Month label on first week */}
                    <div className="w-14 text-xs text-gray-500 text-right pr-2">
                      {weekIdx === 0 ? `${monthData.month}` : ''}
                    </div>

                    {/* Days grid */}
                    <div className="flex gap-1">
                      {/* Pad beginning of week */}
                      {week.days[0] && week.days[0].dayOfWeek > 0 &&
                        Array.from({ length: week.days[0].dayOfWeek }).map((_, i) => (
                          <div key={`pad-${i}`} className="w-7 h-7" />
                        ))
                      }

                      {week.days.map((day) => (
                        <div
                          key={day.date}
                          className={cn(
                            'w-7 h-7 rounded text-[10px] flex items-center justify-center font-medium',
                            day.drinks < 0 ? 'bg-gray-50 text-gray-300' : getDrinkColor(day.drinks)
                          )}
                          title={`${day.date}: ${day.drinks < 0 ? 'No entry' : day.drinks + ' drinks'}`}
                        >
                          {day.drinks >= 0 ? (day.drinks > 0 ? Math.round(day.drinks) : '') : ''}
                        </div>
                      ))}

                      {/* Pad end of week */}
                      {week.days[week.days.length - 1] && week.days[week.days.length - 1].dayOfWeek < 6 &&
                        Array.from({ length: 6 - week.days[week.days.length - 1].dayOfWeek }).map((_, i) => (
                          <div key={`pad-end-${i}`} className="w-7 h-7" />
                        ))
                      }
                    </div>

                    {/* Week total */}
                    <div className={cn(
                      'w-10 text-xs font-bold text-center',
                      weekTotal === 0 ? 'text-gray-300' : 'text-gray-700'
                    )}>
                      {weekTotal > 0 ? Math.round(weekTotal) : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t">
          <span className="text-xs text-gray-500">Less</span>
          <div className="w-4 h-4 rounded bg-gray-100" />
          <div className="w-4 h-4 rounded bg-purple-100" />
          <div className="w-4 h-4 rounded bg-purple-200" />
          <div className="w-4 h-4 rounded bg-purple-300" />
          <div className="w-4 h-4 rounded bg-purple-400" />
          <div className="w-4 h-4 rounded bg-purple-600" />
          <span className="text-xs text-gray-500">More</span>
        </div>
      </CardContent>
    </Card>
  )
}
