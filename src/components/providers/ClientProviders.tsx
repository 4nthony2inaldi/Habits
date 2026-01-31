'use client'

import { ReactNode } from 'react'
import { DashboardControlsProvider } from '@/lib/context/DashboardControlsContext'

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <DashboardControlsProvider>
      {children}
    </DashboardControlsProvider>
  )
}
