// pushStore.ts — Web Push subscription management.
//
// SETUP REQUIRED before push works end-to-end:
//   1. Generate VAPID keys: npx web-push generate-vapid-keys
//   2. Add VITE_VAPID_PUBLIC_KEY=<your-public-key> to .env.local
//   3. Add VAPID_PRIVATE_KEY and VAPID_SUBJECT to Supabase project secrets
//   4. Deploy supabase/functions/send-push/ to your Supabase project
//
// Without VITE_VAPID_PUBLIC_KEY set, subscribeToPush returns 'no_vapid_key'
// and the UI shows a "not configured" state without erroring.

import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

// ─── Detection helpers ────────────────────────────────────────────────────────

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

export function isIosDevice(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function isInStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    !!(navigator as unknown as Record<string, unknown>).standalone
  )
}

export function getCurrentPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

// ─── Subscription ─────────────────────────────────────────────────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

export type SubscribeResult = 'subscribed' | 'already_subscribed' | 'no_vapid_key' | 'permission_denied' | 'not_supported' | 'error'

export async function subscribeToPush(): Promise<SubscribeResult> {
  if (!VAPID_PUBLIC_KEY) return 'no_vapid_key'
  if (!isPushSupported()) return 'not_supported'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'permission_denied'

  try {
    const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()

    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      }))

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'error'

    const json = subscription.toJSON()
    await db.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh ?? null,
        auth_key: json.keys?.auth ?? null,
      },
      { onConflict: 'endpoint' },
    )

    return existing ? 'already_subscribed' : 'subscribed'
  } catch {
    return 'error'
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (!subscription) return
    await subscription.unsubscribe()
    await db.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  } catch {
    // silent — subscription may already be expired
  }
}

export async function isCurrentlySubscribed(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') return false
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return !!subscription
  } catch {
    return false
  }
}
