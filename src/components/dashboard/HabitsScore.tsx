'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils/cn'
import { format, subDays } from 'date-fns'
import type { DailyEntryWithRelations, HabitType } from '@/types/database'
import { habitLabels } from '@/types/forms'
import type { SelectableHabitType } from './DashboardCustomizer'

interface HabitsScoreProps {
  entries: DailyEntryWithRelations[]
  selectedHabits?: SelectableHabitType[]
  title?: string
  subtitle?: string
}

export function HabitsScore({ entries, selectedHabits, title = 'Habits Score', subtitle }: HabitsScoreProps) {
  const { completed, possible, percentage } = useMemo(() => {
    const days = 7

    // Get last 7 days
    const dates: string[] = []
    for (let i = 0; i < days; i++) {
      dates.unshift(format(subDays(new Date(), i + 1), 'yyyy-MM-dd'))
    }

    // Create map of entries by date
    const entriesByDate = new Map<string, DailyEntryWithRelations>()
    entries.forEach((entry) => {
      entriesByDate.set(entry.entry_date, entry)
    })

    // Get all selectable habits, filter by selected if provided
    const regularHabits = Object.keys(habitLabels) as HabitType[]
    const computedHabits: SelectableHabitType[] = ['no_alcohol', 'was_active']
    const allSelectableHabits: SelectableHabitType[] = [...regularHabits, ...computedHabits]

    const habitsToCount = selectedHabits && selectedHabits.length > 0
      ? allSelectableHabits.filter(h => selectedHabits.includes(h))
      : allSelectableHabits

    let completedCount = 0
    const possibleCount = habitsToCount.length * days

    // Count completed habits for each day
    for (const date of dates) {
      const entry = entriesByDate.get(date)
      if (!entry) continue

      for (const habit of habitsToCount) {
        let isCompleted = false

        // Handle computed habits
        if (habit === 'no_alcohol') {
          const totalDrinks = (entry.beers || 0) + (entry.seltzers || 0) +
                             (entry.wine || 0) + (entry.liquor || 0) + (entry.shots || 0)
          isCompleted = totalDrinks === 0
        } else if (habit === 'was_active') {
          const steps = entry.steps || 0
          isCompleted = steps >= 7500
        } else {
          // Regular habits
          isCompleted = entry.healthy_habits.some((h) => h.habit_type === habit)
        }

        if (isCompleted) {
          completedCount++
        }
      }
    }

    const pct = possibleCount > 0 ? Math.round((completedCount / possibleCount) * 100) : 0

    return {
      completed: completedCount,
      possible: possibleCount,
      percentage: pct,
    }
  }, [entries, selectedHabits])

  // Determine color based on percentage
  const getColor = () => {
    if (percentage >= 70) return 'text-green-600'
    if (percentage >= 40) return 'text-yellow-600'
    return 'text-gray-400'
  }

  const getBackgroundColor = () => {
    if (percentage >= 70) return 'bg-green-500'
    if (percentage >= 40) return 'bg-yellow-500'
    return 'bg-gray-300'
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Large percentage display */}
        <div className={cn('text-5xl font-bold', getColor())}>
          {percentage}%
        </div>

        {/* Fraction display */}
        <div className="mt-2 text-lg text-gray-600">
          <span className="font-semibold">{completed}</span>
          <span className="text-gray-400"> / {possible}</span>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-[200px] mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-500 rounded-full', getBackgroundColor())}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Context label */}
        <div className="mt-3 text-xs text-gray-500 text-center">
          {selectedHabits?.length || 13} habits tracked over 7 days
        </div>
      </div>
    </div>
  )
}
