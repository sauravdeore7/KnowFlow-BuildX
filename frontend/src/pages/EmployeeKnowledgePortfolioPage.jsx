import { useEffect, useMemo, useState } from 'react'

import { useApp } from '../hooks/useApp'
import Icon from '../components/common/Icon'
import { fetchKnowledgePortfolio } from '../services/knowledgePortfolioService'

const KNOWLEDGE_STYLES = {
  completed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  decision: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
  blocker: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
  dependency: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  pending: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  next_step: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  document: 'bg-surface-hover text-text-secondary border-border',
}

const KNOWLEDGE_LABELS = {
  completed: 'Completed work',
  decision: 'Decision',
  blocker: 'Blocker',
  dependency: 'Dependency',
  pending: 'Pending',
  next_step: 'Next step',
  document: 'Document extract',
}

function formatDate(value) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatLabel(value) {
  if (!value) return 'Not specified'

  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getDisplayValues(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item.trim()
        if (item === null || item === undefined) return ''
        return String(item).trim()
      })
      .filter(Boolean)
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim().replace(/^[-•*]\s*/, ''))
      .filter(Boolean)
  }

  return []
}

function SectionHeading({ icon, title, description, count }) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-300">
          <Icon name={icon} className="h-5 w-5" />
        </span>

        <div>
          <h3 className="text-base font-bold text-text-primary">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-5 text-text-muted">
            {description}
          </p>
        </div>
      </div>

      {count !== undefined && (
        <span className="self-start rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary">
          {count} records
        </span>
      )}
    </div>
  )
}

function EmptyState({ icon, title, description }) {
  return (
    <div className="mt-5 rounded-xl border border-dashed border-border bg-surface px-4 py-10 text-center">
      <Icon
        name={icon}
        className="mx-auto h-9 w-9 text-text-faint"
      />

      <p className="mt-3 text-sm font-semibold text-text-secondary">
        {title}
      </p>

      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-text-muted">
        {description}
      </p>
    </div>
  )
}

function RecordList({ value }) {
  const items = getDisplayValues(value)

  if (items.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No records available.
      </p>
    )
  }

  return (
    <ul className="mt-2 space-y-2">
      {items.map((item, index) => (
        <li
          key={`${index}-${item}`}
          className="flex items-start gap-2 text-sm leading-6 text-text-secondary"
        >
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
          <span className="break-words">{item}</span>
        </li>
      ))}
    </ul>
  )
}

function JournalField({ label, value }) {
  const items = getDisplayValues(value)

  if (items.length === 0) return null

  return (
    <div className="rounded-xl border border-border-subtle bg-surface p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
        {label}
      </h4>

      <RecordList value={value} />
    </div>
  )
}

