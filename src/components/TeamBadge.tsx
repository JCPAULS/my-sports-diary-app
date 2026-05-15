import { getTeam, hashTeamColor } from '@/lib/teams'

interface TeamBadgeProps {
  team: string                        // full display name, e.g. "New England Patriots"
  sportId?: string                    // defaults to 'nfl' for backwards compat
  size?: 'xs' | 'sm' | 'md' | 'lg'  // 24 / 32 / 48 / 72 px
  className?: string
}

const SIZE_PX   = { xs: 24,   sm: 32,   md: 48,   lg: 72   }
const FONT_SIZE = { xs: '8px', sm: '10px', md: '13px', lg: '22px' }
const BORDER    = { xs: '1.5px', sm: '2px', md: '2px', lg: '3px'  }

export default function TeamBadge({ team, sportId = 'nfl', size = 'md', className = '' }: TeamBadgeProps) {
  const entry = getTeam(sportId, team)
  const bg    = entry?.primaryColor ?? hashTeamColor(team)
  const color = entry?.textColor    ?? 'white'
  const label = entry?.abbreviation ?? team.slice(0, 3).toUpperCase()
  const px    = SIZE_PX[size]

  return (
    <div
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-full font-bebas font-bold leading-none select-none ${className}`}
      style={{
        width:       px,
        height:      px,
        background:  bg,
        color,
        fontSize:    FONT_SIZE[size],
        border:      `${BORDER[size]} solid #000`,
      }}
      title={team}
      aria-label={team}
    >
      {label}
    </div>
  )
}
