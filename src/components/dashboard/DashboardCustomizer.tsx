'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { Settings2, X, Check, Loader2 } from 'lucide-react'
import type { Profile } from '@/types/database'

export interface DashboardWidgetConfig {
  moodChart: boolean
  workLocationChart: boolean
  habitsGrid: boolean
  alcoholTracker: boolean
  movementChart: boolean
  eventsTracker: boolean
}

const defaultConfig: DashboardWidgetConfig = {
  moodChart: true,
  workLocationChart: true,
  habitsGrid: true,
  alcoholTracker: true,
  movementChart: true,
  eventsTracker: true,
}

const widgetLabels: Record<keyof DashboardWidgetConfig, string> = {
  moodChart: 'Mood Chart',
  workLocationChart: 'Work Location',
  habitsGrid: 'Habits Grid',
  alcoholTracker: 'Alcohol Tracker',
  movementChart: 'Movement Chart',
  eventsTracker: 'Events Tracker',
}

interface DashboardCustomizerProps {
  profile: Profile
  config: DashboardWidgetConfig
  onConfigChange: (config: DashboardWidgetConfig) => void
}

export function DashboardCustomizer({
  profile,
  config,
  onConfigChange,
}: DashboardCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localConfig, setLocalConfig] = useState(config)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLocalConfig(config)
  }, [config])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const toggleWidget = (key: keyof DashboardWidgetConfig) => {
    setLocalConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({
          custom_metrics: localConfig as unknown as Record<string, unknown>,
        })
        .eq('id', profile.id)

      if (error) throw error
      onConfigChange(localConfig)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to save dashboard config:', error)
    }
    setSaving(false)
  }

  const hasChanges = JSON.stringify(localConfig) !== JSON.stringify(config)

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Settings2 className="h-4 w-4" />
        <span className="hidden sm:inline">Customize</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Customize Dashboard</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          <div className="p-4 space-y-2">
            <p className="text-xs text-gray-500 mb-3">
              Show or hide dashboard widgets
            </p>
            {(Object.keys(widgetLabels) as Array<keyof DashboardWidgetConfig>).map(
              (key) => (
                <label
                  key={key}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <span className="text-sm text-gray-700">{widgetLabels[key]}</span>
                  <button
                    type="button"
                    onClick={() => toggleWidget(key)}
                    className={cn(
                      'w-10 h-6 rounded-full transition-colors relative',
                      localConfig[key] ? 'bg-purple-600' : 'bg-gray-200'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
                        localConfig[key] ? 'translate-x-5' : 'translate-x-1'
                      )}
                    />
                  </button>
                </label>
              )
            )}
          </div>

          <div className="p-4 border-t border-gray-100">
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="w-full"
              size="sm"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function getWidgetConfig(profile: Profile): DashboardWidgetConfig {
  const customMetrics = profile.custom_metrics as unknown as DashboardWidgetConfig | null
  if (customMetrics && typeof customMetrics === 'object') {
    return {
      ...defaultConfig,
      ...customMetrics,
    }
  }
  return defaultConfig
}
