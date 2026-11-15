
import { timeAgo } from '../../utils/helpers'
import { StatusBadge } from '../common/Badge'
import Avatar from '../common/Avatar'
import Button from '../common/Button'

const MAX_AVATARS = 4

export default function ProjectCard({
  project,
  onOpen,
  onEdit,
  onManageMembers,
  isManager,
  currentUserEmail,
}) {
  const members = project.members ?? []
  const documents = project.documents ?? []
  const knowledgeItems = project.knowledge?.items ?? []

  const completedCount = knowledgeItems.filter(
    (item) => item.type === 'completed'
  ).length

  const unresolvedCount = knowledgeItems.filter((item) =>
    ['pending', 'blocker', 'question'].includes(item.type)
  ).length

  const shown = members.slice(0, MAX_AVATARS)
  const extra = members.length - shown.length

  const currentMember = members.find(
    (member) => member.email === currentUserEmail
  )

  const manager = members.find((member) =>
    member.role?.toLowerCase().includes('manager')
  )

  const myJournalEntries = (project.journalEntries ?? []).filter(
    (entry) => entry.createdBy === currentMember?.name
  )

  const myPendingTasks = myJournalEntries.reduce((total, entry) => {
    return (
      total +
      (entry.pendingTasks ?? '')
        .split('\n')
        .filter((task) => task.trim()).length
    )
  }, 0)

  // Employee-specific project card.
  if (!isManager) {
    return (
      <div className="group flex h-full flex-col rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/10 transition duration-200 hover:-translate-y-1 hover:border-violet-400/40 hover:shadow-lg hover:shadow-black/20">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-text-primary transition group-hover:text-violet-300">
              {project.name}
            </h3>
          </div>

          <StatusBadge type="project" value={project.status} />
        </div>

        <p className="mt-2 min-h-10 line-clamp-2 text-sm leading-5 text-text-muted">
          {project.description}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-violet-400/15 bg-violet-500/[0.07] p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-300 shadow-sm">
            <span className="text-sm font-bold">
              {(currentMember?.name ?? 'U')
                .split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-text-muted">
              Your assigned role
            </p>
            <p className="truncate text-sm font-bold text-text-primary">
              {currentMember?.role ?? 'Team Member'}
            </p>
          </div>

          <span className="rounded-lg border border-violet-400/15 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-300 shadow-sm">
            Assigned
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-border bg-surface px-2 py-3 text-center">
            <p className="text-xl font-bold text-text-primary">
              {members.length}
            </p>
            <p className="mt-1 text-xs font-medium text-text-muted">
              Team Members
            </p>
          </div>

          <div className="rounded-xl border border-emerald-400/10 bg-emerald-500/[0.07] px-2 py-3 text-center">
            <p className="text-xl font-bold text-emerald-300">
              {myJournalEntries.length}
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-300">
              My Entries
            </p>
          </div>

          <div className="rounded-xl border border-amber-400/10 bg-amber-500/[0.07] px-2 py-3 text-center">
            <p className="text-xl font-bold text-amber-300">
              {myPendingTasks}
            </p>
            <p className="mt-1 text-xs font-medium text-amber-300">
              Pending Tasks
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex min-w-0 items-center">
            {shown.map((member) => (
              <Avatar
                key={member.id}
                name={member.name}
                size="sm"
                className="-ml-2 ring-2 ring-surface-raised first:ml-0"
              />
            ))}

            {extra > 0 && (
              <span className="-ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold text-text-secondary ring-2 ring-surface-raised">
                +{extra}
              </span>
            )}

            <span className="ml-3 truncate text-xs font-medium text-text-muted">
              {members.length} members
            </span>
          </div>

          <span className="shrink-0 text-xs text-text-faint">
            Updated {timeAgo(project.updatedAt)}
          </span>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-text-muted">
              Project Manager
            </span>
            <span className="text-xs font-semibold text-text-primary">
              {manager?.name ?? 'Not assigned'}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-text-muted">
              Shared Documents
            </span>
            <span className="text-xs font-bold text-text-primary">
              {documents.length}
            </span>
          </div>
        </div>

        <div className="mt-auto border-t border-border pt-4">
          <Button
            onClick={() => onOpen(project.id)}
            className="w-full"
          >
            View Project
          </Button>
        </div>
      </div>
    )
  }

  // Existing Manager project card — preserved.
  return (
    <div className="group flex h-full flex-col rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/10 transition duration-200 hover:-translate-y-1 hover:border-violet-400/40 hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-text-primary transition group-hover:text-violet-300">
            {project.name}
          </h3>
        </div>

        <StatusBadge type="project" value={project.status} />
      </div>

      <p className="mt-2 min-h-10 line-clamp-2 text-sm leading-5 text-text-muted">
        {project.description}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-faint">
          Handover status
        </span>
        <StatusBadge type="handover" value={project.handoverStatus} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-surface px-2 py-3 text-center">
          <p className="text-xl font-bold text-text-primary">
            {documents.length}
          </p>
          <p className="mt-1 text-xs font-medium text-text-muted">
            Documents
          </p>
        </div>

        <div className="rounded-xl border border-emerald-400/10 bg-emerald-500/[0.07] px-2 py-3 text-center">
          <p className="text-xl font-bold text-emerald-300">
            {completedCount}
          </p>
          <p className="mt-1 text-xs font-medium text-emerald-300">
            Completed
          </p>
        </div>

        <div className="rounded-xl border border-amber-400/10 bg-amber-500/[0.07] px-2 py-3 text-center">
          <p className="text-xl font-bold text-amber-300">
            {unresolvedCount}
          </p>
          <p className="mt-1 text-xs font-medium text-amber-300">
            Unresolved
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex min-w-0 items-center">
          {shown.map((member) => (
            <Avatar
              key={member.id}
              name={member.name}
              size="sm"
              className="-ml-2 ring-2 ring-surface-raised first:ml-0"
            />
          ))}

          {extra > 0 && (
            <span className="-ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold text-text-secondary ring-2 ring-surface-raised">
              +{extra}
            </span>
          )}

          <span className="ml-3 truncate text-xs font-medium text-text-muted">
            {members.length} members
          </span>
        </div>

        <span className="shrink-0 text-xs text-text-faint">
          Updated {timeAgo(project.updatedAt)}
        </span>
      </div>

      <div className="mt-auto border-t border-border pt-4">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => onOpen(project.id)}
            className="flex-1"
          >
            View Project
          </Button>

          {isManager && (
            <>
              <Button
                variant="secondary"
                onClick={() => onEdit(project.id)}
              >
                Edit
              </Button>

              <Button
                variant="secondary"
                onClick={() => onManageMembers(project.id)}
              >
                Members
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
