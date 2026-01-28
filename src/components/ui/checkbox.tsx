'use client'

import * as React from 'react'
import { cn } from '@/lib/utils/cn'
import { Check } from 'lucide-react'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id || React.useId()

    return (
      <div className="flex items-center space-x-2">
        <div className="relative">
          <input
            type="checkbox"
            id={inputId}
            className="peer sr-only"
            ref={ref}
            {...props}
          />
          <div
            className={cn(
              'h-4 w-4 shrink-0 rounded-sm border border-gray-300 ring-offset-white peer-focus-visible:ring-2 peer-focus-visible:ring-purple-500 peer-focus-visible:ring-offset-2 peer-checked:border-purple-600 peer-checked:bg-purple-600 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
              className
            )}
          >
            <Check className="hidden h-full w-full text-white peer-checked:block" />
          </div>
          <Check className="absolute left-0 top-0 hidden h-4 w-4 text-white peer-checked:block" />
        </div>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            {label}
          </label>
        )}
      </div>
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