function KnowledgeCard({ item }) {
  const type = item.item_type || 'other'
  const source = item.source || {}

  return (
    <article className="rounded-xl border border-border bg-surface p-4 transition hover:border-violet-400/30">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                KNOWLEDGE_STYLES[type] ||
                'border-border bg-surface-hover text-text-secondary'
              }`}
            >
              {KNOWLEDGE_LABELS[type] || formatLabel(type)}
            </span>

            <span className="text-xs text-text-muted">
              {formatDate(item.created_at)}
            </span>
          </div>

          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-text-secondary">
            {item.content || 'No content available.'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-border-subtle pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Icon name="folder" className="h-4 w-4 shrink-0" />
          <span>{item.project_name || 'Project unavailable'}</span>
        </div>

        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Icon name="fileText" className="h-4 w-4 shrink-0" />

          {source.source_type === 'journal' ? (
            <span>
              Journal source
              {source.entry_date
                ? ` · ${formatDate(source.entry_date)}`
                : ''}
              {source.field ? ` · ${formatLabel(source.field)}` : ''}
            </span>
          ) : (
            <span className="break-all">
              {source.document_name || 'Document source'}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

export default function EmployeeKnowledgePortfolioPage() {
  const { user } = useApp()

  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedProject, setSelectedProject] = useState('all')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    async function loadPortfolio() {
      if (!user?.accessToken) {
        setPortfolio(null)
        setError('Your session is unavailable. Please log in again.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError('')

      try {
        const data = await fetchKnowledgePortfolio(user.accessToken)

        if (active) {
          setPortfolio(data)
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load your Knowledge Portfolio.')
          setPortfolio(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadPortfolio()

    return () => {
      active = false
    }
  }, [user?.accessToken, reloadKey])

  const projects = portfolio?.projects || []
  const journals = portfolio?.journals || []
  const documents = portfolio?.documents || []
  const knowledge = portfolio?.knowledge || []
  const handovers = portfolio?.handover_context || []

  const filteredData = useMemo(() => {
    const matchesProject = (item) =>
      selectedProject === 'all' ||
      String(item.project_id) === String(selectedProject)

    return {
      projects: projects.filter(matchesProject),
      journals: journals.filter(matchesProject),
      documents: documents.filter(matchesProject),
      knowledge: knowledge.filter(matchesProject),
      handovers: handovers.filter(matchesProject),
    }
  }, [
    projects,
    journals,
    documents,
    knowledge,
    handovers,
    selectedProject,
  ])

  const summary = portfolio?.summary || {}

  if (loading) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-border bg-surface-raised">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-violet-400/20 border-t-violet-400" />

        <p className="mt-4 text-sm font-semibold text-text-primary">
          Building your knowledge portfolio...
        </p>

        <p className="mt-1 text-xs text-text-muted">
          Fetching your project records and contributions.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/20 bg-surface-raised p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-300">
          <Icon name="alert" className="h-6 w-6" />
        </span>

        <h2 className="mt-4 text-lg font-bold text-text-primary">
          Unable to load Knowledge Portfolio
        </h2>

        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-muted">
          {error}
        </p>

        <button
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
        >
          <Icon name="activity" className="h-4 w-4" />
          Try again
        </button>
      </div>
    )
  }

  const profile = portfolio?.profile || {}

  return (
    <div className="space-y-7">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
            <Icon name="bookOpen" className="h-4 w-4" />
            My Workspace
          </div>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
            Knowledge Portfolio
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
            Your personal record of project experience, documented work
            and knowledge contributions across KnowFlow.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-300">
          <Icon name="lock" className="h-4 w-4" />
          Personal Portfolio
        </div>
      </div>

      {/* Employee Profile */}
      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm shadow-black/10">
        <div className="h-2 bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400" />

        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-2xl font-bold text-violet-300">
            {(profile.name || 'E').trim().charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold text-text-primary">
              {profile.name || 'Employee'}
            </h3>

            <p className="mt-1 break-all text-sm text-text-muted">
              {profile.email || ''}
            </p>

            <p className="mt-2 text-xs font-medium text-text-faint">
              Employee Knowledge Record
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface px-4 py-3">
            <p className="text-xs font-medium text-text-muted">
              Assigned projects
            </p>

            <p className="mt-1 text-2xl font-bold text-text-primary">
              {summary.total_projects || 0}
            </p>
          </div>
        </div>
      </section>

      {/* Portfolio Summary */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[
          {
            label: 'Knowledge Contributions',
            value: summary.total_knowledge_items || 0,
            icon: 'brain',
            color: 'bg-violet-500/10 text-violet-300',
          },
          {
            label: 'Work Journal Entries',
            value: summary.total_journals || 0,
            icon: 'notebookPen',
            color: 'bg-indigo-500/10 text-indigo-300',
          },
          {
            label: 'Documents Uploaded',
            value: summary.total_documents || 0,
            icon: 'fileText',
            color: 'bg-emerald-500/10 text-emerald-300',
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/10 transition hover:border-violet-400/20"
          >
            <div className="flex items-center justify-between gap-3">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.color}`}>
                <Icon name={item.icon} className="h-5 w-5" />
              </span>
            </div>

            <p className="mt-4 text-sm font-medium text-text-muted">
              {item.label}
            </p>

            <p className="mt-1 text-3xl font-bold tracking-tight text-text-primary">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      {/* Project Filter */}
      <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Portfolio Records
            </h3>

            <p className="mt-1 text-xs text-text-muted">
              Explore your records across all assigned projects or select one project.
            </p>
          </div>

          <select
            value={selectedProject}
            onChange={(event) => setSelectedProject(event.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 sm:w-72"
          >
            <option value="all">All assigned projects</option>

            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Project Experience */}
      <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/10">
        <SectionHeading
          icon="folder"
          title="Project Experience"
          description="Projects you have been assigned to and your recorded designation."
          count={filteredData.projects.length}
        />

        {filteredData.projects.length === 0 ? (
          <EmptyState
            icon="folder"
            title="No project experience available"
            description="Assigned project information will appear here when available."
          />
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {filteredData.projects.map((project) => (
              <article
                key={project.id}
                className="rounded-xl border border-border bg-surface p-4 transition hover:border-violet-400/25"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-300">
                      <Icon name="folderOpen" className="h-5 w-5" />
                    </span>

                    <div className="min-w-0">
                      <h4 className="break-words text-sm font-bold text-text-primary">
                        {project.name}
                      </h4>

                      <p className="mt-1 text-xs text-text-muted">
                        {project.designation || 'Designation not recorded'}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-lg border border-border bg-surface-hover px-2.5 py-1 text-xs font-semibold text-text-secondary">
                    {formatLabel(project.status)}
                  </span>
                </div>

                {project.description && (
                  <p className="mt-4 text-sm leading-6 text-text-secondary">
                    {project.description}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-4 border-t border-border-subtle pt-3 text-xs text-text-muted">
                  <span>
                    Joined: {formatDate(project.joined_at)}
                  </span>

                  <span>
                    Project created: {formatDate(project.created_at)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Knowledge Contributions */}
      <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/10">
        <SectionHeading
          icon="brain"
          title="Knowledge Contributions"
          description="Extracted knowledge linked to your own journal entries and uploaded documents."
          count={filteredData.knowledge.length}
        />

        {filteredData.knowledge.length === 0 ? (
          <EmptyState
            icon="brain"
            title="No knowledge contributions yet"
            description="Knowledge extracted from your recorded work and uploaded documents will appear here when available."
          />
        ) : (
          <div className="mt-5 space-y-3">
            {filteredData.knowledge.map((item) => (
              <KnowledgeCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Work Journal */}
      <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/10">
        <SectionHeading
          icon="notebookPen"
          title="Work Journal"
          description="Your original work summaries, decisions, tasks and recorded project context."
          count={filteredData.journals.length}
        />

        {filteredData.journals.length === 0 ? (
          <EmptyState
            icon="notebookPen"
            title="No journal entries available"
            description="Your submitted work journal entries will appear here."
          />
        ) : (
          <div className="mt-5 space-y-4">
            {filteredData.journals.map((journal) => {
              const project = projects.find(
                (item) => String(item.id) === String(journal.project_id)
              )

              return (
                <article
                  key={journal.id}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">
                        {project?.name || 'Project unavailable'}
                      </h4>

                      <p className="mt-1 text-xs text-text-muted">
                        Journal entry · {formatDate(journal.entry_date)}
                      </p>
                    </div>

                    <span className="self-start rounded-lg border border-border bg-surface-hover px-3 py-1.5 text-xs font-semibold text-text-secondary">
                      {formatDate(journal.created_at)}
                    </span>
                  </div>

                  {journal.work_summary && (
                    <div className="mt-4">
                      <h5 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                        Work Summary
                      </h5>

                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-text-secondary">
                        {journal.work_summary}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <JournalField
                      label="Completed Tasks"
                      value={journal.completed_tasks}
                    />

                    <JournalField
                      label="Decisions"
                      value={journal.decisions}
                    />

                    <JournalField
                      label="Blockers"
                      value={journal.blockers}
                    />

                    <JournalField
                      label="Dependencies"
                      value={journal.dependencies}
                    />

                    <JournalField
                      label="Pending Tasks"
                      value={journal.pending_tasks}
                    />

                    <JournalField
                      label="Next Steps"
                      value={journal.next_steps}
                    />
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Uploaded Documents */}
      <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/10">
        <SectionHeading
          icon="fileText"
          title="My Documents"
          description="Documents uploaded to your assigned projects."
          count={filteredData.documents.length}
        />

        {filteredData.documents.length === 0 ? (
          <EmptyState
            icon="fileText"
            title="No uploaded documents available"
            description="Documents uploaded by you will appear here."
          />
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {filteredData.documents.map((document) => {
              const project = projects.find(
                (item) => String(item.id) === String(document.project_id)
              )

              return (
                <article
                  key={document.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/15 bg-emerald-500/10 text-emerald-300">
                    <Icon name="fileText" className="h-5 w-5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <h4 className="break-words text-sm font-semibold text-text-primary">
                      {document.name}
                    </h4>

                    <p className="mt-1 text-xs text-text-muted">
                      {project?.name || 'Project unavailable'}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-faint">
                      <span>
                        {document.file_type?.toUpperCase() || 'File'}
                      </span>

                      {document.size_bytes !== null &&
                        document.size_bytes !== undefined && (
                          <span>
                            {(
                              document.size_bytes / (1024 * 1024)
                            ).toFixed(2)}{' '}
                            MB
                          </span>
                        )}

                      <span>{formatDate(document.created_at)}</span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Handover Context */}
      <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/10">
        <SectionHeading
          icon="clipboardCheck"
          title="Handover Record"
          description="Handover records in which you are listed as the outgoing or incoming employee."
          count={filteredData.handovers.length}
        />

        {filteredData.handovers.length === 0 ? (
          <EmptyState
            icon="clipboard"
            title="No handover records available"
            description="Relevant handover records will appear here when you are included in a project transition."
          />
        ) : (
          <div className="mt-5 space-y-3">
            {filteredData.handovers.map((handover) => (
              <article
                key={handover.id}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary">
                      {handover.project_name || 'Project unavailable'}
                    </h4>

                    <p className="mt-1 text-xs text-text-muted">
                      You are listed as the{' '}
                      <span className="font-semibold text-text-secondary">
                        {handover.relationship === 'outgoing'
                          ? 'outgoing employee'
                          : 'incoming employee'}
                      </span>
                    </p>
                  </div>

                  <span className="self-start rounded-lg border border-border bg-surface-hover px-3 py-1.5 text-xs font-semibold text-text-secondary">
                    {formatLabel(handover.status)}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-border-subtle pt-3 text-xs text-text-muted">
                  <span>
                    Manager approval:{' '}
                    <strong className="font-semibold text-text-secondary">
                      {handover.manager_approval_status
                        ? formatLabel(handover.manager_approval_status)
                        : 'Not recorded'}
                    </strong>
                  </span>

                  <span>
                    Created: {formatDate(handover.created_at)}
                  </span>

                  {handover.shared_at && (
                    <span>
                      Shared: {formatDate(handover.shared_at)}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Information Note */}
      <div className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-300">
            <Icon name="info" className="h-5 w-5" />
          </span>

          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              About Your Knowledge Portfolio
            </h3>

            <p className="mt-1 text-sm leading-6 text-text-secondary">
              This portfolio is assembled from your existing KnowFlow
              project records. Knowledge contributions are linked to
              their recorded sources. Handover approval represents
              approval of a handover record and does not independently
              verify every knowledge contribution. The portfolio is
              read-only.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}