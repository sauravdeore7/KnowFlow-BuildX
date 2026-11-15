
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../hooks/useApp'

const FILTERS = ['All Entries', 'Completed', 'Blockers', 'Decisions']

function formatEntryDate(value) {
  if (!value) return 'Date not available'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatEntryTime(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatKnowledgeSource(source) {
  if (!source) return ''

  if (typeof source === 'string') return source

  if (typeof source !== 'object') return String(source)

  const details = [
    source.source_type,
    source.field,
    source.entry_date ? formatEntryDate(source.entry_date) : null,
  ].filter(Boolean)

  return details.length ? details.join(' · ') : 'Journal entry'
}

function getTaskCount(entries) {
  return entries.reduce((total, entry) => {
    const tasks = (entry.completedTasks || '')
      .split(/\n|;/)
      .map((task) => task.trim())
      .filter(Boolean)

    return total + tasks.length
  }, 0)
}

function MetricCard({ label, value, description, icon }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 transition hover:border-violet-500/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-secondary">{label}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-lg text-violet-300">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-text-primary">
        {value}
      </p>
      <p className="mt-1 text-xs text-text-muted">{description}</p>
    </div>
  )
}

function EntrySection({ title, content, color = 'slate' }) {
  if (!content?.trim()) return null

  const styles = {
    slate: 'bg-surface-hover/70 border-border',
    green: 'bg-emerald-500/[0.07] border-emerald-400/20',
    amber: 'bg-amber-500/[0.07] border-amber-400/20',
    blue: 'bg-sky-500/[0.07] border-sky-400/20',
    red: 'bg-red-500/[0.07] border-red-400/20',
    violet: 'bg-violet-500/[0.08] border-violet-400/20',
  }

  return (
    <div className={`rounded-xl border p-3 ${styles[color]}`}>
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-text-muted">
        {title}
      </p>
      <p className="whitespace-pre-line text-sm leading-6 text-text-secondary">
        {content}
      </p>
    </div>
  )
}

function JournalEntryCard({ entry, index }) {
  const hasBlocker = Boolean(entry.blockers?.trim())
  const hasDecision = Boolean(entry.decisions?.trim())
  const hasCompleted = Boolean(entry.completedTasks?.trim())

  return (
    <article className="relative ml-3 border-l-2 border-violet-500/30 pb-7 pl-7 last:border-l-transparent last:pb-0">
      <span className="absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-[3px] border-violet-400 bg-surface" />

      <div className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 transition hover:border-violet-500/30 hover:shadow-xl hover:shadow-violet-950/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
              {formatEntryDate(entry.date || entry.createdAt)}
            </p>
            <h3 className="mt-1 text-base font-bold text-text-primary">
              Journal Entry {index + 1}
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              Recorded by {entry.createdBy || 'Unknown employee'}
              {entry.createdAt && ` · ${formatEntryTime(entry.createdAt)}`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {hasCompleted && (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                Completed
              </span>
            )}
            {hasBlocker && (
              <span className="rounded-full border border-red-400/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
                Blocker
              </span>
            )}
            {hasDecision && (
              <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
                Decision
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <EntrySection title="Work Summary" content={entry.workSummary} />
          <EntrySection title="Completed Tasks" content={entry.completedTasks} color="green" />
          <EntrySection title="Decisions Made" content={entry.decisions} color="violet" />
          <EntrySection title="Blockers" content={entry.blockers} color="red" />
          <EntrySection title="Dependencies" content={entry.dependencies} color="amber" />
          <EntrySection title="Pending Tasks" content={entry.pendingTasks} color="amber" />
          <EntrySection title="Next Steps" content={entry.nextSteps} color="blue" />
          <EntrySection title="Evidence / References" content={entry.evidence} />
        </div>
      </div>
    </article>
  )
}

export default function JournalHistoryPage() {
  const { projects, params, navigate } = useApp()

  const [selectedProjectId, setSelectedProjectId] = useState(
    params.projectId || projects[0]?.id || '',
  )
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All Entries')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    if (params.projectId && projects.some((project) => project.id === params.projectId)) {
      setSelectedProjectId(params.projectId)
    } else if (!projects.some((project) => project.id === selectedProjectId)) {
      setSelectedProjectId(projects[0]?.id || '')
    }
  }, [params.projectId, projects, selectedProjectId])

  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  )

  const entries = useMemo(() => {
    return [...(selectedProject?.journalEntries || [])].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.date || 0).getTime()
      const dateB = new Date(b.createdAt || b.date || 0).getTime()
      return dateB - dateA
    })
  }, [selectedProject])

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const searchableText = [
        entry.workSummary,
        entry.completedTasks,
        entry.decisions,
        entry.blockers,
        entry.dependencies,
        entry.pendingTasks,
        entry.nextSteps,
        entry.evidence,
        entry.createdBy,
      ].join(' ').toLowerCase()

      const matchesSearch = searchableText.includes(search.toLowerCase())

      const matchesFilter =
        activeFilter === 'All Entries' ||
        (activeFilter === 'Completed' && Boolean(entry.completedTasks?.trim())) ||
        (activeFilter === 'Blockers' && Boolean(entry.blockers?.trim())) ||
        (activeFilter === 'Decisions' && Boolean(entry.decisions?.trim()))

      const entryDate = (entry.date || entry.createdAt || '').slice(0, 10)
      const matchesStart = !startDate || entryDate >= startDate
      const matchesEnd = !endDate || entryDate <= endDate

      return matchesSearch && matchesFilter && matchesStart && matchesEnd
    })
  }, [entries, search, activeFilter, startDate, endDate])

  const activeDays = new Set(
    entries.map((entry) => (entry.date || entry.createdAt || '').slice(0, 10)).filter(Boolean),
  ).size

  const handleProjectChange = (projectId) => {
    setSelectedProjectId(projectId)
    navigate('project-journal', { projectId })
  }

  return (
    <div className="space-y-7">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
              Project Knowledge Workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary">
              Journal History
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              View daily work records, decisions, blockers and progress across your projects.
            </p>
          </div>
          <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-300">
            {projects.length} Projects Available
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.12] via-surface-raised to-indigo-500/[0.08] p-5 shadow-lg shadow-black/10 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/15 text-lg text-violet-300">
            ▦
          </span>
          <div>
            <label htmlFor="journal-project" className="block text-sm font-bold text-text-primary">
              Select Project
            </label>
            <p className="text-xs text-text-secondary">
              Switch projects to view their complete journal history
            </p>
          </div>
        </div>

        <select
          id="journal-project"
          value={selectedProjectId}
          onChange={(event) => handleProjectChange(event.target.value)}
          className="mt-4 w-full rounded-xl border border-border-strong bg-surface px-4 py-3 text-sm font-semibold text-text-primary shadow-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>

        {selectedProject && (
          <p className="mt-3 text-xs text-text-secondary">
            Currently viewing: <strong className="text-violet-300">{selectedProject.name}</strong>
          </p>
        )}
      </section>

      {!projects.length ? (
        <div className="rounded-2xl border border-border bg-surface-raised p-10 text-center">
          <h2 className="text-lg font-bold text-text-primary">No projects available</h2>
          <p className="mt-2 text-sm text-text-muted">
            Projects available to your account will appear here.
          </p>
        </div>
      ) : selectedProject ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Total Entries"
              value={entries.length}
              description="Daily work records"
              icon="▤"
            />
            <MetricCard
              label="Tasks Done"
              value={getTaskCount(entries)}
              description="Recorded completed tasks"
              icon="✓"
            />
            <MetricCard
              label="Active Days"
              value={activeDays}
              description="Days with journal activity"
              icon="◷"
            />
          </section>

          <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-lg shadow-black/10">
            <div className="border-b border-border p-5 sm:p-6">
              <div>
                <h2 className="text-lg font-bold text-text-primary">All Journal Entries</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Search, filter and review recorded project activity.
                </p>
              </div>

              <div className="mt-5">
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search work, tasks, decisions, blockers..."
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-faint focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setActiveFilter(filter)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      activeFilter === filter
                        ? 'border border-violet-400/30 bg-violet-600 text-white shadow-lg shadow-violet-950/30'
                        : 'border border-border bg-surface text-text-secondary hover:border-violet-400/40 hover:bg-surface-hover hover:text-violet-300'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-text-secondary">
                  From
                  <input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal text-text-primary outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                  />
                </label>
                <label className="text-xs font-semibold text-text-secondary">
                  To
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal text-text-primary outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                  />
                </label>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="mb-6 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-text-secondary">
                  {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'} found
                </p>
                {(search || activeFilter !== 'All Entries' || startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('')
                      setActiveFilter('All Entries')
                      setStartDate('')
                      setEndDate('')
                    }}
                    className="text-xs font-semibold text-violet-300 transition hover:text-violet-200"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {filteredEntries.length ? (
                <div>
                  {filteredEntries.map((entry, index) => (
                    <JournalEntryCard
                      key={entry.id || `${entry.createdAt}-${index}`}
                      entry={entry}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border-strong bg-surface-hover/50 px-5 py-12 text-center">
                  <p className="text-base font-semibold text-text-primary">
                    {entries.length ? 'No matching entries found' : 'No journal entries yet'}
                  </p>
                  <p className="mt-2 text-sm text-text-muted">
                    {entries.length
                      ? 'Try changing your search or filters.'
                      : 'Daily work records will appear here when employees save their journals.'}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.10] via-surface-raised to-indigo-500/[0.08] p-5 shadow-lg shadow-black/10 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/15 text-xl text-violet-300">
                ✦
              </span>
              <div>
                <h2 className="text-base font-bold text-text-primary">
                  Cumulative Project Knowledge
                </h2>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  Daily journal entries contribute to the project's evolving knowledge.
                  When a handover is initiated, the captured activity can be consolidated
                  into one handover report for review and approval.
                </p>
              </div>
            </div>

            {selectedProject.knowledge?.summary && (
              <div className="mt-5 rounded-xl border border-border bg-surface/80 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-violet-300">
                  Current Knowledge Summary
                </p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {selectedProject.knowledge.summary}
                </p>
              </div>
            )}

            {selectedProject.knowledge?.items?.length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {selectedProject.knowledge.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-border bg-surface/80 p-3"
                  >
                    <p className="text-xs font-bold uppercase text-violet-300">
                      {item.type}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">{item.text}</p>
                    {item.source && (
                      <p className="mt-2 text-xs text-text-muted">
                        Source: {formatKnowledgeSource(item.source)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="mt-4 border-t border-border pt-3 text-xs leading-5 text-text-muted">
              Daily journal entries are not individually submitted for manager approval.
              The consolidated handover follows the review and approval workflow.
            </p>
          </section>
        </>
      ) : null}
    </div>
  )
}
