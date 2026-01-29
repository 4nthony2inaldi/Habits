'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils/cn'
import { differenceInDays, parseISO } from 'date-fns'
import type { DailyEntryWithRelations, EventType } from '@/types/database'
import { eventLabels } from '@/types/forms'
import { Clock, AlertCircle } from 'lucide-react'

interface EventsTrackerProps {
  entries: DailyEntryWithRelations[]
  overdueThreshold?: number
  selectedEvents?: EventType[]
}

export function EventsTracker({ entries, overdueThreshold = 30, selectedEvents }: EventsTrackerProps) {
  const eventData = useMemo(() => {
    const allEvents = Object.keys(eventLabels) as EventType[]
    // Filter by selectedEvents if provided
    const events = selectedEvents && selectedEvents.length > 0
      ? allEvents.filter(e => selectedEvents.includes(e))
      : allEvents
    const today = new Date()

    return events.map((event) => {
      // Find all entries with this event
      const entriesWithEvent = entries.filter((e) =>
        e.life_events.some((le) => le.event_type === event)
      )

      // Calculate days since last occurrence
      let daysSince: number | null = null
      let lastDate: string | null = null

      if (entriesWithEvent.length > 0) {
        const sorted = entriesWithEvent.sort(
          (a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
        )
        lastDate = sorted[0].entry_date
        daysSince = differenceInDays(today, parseISO(lastDate))
      }

      // Count occurrences for current and previous year
      const currentYear = today.getFullYear()
      const countCurrentYear = entriesWithEvent.filter(
        (e) => parseISO(e.entry_date).getFullYear() === currentYear
      ).length
      const countPreviousYear = entriesWithEvent.filter(
        (e) => parseISO(e.entry_date).getFullYear() === currentYear - 1
      ).length

      return {
        event,
        label: eventLabels[event],
        daysSince,
        lastDate,
        countCurrentYear,
        countPreviousYear,
        totalCount: entriesWithEvent.length,
        isOverdue: daysSince !== null && daysSince > overdueThreshold,
      }
    })
      // When specific events are selected, show all of them (even if never occurred)
      // When showing all events, only show ones that have occurred
      .filter((e) => (selectedEvents && selectedEvents.length > 0) || e.totalCount > 0)
      .sort((a, b) => {
        // Sort by days since (null values last, meaning "never" goes to bottom)
        if (a.daysSince === null && b.daysSince === null) return 0
        if (a.daysSince === null) return 1
        if (b.daysSince === null) return -1
        return a.daysSince - b.daysSince
      })
  }, [entries, overdueThreshold, selectedEvents])

  if (eventData.length === 0) {
    return (
      <div className="h-full flex flex-col p-4 overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Days Since...</h3>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No life events recorded yet
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Days Since...</h3>
      <div className="flex-1 min-h-0 space-y-1.5">
        {eventData.map((item) => (
          <div
            key={item.event}
            className={cn(
              'flex items-center justify-between p-2 rounded-lg',
              item.isOverdue ? 'bg-orange-50' : 'bg-gray-50'
            )}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {item.isOverdue && (
                <AlertCircle className="h-3 w-3 text-orange-500 flex-shrink-0" />
              )}
              <span className="text-xs text-gray-700 truncate">{item.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <p
                className={cn(
                  'text-sm font-bold',
                  item.daysSince === null
                    ? 'text-gray-400'
                    : item.isOverdue
                    ? 'text-orange-600'
                    : 'text-gray-900'
                )}
              >
                {item.daysSince !== null ? `${item.daysSince}d` : 'Never'}
              </p>
              <div className="text-right text-[10px] text-gray-500 min-w-[50px]">
                {item.totalCount > 0 ? (
                  <p>{item.countCurrentYear}x / {item.countPreviousYear}x</p>
                ) : (
                  <p>-</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
