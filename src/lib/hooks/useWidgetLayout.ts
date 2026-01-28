'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  type WidgetType,
  type WidgetLayoutItem,
  type DashboardLayout,
  type LayoutItem,
  DEFAULT_LAYOUT,
  STORAGE_KEY,
  WIDGET_CONFIGS,
} from '@/lib/widgets/config'

export function useWidgetLayout() {
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load layout from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as DashboardLayout
        // Validate that all widget IDs are valid
        const validWidgets = parsed.widgets.filter(
          (w) => w.i in WIDGET_CONFIGS
        )
        setLayout({ ...parsed, widgets: validWidgets })
      }
    } catch (e) {
      console.error('Failed to load dashboard layout:', e)
    }
    setIsLoaded(true)
  }, [])

  // Save layout to localStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
      } catch (e) {
        console.error('Failed to save dashboard layout:', e)
      }
    }
  }, [layout, isLoaded])

  const updateLayout = useCallback((newLayouts: LayoutItem[]) => {
    setLayout((prev) => ({
      ...prev,
      widgets: newLayouts as WidgetLayoutItem[],
    }))
  }, [])

  const addWidget = useCallback((widgetType: WidgetType) => {
    const config = WIDGET_CONFIGS[widgetType]
    if (!config) return

    setLayout((prev) => {
      // Check if widget already exists
      if (prev.widgets.some((w) => w.i === widgetType)) {
        return prev
      }

      // Find the lowest available position
      let maxY = 0
      prev.widgets.forEach((w) => {
        const bottom = w.y + w.h
        if (bottom > maxY) maxY = bottom
      })

      const newWidget: WidgetLayoutItem = {
        i: widgetType,
        x: 0,
        y: maxY,
        w: config.defaultW,
        h: config.defaultH,
        minW: config.minW,
        minH: config.minH,
        maxW: config.maxW,
        maxH: config.maxH,
      }

      return {
        ...prev,
        widgets: [...prev.widgets, newWidget],
      }
    })
  }, [])

  const removeWidget = useCallback((widgetType: WidgetType) => {
    setLayout((prev) => ({
      ...prev,
      widgets: prev.widgets.filter((w) => w.i !== widgetType),
    }))
  }, [])

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT)
  }, [])

  const getActiveWidgets = useCallback(() => {
    return layout.widgets.map((w) => w.i)
  }, [layout.widgets])

  const getAvailableWidgets = useCallback(() => {
    const active = new Set(layout.widgets.map((w) => w.i))
    return (Object.keys(WIDGET_CONFIGS) as WidgetType[]).filter(
      (id) => !active.has(id)
    )
  }, [layout.widgets])

  return {
    layout: layout.widgets,
    isEditMode,
    isLoaded,
    setIsEditMode,
    updateLayout,
    addWidget,
    removeWidget,
    resetLayout,
    getActiveWidgets,
    getAvailableWidgets,
  }
}
