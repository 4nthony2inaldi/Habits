'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
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
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { Profile } from '@/types/database'

interface UserManagementProps {
  currentUser: Profile
  users: Profile[]
}

interface UserStats {
  totalEntries: number
  firstEntry: string | null
  lastEntry: string | null
  avgMood: number | null
}

export function UserManagement({ currentUser, users: initialUsers }: UserManagementProps) {
  const [users, setUsers] = useState(initialUsers)
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [userStats, setUserStats] = useState<Record<string, UserStats>>({})
  const [loadingStats, setLoadingStats] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

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
