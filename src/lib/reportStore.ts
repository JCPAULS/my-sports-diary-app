// reportStore.ts — User content reporting.
// Inserts a row into the reports table for moderation review.

import { supabase } from '@/lib/supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export type ReportContentType = 'game' | 'comment' | 'user'

export const REPORT_REASONS = [
  'Spam',
  'Harassment or bullying',
  'Inappropriate content',
  'Fake or misleading information',
  'Other',
] as const

export type ReportReason = typeof REPORT_REASONS[number]

export async function submitReport(
  contentType: ReportContentType,
  contentId: string,
  reason: ReportReason,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('[reportStore] not authenticated')

  const { error } = await db.from('reports').insert({
    reporter_user_id: user.id,
    reported_content_type: contentType,
    reported_content_id: contentId,
    reason,
  })

  if (error) throw new Error(`[reportStore] ${error.message}`)
}
