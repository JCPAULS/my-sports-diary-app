// ReportModal — reason picker for reporting games, comments, or users.

import { useState } from 'react'
import { submitReport, REPORT_REASONS, type ReportContentType, type ReportReason } from '@/lib/reportStore'

interface Props {
  contentType: ReportContentType
  contentId: string
  onClose: () => void
}

export default function ReportModal({ contentType, contentId, onClose }: Props) {
  const [reason, setReason] = useState<ReportReason>(REPORT_REASONS[0])
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await submitReport(contentType, contentId, reason)
      setDone(true)
    } catch {
      // silent — the report may have succeeded even if we got an error
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div className="fixed z-50 inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-paper border-2 border-ink shadow-[6px_6px_0_#000] w-full max-w-sm pointer-events-auto">
          <div className="px-5 py-4 border-b-2 border-ink flex items-center justify-between">
            <h2 className="font-bebas text-lg tracking-[0.2em]">
              REPORT {contentType.toUpperCase()}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="font-bebas text-xl text-ink/40 hover:text-ink leading-none"
            >
              ✕
            </button>
          </div>

          {done ? (
            <div className="px-5 py-8 text-center">
              <p className="text-3xl mb-3">✓</p>
              <p className="font-bebas text-base tracking-[0.15em] text-ink mb-1">REPORT RECEIVED</p>
              <p className="font-caveat text-sm text-ink/50 mb-5">Thanks — we'll review this.</p>
              <button
                type="button"
                onClick={onClose}
                className="font-bebas text-sm tracking-[0.15em] border-2 border-ink px-5 py-2 hover:bg-ink hover:text-paper transition-colors"
              >
                CLOSE
              </button>
            </div>
          ) : (
            <div className="px-5 py-5">
              <p className="font-bebas text-xs tracking-[0.15em] text-ink/40 mb-3">REASON</p>
              <div className="flex flex-col gap-2 mb-5">
                {REPORT_REASONS.map((r) => (
                  <label key={r} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="w-4 h-4 accent-red flex-shrink-0"
                    />
                    <span className="font-archivo text-sm text-ink">{r}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full font-bebas text-base tracking-[0.15em] bg-red text-white border-2 border-ink py-2.5 disabled:opacity-50 hover:bg-red/90 transition-colors"
              >
                {submitting ? 'SUBMITTING…' : 'SUBMIT REPORT'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
