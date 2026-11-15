
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../hooks/useApp'
import Card, { CardHeader } from '../components/common/Card'
import Button from '../components/common/Button'
import EmptyState from '../components/common/EmptyState'
import Icon from '../components/common/Icon'
import { formatDate } from '../utils/helpers'
import SampleDataNotice from '../components/common/SampleDataNotice'

export default function ProjectJournalPage() {
  const { params, projects, user, isManager, navigate } = useApp()

  const assignedProjects = useMemo(
    () =>
      isManager
        ? projects
        : projects.filter((project) =>
            project.members?.some(
              (member) => member.email === user?.email,
            ),
          ),
    [projects, isManager, user?.email],
  )

  const [selectedProjectId, setSelectedProjectId] = useState(
    params.projectId || '',
  )

  useEffect(() => {
    const requestedProject = assignedProjects.find(
      (project) => project.id === params.projectId,
    )

    if (requestedProject) {
      setSelectedProjectId(requestedProject.id)
    } else if (
      !assignedProjects.some(
        (project) => project.id === selectedProjectId,
      )
    ) {
      setSelectedProjectId(assignedProjects[0]?.id || '')
    }
  }, [assignedProjects, params.projectId, selectedProjectId])

  const project = assignedProjects.find(
    (item) => item.id === selectedProjectId,
  )

  const entries = useMemo(
    () =>
      [...(project?.journalEntries || [])].sort(
        (a, b) =>
          new Date(a.date || a.createdAt).getTime() -
          new Date(b.date || b.createdAt).getTime(),
      ),
    [project],
  )

  const fields = [
    ['Work Summary', 'workSummary'],
    ['Completed Tasks', 'completedTasks'],
    ['Decisions and Reasons', 'decisions'],
    ['Problems and Blockers', 'blockers'],
    ['Dependencies', 'dependencies'],
    ['Pending Tasks', 'pendingTasks'],
    ['Next Steps', 'nextSteps'],
    ['Supporting Evidence', 'evidence'],
  ]

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-[#17123b] via-[#11132e] to-[#101b3b] p-6 text-white shadow-xl shadow-black/20 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
            KnowFlow Project Knowledge
          </p>
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
            Project Journal History
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100/80">
            Select a project to explore its complete daily work history,
            decisions, completed tasks and pending activities from day one.
          </p>
        </div>
      </section>

      <SampleDataNotice />

      {assignedProjects.length === 0 ? (
        <Card>
          <EmptyState
            icon="folder"
            title="No assigned projects"
            description="You do not currently have access to any project journal history."
            action={
              <Button onClick={() => navigate('dashboard')}>
                Back to Dashboard
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Card className="border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.08] to-transparent">
            <div className="p-5 sm:p-6">
              <label
                htmlFor="journal-project"
                className="mb-2 block text-sm font-bold text-text-primary"
              >
                Select Project
              </label>
              <select
                id="journal-project"
                value={selectedProjectId}
                onChange={(event) =>
                  setSelectedProjectId(event.target.value)
                }
                className="w-full rounded-xl border border-border-strong bg-surface px-4 py-3 text-sm font-semibold text-text-primary outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
              >
                {assignedProjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-text-muted">
                Only projects you are authorised to access are displayed.
              </p>
            </div>
          </Card>

          {project && (
            <>
              <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-violet-300">
                      Selected Project
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-text-primary">
                      {project.name}
                    </h3>
                    <p className="mt-1 text-sm text-text-muted">
                      {project.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      navigate('project-details', {
                        projectId: project.id,
                      })
                    }
                  >
                    View Project
                    <Icon name="arrowRight" className="h-4 w-4" />
                  </Button>
                </div>
              </section>

              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="p-5">
                  <p className="text-sm font-medium text-text-secondary">
                    Total Entries
                  </p>
                  <p className="mt-2 text-3xl font-bold text-text-primary">
                    {entries.length}
                  </p>
                </Card>

                <Card className="p-5">
                  <p className="text-sm font-medium text-text-secondary">
                    First Entry
                  </p>
                  <p className="mt-2 text-lg font-bold text-text-primary">
                    {entries[0]?.date
                      ? formatDate(entries[0].date)
                      : entries[0]?.createdAt
                        ? formatDate(entries[0].createdAt)
                        : 'No entries'}
                  </p>
                </Card>

                <Card className="p-5">
                  <p className="text-sm font-medium text-text-secondary">
                    Latest Entry
                  </p>
                  <p className="mt-2 text-lg font-bold text-text-primary">
                    {entries.length
                      ? formatDate(
                          entries[entries.length - 1].date ||
                          entries[entries.length - 1].createdAt,
                        )
                      : 'No entries'}
                  </p>
                </Card>
              </div>

              <Card>
                <CardHeader
                  title="Complete Work Journal"
                  subtitle="Daily records arranged chronologically, starting with the first recorded day."
                  action={
                    <Button
                      size="sm"
                      onClick={() => navigate('dashboard')}
                    >
                      <Icon name="plus" className="h-4 w-4" />
                      Write Daily Journal
                    </Button>
                  }
                />

                {entries.length === 0 ? (
                  <EmptyState
                    icon="file"
                    title="No journal entries yet"
                    description="Daily work records for this project will appear here after they are saved."
                  />
                ) : (
                  <div className="space-y-4 p-5 sm:p-6">
                    {entries.map((entry, index) => {
                      const summary =
                        entry.workSummary ||
                        entry.completedTasks ||
                        'Daily work journal entry'

                      return (
                        <details
                          key={entry.id}
                          className="group overflow-hidden rounded-xl border border-border bg-surface-raised transition hover:border-violet-500/30"
                        >
                          <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-4 p-5 transition hover:bg-surface-hover">
                            <div className="flex min-w-0 items-center gap-4">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-sm font-bold text-violet-300">
                                {String(index + 1).padStart(2, '0')}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-wide text-violet-300">
                                  Day {index + 1}
                                </p>
                                <h4 className="mt-1 font-bold text-text-primary">
                                  {entry.date
                                    ? formatDate(entry.date)
                                    : entry.createdAt
                                      ? formatDate(entry.createdAt)
                                      : 'Date not specified'}
                                </h4>
                                <p className="mt-1 truncate text-sm text-text-secondary">
                                  {summary}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs font-medium text-text-muted">
                                {entry.createdBy || 'Employee'}
                              </span>
                              <Icon
                                name="chevronDown"
                                className="h-5 w-5 text-text-muted transition-transform group-open:rotate-180"
                              />
                            </div>
                          </summary>

                          <div className="border-t border-border bg-surface/70 p-5">
                            <div className="mb-4">
                              <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                                Recorded By
                              </p>
                              <p className="mt-1 text-sm font-semibold text-text-primary">
                                {entry.createdBy || 'Employee'}
                              </p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                              {fields
                                .filter(
                                  ([, key]) =>
                                    typeof entry[key] === 'string' &&
                                    entry[key].trim(),
                                )
                                .map(([label, key]) => (
                                  <div
                                    key={key}
                                    className="rounded-xl border border-border bg-surface-raised p-4"
                                  >
                                    <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
                                      {label}
                                    </p>
                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                                      {entry[key]}
                                    </p>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </details>
                      )
                    })}
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}

      <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.08] p-4 text-sm leading-6 text-amber-200">
        <strong className="text-amber-300">Prototype limitation:</strong> Journal history currently
        uses temporary application memory. Entries reset when the
        application is refreshed. Permanent database storage will be
        added during backend integration.
      </div>
    </div>
  )
}
