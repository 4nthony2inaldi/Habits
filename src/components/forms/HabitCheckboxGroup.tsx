'use client'

import { cn } from '@/lib/utils/cn'
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
      <div className="flex flex-wrap gap-2">
        {habits.map(([key, label]) => {
          const isSelected = selected.includes(key as HabitType)
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleHabit(key as HabitType)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm border transition-colors',
                isSelected
                  ? 'bg-green-100 text-green-700 border-green-300'
                  : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
