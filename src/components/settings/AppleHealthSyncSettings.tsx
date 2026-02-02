'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Heart,
  Copy,
  RefreshCw,
  Check,
  ExternalLink,
  Loader2,
} from 'lucide-react'

interface AppleHealthSyncSettingsProps {
  profileId: string
  initialToken: string | null
}

export function AppleHealthSyncSettings({
  profileId,
  initialToken,
}: AppleHealthSyncSettingsProps) {
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(initialToken)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const generateToken = async () => {
    setGenerating(true)
    try {
      // Get the current user to ensure we're updating our own profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Generate a random token
      const newToken = crypto.randomUUID()

      const { data, error } = await supabase
        .from('profiles')
        .update({ health_sync_token: newToken })
        .eq('id', user.id)
        .select('health_sync_token')
        .single()

      if (error) throw error
      if (!data) throw new Error('Failed to save token')
      setToken(newToken)
    } catch (error) {
      console.error('Failed to generate token:', error)
    }
    setGenerating(false)
  }

  const copyToken = async () => {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const copyUrl = async () => {
    if (!token) return
    const url = `${window.location.origin}/api/health/sync?token=${token}&steps=`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const revokeToken = async () => {
    setGenerating(true)
    try {
      // Get the current user to ensure we're updating our own profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({ health_sync_token: null })
        .eq('id', user.id)
        .select('health_sync_token')
        .single()

      if (error) throw error
      if (!data) throw new Error('Failed to revoke token')
      setToken(null)
    } catch (error) {
      console.error('Failed to revoke token:', error)
    }
    setGenerating(false)
  }

  return (
    <div className="space-y-4">
      {!token ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Generate a sync token to automatically import your steps, sleep, and miles from Apple Health
            using iOS Shortcuts.
          </p>
          <Button onClick={generateToken} disabled={generating}>
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Heart className="h-4 w-4 mr-2" />
            )}
            Enable Apple Health Sync
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Your Sync Token</label>
            <div className="flex gap-2">
              <Input
                value={token}
                readOnly
                className="font-mono text-sm bg-gray-50"
              />
              <Button variant="outline" size="icon" onClick={copyToken}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={copyUrl}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Sync URL
            </Button>
            <Button variant="outline" size="sm" onClick={generateToken} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Regenerate Token
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={revokeToken}
              disabled={generating}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Disable Sync
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-blue-900 flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Setup Instructions
            </h4>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Open the <strong>Shortcuts</strong> app on your iPhone</li>
              <li>Create a new shortcut with these actions:</li>
            </ol>
            <div className="bg-white rounded p-3 text-xs font-mono space-y-1 text-gray-700">
              <p className="text-gray-500"># Calculate start of today (midnight)</p>
              <p><strong>Date</strong></p>
              <p className="pl-4">Current Date</p>
              <p><strong>Adjust Date</strong></p>
              <p className="pl-4">Get Start of Day in [Date]</p>
              <p><strong>Set variable</strong> &quot;StartOfToday&quot; to Adjusted Date</p>

              <p className="mt-2 text-gray-500"># Calculate start of yesterday (midnight)</p>
              <p><strong>Adjust Date</strong></p>
              <p className="pl-4">Subtract 1 day from [StartOfToday]</p>
              <p><strong>Set variable</strong> &quot;StartOfYesterday&quot; to Adjusted Date</p>

              <p className="mt-2 text-gray-500"># Get yesterday&apos;s steps</p>
              <p><strong>Find Health Samples</strong></p>
              <p className="pl-4">Type: Steps</p>
              <p className="pl-4">Start Date: <strong>is between</strong> [StartOfYesterday] and [StartOfToday]</p>
              <p><strong>Calculate Statistics</strong></p>
              <p className="pl-4">Calculate <strong>Sum</strong> of Health Samples</p>
              <p><strong>Set variable</strong> &quot;Steps&quot; to Statistics</p>

              <p className="mt-2 text-gray-500"># Get all sleep data in one query</p>
              <p><strong>Find Health Samples</strong></p>
              <p className="pl-4">Type: Sleep Analysis</p>
              <p className="pl-4">Start Date: <strong>is between</strong> [StartOfYesterday] and [StartOfToday]</p>
              <p><strong>Set variable</strong> &quot;SleepSamples&quot; to Health Samples</p>

              <p className="mt-2 text-gray-500"># Get yesterday&apos;s walking + running distance</p>
              <p><strong>Find Health Samples</strong></p>
              <p className="pl-4">Type: Walking + Running Distance</p>
              <p className="pl-4">Start Date: <strong>is between</strong> [StartOfYesterday] and [StartOfToday]</p>
              <p><strong>Calculate Statistics</strong></p>
              <p className="pl-4">Calculate <strong>Sum</strong> of Health Samples</p>
              <p><strong>Set variable</strong> &quot;Miles&quot; to Statistics</p>

              <p className="mt-2 text-gray-500"># Build request body</p>
              <p><strong>Dictionary</strong></p>
              <p className="pl-4">token: {token}</p>
              <p className="pl-4">steps: [Steps]</p>
              <p className="pl-4">miles: [Miles]</p>
              <p className="pl-4">sleep_samples: [SleepSamples]</p>
              <p><strong>Set variable</strong> &quot;RequestBody&quot; to Dictionary</p>

              <p className="mt-2 text-gray-500"># Send to your tracker</p>
              <p><strong>Get Contents of URL</strong></p>
              <p className="pl-4 break-all">
                {window.location.origin}/api/health/sync
              </p>
              <p className="pl-4">Method: <strong>POST</strong></p>
              <p className="pl-4">Request Body: <strong>JSON</strong></p>
              <p className="pl-4">Body: [RequestBody]</p>
            </div>
            <p className="text-xs text-blue-700">
              <strong>Simplified:</strong> Sleep Analysis returns all sleep stages in one query. The server automatically parses In Bed, Awake, REM, Core, and Deep sleep from the raw data. Use &quot;Calculate Statistics&quot; with &quot;Sum&quot; for steps and miles to aggregate from multiple sources.
            </p>
            <ol start={3} className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Optionally, set up an <strong>Automation</strong> to run this Shortcut daily at bedtime</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}
