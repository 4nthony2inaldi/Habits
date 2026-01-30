'use client'

import { cn } from '@/lib/utils/cn'
import type { EventType } from '@/types/database'
import { eventLabels } from '@/types/forms'

interface EventCheckboxGroupProps {
  selected: EventType[]
  onChange: (events: EventType[]) => void
  hiddenFields?: string[]
}

const eventCategories = {
  'Time Off & Travel': ['pto', 'flight', 'train', 'subway', 'bus'],
  'Self Care': ['haircut', 'doctor', 'dentist', 'massage', 'facial', 'pedicure', 'manicure', 'other_selfcare'],
  'Entertainment': ['played_sport', 'attended_sport', 'concert', 'stage_production', 'movies', 'museum', 'guys_night'],
  'Other Activities': ['diner', 'ice_cream', 'park'],
}

export function EventCheckboxGroup({
  selected,
  onChange,
  hiddenFields = [],
}: EventCheckboxGroupProps) {
  const toggleEvent = (event: EventType) => {
    if (selected.includes(event)) {
      onChange(selected.filter((e) => e !== event))
    } else {
      onChange([...selected, event])
    }
  }

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-gray-700">
        Life Events
      </label>
      {Object.entries(eventCategories).map(([category, events]) => {
        const visibleEvents = events.filter(
          (e) => !hiddenFields.includes(e)
        )
        if (visibleEvents.length === 0) return null

        return (
          <div key={category} className="space-y-2">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {category}
            </h4>
            <div className="flex flex-wrap gap-2">
              {visibleEvents.map((event) => {
                const isSelected = selected.includes(event as EventType)
                return (
                  <button
                    key={event}
                    type="button"
                    onClick={() => toggleEvent(event as EventType)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm border transition-colors',
                      isSelected
                        ? 'bg-purple-100 text-purple-700 border-purple-300'
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                    )}
                  >
                    {eventLabels[event as EventType]}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
