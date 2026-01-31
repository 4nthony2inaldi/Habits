'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { Check, X, Star, ListChecks, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { format, subDays, parseISO, isWithinInterval } from 'date-fns'
import type { DailyEntryWithRelations, HabitType } from '@/types/database'
import { habitLabels } from '@/types/forms'
import type { SelectableHabitType } from './DashboardCustomizer'
import { shortHabitLabels } from './DashboardCustomizer'

// Type for day completion status
// For regular habits: true/false/null
// For was_active: 'gold' (10k+) | 'green' (7.5k+) | false | null
type DayStatus = boolean | 'gold' | 'green' | null

interface TooltipData {
  habit: SelectableHabitType
  label: string
  x: number
  y: number
}

interface PeriodStats {
  current: number | null
  prior: number | null
  currentTracked: number
  priorTracked: number
}

interface HabitsGridProps {
  entries: DailyEntryWithRelations[]
  showDays?: number
  selectedHabits?: SelectableHabitType[]
  dateRange: { start: Date; end: Date }
  title?: string
  subtitle?: string
}

export function HabitsGrid({ entries, showDays = 7, selectedHabits, dateRange, title = 'Healthy Habits', subtitle }: HabitsGridProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  // Helper to check if a habit is completed for a given entry
  const isHabitCompleted = (entry: DailyEntryWithRelations, habit: SelectableHabitType): boolean => {
    if (habit === 'no_alcohol') {
      const totalDrinks = (entry.beers || 0) + (entry.seltzers || 0) +
                         (entry.wine || 0) + (entry.liquor || 0) + (entry.shots || 0)
      return totalDrinks === 0
    }
    if (habit === 'was_active') {
      return (entry.steps || 0) >= 7500
    }
    if (habit === 'breakfast_at_home') {
      return entry.breakfast_location === 'home'
    }
    if (habit === 'lunch_at_home') {
      return entry.lunch_location === 'home'
    }
    if (habit === 'dinner_at_home') {
      return entry.dinner_location === 'home'
    }
    if (habit === 'breakfast') {
      const hasOldFormat = entry.healthy_habits.some((h) => h.habit_type === 'breakfast')
      const hasNewFormat = entry.breakfast_location !== null
      return hasOldFormat || hasNewFormat
    }
    return entry.healthy_habits.some((h) => h.habit_type === habit)
  }

  // Calculate completion stats for a habit over different periods
  const calculatePeriodStats = useMemo(() => {
    return (habit: SelectableHabitType, days: number): PeriodStats => {
      const endDate = dateRange.end
      const currentStart = subDays(endDate, days - 1)
      const priorEnd = subDays(currentStart, 1)
      const priorStart = subDays(priorEnd, days - 1)

      let currentCompleted = 0
      let currentTracked = 0
      let priorCompleted = 0
      let priorTracked = 0

      entries.forEach((entry) => {
        const entryDate = parseISO(entry.entry_date)

        // Check if in current period
        if (isWithinInterval(entryDate, { start: currentStart, end: endDate })) {
          currentTracked++
          if (isHabitCompleted(entry, habit)) {
            currentCompleted++
          }
        }
        // Check if in prior period
        else if (isWithinInterval(entryDate, { start: priorStart, end: priorEnd })) {
          priorTracked++
          if (isHabitCompleted(entry, habit)) {
            priorCompleted++
          }
        }
      })

      return {
        current: currentTracked > 0 ? Math.round((currentCompleted / currentTracked) * 100) : null,
        prior: priorTracked > 0 ? Math.round((priorCompleted / priorTracked) * 100) : null,
        currentTracked,
        priorTracked,
      }
    }
  }, [entries, dateRange.end])

  const data = useMemo(() => {
    // Get last N days from end of date range (most recent first)
    const dates: string[] = []
    for (let i = 0; i < showDays; i++) {
      dates.push(format(subDays(dateRange.end, i), 'yyyy-MM-dd'))
    }

    // Create map of entries by date
    const entriesByDate = new Map<string, DailyEntryWithRelations>()
    entries.forEach((entry) => {
      entriesByDate.set(entry.entry_date, entry)
    })

    // Get all selectable habits, filter by selected if provided
    const regularHabits = Object.keys(habitLabels) as HabitType[]
    const computedHabits: SelectableHabitType[] = ['no_alcohol', 'was_active', 'breakfast_at_home', 'lunch_at_home', 'dinner_at_home']
    const allSelectableHabits: SelectableHabitType[] = [...regularHabits, ...computedHabits]

    const habitsToShow = selectedHabits && selectedHabits.length > 0
      ? allSelectableHabits.filter(h => selectedHabits.includes(h))
      : allSelectableHabits

    return habitsToShow.map((habit) => {
      const daysCompleted: DayStatus[] = dates.map((date) => {
        const entry = entriesByDate.get(date)
        if (!entry) return null

        // Handle computed habits
        if (habit === 'no_alcohol') {
          const totalDrinks = (entry.beers || 0) + (entry.seltzers || 0) +
                             (entry.wine || 0) + (entry.liquor || 0) + (entry.shots || 0)
          return totalDrinks === 0
        }

        if (habit === 'was_active') {
          const steps = entry.steps || 0
          if (steps >= 10000) return 'gold'
          if (steps >= 7500) return 'green'
          return false
        }

        if (habit === 'breakfast_at_home') {
          return entry.breakfast_location === 'home'
        }

        if (habit === 'lunch_at_home') {
          return entry.lunch_location === 'home'
        }

        if (habit === 'dinner_at_home') {
          return entry.dinner_location === 'home'
        }

        // 'breakfast' habit: check both old format (healthy_habits) and new format (breakfast_location)
        if (habit === 'breakfast') {
          const hasOldFormat = entry.healthy_habits.some((h) => h.habit_type === 'breakfast')
          const hasNewFormat = entry.breakfast_location !== null
          return hasOldFormat || hasNewFormat
        }

        // Regular habits
        return entry.healthy_habits.some((h) => h.habit_type === habit)
      })

      // Calculate completion rate (gold and green both count as complete for was_active)
      const completedCount = daysCompleted.filter((d) => d === true || d === 'gold' || d === 'green').length
      const trackedDays = daysCompleted.filter((d) => d !== null).length
      const completionRate = trackedDays > 0 ? Math.round((completedCount / trackedDays) * 100) : 0

      return {
        habit,
        label: shortHabitLabels[habit],
        days: daysCompleted,
        dates,
        completionRate,
        completedCount,
        trackedDays,
      }
    })
  }, [entries, showDays, selectedHabits, dateRange.end])

  const dateHeaders = useMemo(() => {
    const headers: { day: string; date: string }[] = []
    for (let i = 0; i < showDays; i++) {
      const d = subDays(dateRange.end, i)
      headers.push({
        day: format(d, 'EEE'),
        date: format(d, 'M/d'),
      })
    }
    return headers
  }, [showDays, dateRange.end])

  const renderDayCell = (status: DayStatus, habit: SelectableHabitType) => {
    if (status === null) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 text-gray-300">
          -
        </span>
      )
    }

    // Gold star for 10k+ steps
    if (status === 'gold') {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100">
          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
        </span>
      )
    }

    // Green check for 7.5k+ steps or true
    if (status === 'green' || status === true) {
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
          <Check className="h-3 w-3 text-green-600" />
        </span>
      )
    }

    // Not completed
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100">
        <X className="h-3 w-3 text-gray-400" />
      </span>
    )
  }

  const handleRowHover = (row: typeof data[0], event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setTooltip({
      habit: row.habit,
      label: row.label,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    })
  }

  const handleRowLeave = () => {
    setTooltip(null)
  }

  // Helper to render comparison with trend icon
  const renderComparison = (stats: PeriodStats, label: string) => {
    const diff = stats.current !== null && stats.prior !== null ? stats.current - stats.prior : null
    const TrendIcon = diff === null ? Minus : diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus
    const trendColor = diff === null ? 'text-gray-400' : diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-gray-400'

    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-gray-500">{label}:</span>
        <span className="flex items-center gap-1">
          <span className="font-medium text-gray-900">
            {stats.current !== null ? `${stats.current}%` : '—'}
          </span>
          {stats.prior !== null && (
            <>
              <TrendIcon className={cn('h-3 w-3', trendColor)} />
              <span className={cn('text-[10px]', trendColor)}>
                {diff !== null && diff !== 0 ? `${diff > 0 ? '+' : ''}${diff}%` : ''}
              </span>
              <span className="text-gray-400 text-[10px]">
                (was {stats.prior}%)
              </span>
            </>
          )}
        </span>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-green-500" />
          {title}
        </h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex-1 min-h-0 flex flex-col scrollbar-hidden">
        <table className="w-full h-full table-fixed">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 pb-2 w-20">
                Habit
              </th>
              {dateHeaders.map((header, i) => (
                <th
                  key={i}
                  className="text-center text-xs font-medium text-gray-500 pb-2"
                >
                  <div>{header.day}</div>
                  <div className="text-[10px] text-gray-400">{header.date}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={row.habit}
                className="border-t border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ height: `${100 / data.length}%` }}
                onMouseEnter={(e) => handleRowHover(row, e)}
                onMouseLeave={handleRowLeave}
              >
                <td className="align-middle">
                  <span className="text-sm text-gray-700 whitespace-nowrap">
                    {row.label}
                  </span>
                </td>
                {row.days.map((status, i) => (
                  <td key={i} className="text-center align-middle">
                    {renderDayCell(status, row.habit)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tooltip - fixed positioning to extend beyond widget */}
      {tooltip && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-xs min-w-[180px] max-w-[280px]">
            <div className="font-medium text-gray-900 mb-2 pb-1 border-b border-gray-100">
              {tooltip.label}
            </div>
            <div className="space-y-1">
              {renderComparison(calculatePeriodStats(tooltip.habit, 7), 'Last 7d')}
              {renderComparison(calculatePeriodStats(tooltip.habit, 30), 'Last 30d')}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
