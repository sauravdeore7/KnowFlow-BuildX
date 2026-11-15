
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '../hooks/useApp'
import Icon from '../components/common/Icon'
import { fetchAuditLogs } from '../services/auditService'

const PAGE_SIZE = 20

function formatDate(value) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function timeAgo(value) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000),
  )

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`

  return formatDate(value)
}

function getActionLabel(action) {
  const labels = {
    DOCUMENT_UPLOADED: 'Document uploaded',
    DOCUMENT_DELETED: 'Document deleted',
    DOCUMENT_UPDATED: 'Document updated',

    HANDOVER_CREATED: 'Handover created',
    HANDOVER_CONFIRMED: 'Handover confirmed',
    HANDOVER_APPROVED: 'Handover approved',
    HANDOVER_UPDATED: 'Handover updated',

    KNOWLEDGE_CREATED: 'Knowledge created',
    KNOWLEDGE_UPDATED: 'Knowledge updated',
    KNOWLEDGE_DELETED: 'Knowledge deleted',

    PROJECT_CREATED: 'Project created',
    PROJECT_UPDATED: 'Project updated',
    PROJECT_DELETED: 'Project deleted',

    PROJECT_MEMBER_ADDED: 'Project member added',
    PROJECT_MEMBER_UPDATED: 'Project member updated',
    PROJECT_MEMBER_REMOVED: 'Project member removed',
  }

  return (
    labels[action] ||
    String(action || 'Activity recorded')
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  )
}

function getActionStyle(action) {
  const value = String(action || '').toUpperCase()

  if (value.includes('DELETE') || value.includes('REMOVED')) {
    return 'border-rose-400/20 bg-rose-500/10 text-rose-300'
  }

  if (value.includes('APPROV') || value.includes('CONFIRM')) {
    return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
  }

  if (
    value.includes('UPLOAD') ||
    value.includes('CREATE') ||
    value.includes('ADDED')
  ) {
    return 'border-sky-400/20 bg-sky-500/10 text-sky-300'
  }

  return 'border-violet-400/20 bg-violet-500/10 text-violet-300'
}

function getActionIcon(action) {
  const value = String(action || '').toUpperCase()

  if (value.includes('DELETE') || value.includes('REMOVED')) {
    return 'alert'
  }

  if (value.includes('APPROV') || value.includes('CONFIRM')) {
    return 'checkCircle'
  }

  if (value.includes('UPLOAD')) return 'upload'
  if (value.includes('HANDOVER')) return 'clipboard'
  if (value.includes('PROJECT_MEMBER')) return 'users'
  if (value.includes('PROJECT')) return 'folder'

  return 'fileText'
}

function MetricCard({ label, value, description, icon, iconStyle }) {
  return (
    <article className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/10 transition hover:-translate-y-0.5 hover:border-violet-400/30 hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-text-secondary">{label}</p>

        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconStyle}`}
        >
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>

      <p className="mt-4 text-3xl font-bold tracking-tight text-text-primary">
        {value}
      </p>

      <p className="mt-1 text-xs text-text-muted">{description}</p>
    </article>
  )
}

function ValueSection({ title, value, emptyText }) {
  const hasValue =
    value &&
    typeof value === 'object' &&
    Object.keys(value).length > 0

  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface p-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
        {title}
      </h4>

      {hasValue ? (
        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-text-secondary">
          {JSON.stringify(value, null, 2)}
        </pre>
      ) : (
        <p className="mt-3 text-sm text-text-faint">{emptyText}</p>
      )}
    </div>
  )
}

