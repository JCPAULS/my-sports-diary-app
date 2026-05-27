import { avatarInitials } from '@/lib/profileUtils'

interface Props {
  photoUrl?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeClasses = {
  sm: 'w-9 h-9 text-sm',
  md: 'w-14 h-14 text-base',
  lg: 'w-20 h-20 text-xl',
  xl: 'w-28 h-28 text-3xl',
}

export default function AvatarCircle({ photoUrl, name, size = 'md', className = '' }: Props) {
  const base = `${sizeClasses[size]} rounded-full border-2 border-ink overflow-hidden flex-shrink-0 flex items-center justify-center bg-paper-deep ${className}`

  if (photoUrl) {
    return (
      <div className={base}>
        <img src={photoUrl} alt={name ?? 'profile'} className="w-full h-full object-cover" />
      </div>
    )
  }

  return (
    <div className={base}>
      <span className="font-bebas text-ink/40 leading-none">{avatarInitials(name)}</span>
    </div>
  )
}
