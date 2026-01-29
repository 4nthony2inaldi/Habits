'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import { Check, X, TrendingUp, TrendingDown } from 'lucide-react'
import { format, parseISO, subDays } from 'date-fns'
import type { DailyEntryWithRelations, HabitType } from '@/types/database'
import { habitLabels } from '@/types/forms'

interface HabitsGridProps {
  entries: DailyEntryWithRelations[]
  showDays?: number
  selectedHabits?: HabitType[]
}

export function HabitsGrid({ entries, showDays = 7, selectedHabits }: HabitsGridProps) {
  const data = useMemo(() => {
    // Get last N days
    const dates: string[] = []
    for (let i = 0; i < showDays; i++) {
      dates.unshift(format(subDays(new Date(), i + 1), 'yyyy-MM-dd'))
    }

    // Create map of entries by date
    const entriesByDate = new Map<string, DailyEntryWithRelations>()
    entries.forEach((entry) => {
      entriesByDate.set(entry.entry_date, entry)
    })

    // Calculate habit data - filter by selectedHabits if provided
    const allHabits = Object.keys(habitLabels) as HabitType[]
    const habits = selectedHabits && selectedHabits.length > 0
      ? allHabits.filter(h => selectedHabits.includes(h))
      : allHabits

    return habits.map((habit) => {
      const daysCompleted = dates.map((date) => {
        const entry = entriesByDate.get(date)
        if (!entry) return null
        return entry.healthy_habits.some((h) => h.habit_type === habit)
      })

      const completedCount = daysCompleted.filter((d) => d === true).length
      const trackedDays = daysCompleted.filter((d) => d !== null).length
      const completionRate = trackedDays > 0 ? Math.round((completedCount / trackedDays) * 100) : 0

      return {
        habit,
        label: habitLabels[habit],
        days: daysCompleted,
        dates,
        completionRate,
        completedCount,
        trackedDays,
      }
    })
  }, [entries, showDays, selectedHabits])

  const dateHeaders = useMemo(() => {
    const dates: string[] = []
    for (let i = 0; i < showDays; i++) {
      dates.unshift(format(subDays(new Date(), i + 1), 'EEE'))
    }
    return dates
  }, [showDays])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Healthy Habits</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 pb-3 pr-4">
                  Habit
                </th>
                {dateHeaders.map((day, i) => (
                  <th
                    key={i}
                    className="text-center text-xs font-medium text-gray-500 pb-3 px-1 min-w-[36px]"
                  >
                    {day}
                  </th>
                ))}
                <th className="text-right text-xs font-medium text-gray-500 pb-3 pl-4">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.habit} className="border-t border-gray-100">
                  <td className="py-2 pr-4">
                    <span className="text-sm text-gray-700 whitespace-nowrap">
                      {row.label}
                    </span>
                  </td>
                  {row.days.map((completed, i) => (
                    <td key={i} className="text-center py-2 px-1">
                      {completed === null ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 text-gray-300">
                          -
                        </span>
                      ) : completed ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
                          <Check className="h-3 w-3 text-green-600" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100">
                          <X className="h-3 w-3 text-gray-400" />
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="text-right py-2 pl-4">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        row.completionRate >= 70
                          ? 'text-green-600'
                          : row.completionRate >= 40
                          ? 'text-yellow-600'
                          : 'text-gray-400'
                      )}
                    >
                      {row.completionRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
