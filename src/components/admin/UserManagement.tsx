'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  User,
  Shield,
  ShieldOff,
  Mail,
  Calendar,
  BarChart3,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Copy,
  Eye,
  EyeOff,
  LayoutGrid
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { Profile, NotificationChannel } from '@/types/database'

interface UserManagementProps {
  currentUser: Profile
  users: Profile[]
  onUserAdded?: (user: Profile) => void
}

interface UserStats {
  totalEntries: number
  firstEntry: string | null
  lastEntry: string | null
  avgMood: number | null
}

export function UserManagement({ currentUser, users: initialUsers, onUserAdded }: UserManagementProps) {
  const [users, setUsers] = useState(initialUsers)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [userStats, setUserStats] = useState<Record<string, UserStats>>({})
  const [loadingStats, setLoadingStats] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Invite user state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteDisplayName, setInviteDisplayName] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [pushLayoutLoading, setPushLayoutLoading] = useState(false)
  const [inviteResult, setInviteResult] = useState<{
    email: string
    displayName: string
    temporaryPassword: string
  } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const fetchUserStats = async (userId: string) => {
    if (userStats[userId]) return

    setLoadingStats(userId)
    const supabase = createClient()

    try {
      const { data: entries, count } = await supabase
        .from('daily_entries')
        .select('entry_date, mood_score', { count: 'exact' })
        .eq('user_id', userId)
        .order('entry_date', { ascending: true })

      const stats: UserStats = {
        totalEntries: count || 0,
        firstEntry: entries?.[0]?.entry_date || null,
        lastEntry: entries?.[entries.length - 1]?.entry_date || null,
        avgMood: null
      }

      if (entries && entries.length > 0) {
        const moodScores = entries
          .map(e => e.mood_score)
          .filter((m): m is number => m !== null)
        if (moodScores.length > 0) {
          stats.avgMood = moodScores.reduce((a, b) => a + b, 0) / moodScores.length
        }
      }

      setUserStats(prev => ({ ...prev, [userId]: stats }))
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    } finally {
      setLoadingStats(null)
    }
  }

  const toggleUserExpand = (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null)
    } else {
      setExpandedUser(userId)
      fetchUserStats(userId)
    }
  }

  const toggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    if (userId === currentUser.id) {
      setMessage({ type: 'error', text: "You cannot change your own admin status" })
      return
    }

    setActionLoading(userId)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: !currentIsAdmin })
      .eq('id', userId)

    if (error) {
      setMessage({ type: 'error', text: `Failed to update admin status: ${error.message}` })
    } else {
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, is_admin: !currentIsAdmin } : u
      ))
      setMessage({
        type: 'success',
        text: `${!currentIsAdmin ? 'Granted' : 'Revoked'} admin access`
      })
    }

    setActionLoading(null)
  }

  const inviteUser = async () => {
    if (!inviteEmail || !inviteDisplayName) {
      setMessage({ type: 'error', text: 'Email and display name are required' })
      return
    }

    setInviteLoading(true)
    setMessage(null)
    setInviteResult(null)

    try {
      const response = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          displayName: inviteDisplayName,
          // Pass admin's dashboard config so new user has same default layout
          dashboardConfig: currentUser.custom_metrics,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite user')
      }

      // Add new user to the list
      const newUser: Profile = {
        id: data.user.id,
        email: data.user.email,
        display_name: data.user.displayName,
        is_admin: false,
        share_drinks: true,
        share_steps: true,
        leaderboard_anonymous: false,
        reminder_enabled: false,
        reminder_time: '21:00',
        streak_warnings_enabled: true,
        weekly_digest_enabled: false,
        weekly_digest_day: 0,
        hidden_fields: [],
        field_groupings: null,
        home_city: null,
        home_lat: null,
        home_lng: null,
        custom_habits: [],
        custom_metrics: currentUser.custom_metrics, // Same dashboard layout as admin
        allow_admin_nudges: true,
        notification_channel: 'email',
        temperature_unit: 'fahrenheit',
        health_sync_token: null,
        created_at: new Date().toISOString(),
      }
      setUsers((prev) => [...prev, newUser])

      // Notify parent so DataImporter also sees the new user
      onUserAdded?.(newUser)

      // Show credentials
      setInviteResult({
        email: inviteEmail,
        displayName: inviteDisplayName,
        temporaryPassword: data.temporaryPassword,
      })
      setShowPassword(false)

      // Clear form
      setInviteEmail('')
      setInviteDisplayName('')

      setMessage({ type: 'success', text: `Successfully invited ${inviteDisplayName}` })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to invite user',
      })
    } finally {
      setInviteLoading(false)
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const pushLayoutToAllUsers = async () => {
    if (!currentUser.custom_metrics) {
      setMessage({ type: 'error', text: 'No dashboard layout configured to push' })
      return
    }

    setPushLayoutLoading(true)
    setMessage(null)

    const supabase = createClient()
    const nonAdminUsers = users.filter(u => !u.is_admin && u.id !== currentUser.id)

    if (nonAdminUsers.length === 0) {
      setMessage({ type: 'error', text: 'No other users to update' })
      setPushLayoutLoading(false)
      return
    }

    try {
      // Update all non-admin users with the admin's dashboard layout
      const { error } = await supabase
        .from('profiles')
        .update({ custom_metrics: currentUser.custom_metrics })
        .in('id', nonAdminUsers.map(u => u.id))

      if (error) {
        throw error
      }

      setMessage({
        type: 'success',
        text: `Dashboard layout pushed to ${nonAdminUsers.length} user${nonAdminUsers.length === 1 ? '' : 's'}`
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to push layout'
      })
    } finally {
      setPushLayoutLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
        <p className="text-sm text-gray-600 mt-1">
          View and manage all users in the system
        </p>
      </div>

      {message && (
        <div className={cn(
          'flex items-center gap-2 p-3 rounded-lg text-sm',
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        )}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {message.text}
        </div>
      )}

      {/* Invite User Section */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
          <UserPlus className="h-5 w-5 text-purple-600" />
          Invite New User
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <Label htmlFor="inviteEmail">Email</Label>
            <Input
              id="inviteEmail"
              type="email"
              placeholder="friend@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inviteDisplayName">Display Name</Label>
            <Input
              id="inviteDisplayName"
              type="text"
              placeholder="John Doe"
              value={inviteDisplayName}
              onChange={(e) => setInviteDisplayName(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={inviteUser}
          disabled={inviteLoading || !inviteEmail || !inviteDisplayName}
          className="w-full sm:w-auto"
        >
          {inviteLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <UserPlus className="h-4 w-4 mr-2" />
          )}
          Invite User
        </Button>

        {/* Show credentials after successful invite */}
        {inviteResult && (
          <div className="mt-4 p-4 bg-white border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-3">
              Share these credentials with {inviteResult.displayName}:
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <div>
                  <span className="text-xs text-gray-500 block">Email</span>
                  <span className="font-mono text-sm">{inviteResult.email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(inviteResult.email, 'email')}
                >
                  {copiedField === 'email' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <div className="flex-1">
                  <span className="text-xs text-gray-500 block">Temporary Password</span>
                  <span className="font-mono text-sm">
                    {showPassword ? inviteResult.temporaryPassword : '••••••••••••'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(inviteResult.temporaryPassword, 'password')}
                  >
                    {copiedField === 'password' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              The user should change their password after first login via Settings or using &quot;Forgot Password&quot;.
            </p>
          </div>
        )}
      </div>

      {/* Push Layout Section */}
      <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
        <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-2">
          <LayoutGrid className="h-5 w-5 text-blue-600" />
          Dashboard Layout
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Push your current dashboard layout (widget positions, visibility, and settings) to all non-admin users.
          New users will automatically get your layout when invited.
        </p>
        <Button
          onClick={pushLayoutToAllUsers}
          disabled={pushLayoutLoading}
          variant="outline"
          className="border-blue-300 text-blue-700 hover:bg-blue-100"
        >
          {pushLayoutLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <LayoutGrid className="h-4 w-4 mr-2" />
          )}
          Push My Layout to All Users
        </Button>
      </div>

      {/* User List */}
      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* User Row */}
            <div
              className={cn(
                'flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors',
                expandedUser === user.id && 'bg-gray-50'
              )}
              onClick={() => toggleUserExpand(user.id)}
            >
              <div className="flex items-center gap-3">
                {expandedUser === user.id ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {user.display_name}
                    </span>
                    {user.id === currentUser.id && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                        You
                      </span>
                    )}
                    {user.is_admin && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                  </div>
                  {user.email && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleAdmin(user.id, user.is_admin)
                  }}
                  disabled={actionLoading === user.id || user.id === currentUser.id}
                  className={cn(
                    user.is_admin
                      ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                      : 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                  )}
                >
                  {actionLoading === user.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : user.is_admin ? (
                    <>
                      <ShieldOff className="h-4 w-4 mr-1" />
                      Remove Admin
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-1" />
                      Make Admin
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedUser === user.id && (
              <div className="border-t border-gray-200 p-4 bg-white">
                {loadingStats === user.id ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                  </div>
                ) : userStats[user.id] ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <BarChart3 className="h-4 w-4" />
                        Total Entries
                      </div>
                      <div className="text-xl font-semibold text-gray-900">
                        {userStats[user.id].totalEntries}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Calendar className="h-4 w-4" />
                        First Entry
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {userStats[user.id].firstEntry || 'N/A'}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <Calendar className="h-4 w-4" />
                        Last Entry
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {userStats[user.id].lastEntry || 'N/A'}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        😊 Avg Mood
                      </div>
                      <div className="text-xl font-semibold text-gray-900">
                        {userStats[user.id].avgMood?.toFixed(1) || 'N/A'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Failed to load user statistics
                  </p>
                )}

                {/* User Settings Summary */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Settings</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className={cn(
                      'text-xs px-2 py-1 rounded',
                      user.share_drinks ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    )}>
                      {user.share_drinks ? '✓' : '✗'} Share Drinks
                    </span>
                    <span className={cn(
                      'text-xs px-2 py-1 rounded',
                      user.share_steps ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    )}>
                      {user.share_steps ? '✓' : '✗'} Share Steps
                    </span>
                    <span className={cn(
                      'text-xs px-2 py-1 rounded',
                      user.leaderboard_anonymous ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                    )}>
                      {user.leaderboard_anonymous ? '🕵️ Anonymous' : '👤 Visible'}
                    </span>
                    <span className={cn(
                      'text-xs px-2 py-1 rounded',
                      user.reminder_enabled ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    )}>
                      {user.reminder_enabled ? '🔔' : '🔕'} Reminders
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No users found
        </div>
      )}
    </div>
  )
}
