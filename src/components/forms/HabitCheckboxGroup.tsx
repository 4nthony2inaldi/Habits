'use client'

import { cn } from '@/lib/utils/cn'
import { Check } from 'lucide-react'
import type { HabitType } from '@/types/database'
import { habitLabels } from '@/types/forms'

interface HabitCheckboxGroupProps {
  selected: HabitType[]
  onChange: (habits: HabitType[]) => void
  hiddenFields?: string[]
}

export function HabitCheckboxGroup({
  selected,
  onChange,
  hiddenFields = [],
}: HabitCheckboxGroupProps) {
  const habits = Object.entries(habitLabels).filter(
    ([key]) => !hiddenFields.includes(key)
  )

  const toggleHabit = (habit: HabitType) => {
    if (selected.includes(habit)) {
      onChange(selected.filter((h) => h !== habit))
    } else {
      onChange([...selected, habit])
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        Healthy Habits
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {habits.map(([key, label]) => {
          const isSelected = selected.includes(key as HabitType)
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleHabit(key as HabitType)}
              className={cn(
                'flex items-center gap-2 p-3 rounded-lg border text-left text-sm transition-colors',
                isSelected
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              )}
            >
              <div
                className={cn(
                  'flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center',
                  isSelected
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-300'
                )}
              >
                {isSelected && <Check className="h-3 w-3 text-white" />}
              </div>
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
