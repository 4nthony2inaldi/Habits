'use client'

import { cn } from '@/lib/utils/cn'
import { Check } from 'lucide-react'
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {visibleEvents.map((event) => {
                const isSelected = selected.includes(event as EventType)
                return (
                  <button
                    key={event}
                    type="button"
                    onClick={() => toggleEvent(event as EventType)}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-colors',
                      isSelected
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    )}
                  >
                    <div
                      className={cn(
                        'flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center',
                        isSelected
                          ? 'border-purple-500 bg-purple-500'
                          : 'border-gray-300'
                      )}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span className="truncate">{eventLabels[event as EventType]}</span>
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
