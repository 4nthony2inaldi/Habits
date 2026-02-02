'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Link as LinkIcon,
  Unlink,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  History,
} from 'lucide-react'
import type { HealthProvider } from '@/types/database'

interface HealthConnection {
  id: string
  provider: HealthProvider
  provider_user_id: string | null
  last_sync_at: string | null
  last_sync_status: 'success' | 'error' | 'pending' | null
  last_sync_error: string | null
  created_at: string
}

export function HealthConnectionsSettings() {
  const [connections, setConnections] = useState<HealthConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<HealthProvider | null>(null)
  const [disconnecting, setDisconnecting] = useState<HealthProvider | null>(null)
  const [historicalSyncing, setHistoricalSyncing] = useState(false)

  // Fetch connections on mount
  useEffect(() => {
    fetchConnections()
  }, [])

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/health/provider-sync')
      if (response.ok) {
        const data = await response.json()
        setConnections(data.connections || [])
      }
    } catch (error) {
      console.error('Failed to fetch health connections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = (provider: HealthProvider) => {
    // Redirect to OAuth flow
    window.location.href = `/api/health/${provider}/authorize`
  }

  const handleDisconnect = async (provider: HealthProvider) => {
    if (!confirm(`Are you sure you want to disconnect ${provider === 'oura' ? 'Oura Ring' : 'Whoop'}?`)) {
      return
    }

    setDisconnecting(provider)
    try {
      const response = await fetch('/api/health/provider-sync', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })

      if (response.ok) {
        setConnections((prev) => prev.filter((c) => c.provider !== provider))
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
    } finally {
      setDisconnecting(null)
    }
  }

  const handleSync = async (provider: HealthProvider) => {
    setSyncing(provider)
    try {
      const response = await fetch('/api/health/provider-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh connections to get updated sync status
        await fetchConnections()
        // Show success feedback with synced data details AND debug info
        const syncedData = data.data
        const details = []
        if (syncedData?.steps !== null) details.push(`${syncedData.steps.toLocaleString()} steps`)
        if (syncedData?.sleepHours !== null) details.push(`${syncedData.sleepHours.toFixed(1)}h sleep`)
        if (syncedData?.sleepScore !== null) details.push(`score: ${syncedData.sleepScore}`)
        if (syncedData?.hrv !== null) details.push(`HRV: ${syncedData.hrv}`)

        const detailsStr = details.length > 0 ? details.join(', ') : 'No data'

        // Debug info from API response
        const debug = data.debug
        let debugStr = ''
        if (debug) {
          debugStr = `\n\n[Debug]\nQueried: ${debug.queriedDate}\nSleep periods: ${debug.sleepPeriodsCount}`
          if (debug.sleepPeriods?.length > 0) {
            debugStr += `\n  ${debug.sleepPeriods.map((p: { day: string; hrs: number }) => `${p.day}: ${p.hrs}h`).join('\n  ')}`
          }
          debugStr += `\nActivities: ${debug.activityDataCount}`
        }

        alert(`Synced ${provider === 'oura' ? 'Oura' : 'Whoop'} for ${data.date}\n${detailsStr}${debugStr}`)
      } else {
        alert(data.error || 'Sync failed')
      }
    } catch (error) {
      console.error('Failed to sync:', error)
      alert('Failed to sync data')
    } finally {
      setSyncing(null)
    }
  }

  const handleHistoricalSync = async (days: number) => {
    if (!confirm(`This will sync the last ${days} days of Oura data. This may take a moment. Continue?`)) {
      return
    }

    setHistoricalSyncing(true)
    try {
      const response = await fetch('/api/health/historical-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      })

      const data = await response.json()

      if (response.ok) {
        await fetchConnections()
        alert(
          `Historical sync complete!\n\n` +
          `Total days: ${data.total}\n` +
          `Synced: ${data.synced}\n` +
          `Created: ${data.created}\n` +
          `Updated: ${data.updated}\n` +
          `Skipped (no data): ${data.skipped}\n` +
          `Errors: ${data.errors}`
        )
      } else {
        alert(data.error || 'Historical sync failed')
      }
    } catch (error) {
      console.error('Failed to historical sync:', error)
      alert('Failed to sync historical data')
    } finally {
      setHistoricalSyncing(false)
    }
  }

  const getConnection = (provider: HealthProvider) => connections.find((c) => c.provider === provider)

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const renderConnectionCard = (
    provider: HealthProvider,
    name: string,
    description: string,
    logo: React.ReactNode
  ) => {
    const connection = getConnection(provider)
    const isConnected = !!connection
    const isSyncing = syncing === provider
    const isDisconnecting = disconnecting === provider

    return (
      <div className="p-4 border rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              {logo}
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{name}</h4>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
          </div>

          {isConnected ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSync(provider)}
                disabled={isSyncing || isDisconnecting}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-1.5 hidden sm:inline">Sync</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDisconnect(provider)}
                disabled={isSyncing || isDisconnecting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => handleConnect(provider)}>
              <LinkIcon className="h-4 w-4 mr-1.5" />
              Connect
            </Button>
          )}
        </div>

        {isConnected && connection && (
          <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last sync: {formatLastSync(connection.last_sync_at)}
              </span>
              {connection.last_sync_status === 'success' && (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Success
                </span>
              )}
              {connection.last_sync_status === 'error' && (
                <span className="text-red-600 flex items-center gap-1" title={connection.last_sync_error || undefined}>
                  <XCircle className="h-3 w-3" />
                  Error
                </span>
              )}
              {connection.last_sync_status === 'pending' && (
                <span className="text-amber-600 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Pending
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">
        Connect your wearable devices to automatically import sleep and activity data.
      </p>

      {renderConnectionCard(
        'oura',
        'Oura Ring',
        'Sleep, steps, HRV, and recovery data',
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}

      {/* Historical sync for Oura */}
      {getConnection('oura') && (
        <div className="p-4 border rounded-lg bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-gray-500" />
              <div>
                <h4 className="font-medium text-gray-900 text-sm">Historical Sync</h4>
                <p className="text-xs text-gray-500">One-time import of past Oura data</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleHistoricalSync(30)}
                disabled={historicalSyncing}
              >
                {historicalSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                30d
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleHistoricalSync(90)}
                disabled={historicalSyncing}
              >
                90d
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleHistoricalSync(365)}
                disabled={historicalSyncing}
              >
                1yr
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleHistoricalSync(730)}
                disabled={historicalSyncing}
              >
                2yr
              </Button>
            </div>
          </div>
        </div>
      )}

      {renderConnectionCard(
        'whoop',
        'Whoop',
        'Sleep, recovery, and strain data (no steps)',
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <rect x="4" y="8" width="16" height="8" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      )}

      <div className="text-xs text-gray-500 mt-4 space-y-1">
        <p>• Data syncs for yesterday by default. Click Sync to pull the latest data.</p>
        <p>• Oura requires an active Oura Membership for API access.</p>
        <p>• Whoop does not track steps - only sleep and recovery metrics.</p>
      </div>
    </div>
  )
}
