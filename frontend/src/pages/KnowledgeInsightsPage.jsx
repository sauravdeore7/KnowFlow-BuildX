
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../hooks/useApp'

const STATUS_STYLES = {
  completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/25',
  pending: 'bg-amber-500/15 text-amber-300 border-amber-400/25',
  blocker: 'bg-red-500/15 text-red-300 border-red-400/25',
  decision: 'bg-sky-500/15 text-sky-300 border-sky-400/25',
  question: 'bg-violet-500/15 text-violet-300 border-violet-400/25',
  dependency: 'bg-orange-500/15 text-orange-300 border-orange-400/25',
  next_step: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/25',
  document: 'bg-surface-hover text-text-secondary border-border',
  task: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/25',
}

const STATUS_LABELS = {
  completed: 'Completed',
  pending: 'Pending',
  blocker: 'Blocker',
  decision: 'Decision',
  question: 'Open Question',
  dependency: 'Dependency',
  next_step: 'Next Step',
  document: 'Document',
  task: 'Task',
}

const CATEGORY_ORDER = [
  'completed',
  'decision',
  'pending',
  'next_step',
  'blocker',
  'dependency',
  'question',
  'document',
  'task',
]

const CATEGORY_ICONS = {
  all: '◈',
  completed: '✓',
  decision: '◇',
  pending: '◷',
  next_step: '→',
  blocker: '!',
  dependency: '⌁',
  question: '?',
  document: '▤',
  task: '□',
}

const PLACEHOLDERS = new Set([
  '',
  'none',
  'null',
  'undefined',
  'n/a',
  'na',
  'nil',
  '-',
  '--',
  'not applicable',
])

function getFindingText(finding) {
  const value = finding.text ?? finding.content ?? ''
  return String(value).trim()
}

function isMeaningful(value) {
  if (value === null || value === undefined) return false

  const text = String(value).trim()

  return text.length > 0 && !PLACEHOLDERS.has(text.toLowerCase())
}

function getMeaningfulFindings(project) {
  return (project.knowledge?.items || []).filter((item) =>
    isMeaningful(getFindingText(item)),
  )
}

function getMeaningfulJournalValue(value) {
  if (Array.isArray(value)) {
    return value.some((item) => getMeaningfulJournalValue(item))
  }

  if (typeof value === 'object' && value !== null) {
    return Object.values(value).some((item) =>
      getMeaningfulJournalValue(item),
    )
  }

  return isMeaningful(value)
}

function getSourceLabel(source, findingType) {
  if (!source || typeof source !== 'object') {
    return 'Source details unavailable'
  }

  const sourceType = String(
    source.source_type || source.type || '',
  ).toLowerCase()

  if (
    sourceType === 'journal' ||
    source.journal_id ||
    source.entry_date
  ) {
    const date = source.entry_date || source.journal_date

    return date ? `Journal entry · ${date}` : 'Journal entry'
  }

  if (
    sourceType === 'document' ||
    source.document_name ||
    source.file_name
  ) {
    return `Document · ${
      source.document_name || source.file_name || 'Project document'
    }`
  }

  if (source.source_name || source.name) {
    return String(source.source_name || source.name)
  }

  if (findingType === 'document') {
    return 'Project document'
  }

  return 'Project knowledge record'
}

