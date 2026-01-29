'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      .filter((e) => e.totalCount > 0) // Only show events that have occurred
      .sort((a, b) => {
        // Sort by days since (null values last)
        if (a.daysSince === null) return 1
        if (b.daysSince === null) return -1
        return a.daysSince - b.daysSince
      })
  }, [entries, overdueThreshold, selectedEvents])

  if (eventData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Life Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No life events recorded yet
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Days Since...</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {eventData.slice(0, 15).map((item) => (
            <div
              key={item.event}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg',
                item.isOverdue ? 'bg-orange-50' : 'bg-gray-50'
              )}
            >
              <div className="flex items-center gap-3">
                {item.isOverdue && (
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                )}
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p
                    className={cn(
                      'text-lg font-bold',
                      item.isOverdue ? 'text-orange-600' : 'text-gray-900'
                    )}
                  >
                    {item.daysSince !== null ? `${item.daysSince}d` : '-'}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500 min-w-[60px]">
                  <p>{item.countCurrentYear}x this year</p>
                  {item.countPreviousYear > 0 && (
                    <p>{item.countPreviousYear}x last year</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {eventData.length > 15 && (
          <p className="text-center text-sm text-gray-500 mt-4">
            +{eventData.length - 15} more events
          </p>
        )}
      </CardContent>
    </Card>
  )
}
