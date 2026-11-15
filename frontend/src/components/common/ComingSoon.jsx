
// Placeholder body for pages that Part 2 will build. Part 2 replaces the pages that use this.
import Card from './Card'
import Icon from './Icon'
import { useApp } from '../../hooks/useApp'
import Button from './Button'

export default function ComingSoon({ title, description, plannedFeatures }) {
  const { params, getProjectById, navigate } = useApp()
  const project = params.projectId ? getProjectById(params.projectId) : null

  return (
    <Card className="mx-auto max-w-2xl p-8 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl
        border border-violet-400/20 bg-violet-500/10 text-violet-300">
        <Icon name="clock" className="h-7 w-7" />
      </span>

      <h2 className="mt-5 text-xl font-semibold text-text-primary">
        {title}
      </h2>

      <p className="mt-2 text-sm text-text-secondary">{description}</p>

      {project && (
        <p className="mt-3 text-sm text-text-secondary">
          Selected project: <strong className="text-text-primary">{project.name}</strong>
        </p>
      )}

      <p className="mt-4 inline-block rounded-full border border-amber-400/20
        bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300 ring-1 ring-inset ring-amber-400/20"
      >
        Not built yet. Planned for Part 2.
      </p>

      <ul className="mx-auto mt-5 max-w-md space-y-1.5 text-left text-sm text-text-secondary">
        {plannedFeatures.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-7">
        <Button
          variant="secondary"
          onClick={() => navigate(project ? 'project-details' : 'dashboard', params)}
        >
          {project ? 'Back to project' : 'Back to dashboard'}
        </Button>
      </div>
    </Card>
  )
}
