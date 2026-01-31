'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface DashboardControlsContextType {
  controlsCollapsed: boolean
  toggleControls: () => void
}

const DashboardControlsContext = createContext<DashboardControlsContextType | undefined>(undefined)

const STORAGE_KEY = 'dashboard-controls-collapsed'

export function DashboardControlsProvider({ children }: { children: ReactNode }) {
  const [controlsCollapsed, setControlsCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setControlsCollapsed(stored === 'true')
    }
    setMounted(true)
  }, [])

  // Save to localStorage when changed
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, String(controlsCollapsed))
    }
  }, [controlsCollapsed, mounted])

  const toggleControls = () => {
    setControlsCollapsed((prev) => !prev)
  }

  return (
    <DashboardControlsContext.Provider value={{ controlsCollapsed, toggleControls }}>
      {children}
    </DashboardControlsContext.Provider>
  )
}

export function useDashboardControls() {
  const context = useContext(DashboardControlsContext)
  if (context === undefined) {
    throw new Error('useDashboardControls must be used within a DashboardControlsProvider')
  }
  return context
}