function getFindingDate(finding) {
  const source = finding.source || {}

  const value =
    source.entry_date ||
    source.journal_date ||
    finding.created_at ||
    finding.updated_at

  if (!value) return null

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return null

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getInsights(project) {
  const findings = getMeaningfulFindings(project)
  const journals = project.journalEntries || []
  const documents = project.documents || []
  const members = project.members || []

  const count = (type) =>
    findings.filter(
      (item) => String(item.type || '').toLowerCase() === type,
    ).length

  const journalBlockers = journals.filter((entry) =>
    getMeaningfulJournalValue(entry.blockers),
  )

  const journalPending = journals.filter((entry) =>
    getMeaningfulJournalValue(entry.pendingTasks),
  )

  const sourceMissing = findings.filter(
    (item) =>
      !item.source ||
      typeof item.source !== 'object' ||
      Object.keys(item.source).length === 0,
  )

  const blockers = findings.filter(
    (item) => String(item.type || '').toLowerCase() === 'blocker',
  )

  const pending = findings.filter(
    (item) => String(item.type || '').toLowerCase() === 'pending',
  )

  const questions = findings.filter(
    (item) => String(item.type || '').toLowerCase() === 'question',
  )

  const observations = []

  if (blockers.length > 0) {
    observations.push({
      level: 'high',
      title: `${blockers.length} recorded blocker${blockers.length === 1 ? '' : 's'}`,
      description: getFindingText(blockers[0]),
      finding: blockers[0],
      type: 'blocker',
    })
  }

  if (pending.length > 0) {
    observations.push({
      level: 'medium',
      title: `${pending.length} pending work item${pending.length === 1 ? '' : 's'}`,
      description: getFindingText(pending[0]),
      finding: pending[0],
      type: 'pending',
    })
  }

  if (questions.length > 0) {
    observations.push({
      level: 'medium',
      title: `${questions.length} unresolved question${questions.length === 1 ? '' : 's'}`,
      description: getFindingText(questions[0]),
      finding: questions[0],
      type: 'question',
    })
  }

  if (sourceMissing.length > 0) {
    observations.push({
      level: 'info',
      title: `${sourceMissing.length} finding${sourceMissing.length === 1 ? '' : 's'} without source details`,
      description:
        'Some records do not contain enough source information to trace their origin.',
      type: 'source',
    })
  }

  return {
    findings,
    journals,
    documents,
    members,
    completed: count('completed'),
    pending: count('pending'),
    blockers: count('blocker'),
    decisions: count('decision'),
    questions: count('question'),
    dependencies: count('dependency'),
    nextSteps: count('next_step'),
    documentsFindings: count('document'),
    journalBlockers: journalBlockers.length,
    journalPending: journalPending.length,
    sourceMissing: sourceMissing.length,
    openWork: pending.length + blockers.length + questions.length,
    sourceCount: journals.length + documents.length,
    observations,
  }
}

function MetricCard({ label, value, detail, icon, accent }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-5 transition hover:border-violet-500/30 hover:shadow-lg hover:shadow-black/10">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          {label}
        </span>

        <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${accent}`}>
          {icon}
        </span>
      </div>

      <p className="mt-4 text-3xl font-bold tracking-tight text-text-primary">
        {value}
      </p>

      <p className="mt-1 text-xs text-text-muted">{detail}</p>
    </div>
  )
}

function CategoryButton({ type, count, active, onClick }) {
  const label = type === 'all' ? 'All findings' : STATUS_LABELS[type] || type

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition ${
        active
          ? 'border-violet-500/40 bg-violet-500/10 text-violet-300 shadow-sm'
          : 'border-transparent bg-surface-raised text-text-secondary hover:border-border hover:bg-surface-hover'
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-sm font-semibold text-text-secondary">
          {CATEGORY_ICONS[type] || '•'}
        </span>

        <span className="truncate text-sm font-medium">{label}</span>
      </span>

      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? 'bg-violet-500/20 text-violet-300'
          : 'bg-surface-hover text-text-muted'
      }`}>
        {count}
      </span>
    </button>
  )
}

