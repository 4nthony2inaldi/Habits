'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils/cn'
import { format, subDays, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns'
import { Zap } from 'lucide-react'
import type { DailyEntryWithRelations, EventType } from '@/types/database'
import { eventLabels, defaultFieldGroupings, type FieldGroupings } from '@/types/forms'

interface BusyTrendProps {
  entries: DailyEntryWithRelations[]
  dateRange: { start: Date; end: Date }
  fieldGroupings?: FieldGroupings | null
  homeCity?: string | null
  title?: string
}

function countBusyForWeek(
  entries: DailyEntryWithRelations[],
  weekEndDate: Date,
  eventsToCount: EventType[],
  homeCity: string | null
): number {
  const weekStart = startOfWeek(weekEndDate, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(weekEndDate, { weekStartsOn: 0 })

  let count = 0

  entries.forEach((entry) => {
    const entryDate = parseISO(entry.entry_date)
    if (!isWithinInterval(entryDate, { start: weekStart, end: weekEnd })) return

    // Count matching events
    entry.life_events.forEach((le) => {
      if (eventsToCount.includes(le.event_type)) {
        count++
      }
    })

    // Count flights and trains (always include these)
    const hasFlightOrTrain = entry.life_events.some(
      (le) => le.event_type === 'flight' || le.event_type === 'train'
    )
    if (hasFlightOrTrain) {
      entry.life_events.forEach((le) => {
        if (le.event_type === 'flight' || le.event_type === 'train') {
          count++
        }
      })
    }

    // Count nights away (city_sleep differs from home)
    if (homeCity && entry.city_sleep && entry.city_sleep.toLowerCase() !== homeCity.toLowerCase()) {
      count++
    }
  })

  return count
}

export function BusyTrend({
  entries,
  dateRange,
  fieldGroupings,
  homeCity,
  title = 'Busy',
}: BusyTrendProps) {
  // Get events to count from groupings
  const eventsToCount = useMemo(() => {
    const groupings = fieldGroupings || defaultFieldGroupings
    const eventsGroup = groupings.find((g) => g.id === 'events')
    const selfCareGroup = groupings.find((g) => g.id === 'self-care')

    const eventsGroupEvents = (eventsGroup?.fields || []).filter(
      (f) => f in eventLabels
    ) as EventType[]
    const selfCareGroupEvents = (selfCareGroup?.fields || []).filter(
      (f) => f in eventLabels
    ) as EventType[]

    // Combine but exclude flight/train as we handle those separately
    return [...eventsGroupEvents, ...selfCareGroupEvents].filter(
      (e) => e !== 'flight' && e !== 'train'
    )
  }, [fieldGroupings])

  // Generate dynamic subtitle showing actual date range
  const dateRangeLabel = useMemo(() => {
    const weekEnd = endOfWeek(dateRange.end, { weekStartsOn: 0 })
    const weekStart = startOfWeek(dateRange.end, { weekStartsOn: 0 })
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`
  }, [dateRange.end])

  // Current week count
  const currentCount = useMemo(() => {
    return countBusyForWeek(entries, dateRange.end, eventsToCount, homeCity || null)
  }, [entries, dateRange.end, eventsToCount, homeCity])

  // Sparkline data: 12 weeks
  const sparklineData = useMemo(() => {
    const weeks: { count: number; endDate: Date }[] = []

    for (let i = 0; i < 12; i++) {
      const weekEndDate = subDays(dateRange.end, i * 7)
      const count = countBusyForWeek(entries, weekEndDate, eventsToCount, homeCity || null)
      weeks.unshift({ count, endDate: weekEndDate })
    }

    return weeks
  }, [entries, dateRange.end, eventsToCount, homeCity])

  const maxCount = Math.max(...sparklineData.map((d) => d.count), 1)

  // Determine color based on count (higher = more busy = warmer color)
  const getColor = () => {
    if (currentCount >= 8) return 'text-red-500'
    if (currentCount >= 4) return 'text-orange-500'
    if (currentCount >= 1) return 'text-blue-500'
    return 'text-gray-400'
  }

  // Sparkline rendering - use bars instead of line
  const sparklineHeight = 40
  const sparklineWidth = 120
  const barWidth = sparklineWidth / 12 - 2

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          {title}
        </h3>
        <p className="text-xs text-gray-500">{dateRangeLabel}</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Large count display */}
        <div className={cn('text-5xl font-bold', getColor())}>{currentCount}</div>

        <div className="mt-1 text-sm text-gray-500">things this week</div>

        {/* Mini bar chart - 12 week trend */}
        <div className="mt-6 flex flex-col items-center">
          <svg width={sparklineWidth} height={sparklineHeight} className="overflow-visible">
            {sparklineData.map((d, i) => {
              const barHeight = maxCount > 0 ? (d.count / maxCount) * sparklineHeight : 0
              const x = i * (barWidth + 2)
              const y = sparklineHeight - barHeight
              const isLast = i === sparklineData.length - 1

              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barHeight, d.count > 0 ? 2 : 0)}
                  rx={1}
                  fill={isLast ? '#f59e0b' : '#d1d5db'}
                  className={isLast ? '' : 'opacity-60'}
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
