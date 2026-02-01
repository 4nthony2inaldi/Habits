'use client'

import { Select } from '@/components/ui/select'

interface UserSelectorProps {
  users: { id: string; display_name: string }[]
  selectedUserId: string
  onUserChange: (userId: string) => void
  className?: string
}

// Get first name from display name for compact display
function getFirstName(displayName: string): string {
  return displayName.split(' ')[0] || displayName
}

export function UserSelector({
  users,
  selectedUserId,
  onUserChange,
  className,
}: UserSelectorProps) {
  return (
    <Select
      value={selectedUserId}
      onChange={(e) => onUserChange(e.target.value)}
      className={className}
    >
      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {getFirstName(user.display_name)}
        </option>
      ))}
    </Select>
  )
}
