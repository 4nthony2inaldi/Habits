'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { Settings2, X, Check, Loader2, GripVertical, Maximize2, Minimize2, ChevronDown, ChevronRight } from 'lucide-react'
import type { Profile, HabitType, EventType } from '@/types/database'
import { habitLabels, eventLabels } from '@/types/forms'

export type WidgetSize = 'half' | 'full'

// Computed habits that are calculated from entry data
export type ComputedHabitType = 'no_alcohol' | 'was_active'

// All selectable habits (regular + computed)
export type SelectableHabitType = HabitType | ComputedHabitType

export const computedHabitLabels: Record<ComputedHabitType, string> = {
  no_alcohol: "Didn't drink",
  was_active: 'Was active (7.5k+ steps)',
}

// Short labels for mobile display
export const shortHabitLabels: Record<SelectableHabitType, string> = {
  sleep_8hrs: 'Sleep',
  breakfast: 'Breakfast',
  vitamin: 'Vitamin',
  water_8cups: 'Water',
  cooked_dinner: 'Cooked',
  exercise: 'Exercise',
  read_5pages: 'Read',
  family_interaction: 'Family',
  ate_fruit: 'Fruit',
  ate_vegetables: 'Veggies',
  journaled: 'Journal',
  no_alcohol: 'Sober',
  was_active: 'Active',
}

// Combined labels for all selectable habits
export const allHabitLabels: Record<SelectableHabitType, string> = {
  ...habitLabels,
  ...computedHabitLabels,
}

export interface WidgetSettings {
  visible: boolean
  size: WidgetSize
  order: number
}

export interface DashboardWidgetConfig {
  moodChart: WidgetSettings
  workLocationChart: WidgetSettings
  habitsGrid: WidgetSettings
  alcoholTracker: WidgetSettings
  movementChart: WidgetSettings
  eventsTracker: WidgetSettings
  selectedHabits: SelectableHabitType[]
  selectedEvents: EventType[]
}

export type WidgetKey = keyof Omit<DashboardWidgetConfig, 'selectedHabits' | 'selectedEvents'>

const allHabits = Object.keys(allHabitLabels) as SelectableHabitType[]
const allEvents = Object.keys(eventLabels) as EventType[]

const defaultConfig: DashboardWidgetConfig = {
  moodChart: { visible: true, size: 'half', order: 0 },
  workLocationChart: { visible: true, size: 'half', order: 1 },
  habitsGrid: { visible: true, size: 'full', order: 2 },
  alcoholTracker: { visible: true, size: 'half', order: 3 },
  movementChart: { visible: true, size: 'half', order: 4 },
  eventsTracker: { visible: true, size: 'full', order: 5 },
  selectedHabits: allHabits,
  selectedEvents: allEvents,
}

