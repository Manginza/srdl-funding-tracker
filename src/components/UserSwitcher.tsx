import { UserCircle } from 'lucide-react'
import { USERS, setCurrentUserId, useCurrentUser } from '@/lib/currentUser'

// Local-only identity switcher. Stands in for real authentication until the
// app is wired to Supabase auth.
export default function UserSwitcher() {
  const user = useCurrentUser()

  return (
    <div className="px-3 py-3 border-t border-gray-200">
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1.5">
        <UserCircle size={14} /> Acting as
      </label>
      <select
        value={user.id}
        onChange={e => setCurrentUserId(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white"
      >
        {USERS.map(u => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[11px] text-gray-400">
        {user.title ? `${user.title} · ` : ''}
        {user.roles.join(', ')}
      </p>
    </div>
  )
}