function FindingCard({ finding, onOpen }) {
  const type = String(finding.type || '').toLowerCase()
  const label = STATUS_LABELS[type] || type || 'Finding'
  const text = getFindingText(finding)
  const source = getSourceLabel(finding.source, type)
  const date = getFindingDate(finding)

  return (
    <article className="group rounded-xl border border-border bg-surface-raised p-4 transition hover:border-violet-500/30 hover:shadow-lg hover:shadow-black/10 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
          STATUS_STYLES[type] || 'border-border bg-surface-hover text-text-secondary'
        }`}>
          {label}
        </span>

        {date && (
          <span className="text-xs text-text-muted">{date}</span>
        )}
      </div>

      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-text-secondary">
        {text.length > 360 ? `${text.slice(0, 360).trim()}…` : text}
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <span className="flex min-w-0 items-center gap-2 text-xs text-text-muted">
          <span>↳</span>
          <span className="truncate">{source}</span>
        </span>

        <button
          type="button"
          onClick={onOpen}
          className="shrink-0 text-xs font-semibold text-violet-400 transition hover:text-violet-300"
        >
          View details →
        </button>
      </div>
    </article>
  )
}

function FindingDetail({ finding, onClose }) {
  if (!finding) return null

  const type = String(finding.type || '').toLowerCase()
  const text = getFindingText(finding)
  const date = getFindingDate(finding)
  const source = getSourceLabel(finding.source, type)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="finding-detail-title"
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface-raised shadow-2xl shadow-black/40"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface-raised px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Knowledge record
            </p>
            <h3 id="finding-detail-title" className="mt-1 font-bold text-text-primary">
              Finding details
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close finding details"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-text-muted transition hover:bg-surface-hover hover:text-text-primary"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
              STATUS_STYLES[type] || 'border-border bg-surface-hover text-text-secondary'
            }`}>
              {STATUS_LABELS[type] || type || 'Finding'}
            </span>

            <h4 className="mt-4 text-sm font-semibold text-text-muted">
              Recorded information
            </h4>

            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-text-secondary">
              {text}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Source information
            </h4>

            <p className="mt-2 break-words text-sm font-medium text-text-primary">
              {source}
            </p>

            <p className="mt-2 text-xs text-text-muted">
              {date ? `Recorded: ${date}` : 'Date information unavailable'}
            </p>

            {finding.source && typeof finding.source === 'object' && (
              <div className="mt-3 space-y-1 border-t border-border pt-3">
                {Object.entries(finding.source).map(([key, value]) => {
                  if (
                    value === null ||
                    value === undefined ||
                    typeof value === 'object'
                  ) {
                    return null
                  }

                  return (
                    <p key={key} className="break-words text-xs text-text-muted">
                      <span className="font-semibold text-text-secondary">
                        {key.replace(/_/g, ' ')}:
                      </span>{' '}
                      {String(value)}
                    </p>
                  )
                })}
              </div>
            )}
          </div>

          {finding.id && (
            <p className="break-all text-xs text-text-muted">
              Record ID: {finding.id}
            </p>
          )}
        </div>

        <div className="border-t border-border px-5 py-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised"
          >
            Close details
          </button>
        </div>
      </section>
    </div>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-hover text-2xl text-text-muted">
        ◈
      </div>

      <h4 className="mt-4 text-sm font-semibold text-text-primary">
        {title}
      </h4>

      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-text-muted">
        {description}
      </p>
    </div>
  )
}

