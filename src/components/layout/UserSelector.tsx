'use client'

import { Select } from '@/components/ui/select'

interface UserSelectorProps {
  users: { id: string; display_name: string }[]
  selectedUserId: string
  onUserChange: (userId: string) => void
  className?: string
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
          {user.display_name}
        </option>
      ))}
    </Select>
  )
}
