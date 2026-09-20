import { useSyncExternalStore } from 'react'
import type { AppUser, AppRole } from '@/types/database'

// Simulated identities for the local (no-auth) build. When the app moves to
// Supabase, replace this module with real auth + a profiles lookup; the rest
// of the UI only depends on AppUser / hasRole, so nothing else needs to change.
export const USERS: AppUser[] = [
  { id: 'user-lungisa', name: 'Lungisa Sobhuwa', title: 'Executive Director', roles: ['requester', 'admin'] },
  { id: 'user-zukiswa', name: 'Zukiswa Tom', title: 'Authoriser', roles: ['authoriser'] },
]

const KEY = 'funding-tracker-current-user'
const listeners = new Set<() => void>()

function readId(): string {
  try {
    return localStorage.getItem(KEY) || USERS[0].id
  } catch {
    return USERS[0].id
  }
}

export function setCurrentUserId(id: string): void {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* storage unavailable — keep in-memory default */
  }
  listeners.forEach(l => l())
}

export function getCurrentUser(): AppUser {
  const id = readId()
  return USERS.find(u => u.id === id) ?? USERS[0]
}

export function hasRole(user: AppUser, role: AppRole): boolean {
  return user.roles.includes(role)
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function useCurrentUser(): AppUser {
  const id = useSyncExternalStore(subscribe, readId, readId)
  return USERS.find(u => u.id === id) ?? USERS[0]
}
