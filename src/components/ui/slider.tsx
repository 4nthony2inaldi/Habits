'use client'

import * as React from 'react'
import { cn } from '@/lib/utils/cn'

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  showValue?: boolean
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, showValue = true, value, min = 0, max = 10, ...props }, ref) => {
    return (
      <div className="flex items-center gap-3 w-full">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          className={cn(
            'h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 accent-purple-600',
            className
          )}
          ref={ref}
          {...props}
        />
        {showValue && (
          <span className="min-w-[2rem] text-center text-sm font-medium text-gray-700">
            {value}
          </span>
        )}
      </div>
    )
  }
)
Slider.displayName = 'Slider'

export { Slider }
