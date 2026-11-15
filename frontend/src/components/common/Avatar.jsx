
// Circle with the person's initials.
import { getInitials } from '../../utils/helpers'

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
}

export default function Avatar({ name, size = 'md', className = '' }) {
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full
        border border-violet-400/20 bg-violet-500/15
        font-semibold text-violet-300 ${SIZES[size]} ${className}`}
    >
      {getInitials(name)}
    </span>
  )
}
