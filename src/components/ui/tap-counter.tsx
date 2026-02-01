'use client'

import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface TapCounterProps {
  value: number
  onChange: (value: number) => void
  max?: number
  label?: string
  className?: string
  color?: string
}

export function TapCounter({
  value = 0,
  onChange,
  max = 10,
  label,
  className,
  color = 'bg-purple-500'
}: TapCounterProps) {
  const displayMax = Math.max(max, value + 2) // Always show at least 2 empty circles
  const circles = Math.min(displayMax, 12) // Cap display at 12 circles

  const increment = () => onChange(value + 1)
  const decrement = () => onChange(Math.max(0, value - 1))

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">{value}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        {/* Decrement button */}
        <button
          type="button"
          onClick={decrement}
          disabled={value === 0}
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all',
            value === 0
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 active:scale-95'
          )}
        >
          <Minus className="w-4 h-4" />
        </button>

        {/* Tappable circles area */}
        <button
          type="button"
          onClick={increment}
          className="flex-1 flex items-center justify-start gap-1.5 py-2 px-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 dark:active:bg-gray-800 transition-colors min-h-[44px]"
        >
          {Array.from({ length: circles }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-5 h-5 rounded-full transition-all flex-shrink-0',
                i < value
                  ? `${color} shadow-sm`
                  : 'bg-gray-200 dark:bg-gray-700'
              )}
            />
          ))}
          {value > circles && (
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">
              +{value - circles}
            </span>
          )}
        </button>

        {/* Increment button */}
        <button
          type="button"
          onClick={increment}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 active:scale-95 flex items-center justify-center transition-all"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
