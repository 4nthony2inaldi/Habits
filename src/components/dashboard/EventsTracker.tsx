'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils/cn'
import { differenceInDays, parseISO, subYears, isWithinInterval, format } from 'date-fns'
import type { DailyEntryWithRelations, EventType } from '@/types/database'
import { eventLabels } from '@/types/forms'
import { AlertCircle, Calendar } from 'lucide-react'

// Short labels for compact display
const shortEventLabels: Record<EventType, string> = {
  concert: 'Concert',
  stage_production: 'Stage',
  movies: 'Movies',
  museum: 'Museum',
  attended_sport: 'Sports Event',
  played_sport: 'Played Sport',
  haircut: 'Haircut',
  massage: 'Massage',
  facial: 'Facial',
  pedicure: 'Pedicure',
  manicure: 'Manicure',
  other_selfcare: 'Self Care',
  doctor: 'Doctor',
  dentist: 'Dentist',
  flight: 'Flight',
  train: 'Train',
  subway: 'Subway',
  bus: 'Bus',
  diner: 'Diner',
  ice_cream: 'Ice Cream',
  park: 'Park',
  guys_night: 'Saw Friends',
  pto: 'PTO',
}

interface EventsTrackerProps {
  entries: DailyEntryWithRelations[]
  dateRange: { start: Date; end: Date }
  overdueThreshold?: number
  selectedEvents?: EventType[]
  title?: string
  subtitle?: string
}

export function EventsTracker({ entries, dateRange, overdueThreshold = 30, selectedEvents, title = 'Life Events', subtitle }: EventsTrackerProps) {
  // Calculate prior period (same duration, shifted back 1 year)
  const { priorPeriod, hasPriorPeriod } = useMemo(() => {
    const priorStart = subYears(dateRange.start, 1)
    const priorEnd = subYears(dateRange.end, 1)

    // Check if we have any data in the prior period
    const hasData = entries.some((e) => {
      const entryDate = parseISO(e.entry_date)
      return isWithinInterval(entryDate, { start: priorStart, end: priorEnd })
    })

    return {
      priorPeriod: { start: priorStart, end: priorEnd },
      hasPriorPeriod: hasData,
    }
  }, [dateRange, entries])

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

      // Count occurrences in current period (selected date range)
      const countCurrentPeriod = entriesWithEvent.filter((e) => {
        const entryDate = parseISO(e.entry_date)
        return isWithinInterval(entryDate, { start: dateRange.start, end: dateRange.end })
      }).length

      // Count occurrences in prior period (same range, 1 year earlier)
      const countPriorPeriod = entriesWithEvent.filter((e) => {
        const entryDate = parseISO(e.entry_date)
        return isWithinInterval(entryDate, { start: priorPeriod.start, end: priorPeriod.end })
      }).length

      return {
        event,
        label: shortEventLabels[event] || eventLabels[event],
        daysSince,
        lastDate,
        countCurrentPeriod,
        countPriorPeriod,
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
  }, [entries, dateRange, priorPeriod, overdueThreshold, selectedEvents])

  if (eventData.length === 0) {
    return (
      <div className="h-full flex flex-col p-4">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500" />
            {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          No life events recorded yet
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-indigo-500" />
          {title}
        </h3>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="flex-1 min-h-0 flex flex-col gap-1 scrollbar-hidden">
        {eventData.map((item) => (
          <div
            key={item.event}
            className={cn(
              'flex items-center px-2 rounded-lg flex-1',
              item.isOverdue ? 'bg-orange-50' : 'bg-gray-50'
            )}
            style={{ minHeight: 0 }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {item.isOverdue && (
                <AlertCircle className="h-3 w-3 text-orange-500 flex-shrink-0" />
              )}
              <span className="text-xs text-gray-700 truncate">{item.label}</span>
            </div>
            <div className="flex items-center">
              <p
                className={cn(
                  'text-sm font-bold w-12 text-right',
                  item.daysSince === null
                    ? 'text-gray-400'
                    : item.isOverdue
                    ? 'text-orange-600'
                    : 'text-gray-900'
                )}
              >
                {item.daysSince !== null ? `${item.daysSince}d` : 'Never'}
              </p>
              <div className="text-[10px] text-gray-500 w-14 text-right">
                {item.countCurrentPeriod > 0 || item.countPriorPeriod > 0 ? (
                  <span>
                    {item.countCurrentPeriod}x
                    {hasPriorPeriod && <span className="text-gray-400"> / {item.countPriorPeriod}x</span>}
                  </span>
                ) : (
                  <span>-</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
