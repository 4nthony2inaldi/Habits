'use client'

import { useRef } from 'react'
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
  const lastTap = useRef<number>(0)

  const handleTap = () => {
    const now = Date.now()
    const timeSinceLastTap = now - lastTap.current

    if (timeSinceLastTap < 300) {
      // Double-tap: undo first tap's increment (-1) then decrement (-1) = -2 from current
      onChange(Math.max(0, value - 2))
      lastTap.current = 0
    } else {
      // Single tap: increment
      onChange(value + 1)
      lastTap.current = now
    }
  }

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      {label && (
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
      )}
      <button
        type="button"
        onClick={handleTap}
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all active:scale-95 shadow-sm select-none',
          value > 0 ? color : 'bg-gray-500 dark:bg-gray-600'
        )}
      >
        {value}
      </button>
    </div>
  )
}
