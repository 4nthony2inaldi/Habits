'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import {
  LayoutDashboard,
  PlusCircle,
  Trophy,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
} from 'lucide-react'
import type { Profile } from '@/types/database'

interface HeaderProps {
  profile: Profile | null
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'New Entry', href: '/entry', icon: PlusCircle },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Leaderboards', href: '/leaderboards', icon: Trophy },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Header({ profile }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isDashboard = pathname === '/dashboard'

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center flex-shrink-0">
            <div className="h-8 w-8 rounded-lg bg-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">H</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                    isActive
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Dashboard controls slot - visible on dashboard for all screen sizes */}
          {isDashboard && (
            <div id="dashboard-header-controls" className="flex items-center gap-2" />
          )}

          {/* Right side - User info and logout (hidden on dashboard as it's in the portal) */}
          <div className="flex items-center space-x-4">
            {/* User info - only show on non-dashboard pages */}
            {!isDashboard && (
              <div className="hidden md:flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  {profile?.display_name || 'User'}
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="container mx-auto px-4 py-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium',
                    isActive
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-gray-600">
                  {profile?.display_name || 'User'}
                </span>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-2" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
