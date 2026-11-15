
// Friendly "nothing here yet" block with an optional action button.
import Icon from './Icon'

export default function EmptyState({ icon = 'folder', title, description, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full
        border border-violet-400/20 bg-violet-500/10 text-violet-300">
        <Icon name={icon} className="h-6 w-6" />
      </span>

      <h3 className="mt-4 text-base font-semibold text-text-primary">
        {title}
      </h3>

      {description && (
        <p className="mt-1 max-w-sm text-sm text-text-muted">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
