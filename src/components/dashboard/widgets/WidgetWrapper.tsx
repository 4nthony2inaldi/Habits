'use client'

import { X, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { WidgetType } from '@/lib/widgets/config'
import { WIDGET_CONFIGS } from '@/lib/widgets/config'

interface WidgetWrapperProps {
  widgetId: WidgetType
  isEditMode: boolean
  onRemove: (id: WidgetType) => void
  children: React.ReactNode
}

export function WidgetWrapper({
  widgetId,
  isEditMode,
  onRemove,
  children,
}: WidgetWrapperProps) {
  const config = WIDGET_CONFIGS[widgetId]

  return (
    <div className="relative h-full group">
      {isEditMode && (
        <>
          {/* Drag handle */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-purple-500/10 to-transparent z-10 cursor-move flex items-center justify-center drag-handle">
            <GripVertical className="h-4 w-4 text-purple-500" />
          </div>

          {/* Remove button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove(widgetId)
            }}
            className="absolute top-1 right-1 z-20 p-1.5 rounded-full bg-red-100 hover:bg-red-200 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title={`Remove ${config.name}`}
          >
            <X className="h-4 w-4" />
          </button>

          {/* Edit mode overlay border */}
          <div className="absolute inset-0 border-2 border-dashed border-purple-300 rounded-lg pointer-events-none" />
        </>
      )}

      <div className={cn('h-full', isEditMode && 'pt-2')}>
        {children}
      </div>
    </div>
  )
}
