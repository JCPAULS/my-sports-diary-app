// notificationPrefs.ts — Per-type notification preferences stored in localStorage.
// Push-type prefs control whether a Web Push is sent for each notification type.
// In-app notifications are always shown (the inbox always receives everything).

export type NotifType =
  | 'friend_request'
  | 'friend_accepted'
  | 'tagged'
  | 'comment'
  | 'reaction'
  | 'attendance_link'
  | 'milestone'
  | 'anniversary'

export const ALL_NOTIF_TYPES: NotifType[] = [
  'friend_request',
  'friend_accepted',
  'tagged',
  'comment',
  'reaction',
  'attendance_link',
  'milestone',
  'anniversary',
]

export const NOTIF_TYPE_LABELS: Record<NotifType, string> = {
  friend_request:  'Friend requests',
  friend_accepted: 'Friend accepted',
  tagged:          'Tagged in a game',
  comment:         'Comments on your game',
  reaction:        'Reactions to your game',
  attendance_link: '"I Was There Too!" links',
  milestone:       'Milestones',
  anniversary:     'Game anniversaries',
}

export interface NotificationPrefs {
  pauseAll: boolean
  push: Record<NotifType, boolean>
}

const STORAGE_KEY = 'sports-diary-notif-prefs-v1'

export const DEFAULT_PREFS: NotificationPrefs = {
  pauseAll: false,
  push: {
    friend_request:  true,
    friend_accepted: true,
    tagged:          true,
    comment:         true,
    reaction:        false,
    attendance_link: true,
    milestone:       false,
    anniversary:     false,
  },
}

export function getNotifPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>
    return {
      pauseAll: parsed.pauseAll ?? DEFAULT_PREFS.pauseAll,
      push: { ...DEFAULT_PREFS.push, ...(parsed.push ?? {}) },
    }
  } catch {
    return DEFAULT_PREFS
  }
}

export function saveNotifPrefs(prefs: NotificationPrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}
