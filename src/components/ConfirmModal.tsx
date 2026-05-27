interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-paper border-4 border-ink shadow-[8px_8px_0_var(--color-gold)] max-w-sm w-full">
        <div className="bg-ink px-6 py-4">
          <p className="font-bebas text-xl text-paper tracking-[0.15em]">{title}</p>
        </div>
        <div className="p-6 flex flex-col gap-5">
          <p className="font-archivo text-sm text-ink leading-relaxed">{message}</p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="font-bebas text-sm tracking-[0.15em] px-4 py-2 border-2 border-ink/25 text-ink/60 hover:border-ink hover:text-ink transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`font-bebas text-sm tracking-[0.15em] px-5 py-2 border-2 border-ink text-paper transition-colors ${
                danger ? 'bg-red hover:bg-red/80' : 'bg-ink hover:bg-ink/80'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