function AuditRecord({ record, expanded, onToggle }) {
  return (
    <article className="border-b border-border last:border-b-0">
      <div className="p-5 transition hover:bg-surface-hover/60 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-secondary">
            <Icon
              name={getActionIcon(record.actionType)}
              className="h-5 w-5"
            />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-text-primary">
                  {record.description || getActionLabel(record.actionType)}
                </h3>

                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getActionStyle(record.actionType)}`}
                >
                  {getActionLabel(record.actionType)}
                </span>
              </div>

              <span className="text-xs font-medium text-text-faint">
                {timeAgo(record.createdAt)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="users" className="h-3.5 w-3.5" />
                {record.actorName || 'Unknown user'}
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Icon name="folder" className="h-3.5 w-3.5" />
                {record.projectName || 'Unknown project'}
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Icon name="clock" className="h-3.5 w-3.5" />
                {formatDate(record.createdAt)}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-text-faint">
                {record.entityType || 'Record'}
                {record.entityId ? ` · ${record.entityId}` : ''}
              </span>

              <button
                type="button"
                onClick={onToggle}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary transition hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-violet-300"
              >
                <Icon name="eye" className="h-3.5 w-3.5" />
                {expanded ? 'Hide details' : 'View details'}
              </button>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-5 space-y-4 border-t border-border pt-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <ValueSection
                title="Previous values"
                value={record.oldValues}
                emptyText="No previous values recorded for this event."
              />

              <ValueSection
                title="New values"
                value={record.newValues}
                emptyText="No new values recorded for this event."
              />
            </div>

            <ValueSection
              title="Event metadata"
              value={record.metadata}
              emptyText="No additional metadata recorded."
            />

            <div className="rounded-xl border border-border bg-surface p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                Actor information
              </p>

              <p className="mt-2 text-sm font-semibold text-text-primary">
                {record.actorName || 'Unknown user'}
              </p>

              <p className="mt-1 text-xs text-text-muted">
                {record.actorEmail || 'Email unavailable'}
              </p>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

export default function AuditHistoryPage() {
  const { projects = [], user } = useApp()

  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [expandedId, setExpandedId] = useState(null)
  const [searchInput, setSearchInput] = useState('')

  const [filters, setFilters] = useState({
    projectId: '',
    actionType: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  })

  const [page, setPage] = useState(0)

  const loadAuditLogs = useCallback(async () => {
    if (!user?.accessToken) {
      setLogs([])
      setTotal(0)
      setLoadError('Authentication token is missing. Please log in again.')
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError('')

    try {
      const data = await fetchAuditLogs(user.accessToken, {
        ...filters,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      })

      setLogs(data.logs || [])
      setTotal(data.total || 0)
    } catch (error) {
      setLogs([])
      setTotal(0)
      setLoadError(error.message || 'Unable to load audit history.')
    } finally {
      setLoading(false)
    }
  }, [user?.accessToken, filters, page])

  useEffect(() => {
    loadAuditLogs()
  }, [loadAuditLogs, refreshKey])

  const projectCount = useMemo(
    () =>
      new Set(
        logs.map((record) => record.projectId).filter(Boolean),
      ).size,
    [logs],
  )

  const latestActivity = logs.length
    ? formatDate(logs[0].createdAt)
    : 'No activity'

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function applyFilters(event) {
    event.preventDefault()

    setPage(0)
    setExpandedId(null)

    setFilters((current) => ({
      ...current,
      search: searchInput.trim(),
    }))
  }

  function clearFilters() {
    setSearchInput('')

    setFilters({
      projectId: '',
      actionType: '',
      search: '',
      dateFrom: '',
      dateTo: '',
    })

    setPage(0)
    setExpandedId(null)
  }

  function refreshLogs() {
    setRefreshKey((current) => current + 1)
  }

  return (
    <div className="space-y-7">
      <section>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
              Manager Workspace · Governance
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary">
              Audit & Version History
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
              Maintain visibility into project activity, document changes and
              recorded knowledge events with a traceable audit trail.
            </p>
          </div>

          <button
            type="button"
            onClick={refreshLogs}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm font-semibold text-text-secondary shadow-sm transition hover:border-violet-400/40 hover:bg-violet-500/10 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="clock" className="h-4 w-4" />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Audit Events"
          value={total}
          description="Matching records across your projects"
          icon="clipboard"
          iconStyle="border border-violet-400/20 bg-violet-500/10 text-violet-300"
        />

        <MetricCard
          label="Visible Records"
          value={logs.length}
          description={`Records on page ${page + 1}`}
          icon="fileText"
          iconStyle="border border-indigo-400/20 bg-indigo-500/10 text-indigo-300"
        />

        <MetricCard
          label="Projects on This Page"
          value={projectCount}
          description="Projects represented by visible records"
          icon="folder"
          iconStyle="border border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
        />

        <MetricCard
          label="Latest Activity"
          value={logs.length ? 'Recorded' : '—'}
          description={latestActivity}
          icon="clock"
          iconStyle="border border-amber-400/20 bg-amber-500/10 text-amber-300"
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm shadow-black/10">
        <div className="border-b border-border p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                Activity Audit Trail
              </h2>

              <p className="mt-1 text-sm text-text-muted">
                Search and review recorded actions across your projects.
              </p>
            </div>

            <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary">
              {total} total events
            </span>
          </div>

          <form onSubmit={applyFilters} className="mt-5 space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
                  Project
                </span>

                <select
                  value={filters.projectId}
                  onChange={(event) => {
                    setFilters((current) => ({
                      ...current,
                      projectId: event.target.value,
                    }))

                    setPage(0)
                  }}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                >
                  <option value="">All projects</option>

                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
                  Action type
                </span>

                <select
                  value={filters.actionType}
                  onChange={(event) => {
                    setFilters((current) => ({
                      ...current,
                      actionType: event.target.value,
                    }))

                    setPage(0)
                  }}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                >
                  <option value="">All actions</option>

                  <option value="PROJECT_CREATED">Project created</option>
                  <option value="PROJECT_UPDATED">Project updated</option>
                  <option value="PROJECT_DELETED">Project deleted</option>

                  <option value="PROJECT_MEMBER_ADDED">
                    Project member added
                  </option>
                  <option value="PROJECT_MEMBER_UPDATED">
                    Project member updated
                  </option>
                  <option value="PROJECT_MEMBER_REMOVED">
                    Project member removed
                  </option>

                  <option value="DOCUMENT_UPLOADED">Document uploaded</option>
                  <option value="DOCUMENT_DELETED">Document deleted</option>
                  <option value="DOCUMENT_UPDATED">Document updated</option>

                  <option value="HANDOVER_CREATED">Handover created</option>
                  <option value="HANDOVER_CONFIRMED">Handover confirmed</option>
                  <option value="HANDOVER_APPROVED">Handover approved</option>
                  <option value="HANDOVER_UPDATED">Handover updated</option>

                  <option value="KNOWLEDGE_CREATED">Knowledge created</option>
                  <option value="KNOWLEDGE_UPDATED">Knowledge updated</option>
                  <option value="KNOWLEDGE_DELETED">Knowledge deleted</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
                  From date
                </span>

                <input
                  type="date"
                  value={filters.dateFrom.slice(0, 10)}
                  onChange={(event) => {
                    setFilters((current) => ({
                      ...current,
                      dateFrom: event.target.value
                        ? `${event.target.value}T00:00:00`
                        : '',
                    }))

                    setPage(0)
                  }}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-text-secondary">
                  To date
                </span>

                <input
                  type="date"
                  value={filters.dateTo.slice(0, 10)}
                  onChange={(event) => {
                    setFilters((current) => ({
                      ...current,
                      dateTo: event.target.value
                        ? `${event.target.value}T23:59:59`
                        : '',
                    }))

                    setPage(0)
                  }}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint"
                />

                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search activity descriptions..."
                  className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-3 text-sm text-text-primary outline-none transition placeholder:text-text-faint focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                <Icon name="search" className="h-4 w-4" />
                Apply filters
              </button>

              <button
                type="button"
                onClick={clearFilters}
                className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
              >
                Clear
              </button>
            </div>
          </form>
        </div>

        {loading ? (
          <div className="space-y-4 p-6">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-xl border border-border p-5"
              >
                <div className="flex gap-4">
                  <div className="h-11 w-11 rounded-xl bg-surface-hover" />

                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-1/3 rounded bg-surface-hover" />
                    <div className="h-3 w-2/3 rounded bg-surface-hover" />
                    <div className="h-3 w-1/2 rounded bg-surface-hover" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : loadError ? (
          <div className="p-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-500/10 text-rose-300">
              <Icon name="alert" className="h-6 w-6" />
            </span>

            <h3 className="mt-4 text-base font-bold text-text-primary">
              Unable to load audit history
            </h3>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-muted">
              {loadError}
            </p>

            <button
              type="button"
              onClick={refreshLogs}
              className="mt-5 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              Try again
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface text-text-muted">
              <Icon name="clipboard" className="h-6 w-6" />
            </span>

            <h3 className="mt-4 text-base font-bold text-text-primary">
              No audit events found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
              No records match your current filters. Try clearing the filters
              or check again after a project activity has been recorded.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div>
              {logs.map((record) => (
                <AuditRecord
                  key={record.id}
                  record={record}
                  expanded={expandedId === record.id}
                  onToggle={() =>
                    setExpandedId((current) =>
                      current === record.id ? null : record.id,
                    )
                  }
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-5 py-4 sm:px-6">
              <p className="text-xs text-text-muted">
                Showing {page * PAGE_SIZE + 1}–
                {page * PAGE_SIZE + logs.length} of {total} events
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => {
                    setPage((current) => Math.max(0, current - 1))
                    setExpandedId(null)
                  }}
                  className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs font-semibold text-text-secondary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="px-2 text-xs font-semibold text-text-secondary">
                  {page + 1} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={(page + 1) * PAGE_SIZE >= total}
                  onClick={() => {
                    setPage((current) => current + 1)
                    setExpandedId(null)
                  }}
                  className="rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs font-semibold text-text-secondary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="flex items-start gap-3 rounded-2xl border border-sky-400/20 bg-sky-500/[0.08] p-5">
        <Icon
          name="lock"
          className="mt-0.5 h-5 w-5 shrink-0 text-sky-300"
        />

        <div>
          <h3 className="text-sm font-bold text-sky-200">
            Secure audit visibility
          </h3>

          <p className="mt-1 text-sm leading-6 text-sky-100/80">
            Audit records are retrieved through authenticated, manager-only
            access and are restricted to projects owned by the signed-in
            manager. Historical comparisons are shown only when recorded
            before-and-after values are available.
          </p>
        </div>
      </section>
    </div>
  )
}
