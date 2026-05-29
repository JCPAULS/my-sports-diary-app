// Client-side rate limiting via localStorage daily counters.
//
// TODO (F-security): Replace with server-side enforcement. Options:
//   A) Supabase Edge Function that checks + increments a rate_limit_events table
//      (INSERT ... ON CONFLICT DO UPDATE ... RETURNING count) with RLS.
//   B) A `rate_limit_events` table with (user_id, action, day) + UNIQUE constraint
//      and a count column updated via an RPC.
// Client-side limits can be bypassed by clearing localStorage or using multiple
// browsers. They deter casual abuse but are not a security guarantee.

type RateLimitedAction = 'friend_request' | 'email_search' | 'tag' | 'comment' | 'reaction'

const DAILY_LIMITS: Record<RateLimitedAction, number> = {
  friend_request: 30,
  email_search: 50,
  tag: 30,
  comment: 100,
  reaction: 200,
}

function storageKey(action: RateLimitedAction): string {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD in UTC
  return `rl_${action}_${today}`
}

export function getRateLimitRemaining(action: RateLimitedAction): number {
  const used = parseInt(localStorage.getItem(storageKey(action)) ?? '0', 10)
  return Math.max(0, DAILY_LIMITS[action] - used)
}

export function checkRateLimit(action: RateLimitedAction): boolean {
  return getRateLimitRemaining(action) > 0
}

export function consumeRateLimit(action: RateLimitedAction): void {
  const key = storageKey(action)
  const used = parseInt(localStorage.getItem(key) ?? '0', 10)
  localStorage.setItem(key, String(used + 1))
}

export const RATE_LIMITS = DAILY_LIMITS
