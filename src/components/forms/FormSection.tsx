'use client'

import { cn } from '@/lib/utils/cn'
import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

interface FormSectionProps {
  title: string
  subtitle?: string
  icon?: ReactNode
  isOpen: boolean
  onToggle: () => void
  summary?: string
  children: ReactNode
  className?: string
}

export function FormSection({
  title,
  subtitle,
  icon,
  isOpen,
  onToggle,
  summary,
  children,
  className,
}: FormSectionProps) {
  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 overflow-hidden', className)}>
      {/* Header - always visible, clickable to toggle */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-gray-500">{icon}</span>}
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {subtitle && !isOpen && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Summary when collapsed */}
          {!isOpen && summary && (
            <span className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
              {summary}
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-5 w-5 text-gray-400 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Content - collapsible */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
          {children}
        </div>
      </div>
    </div>
  )
}
