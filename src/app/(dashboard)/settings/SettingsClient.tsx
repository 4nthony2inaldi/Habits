'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils/cn'
import type { Profile } from '@/types/database'
import { habitLabels, eventLabels } from '@/types/forms'
import {
  User,
  Eye,
  EyeOff,
  Bell,
  Trophy,
  Check,
  Save,
  Loader2,
} from 'lucide-react'

interface SettingsClientProps {
  profile: Profile
}

export function SettingsClient({ profile }: SettingsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  // Profile settings
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [homeCity, setHomeCity] = useState(profile.home_city || '')

  // Privacy settings
  const [shareDrinks, setShareDrinks] = useState(profile.share_drinks)
  const [shareSteps, setShareSteps] = useState(profile.share_steps)
  const [anonymous, setAnonymous] = useState(profile.leaderboard_anonymous)

  // Hidden fields
  const [hiddenFields, setHiddenFields] = useState<string[]>(profile.hidden_fields || [])

  // Notification settings
  const [reminderEnabled, setReminderEnabled] = useState(profile.reminder_enabled)
  const [reminderTime, setReminderTime] = useState(profile.reminder_time || '21:00')
  const [streakWarnings, setStreakWarnings] = useState(profile.streak_warnings_enabled)
  const [weeklyDigest, setWeeklyDigest] = useState(profile.weekly_digest_enabled)

  const toggleHiddenField = (field: string) => {
    setHiddenFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          home_city: homeCity || null,
          share_drinks: shareDrinks,
          share_steps: shareSteps,
          leaderboard_anonymous: anonymous,
          hidden_fields: hiddenFields,
          reminder_enabled: reminderEnabled,
          reminder_time: reminderTime,
          streak_warnings_enabled: streakWarnings,
          weekly_digest_enabled: weeklyDigest,
        })
        .eq('id', profile.id)

      if (error) throw error
      router.refresh()
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
    setSaving(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your profile and preferences</p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="homeCity">Home City</Label>
            <Input
              id="homeCity"
              value={homeCity}
              onChange={(e) => setHomeCity(e.target.value)}
              placeholder="For distance calculations"
            />
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5" />
            Leaderboard Participation
          </CardTitle>
          <CardDescription>
            Choose which metrics to share with the group
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <span className="font-medium">Share Drinks Leaderboard</span>
              <input
                type="checkbox"
                checked={shareDrinks}
                onChange={(e) => setShareDrinks(e.target.checked)}
                className="w-5 h-5 accent-purple-600"
              />
            </label>
            <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <span className="font-medium">Share Steps Leaderboard</span>
              <input
                type="checkbox"
                checked={shareSteps}
                onChange={(e) => setShareSteps(e.target.checked)}
                className="w-5 h-5 accent-purple-600"
              />
            </label>
            <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <div>
                <span className="font-medium flex items-center gap-2">
                  <EyeOff className="h-4 w-4" />
                  Anonymous Mode
                </span>
                <p className="text-sm text-gray-500">Show rank but hide your name</p>
              </div>
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="w-5 h-5 accent-purple-600"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div>
              <span className="font-medium">Daily Reminder</span>
              <p className="text-sm text-gray-500">Get reminded to log your day</p>
            </div>
            <input
              type="checkbox"
              checked={reminderEnabled}
              onChange={(e) => setReminderEnabled(e.target.checked)}
              className="w-5 h-5 accent-purple-600"
            />
          </label>
          {reminderEnabled && (
            <div className="pl-4 space-y-2">
              <Label htmlFor="reminderTime">Reminder Time</Label>
              <Input
                id="reminderTime"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="max-w-[150px]"
              />
            </div>
          )}
          <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div>
              <span className="font-medium">Streak Warnings</span>
              <p className="text-sm text-gray-500">Alert when streak is at risk</p>
            </div>
            <input
              type="checkbox"
              checked={streakWarnings}
              onChange={(e) => setStreakWarnings(e.target.checked)}
              className="w-5 h-5 accent-purple-600"
            />
          </label>
          <label className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <div>
              <span className="font-medium">Weekly Digest</span>
              <p className="text-sm text-gray-500">Sunday summary email</p>
            </div>
            <input
              type="checkbox"
              checked={weeklyDigest}
              onChange={(e) => setWeeklyDigest(e.target.checked)}
              className="w-5 h-5 accent-purple-600"
            />
          </label>
        </CardContent>
      </Card>

      {/* Hidden Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5" />
            Customize Form Fields
          </CardTitle>
          <CardDescription>
            Hide fields you don't use to simplify your entry form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Alcohol Tracking</h4>
            <div className="flex flex-wrap gap-2">
              {['beers', 'seltzers', 'wine', 'liquor', 'shots'].map((field) => (
                <button
                  key={field}
                  type="button"
                  onClick={() => toggleHiddenField(field)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm border transition-colors',
                    hiddenFields.includes(field)
                      ? 'bg-gray-100 text-gray-500 border-gray-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                  )}
                >
                  {hiddenFields.includes(field) ? 'Hidden' : 'Visible'}: {field}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Location Tracking</h4>
            <button
              type="button"
              onClick={() => toggleHiddenField('location_tracking')}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm border transition-colors',
                hiddenFields.includes('location_tracking')
                  ? 'bg-gray-100 text-gray-500 border-gray-200'
                  : 'bg-purple-50 text-purple-700 border-purple-200'
              )}
            >
              {hiddenFields.includes('location_tracking') ? 'Hidden' : 'Visible'}
            </button>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Healthy Habits</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(habitLabels).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleHiddenField(key)}
                  className={cn(
                    'px-2 py-1 rounded text-xs border transition-colors',
                    hiddenFields.includes(key)
                      ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                      : 'bg-green-50 text-green-700 border-green-200'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Life Events</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(eventLabels).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleHiddenField(key)}
                  className={cn(
                    'px-2 py-1 rounded text-xs border transition-colors',
                    hiddenFields.includes(key)
                      ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  )
}