const widgetLabels: Record<WidgetKey, string> = {
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
  const [draggedItem, setDraggedItem] = useState<WidgetKey | null>(null)
  const [habitsExpanded, setHabitsExpanded] = useState(false)
  const [eventsExpanded, setEventsExpanded] = useState(false)
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

  const toggleWidget = (key: WidgetKey) => {
    setLocalConfig((prev) => ({
      ...prev,
      [key]: { ...prev[key], visible: !prev[key].visible },
    }))
  }

  const toggleSize = (key: WidgetKey) => {
    setLocalConfig((prev) => ({
      ...prev,
      [key]: { ...prev[key], size: prev[key].size === 'half' ? 'full' : 'half' },
    }))
  }

  const toggleHabit = (habit: SelectableHabitType) => {
    setLocalConfig((prev) => {
      const currentHabits = prev.selectedHabits
      const isSelected = currentHabits.includes(habit)
      return {
        ...prev,
        selectedHabits: isSelected
          ? currentHabits.filter((h) => h !== habit)
          : [...currentHabits, habit],
      }
    })
  }

  const selectAllHabits = () => {
    setLocalConfig((prev) => ({
      ...prev,
      selectedHabits: [...allHabits],
    }))
  }

  const deselectAllHabits = () => {
    setLocalConfig((prev) => ({
      ...prev,
      selectedHabits: [],
    }))
  }

  const toggleEvent = (event: EventType) => {
    setLocalConfig((prev) => {
      const currentEvents = prev.selectedEvents
      const isSelected = currentEvents.includes(event)
      return {
        ...prev,
        selectedEvents: isSelected
          ? currentEvents.filter((e) => e !== event)
          : [...currentEvents, event],
      }
    })
  }

  const selectAllEvents = () => {
    setLocalConfig((prev) => ({
      ...prev,
      selectedEvents: [...allEvents],
    }))
  }

  const deselectAllEvents = () => {
    setLocalConfig((prev) => ({
      ...prev,
      selectedEvents: [],
    }))
  }

  const handleDragStart = (key: WidgetKey) => {
    setDraggedItem(key)
  }

  const handleDragOver = (e: React.DragEvent, targetKey: WidgetKey) => {
    e.preventDefault()
    if (!draggedItem || draggedItem === targetKey) return

    setLocalConfig((prev) => {
      const newConfig = { ...prev }
      const draggedOrder = prev[draggedItem].order
      const targetOrder = prev[targetKey].order

      // Swap orders
      newConfig[draggedItem] = { ...prev[draggedItem], order: targetOrder }
      newConfig[targetKey] = { ...prev[targetKey], order: draggedOrder }

      return newConfig
    })
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
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

  // Sort widgets by order for display
  const widgetKeys = Object.keys(widgetLabels) as WidgetKey[]
  const sortedWidgets = widgetKeys.sort(
    (a, b) => localConfig[a].order - localConfig[b].order
  )

  const renderExpandableWidget = (key: WidgetKey) => {
    const isHabits = key === 'habitsGrid'
    const isEvents = key === 'eventsTracker'
    const isExpandable = (isHabits || isEvents) && localConfig[key].visible
    const isExpanded = isHabits ? habitsExpanded : eventsExpanded
    const setExpanded = isHabits ? setHabitsExpanded : setEventsExpanded
    const items = isHabits ? allHabits : allEvents
    const selectedItems = isHabits ? localConfig.selectedHabits : localConfig.selectedEvents
    const labels = isHabits ? allHabitLabels : eventLabels
    const toggleItem = isHabits ? toggleHabit : toggleEvent
    const selectAll = isHabits ? selectAllHabits : selectAllEvents
    const deselectAll = isHabits ? deselectAllHabits : deselectAllEvents

    if (!isExpandable) {
      return (
        <span className="text-sm text-gray-700 flex-1 truncate">
          {widgetLabels[key]}
        </span>
      )
    }

    return (
      <button
        type="button"
        onClick={() => setExpanded(!isExpanded)}
        className="flex items-center gap-1 text-sm text-gray-700 flex-1"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        {widgetLabels[key]}
        <span className="text-xs text-gray-400">
          ({selectedItems.length}/{items.length})
        </span>
      </button>
    )
  }

  const renderSelectionDropdown = (key: WidgetKey) => {
    const isHabits = key === 'habitsGrid'
    const isEvents = key === 'eventsTracker'

    if (!isHabits && !isEvents) return null
    if (!localConfig[key].visible) return null

    const isExpanded = isHabits ? habitsExpanded : eventsExpanded
    if (!isExpanded) return null

    const items = isHabits ? allHabits : allEvents
    const selectedItems = isHabits ? localConfig.selectedHabits : localConfig.selectedEvents
    const labels = isHabits ? allHabitLabels : eventLabels
    const toggleItem = isHabits
      ? (item: string) => toggleHabit(item as SelectableHabitType)
      : (item: string) => toggleEvent(item as EventType)
    const selectAll = isHabits ? selectAllHabits : selectAllEvents
    const deselectAll = isHabits ? deselectAllHabits : deselectAllEvents
    const itemLabel = isHabits ? 'habits' : 'events'

    return (
      <div className="ml-6 mt-1 p-2 bg-gray-50 rounded-lg space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-gray-600">Select {itemLabel} to show:</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-purple-600 hover:underline"
            >
              All
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-xs text-purple-600 hover:underline"
            >
              None
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto">
          {items.map((item) => (
            <label
              key={item}
              className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedItems.includes(item as never)}
                onChange={() => toggleItem(item)}
                className="w-4 h-4 accent-purple-600 rounded"
              />
              <span className="text-xs text-gray-700">{labels[item as keyof typeof labels]}</span>
            </label>
          ))}
        </div>
      </div>
    )
  }

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
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Customize Dashboard</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          <div className="p-4 space-y-1 max-h-96 overflow-y-auto">
            <p className="text-xs text-gray-500 mb-3">
              Drag to reorder, toggle visibility and size
            </p>
            {sortedWidgets.map((key) => (
              <div key={key}>
                <div
                  draggable
                  onDragStart={() => handleDragStart(key)}
                  onDragOver={(e) => handleDragOver(e, key)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg border border-transparent transition-colors',
                    draggedItem === key ? 'bg-purple-50 border-purple-200' : 'hover:bg-gray-50',
                    !localConfig[key].visible && 'opacity-50'
                  )}
                >
                  <GripVertical className="h-4 w-4 text-gray-400 cursor-grab flex-shrink-0" />

                  {renderExpandableWidget(key)}

                  <button
                    type="button"
                    onClick={() => toggleSize(key)}
                    className={cn(
                      'p-1.5 rounded transition-colors',
                      localConfig[key].size === 'full'
                        ? 'bg-purple-100 text-purple-600'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    )}
                    title={localConfig[key].size === 'full' ? 'Full width' : 'Half width'}
                  >
                    {localConfig[key].size === 'full' ? (
                      <Maximize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Minimize2 className="h-3.5 w-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleWidget(key)}
                    className={cn(
                      'w-9 h-5 rounded-full transition-colors relative flex-shrink-0',
                      localConfig[key].visible ? 'bg-purple-600' : 'bg-gray-200'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm',
                        localConfig[key].visible ? 'translate-x-4' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                </div>

                {renderSelectionDropdown(key)}
              </div>
            ))}
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

// Helper to migrate old config format to new format
function migrateConfig(oldConfig: unknown): DashboardWidgetConfig {
  if (!oldConfig || typeof oldConfig !== 'object') {
    return defaultConfig
  }

  const config = oldConfig as Record<string, unknown>

  // Start with defaults
  const result = { ...defaultConfig }

  // Check if it has the new widget format
  if (config.moodChart && typeof config.moodChart === 'object' && 'visible' in (config.moodChart as object)) {
    // Merge widget settings
    for (const key of Object.keys(widgetLabels) as WidgetKey[]) {
      if (key in config && typeof config[key] === 'object') {
        result[key] = { ...defaultConfig[key], ...(config[key] as WidgetSettings) }
      }
    }
  } else {
    // Migrate from old boolean format
    for (const key of Object.keys(widgetLabels) as WidgetKey[]) {
      if (key in config) {
        const value = config[key]
        if (typeof value === 'boolean') {
          result[key] = { ...defaultConfig[key], visible: value }
        }
      }
    }
  }

  // Migrate selectedHabits
  if ('selectedHabits' in config && Array.isArray(config.selectedHabits)) {
    result.selectedHabits = config.selectedHabits as SelectableHabitType[]
  }

  // Migrate selectedEvents
  if ('selectedEvents' in config && Array.isArray(config.selectedEvents)) {
    result.selectedEvents = config.selectedEvents as EventType[]
  }

  return result
}

export function getWidgetConfig(profile: Profile): DashboardWidgetConfig {
  const customMetrics = profile.custom_metrics
  return migrateConfig(customMetrics)
}

export function getOrderedVisibleWidgets(config: DashboardWidgetConfig): WidgetKey[] {
  const widgetKeys = Object.keys(widgetLabels) as WidgetKey[]
  return widgetKeys
    .filter((key) => config[key].visible)
    .sort((a, b) => config[a].order - config[b].order)
}
