
import { useMemo, useState } from 'react'
import { useApp } from '../hooks/useApp'
import Icon from '../components/common/Icon'

function formatDate(value) {
  if (!value) return 'Date not available'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getDateValue(entry) {
  const value = entry.createdAt || entry.date
  const date = new Date(value || 0)

  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function getTaskCount(entries) {
  return entries.reduce((total, entry) => {
    return total + (entry.completedTasks || '')
      .split(/\n|;/)
      .map((task) => task.trim())
      .filter(Boolean).length
  }, 0)
}

function MetricCard({ label, value, description, icon }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:border-violet-500/25 hover:shadow-xl hover:shadow-black/20">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-muted">{label}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>

      <p className="mt-4 text-3xl font-bold tracking-tight text-text-primary">
        {value}
      </p>

      <p className="mt-1 text-xs text-text-muted">{description}</p>
    </div>
  )
}

function DetailSection({ title, content, color = 'slate' }) {
  if (!content?.trim()) return null

  const styles = {
    slate: 'border-border bg-surface',
    green: 'border-emerald-500/20 bg-emerald-500/10',
    amber: 'border-amber-500/20 bg-amber-500/10',
    blue: 'border-sky-500/20 bg-sky-500/10',
    red: 'border-rose-500/20 bg-rose-500/10',
    violet: 'border-violet-500/20 bg-violet-500/10',
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

function JournalCard({ entry, expanded, onToggle }) {
  const { journal, project } = entry

  return (
    <article className="relative ml-3 border-l-2 border-violet-500/25 pb-7 pl-7 last:border-l-transparent last:pb-0">
      <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-[3px] border-violet-400 bg-surface-raised" />

      <div className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 transition hover:border-violet-500/25 hover:shadow-xl hover:shadow-black/15">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-300">
              {formatDate(journal.date || journal.createdAt)}
            </p>

            <h3 className="mt-1 text-base font-bold text-text-primary">
              {project.name}
            </h3>

            <p className="mt-1 text-xs text-text-muted">
              {entry.memberRole || 'Project Member'}
              {journal.createdAt && ` · ${formatTime(journal.createdAt)}`}
            </p>
          </div>

          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
            Submitted
          </span>
        </div>

        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-text-faint">
            Work Summary
          </p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {journal.workSummary || 'No work summary provided.'}
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {journal.completedTasks?.trim() && (
            <div className="flex gap-2">
              <Icon name="checkCircle" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <div>
                <p className="text-xs font-semibold text-text-secondary">Completed</p>
                <p className="mt-1 text-xs leading-5 text-text-muted line-clamp-2 whitespace-pre-line">
                  {journal.completedTasks}
                </p>
              </div>
            </div>
          )}

          {journal.blockers?.trim() && (
            <div className="flex gap-2">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <p className="text-xs font-semibold text-text-secondary">Blockers</p>
                <p className="mt-1 text-xs leading-5 text-text-muted line-clamp-2 whitespace-pre-line">
                  {journal.blockers}
                </p>
              </div>
            </div>
          )}
        </div>

        {expanded && (
          <div className="mt-5 grid gap-3 border-t border-border pt-5">
            <DetailSection title="Work Summary" content={journal.workSummary} />
            <DetailSection title="Completed Tasks" content={journal.completedTasks} color="green" />
            <DetailSection title="Decisions Made" content={journal.decisions} color="violet" />
            <DetailSection title="Blockers" content={journal.blockers} color="red" />
            <DetailSection title="Dependencies" content={journal.dependencies} color="amber" />
            <DetailSection title="Pending Tasks" content={journal.pendingTasks} color="amber" />
            <DetailSection title="Next Steps" content={journal.nextSteps} color="blue" />
            <DetailSection title="Evidence / References" content={journal.evidence} />

            <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-xs text-text-faint">
              <span>Submitted by {journal.createdBy}</span>
              <span>{formatDate(journal.createdAt || journal.date)}</span>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-text-faint">
            {formatTime(journal.createdAt)}
            {journal.createdAt ? ' · Submission time' : 'Journal record'}
          </p>

          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-2 text-sm font-semibold text-violet-300 transition hover:text-violet-200"
          >
            {expanded ? 'Show Less' : 'View Journal'}
            <Icon
              name={expanded ? 'arrowLeft' : 'eye'}
              className="h-4 w-4"
            />
          </button>
        </div>
      </div>
    </article>
  )
}

export default function EmployeeJournalHistoryPage() {
  const { projects, user } = useApp()

  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [expandedEntry, setExpandedEntry] = useState(null)

  const journals = useMemo(() => {
    return projects.flatMap((project) => {
      const member = project.members?.find(
        (item) => item.email === user?.email
      )

      if (!member) return []

      return (project.journalEntries || [])
        .filter((entry) => entry.createdBy === member.name)
        .map((journal) => ({
          journal,
          project,
          memberRole: member.role,
        }))
    }).sort((a, b) => getDateValue(b.journal) - getDateValue(a.journal))
  }, [projects, user])

  const thisMonthCount = journals.filter((entry) => {
    const date = new Date(getDateValue(entry.journal))
    const now = new Date()

    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    )
  }).length

  const latestEntry = journals[0]

  const filteredJournals = useMemo(() => {
    const now = new Date()

    return journals.filter(({ journal, project }) => {
      const searchableText = [
        project.name,
        journal.workSummary,
        journal.completedTasks,
        journal.decisions,
        journal.blockers,
        journal.dependencies,
        journal.pendingTasks,
        journal.nextSteps,
        journal.evidence,
      ].join(' ').toLowerCase()

      const matchesSearch = searchableText.includes(search.toLowerCase())

      const matchesProject =
        selectedProject === 'all' || project.id === selectedProject

      const date = new Date(getDateValue(journal))

      let matchesDate = true

      if (dateRange === 'today') {
        matchesDate = date.toDateString() === now.toDateString()
      }

      if (dateRange === 'week') {
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - 6)
        weekStart.setHours(0, 0, 0, 0)
        matchesDate = date >= weekStart && date <= now
      }

      if (dateRange === 'month') {
        matchesDate =
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
      }

      if (dateRange === 'custom') {
        const entryDate = (journal.date || journal.createdAt || '').slice(0, 10)
        matchesDate =
          (!startDate || entryDate >= startDate) &&
          (!endDate || entryDate <= endDate)
      }

      return matchesSearch && matchesProject && matchesDate
    })
  }, [journals, search, selectedProject, dateRange, startDate, endDate])

  const hasActiveFilters =
    selectedProject !== 'all' ||
    dateRange !== 'all' ||
    Boolean(search)

  const clearFilters = () => {
    setSearch('')
    setSelectedProject('all')
    setDateRange('all')
    setStartDate('')
    setEndDate('')
  }

  return (
    <div className="space-y-7">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
              Employee Workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary">
              Journal History
            </h1>
            <p className="mt-2 text-sm text-text-muted">
              Review your previously submitted work journals and project progress.
            </p>
          </div>

          <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-300">
            <span className="inline-flex items-center gap-2">
              <Icon name="lock" className="h-3.5 w-3.5" />
              Personal Records
            </span>
          </span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Total Journals"
          value={journals.length}
          description="Your submitted work records"
          icon="notebookPen"
        />

        <MetricCard
          label="This Month"
          value={thisMonthCount}
          description="Journals submitted this month"
          icon="clock"
        />

        <MetricCard
          label="Last Submitted"
          value={latestEntry ? formatDate(latestEntry.journal.date || latestEntry.journal.createdAt) : '—'}
          description="Your latest journal entry"
          icon="clock"
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-lg shadow-black/10">
        <div className="border-b border-border p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                Your Submitted Journals
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Your personal work records, arranged from newest to oldest.
              </p>
            </div>

            <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300">
              Newest First
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search journals..."
                className="w-full rounded-xl border border-border bg-surface py-3 pl-10 pr-4 text-sm text-text-primary outline-none transition placeholder:text-text-faint focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
              />
            </div>

            <button
              type="button"
              onClick={() => setFilterOpen(!filterOpen)}
              className={`inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition ${
                filterOpen || hasActiveFilters
                  ? 'border-violet-500/30 bg-violet-500/10 text-violet-300'
                  : 'border-border bg-surface text-text-secondary hover:border-violet-500/30 hover:text-text-primary'
              }`}
            >
              <Icon name="listChecks" className="h-4 w-4" />
              Filter
              <Icon name="listChecks" className="h-4 w-4" />
            </button>
          </div>

          {filterOpen && (
            <div className="mt-4 rounded-xl border border-border bg-surface p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-text-secondary">
                  Project
                  <select
                    value={selectedProject}
                    onChange={(event) => setSelectedProject(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm font-normal text-text-primary outline-none focus:border-violet-500"
                  >
                    <option value="all">All Projects</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-semibold text-text-secondary">
                  Date Range
                  <select
                    value={dateRange}
                    onChange={(event) => setDateRange(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm font-normal text-text-primary outline-none focus:border-violet-500"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </label>
              </div>

              {dateRange === 'custom' && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-text-secondary">
                    From
                    <input
                      type="date"
                      value={startDate}
                      max={endDate || undefined}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="mt-2 block w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm font-normal text-text-primary"
                    />
                  </label>

                  <label className="text-xs font-semibold text-text-secondary">
                    To
                    <input
                      type="date"
                      value={endDate}
                      min={startDate || undefined}
                      onChange={(event) => setEndDate(event.target.value)}
                      className="mt-2 block w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm font-normal text-text-primary"
                    />
                  </label>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-violet-300 hover:text-violet-200"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-text-secondary">
              {filteredJournals.length}{' '}
              {filteredJournals.length === 1 ? 'journal' : 'journals'} found
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-violet-300 hover:text-violet-200"
              >
                Clear all
              </button>
            )}
          </div>

          {filteredJournals.length ? (
            <div>
              {filteredJournals.map((entry) => {
                const entryId =
                  entry.journal.id ||
                  `${entry.project.id}-${getDateValue(entry.journal)}`

                return (
                  <JournalCard
                    key={entryId}
                    entry={entry}
                    expanded={expandedEntry === entryId}
                    onToggle={() =>
                      setExpandedEntry(
                        expandedEntry === entryId ? null : entryId
                      )
                    }
                  />
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-12 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                <Icon name="bookOpen" className="h-7 w-7" />
              </span>

              <h3 className="mt-4 text-base font-bold text-text-primary">
                {journals.length
                  ? 'No matching journals found'
                  : 'No journal entries yet'}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
                {journals.length
                  ? 'Try changing your search or filters to find your journals.'
                  : 'Your submitted daily work journals will appear here.'}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-surface-raised to-indigo-500/10 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/15 text-violet-300">
            <Icon name="sparkles" className="h-5 w-5" />
          </span>

          <div>
            <h2 className="text-base font-bold text-text-primary">
              Your Work Builds Project Knowledge
            </h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              Your daily journal entries contribute to cumulative project
              knowledge. When a handover is initiated, the captured activity
              can be consolidated into a handover report for review and approval.
            </p>
          </div>
        </div>

        <p className="mt-4 border-t border-border pt-3 text-xs leading-5 text-text-muted">
          Daily journal entries are personal work records and are not
          individually sent for manager approval.
        </p>
      </section>
    </div>
  )
}
