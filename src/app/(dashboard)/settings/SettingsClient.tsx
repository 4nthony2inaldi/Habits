'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CityAutocomplete } from '@/components/ui/city-autocomplete'
import { cn } from '@/lib/utils/cn'
import type { Profile } from '@/types/database'
import {
  habitLabels,
  eventLabels,
  defaultFieldGroupings,
  getFieldLabel,
  type FieldGroupings,
  type FieldGrouping,
  type TrackableField,
} from '@/types/forms'
import {
  User,
  Eye,
  EyeOff,
  Bell,
  Trophy,
  Check,
  Save,
  Loader2,
  Smartphone,
  Lock,
  Heart,
  GripVertical,
  RotateCcw,
} from 'lucide-react'
import { PushNotificationSettings } from '@/components/settings/PushNotificationSettings'
import { AppleHealthSyncSettings } from '@/components/settings/AppleHealthSyncSettings'
import { HealthConnectionsSettings } from '@/components/settings/HealthConnectionsSettings'
import { Watch } from 'lucide-react'

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
  const [homeLat, setHomeLat] = useState<number | null>(profile.home_lat)
  const [homeLng, setHomeLng] = useState<number | null>(profile.home_lng)
  const [temperatureUnit, setTemperatureUnit] = useState<'fahrenheit' | 'celsius'>(profile.temperature_unit || 'fahrenheit')

  // Privacy settings
  const [shareDrinks, setShareDrinks] = useState(profile.share_drinks)
  const [shareSteps, setShareSteps] = useState(profile.share_steps)
  const [anonymous, setAnonymous] = useState(profile.leaderboard_anonymous)

  // Hidden fields
  const [hiddenFields, setHiddenFields] = useState<string[]>(profile.hidden_fields || [])

  // Field groupings (with deep clone to avoid mutation)
  const [fieldGroupings, setFieldGroupings] = useState<FieldGroupings>(() => {
    if (profile.field_groupings) {
      return JSON.parse(JSON.stringify(profile.field_groupings)) as FieldGroupings
    }
    return JSON.parse(JSON.stringify(defaultFieldGroupings)) as FieldGroupings
  })

  // Drag state
  const [draggedField, setDraggedField] = useState<TrackableField | null>(null)
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null)

  // Notification settings
  const [reminderEnabled, setReminderEnabled] = useState(profile.reminder_enabled)
  const [reminderTime, setReminderTime] = useState(profile.reminder_time || '21:00')
  const [streakWarnings, setStreakWarnings] = useState(profile.streak_warnings_enabled)
  const [weeklyDigest, setWeeklyDigest] = useState(profile.weekly_digest_enabled)

  // Password change
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // Save status
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const toggleHiddenField = (field: string) => {
    setHiddenFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    )
  }

  // Drag and drop handlers for field groupings
  const handleDragStart = (field: TrackableField) => {
    setDraggedField(field)
  }

  const handleDragOver = (e: React.DragEvent, groupId: string) => {
    e.preventDefault()
    setDragOverGroup(groupId)
  }

  const handleDragLeave = () => {
    setDragOverGroup(null)
  }

  const handleDrop = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault()
    if (!draggedField) return

    setFieldGroupings((prev) => {
      const newGroupings = prev.map((group) => ({
        ...group,
        fields: group.fields.filter((f) => f !== draggedField),
      }))

      const targetGroup = newGroupings.find((g) => g.id === targetGroupId)
      if (targetGroup && !targetGroup.fields.includes(draggedField)) {
        targetGroup.fields.push(draggedField)
      }

      return newGroupings
    })

    setDraggedField(null)
    setDragOverGroup(null)
  }

  const handleDragEnd = () => {
    setDraggedField(null)
    setDragOverGroup(null)
  }

  const resetGroupingsToDefault = () => {
    setFieldGroupings(JSON.parse(JSON.stringify(defaultFieldGroupings)))
  }

  const getGroupColorClasses = (color: FieldGrouping['color'], isHidden: boolean) => {
    if (isHidden) {
      return 'bg-gray-100 text-gray-400 border-gray-200 line-through'
    }
    switch (color) {
      case 'green':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'purple':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'pink':
        return 'bg-pink-50 text-pink-700 border-pink-200'
      case 'blue':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'orange':
        return 'bg-orange-50 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getGroupDropZoneClasses = (color: FieldGrouping['color'], isOver: boolean) => {
    if (!isOver) return 'border-dashed border-gray-200'
    switch (color) {
      case 'green':
        return 'border-solid border-green-400 bg-green-50/50'
      case 'purple':
        return 'border-solid border-purple-400 bg-purple-50/50'
      case 'pink':
        return 'border-solid border-pink-400 bg-pink-50/50'
      case 'blue':
        return 'border-solid border-blue-400 bg-blue-50/50'
      case 'orange':
        return 'border-solid border-orange-400 bg-orange-50/50'
      default:
        return 'border-solid border-gray-400 bg-gray-50/50'
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      // Get the current user to ensure we're updating our own profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Use the authenticated user's ID instead of the prop to ensure RLS works
      const { data, error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          home_city: homeCity || null,
          home_lat: homeLat,
          home_lng: homeLng,
          temperature_unit: temperatureUnit,
          share_drinks: shareDrinks,
          share_steps: shareSteps,
          leaderboard_anonymous: anonymous,
          hidden_fields: hiddenFields,
          field_groupings: fieldGroupings,
          reminder_enabled: reminderEnabled,
          reminder_time: reminderTime,
          streak_warnings_enabled: streakWarnings,
          weekly_digest_enabled: weeklyDigest,
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      if (!data) {
        throw new Error('Failed to save settings - no data returned')
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      router.refresh()
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveError(error instanceof Error ? error.message : 'Failed to save settings')
    }
    setSaving(false)
  }

  const handleChangePassword = async () => {
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password')
    }
    setChangingPassword(false)
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
            <CityAutocomplete
              id="homeCity"
              value={homeCity}
              onChange={(value, lat, lng) => {
                setHomeCity(value)
                setHomeLat(lat ?? null)
                setHomeLng(lng ?? null)
              }}
              placeholder="Search for your home city..."
            />
            {homeCity && (
              <p className="text-xs text-gray-500">
                {homeLat && homeLng ? (
                  <span className="text-green-600">Coordinates saved - distance calculation enabled</span>
                ) : (
                  <span className="text-amber-600">No coordinates - select from dropdown to enable distance calculation</span>
                )}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Temperature Unit</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="temperatureUnit"
                  value="fahrenheit"
                  checked={temperatureUnit === 'fahrenheit'}
                  onChange={() => setTemperatureUnit('fahrenheit')}
                  className="w-4 h-4 accent-purple-600"
                />
                <span className="text-sm">Fahrenheit (°F)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="temperatureUnit"
                  value="celsius"
                  checked={temperatureUnit === 'celsius'}
                  onChange={() => setTemperatureUnit('celsius')}
                  className="w-4 h-4 accent-purple-600"
                />
                <span className="text-sm">Celsius (°C)</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your account password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
          {passwordError && (
            <p className="text-sm text-red-600">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <Check className="h-4 w-4" />
              Password changed successfully
            </p>
          )}
          <Button
            onClick={handleChangePassword}
            disabled={changingPassword || !newPassword || !confirmPassword}
            variant="outline"
          >
            {changingPassword ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Lock className="h-4 w-4 mr-2" />
            )}
            Change Password
          </Button>
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

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Receive notifications directly on this device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PushNotificationSettings
            reminderTime={reminderTime}
            onReminderTimeChange={setReminderTime}
          />
        </CardContent>
      </Card>

      {/* Apple Health Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5" />
            Apple Health Sync
          </CardTitle>
          <CardDescription>
            Automatically import steps from Apple Health via iOS Shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppleHealthSyncSettings
            profileId={profile.id}
            initialToken={profile.health_sync_token}
          />
        </CardContent>
      </Card>

      {/* Wearable Device Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Watch className="h-5 w-5" />
            Wearable Devices
          </CardTitle>
          <CardDescription>
            Connect Oura Ring or Whoop for automatic sleep and health data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HealthConnectionsSettings />
        </CardContent>
      </Card>

      {/* Other Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Other Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          {/* Customizable Field Groupings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Drag items between groups to customize. Click to toggle visibility.
              </p>
              <button
                type="button"
                onClick={resetGroupingsToDefault}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            </div>

            {fieldGroupings.map((group) => (
              <div
                key={group.id}
                onDragOver={(e) => handleDragOver(e, group.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, group.id)}
                className={cn(
                  'border-2 rounded-lg p-3 transition-colors min-h-[60px]',
                  getGroupDropZoneClasses(group.color, dragOverGroup === group.id)
                )}
              >
                <h4 className="text-sm font-medium text-gray-700 mb-2">{group.name}</h4>
                <div className="flex flex-wrap gap-2">
                  {group.fields.map((field) => (
                    <button
                      key={field}
                      type="button"
                      draggable
                      onDragStart={() => handleDragStart(field)}
                      onDragEnd={handleDragEnd}
                      onClick={() => toggleHiddenField(field)}
                      className={cn(
                        'px-2 py-1 rounded text-xs border transition-colors cursor-grab active:cursor-grabbing flex items-center gap-1',
                        getGroupColorClasses(group.color, hiddenFields.includes(field)),
                        draggedField === field && 'opacity-50'
                      )}
                    >
                      <GripVertical className="h-3 w-3 opacity-40" />
                      {getFieldLabel(field)}
                    </button>
                  ))}
                  {group.fields.length === 0 && (
                    <span className="text-xs text-gray-400 italic">
                      Drop items here
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex flex-col items-end gap-2">
        {saveError && (
          <p className="text-sm text-red-600">{saveError}</p>
        )}
        {saveSuccess && (
          <p className="text-sm text-green-600 flex items-center gap-1">
            <Check className="h-4 w-4" />
            Settings saved successfully
          </p>
        )}
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
