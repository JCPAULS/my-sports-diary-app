import { Link, useLocation } from 'react-router-dom'

export default function Nav() {
  const { pathname } = useLocation()

  const link = (to: string, label: string) => {
    const active = pathname === to
    return (
      <Link
        to={to}
        className={`font-bebas text-sm tracking-[0.2em] px-4 py-3 border-b-2 transition-colors ${
          active
            ? 'border-red text-ink'
            : 'border-transparent text-ink/40 hover:text-ink hover:border-ink/30'
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <div className="bg-paper border-b border-ink/15">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 flex items-center gap-0 -mb-[2px]">
        {link('/', 'TIMELINE')}
        {link('/stats', 'STATS')}
        {link('/settings', 'SETTINGS')}
      </div>
    </div>
  )
}
