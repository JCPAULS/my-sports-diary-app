interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}

export default function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`mt-0.5 w-10 h-6 rounded-full border-2 border-ink transition-colors flex-shrink-0 relative ${
          checked ? 'bg-red' : 'bg-ink/10'
        }`}
        aria-pressed={checked}
      >
        {/* left-0 anchors the dot; translate math: inner=36px, dot=14px, gap=3px → ON=19px */}
        <span
          className={`absolute left-0 top-[3px] w-[14px] h-[14px] rounded-full bg-paper border border-ink/20 transition-transform ${
            checked ? 'translate-x-[19px]' : 'translate-x-[3px]'
          }`}
        />
      </button>
      <div className="cursor-pointer" onClick={() => onChange(!checked)}>
        <p className="font-archivo text-sm text-ink leading-snug">{label}</p>
        {description && (
          <p className="font-archivo text-xs text-ink/40 mt-0.5 leading-snug">{description}</p>
        )}
      </div>
    </div>
  )
}
