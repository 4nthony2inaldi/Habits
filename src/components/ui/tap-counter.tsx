'use client'

import { cn } from '@/lib/utils/cn'

interface TapCounterProps {
  value: number
  onChange: (value: number) => void
  label?: string
  className?: string
  color?: string
}

export function TapCounter({
  value = 0,
  onChange,
  label,
  className,
  color = 'bg-purple-500'
}: TapCounterProps) {
  const increment = () => onChange(value + 1)
  const decrement = (e: React.MouseEvent) => {
    e.preventDefault()
    onChange(Math.max(0, value - 1))
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && (
        <span className="text-sm text-gray-700 dark:text-gray-300 min-w-[70px]">{label}</span>
      )}
      <button
        type="button"
        onClick={increment}
        onContextMenu={decrement}
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all active:scale-95 shadow-sm',
          value > 0 ? color : 'bg-gray-300 dark:bg-gray-600'
        )}
      >
        {value}
      </button>
    </div>
  )
}
