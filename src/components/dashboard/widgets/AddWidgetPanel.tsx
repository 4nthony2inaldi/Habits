'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'
import { type WidgetType, WIDGET_CONFIGS } from '@/lib/widgets/config'

interface AddWidgetPanelProps {
  availableWidgets: WidgetType[]
  onAddWidget: (widgetType: WidgetType) => void
}

export function AddWidgetPanel({ availableWidgets, onAddWidget }: AddWidgetPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (availableWidgets.length === 0) {
    return null
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Widget
      </Button>

      {isOpen && (
        <Card className="absolute top-full mt-2 right-0 z-50 w-80 p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Add Widget</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableWidgets.map((widgetId) => {
              const config = WIDGET_CONFIGS[widgetId]
              const Icon = config.icon

              return (
                <button
                  key={widgetId}
                  onClick={() => {
                    onAddWidget(widgetId)
                    setIsOpen(false)
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors text-left group"
                >
                  <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-purple-100">
                    <Icon className="h-5 w-5 text-gray-600 group-hover:text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{config.name}</p>
                    <p className="text-xs text-gray-500 truncate">{config.description}</p>
                  </div>
                  <Plus className="h-4 w-4 text-gray-400 group-hover:text-purple-600" />
                </button>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