export default function KnowledgeInsightsPage() {
  const { projects, params } = useApp()

  const [selectedProjectId, setSelectedProjectId] = useState(
    params.projectId || '',
  )
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFinding, setSelectedFinding] = useState(null)

  useEffect(() => {
    if (params.projectId) {
      setSelectedProjectId(params.projectId)
    }
  }, [params.projectId])

  const project = projects.find(
    (item) => item.id === selectedProjectId,
  )

  const insights = useMemo(
    () => (project ? getInsights(project) : null),
    [project],
  )

  const categoryCounts = useMemo(() => {
    if (!insights) return {}

    return insights.findings.reduce((counts, finding) => {
      const type = String(finding.type || 'other').toLowerCase()
      counts[type] = (counts[type] || 0) + 1
      return counts
    }, {})
  }, [insights])

  const filteredFindings = useMemo(() => {
    if (!insights) return []

    const query = searchQuery.trim().toLowerCase()

    return insights.findings.filter((finding) => {
      const type = String(finding.type || '').toLowerCase()
      const text = getFindingText(finding).toLowerCase()
      const source = getSourceLabel(finding.source, type).toLowerCase()

      const matchesCategory =
        activeCategory === 'all' || type === activeCategory

      const matchesSearch =
        !query ||
        text.includes(query) ||
        type.includes(query) ||
        source.includes(query)

      return matchesCategory && matchesSearch
    })
  }, [insights, activeCategory, searchQuery])

  const handleProjectChange = (projectId) => {
    setSelectedProjectId(projectId)
    setActiveCategory('all')
    setSearchQuery('')
    setSelectedFinding(null)
  }

  const attentionItems = insights?.observations.filter(
    (item) => item.finding,
  ) || []

  if (!projects.length) {
    return (
      <div className="mx-auto max-w-3xl py-16">
        <EmptyState
          title="No projects available"
          description="Create a project to start exploring its knowledge records and insights."
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-10">
      {/* Page heading */}
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-violet-300">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            Manager workspace
            <span className="text-text-muted">/</span>
            Project intelligence
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Knowledge Insights
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
            Understand what your team knows, identify unresolved work,
            and explore the information behind every project finding.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface-raised px-4 py-3">
          <p className="text-xs font-medium text-text-muted">
            KNOWFLOW WORKSPACE
          </p>
          <p className="mt-1 text-sm font-semibold text-text-primary">
            Project Knowledge Intelligence
          </p>
        </div>
      </header>

      {/* Project selection */}
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Current project
          </p>

          <h2 className="mt-1 truncate text-lg font-bold text-text-primary">
            {project?.name || 'Select a project'}
          </h2>

          <p className="mt-1 text-sm text-text-muted">
            Choose a project to explore its knowledge and activity.
          </p>
        </div>

        <select
          value={selectedProjectId}
          onChange={(event) => handleProjectChange(event.target.value)}
          aria-label="Select project"
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 sm:max-w-sm"
        >
          <option value="">Choose a project...</option>

          {projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </section>

      {!project ? (
        <EmptyState
          title="Select a project to explore its knowledge"
          description="Once you select a project, its recorded decisions, work items, blockers, dependencies and document findings will appear here."
        />
      ) : (
        <>
          {/* Project introduction */}
          <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
                Project overview
              </p>

              <h2 className="mt-2 text-xl font-bold text-text-primary">
                {project.name}
              </h2>

              <p className="mt-2 text-sm leading-6 text-text-muted">
                {project.knowledge?.summary ||
                  project.description ||
                  'Explore the knowledge records currently available for this project.'}
              </p>
            </div>

            <div className="shrink-0 rounded-xl border border-border bg-surface-raised px-4 py-3">
              <p className="text-xs text-text-muted">Knowledge records</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">
                {insights.findings.length}
              </p>
            </div>
          </section>

          {/* Key metrics */}
          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-text-primary">
                  Project at a glance
                </h3>
                <p className="mt-1 text-sm text-text-muted">
                  A summary of the meaningful information currently recorded.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Total findings"
                value={insights.findings.length}
                detail="Meaningful knowledge records"
                icon="◈"
                accent="bg-violet-500/15 text-violet-300"
              />

              <MetricCard
                label="Decisions"
                value={insights.decisions}
                detail="Recorded project decisions"
                icon="◇"
                accent="bg-indigo-500/15 text-indigo-300"
              />

              <MetricCard
                label="Open work"
                value={insights.openWork}
                detail="Pending, blockers and questions"
                icon="◷"
                accent="bg-amber-500/15 text-amber-300"
              />

              <MetricCard
                label="Project sources"
                value={insights.sourceCount}
                detail={`${insights.journals.length} journals · ${insights.documents.length} documents`}
                icon="▤"
                accent="bg-emerald-500/15 text-emerald-300"
              />
            </div>
          </section>

          {/* Needs attention */}
          <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300">
                    !
                  </span>

                  <h3 className="text-lg font-bold text-text-primary">
                    Needs attention
                  </h3>
                </div>

                <p className="mt-2 text-sm text-text-muted">
                  Recorded issues that may require manager follow-up.
                </p>
              </div>

              <span className="rounded-full bg-surface-hover px-3 py-1.5 text-xs font-semibold text-text-secondary">
                {attentionItems.length}{' '}
                {attentionItems.length === 1
                  ? 'category to review'
                  : 'categories to review'}
              </span>
            </div>

            {attentionItems.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-border bg-surface p-6 text-center">
                <p className="text-sm font-semibold text-text-primary">
                  No recorded attention items
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  No meaningful blockers, pending work or open questions were found in these knowledge records.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
                {attentionItems.map((item, index) => (
                  <button
                    key={`${item.type}-${index}`}
                    type="button"
                    onClick={() => setSelectedFinding(item.finding)}
                    className="rounded-xl border border-border bg-surface p-4 text-left transition hover:border-violet-500/30 hover:bg-surface-hover"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        STATUS_STYLES[item.type] || 'border-border bg-surface-hover text-text-secondary'
                      }`}>
                        {STATUS_LABELS[item.type] || item.type}
                      </span>

                      <span className="text-xs text-text-muted">
                        View →
                      </span>
                    </div>

                    <p className="mt-3 text-sm font-semibold text-text-primary">
                      {item.title}
                    </p>

                    <p className="mt-2 line-clamp-3 break-words text-xs leading-5 text-text-muted">
                      {item.description}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Knowledge explorer */}
          <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-lg shadow-black/10">
            <div className="border-b border-border p-5 sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
                    Explore project information
                  </p>

                  <h3 className="mt-2 text-xl font-bold text-text-primary">
                    Knowledge library
                  </h3>

                  <p className="mt-1 text-sm text-text-muted">
                    Search, filter and inspect the findings extracted from project records.
                  </p>
                </div>

                <span className="w-fit rounded-lg bg-surface-hover px-3 py-2 text-xs font-semibold text-text-secondary">
                  {filteredFindings.length} of {insights.findings.length} findings
                </span>
              </div>

              <div className="relative mt-5">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                  ⌕
                </span>

                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search knowledge, categories or sources..."
                  aria-label="Search knowledge findings"
                  className="w-full rounded-xl border border-border bg-surface py-3 pl-11 pr-4 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[235px_minmax(0,1fr)]">
              {/* Category navigation */}
              <aside className="border-b border-border bg-surface p-4 lg:border-b-0 lg:border-r">
                <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Categories
                </p>

                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">
                  <CategoryButton
                    type="all"
                    count={insights.findings.length}
                    active={activeCategory === 'all'}
                    onClick={() => setActiveCategory('all')}
                  />

                  {CATEGORY_ORDER.filter(
                    (type) => (categoryCounts[type] || 0) > 0,
                  ).map((type) => (
                    <CategoryButton
                      key={type}
                      type={type}
                      count={categoryCounts[type]}
                      active={activeCategory === type}
                      onClick={() => setActiveCategory(type)}
                    />
                  ))}
                </div>
              </aside>

              {/* Findings list */}
              <div className="min-w-0 p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-text-primary">
                      {activeCategory === 'all'
                        ? 'All findings'
                        : STATUS_LABELS[activeCategory] || activeCategory}
                    </h4>

                    <p className="mt-1 text-xs text-text-muted">
                      Select a record to inspect its complete information.
                    </p>
                  </div>

                  {(activeCategory !== 'all' || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCategory('all')
                        setSearchQuery('')
                      }}
                      className="text-xs font-semibold text-violet-400 transition hover:text-violet-300"
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                {filteredFindings.length === 0 ? (
                  <EmptyState
                    title="No matching knowledge records"
                    description="Try a different search term or category to find the information you need."
                  />
                ) : (
                  <div className="space-y-3">
                    {filteredFindings.map((finding, index) => (
                      <FindingCard
                        key={finding.id || `${finding.type}-${index}`}
                        finding={finding}
                        onOpen={() => setSelectedFinding(finding)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Project activity */}
          <section>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-text-primary">
                Source activity
              </h3>

              <p className="mt-1 text-sm text-text-muted">
                An overview of the project material available to this workspace.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: 'Journal entries',
                  value: insights.journals.length,
                  detail: 'Available project journals',
                  icon: '▤',
                },
                {
                  label: 'Project documents',
                  value: insights.documents.length,
                  detail: 'Available project documents',
                  icon: '▧',
                },
                {
                  label: 'Team members',
                  value: insights.members.length,
                  detail: 'Project membership records',
                  icon: '♧',
                },
                {
                  label: 'Departing members',
                  value: insights.members.filter((member) => member.departing).length,
                  detail: 'Members marked as departing',
                  icon: '↗',
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="flex items-center gap-4 rounded-xl border border-border bg-surface-raised p-4"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-hover text-lg text-text-secondary">
                    {metric.icon}
                  </span>

                  <div className="min-w-0">
                    <p className="text-2xl font-bold text-text-primary">
                      {metric.value}
                    </p>

                    <p className="text-sm font-semibold text-text-secondary">
                      {metric.label}
                    </p>

                    <p className="mt-0.5 text-xs text-text-muted">
                      {metric.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-4">
                <p className="text-2xl font-bold text-red-300">
                  {insights.journalBlockers}
                </p>
                <p className="mt-1 text-sm font-semibold text-text-secondary">
                  Journals mentioning blockers
                </p>
              </div>

              <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-4">
                <p className="text-2xl font-bold text-amber-300">
                  {insights.journalPending}
                </p>
                <p className="mt-1 text-sm font-semibold text-text-secondary">
                  Journals mentioning pending tasks
                </p>
              </div>
            </div>
          </section>

          {/* Transparency */}
          <section className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-text-secondary">
                i
              </span>

              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  About these insights
                </h3>

                <p className="mt-1 text-sm leading-6 text-text-muted">
                  KnowFlow organises knowledge records generated from supported
                  project journals and documents. Current extraction uses
                  rule-based processing. Advanced semantic AI analysis is not
                  yet enabled. Source details are displayed when available in
                  the underlying records. These counts describe recorded
                  information, not independently verified project status.
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      <FindingDetail
        finding={selectedFinding}
        onClose={() => setSelectedFinding(null)}
      />
    </div>
  )
}
