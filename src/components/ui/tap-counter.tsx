'use client'

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
  max = 6,
  label,
  className,
  color = 'bg-purple-500'
}: TapCounterProps) {
  const circles = max

  const increment = () => onChange(value + 1)
  const decrement = () => onChange(Math.max(0, value - 1))

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && (
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-16 truncate">{label}</span>
      )}
      {/* Tappable circles */}
      <button
        type="button"
        onClick={increment}
        className="flex items-center gap-1 py-1 px-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 active:bg-gray-100 transition-colors"
      >
        {Array.from({ length: circles }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-3 h-3 rounded-full transition-all',
              i < value
                ? `${color} shadow-sm`
                : 'bg-gray-200 dark:bg-gray-700'
            )}
          />
        ))}
      </button>
      {/* Count - tap to decrement */}
      <button
        type="button"
        onClick={decrement}
        disabled={value === 0}
        className={cn(
          'text-sm font-bold tabular-nums w-5 text-center',
          value > 0
            ? 'text-gray-900 dark:text-white hover:text-red-500'
            : 'text-gray-300 dark:text-gray-600'
        )}
      >
        {value}
      </button>
    </div>
  )
}
