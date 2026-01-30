'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils/cn'
import { format, subDays } from 'date-fns'
import { Target } from 'lucide-react'
import type { DailyEntryWithRelations, HabitType } from '@/types/database'
import { habitLabels } from '@/types/forms'
import type { SelectableHabitType } from './DashboardCustomizer'

interface HabitsScoreProps {
  entries: DailyEntryWithRelations[]
  selectedHabits?: SelectableHabitType[]
  dateRange: { start: Date; end: Date }
  title?: string
  subtitle?: string
}

function calculateScoreForPeriod(
  entries: DailyEntryWithRelations[],
  endDate: Date,
  days: number,
  habitsToCount: SelectableHabitType[]
): { completed: number; possible: number; percentage: number } {
  // Get dates for the period
  const dates: string[] = []
  for (let i = 0; i < days; i++) {
    dates.unshift(format(subDays(endDate, i), 'yyyy-MM-dd'))
  }

  // Create map of entries by date
  const entriesByDate = new Map<string, DailyEntryWithRelations>()
  entries.forEach((entry) => {
    entriesByDate.set(entry.entry_date, entry)
  })

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
      } else if (habit === 'breakfast_at_home') {
        isCompleted = entry.breakfast_location === 'home'
      } else if (habit === 'lunch_at_home') {
        isCompleted = entry.lunch_location === 'home'
      } else if (habit === 'dinner_at_home') {
        isCompleted = entry.dinner_location === 'home'
      } else if (habit === 'breakfast') {
        // 'breakfast' habit: check both old format (healthy_habits) and new format (breakfast_location)
        const hasOldFormat = entry.healthy_habits.some((h) => h.habit_type === 'breakfast')
        const hasNewFormat = entry.breakfast_location !== null
        isCompleted = hasOldFormat || hasNewFormat
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
}

export function HabitsScore({ entries, selectedHabits, dateRange, title = 'Habits Score' }: HabitsScoreProps) {
  // Generate dynamic subtitle showing actual date range
  const dateRangeLabel = useMemo(() => {
    const endDate = dateRange.end
    const startDate = subDays(endDate, 6)
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d')}`
  }, [dateRange.end])
  // Get habits to count
  const habitsToCount = useMemo(() => {
    const regularHabits = Object.keys(habitLabels) as HabitType[]
    const computedHabits: SelectableHabitType[] = ['no_alcohol', 'was_active', 'breakfast_at_home', 'lunch_at_home', 'dinner_at_home']
    const allSelectableHabits: SelectableHabitType[] = [...regularHabits, ...computedHabits]

    return selectedHabits && selectedHabits.length > 0
      ? allSelectableHabits.filter(h => selectedHabits.includes(h))
      : allSelectableHabits
  }, [selectedHabits])

  // Current score (most recent 7 days from end of date range)
  const currentScore = useMemo(() => {
    return calculateScoreForPeriod(entries, dateRange.end, 7, habitsToCount)
  }, [entries, dateRange.end, habitsToCount])

  // Sparkline data: 12 weeks of rolling 7-day scores
  const sparklineData = useMemo(() => {
    const weeks: { percentage: number; endDate: Date }[] = []

    for (let i = 0; i < 12; i++) {
      // Each point is 7 days apart (non-overlapping weeks)
      const weekEndDate = subDays(dateRange.end, i * 7)
      const score = calculateScoreForPeriod(entries, weekEndDate, 7, habitsToCount)
      weeks.unshift({ percentage: score.percentage, endDate: weekEndDate })
    }

    return weeks
  }, [entries, dateRange.end, habitsToCount])

  // Determine color based on percentage
  const getColor = () => {
    if (currentScore.percentage >= 70) return 'text-green-600'
    if (currentScore.percentage >= 40) return 'text-yellow-600'
    return 'text-gray-400'
  }

  const getBackgroundColor = () => {
    if (currentScore.percentage >= 70) return 'bg-green-500'
    if (currentScore.percentage >= 40) return 'bg-yellow-500'
    return 'bg-gray-300'
  }

  // Sparkline rendering
  const maxPercentage = Math.max(...sparklineData.map(d => d.percentage), 1)
  const sparklineHeight = 40
  const sparklineWidth = 120

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Target className="h-5 w-5 text-orange-500" />
          {title}
        </h3>
        <p className="text-xs text-gray-500">{dateRangeLabel}</p>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Large percentage display */}
        <div className={cn('text-5xl font-bold', getColor())}>
          {currentScore.percentage}%
        </div>

        {/* Fraction display */}
        <div className="mt-2 text-lg text-gray-600">
          <span className="font-semibold">{currentScore.completed}</span>
          <span className="text-gray-400"> / {currentScore.possible}</span>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-[200px] mt-4 h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-500 rounded-full', getBackgroundColor())}
            style={{ width: `${currentScore.percentage}%` }}
          />
        </div>

        {/* Sparkline - 12 week trend */}
        <div className="mt-4 flex flex-col items-center">
          <svg
            width={sparklineWidth}
            height={sparklineHeight}
            className="overflow-visible"
          >
            {/* Line connecting points */}
            <polyline
              fill="none"
              stroke="#d1d5db"
              strokeWidth="1.5"
              points={sparklineData
                .map((d, i) => {
                  const x = (i / (sparklineData.length - 1)) * sparklineWidth
                  const y = sparklineHeight - (d.percentage / 100) * sparklineHeight
                  return `${x},${y}`
                })
                .join(' ')}
            />
            {/* Dots for each week */}
            {sparklineData.map((d, i) => {
              const x = (i / (sparklineData.length - 1)) * sparklineWidth
              const y = sparklineHeight - (d.percentage / 100) * sparklineHeight
              const isLast = i === sparklineData.length - 1

              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={isLast ? 4 : 2}
                  fill={isLast ? (currentScore.percentage >= 70 ? '#22c55e' : currentScore.percentage >= 40 ? '#eab308' : '#9ca3af') : '#9ca3af'}
                  className={isLast ? '' : 'opacity-50'}
                />
              )
            })}
          </svg>
          <div className="text-[10px] text-gray-400 mt-1">12 week trend</div>
        </div>
      </div>
    </div>
  )
}
