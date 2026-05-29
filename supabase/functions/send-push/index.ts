// Supabase Edge Function: send-push
// Triggered by a database webhook on INSERT to the notifications table.
//
// SETUP:
// 1. Deploy this function: supabase functions deploy send-push
// 2. Set secrets:
//    supabase secrets set VAPID_PRIVATE_KEY=<your-private-key>
//    supabase secrets set VAPID_SUBJECT=mailto:your@email.com
// 3. Create a Database Webhook in Supabase dashboard:
//    Table: notifications, Event: INSERT, URL: <your-project>/functions/v1/send-push
//
// This function reads the new notification row, looks up the user's push
// subscriptions, and sends a Web Push for each active subscription.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com'
const VAPID_PUBLIC_KEY = Deno.env.get('VITE_VAPID_PUBLIC_KEY') ?? ''

interface NotificationRow {
  id: string
  user_id: string
  type: string
  actor_user_id: string | null
  subject_id: string | null
  subject_type: string | null
}

interface PushSubscription {
  endpoint: string
  p256dh: string | null
  auth_key: string | null
}

function notifTitle(_type: string): string {
  return 'My Sports Diary'
}

function notifBody(type: string): string {
  switch (type) {
    case 'friend_request':  return 'Someone wants to be friends'
    case 'friend_accepted': return 'Your friend request was accepted'
    case 'tagged':          return 'You were tagged in a game'
    case 'comment':         return 'Someone commented on your game'
    case 'reaction':        return 'Someone reacted to your game'
    case 'attendance_link': return 'Someone was also at your game'
    case 'milestone':       return 'You unlocked a new milestone!'
    case 'anniversary':     return 'A game in your diary has an anniversary today'
    default:                return 'New activity in your diary'
  }
}

function notifUrl(type: string, subjectId: string | null, actorUserId: string | null): string {
  switch (type) {
    case 'friend_request':  return '/friends?tab=requests'
    case 'friend_accepted': return actorUserId ? `/user/${actorUserId}` : '/friends'
    case 'milestone':       return '/stats'
    default: return subjectId ? `/game/${subjectId}` : '/'
  }
}

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json()
    const record = body.record as NotificationRow

    if (!record?.user_id || !record?.type) {
      return new Response('Invalid payload', { status: 400 })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Fetch the user's push subscriptions
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth_key')
      .eq('user_id', record.user_id)

    if (!subs?.length) {
      return new Response('No subscriptions', { status: 200 })
    }

    const payload = JSON.stringify({
      title: notifTitle(record.type),
      body: notifBody(record.type),
      url: notifUrl(record.type, record.subject_id, record.actor_user_id),
      icon: '/pwa-192x192.png',
    })

    // Send push to each subscription
    // NOTE: This uses the web-push protocol via fetch with VAPID auth headers.
    // For production, use a proper web-push library (e.g., web-push npm package
    // via a Deno-compatible shim, or implement RFC 8292 signing manually).
    const results = await Promise.allSettled(
      (subs as PushSubscription[]).map(async (sub) => {
        if (!sub.p256dh || !sub.auth_key) return

        // Placeholder: in a real implementation, sign with VAPID and send.
        // The web-push protocol requires ECDH key agreement + VAPID JWT signing.
        // See: https://web.dev/push-notifications-web-push-protocol/
        //
        // For now, log the intent. Replace with:
        // import webpush from 'npm:web-push'
        // webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
        // await webpush.sendNotification(sub, payload)
        console.log('[send-push] would push to', sub.endpoint.slice(0, 40), '...', payload)
        void VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT // reference to avoid unused warnings
      })
    )

    const failed = results.filter((r) => r.status === 'rejected').length
    return new Response(
      JSON.stringify({ sent: results.length - failed, failed }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[send-push]', err)
    return new Response('Internal error', { status: 500 })
  }
})
