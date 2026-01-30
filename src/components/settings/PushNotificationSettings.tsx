'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2, Smartphone, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

interface PushNotificationSettingsProps {
  reminderTime: string
  onReminderTimeChange: (time: string) => void
}

export function PushNotificationSettings({
  reminderTime,
  onReminderTimeChange,
}: PushNotificationSettingsProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkPushSupport()
  }, [])

  async function checkPushSupport() {
    setLoading(true)
    setError(null)

    // Check if push notifications are supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setIsSupported(false)
      setLoading(false)
      return
    }

    setIsSupported(true)
    setPermission(Notification.permission)

    // Check if already subscribed
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (err) {
      console.error('Error checking push subscription:', err)
    }

    setLoading(false)
  }

  async function subscribeToPush() {
    setSubscribing(true)
    setError(null)

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission()
      setPermission(permissionResult)

      if (permissionResult !== 'granted') {
        setError('Permission denied. Please enable notifications in your browser settings.')
        setSubscribing(false)
        return
      }

      // Get VAPID public key
      const vapidResponse = await fetch('/api/push/vapid-public-key')
      if (!vapidResponse.ok) {
        throw new Error('Failed to get VAPID public key. Please check server configuration.')
      }
      const { publicKey } = await vapidResponse.json()

      // Subscribe to push notifications
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          reminderTime: reminderTime + ':00',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save subscription to server')
      }

      setIsSubscribed(true)
    } catch (err) {
      console.error('Error subscribing to push:', err)
      setError(err instanceof Error ? err.message : 'Failed to enable notifications')
    }

    setSubscribing(false)
  }

  async function unsubscribeFromPush() {
    setSubscribing(true)
    setError(null)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe()

        // Remove from server
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
      }

      setIsSubscribed(false)
    } catch (err) {
      console.error('Error unsubscribing from push:', err)
      setError('Failed to disable notifications')
    }

    setSubscribing(false)
  }

  // Helper function to convert VAPID key
  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking notification support...</span>
        </div>
      </div>
    )
  }

  if (!isSupported) {
    return (
      <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Push notifications not supported</p>
            <p className="text-sm text-amber-700 mt-1">
              Your browser or device doesn't support push notifications. Try using Chrome, Firefox, or Edge on desktop, or add this app to your home screen on mobile.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Push notification enable/disable */}
      <div className={cn(
        'p-4 border rounded-lg transition-colors',
        isSubscribed ? 'bg-green-50 border-green-200' : 'bg-gray-50'
      )}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              'p-2 rounded-full',
              isSubscribed ? 'bg-green-100' : 'bg-gray-200'
            )}>
              {isSubscribed ? (
                <Bell className="h-5 w-5 text-green-600" />
              ) : (
                <BellOff className="h-5 w-5 text-gray-500" />
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {isSubscribed ? 'Push Notifications Enabled' : 'Enable Push Notifications'}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {isSubscribed
                  ? 'You will receive daily reminders on this device'
                  : 'Get daily reminders to log your habits directly to your device'}
              </p>
              {isSubscribed && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <Smartphone className="h-4 w-4" />
                  <span>Active on this device</span>
                </div>
              )}
            </div>
          </div>

          <Button
            variant={isSubscribed ? 'outline' : 'default'}
            size="sm"
            onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
            disabled={subscribing}
          >
            {subscribing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isSubscribed ? (
              'Disable'
            ) : (
              'Enable'
            )}
          </Button>
        </div>
      </div>

      {/* Reminder time setting */}
      {isSubscribed && (
        <div className="pl-4 space-y-2">
          <label htmlFor="pushReminderTime" className="text-sm font-medium text-gray-700">
            Daily Reminder Time
          </label>
          <div className="flex items-center gap-2">
            <input
              id="pushReminderTime"
              type="time"
              value={reminderTime}
              onChange={(e) => onReminderTimeChange(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            />
            <span className="text-sm text-gray-500">
              ({Intl.DateTimeFormat().resolvedOptions().timeZone})
            </span>
          </div>
          <p className="text-xs text-gray-500">
            You'll receive a notification at this time if you haven't logged your entry for the day.
          </p>
        </div>
      )}

      {/* Permission denied warning */}
      {permission === 'denied' && (
        <div className="p-3 border rounded-lg bg-red-50 border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-red-800">Notifications blocked</p>
              <p className="text-red-700 mt-1">
                You've blocked notifications for this site. To enable them, click the lock icon in your browser's address bar and allow notifications.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 border rounded-lg bg-red-50 border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
