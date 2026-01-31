'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { Upload, Users, Database, MapPin } from 'lucide-react'
import { DataImporter } from '@/components/admin/DataImporter'
import { UserManagement } from '@/components/admin/UserManagement'
import { CityFixer } from '@/components/admin/CityFixer'
import type { Profile } from '@/types/database'

interface AdminClientProps {
  currentUser: Profile
  users: Profile[]
}

const tabs = [
  { id: 'import', name: 'Import Data', icon: Upload },
  { id: 'users', name: 'User Management', icon: Users },
  { id: 'cities', name: 'Fix Cities', icon: MapPin },
] as const

type TabId = typeof tabs[number]['id']

export function AdminClient({ currentUser, users: initialUsers }: AdminClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('import')
  const [users, setUsers] = useState<Profile[]>(initialUsers)

  const handleUserAdded = (newUser: Profile) => {
    setUsers((prev) => [...prev, newUser])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-purple-600 flex items-center justify-center">
          <Database className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Console</h1>
          <p className="text-gray-600">Manage users and import data</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {activeTab === 'import' && (
          <DataImporter currentUser={currentUser} users={users} />
        )}
        {activeTab === 'users' && (
          <UserManagement currentUser={currentUser} users={users} onUserAdded={handleUserAdded} />
        )}
        {activeTab === 'cities' && (
          <CityFixer currentUser={currentUser} users={users} />
        )}
      </div>
    </div>
  )
}
