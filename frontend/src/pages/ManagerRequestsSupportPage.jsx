
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '../hooks/useApp'
import Icon from '../components/common/Icon'
import {
  fetchSupportRequests,
  updateSupportRequest,
} from '../services/supportService'

const REQUEST_TYPES = [
  { value: 'document', label: 'Document Access', icon: 'fileText' },
  { value: 'blocker', label: 'Report a Blocker', icon: 'alert' },
  { value: 'clarification', label: 'Request Clarification', icon: 'clipboard' },
]

const STATUS_STYLES = {
  Pending: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  'In Review': 'border-sky-500/20 bg-sky-500/10 text-sky-300',
  Resolved: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
}

const PRIORITY_STYLES = {
  High: 'bg-rose-500/10 text-rose-300',
  Medium: 'bg-amber-500/10 text-amber-300',
  Low: 'bg-surface-hover text-text-secondary',
}

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

function normalizePriority(value) {
  const priority = String(value || 'Medium').toLowerCase()
  return priority.charAt(0).toUpperCase() + priority.slice(1)
}

function enrichRequest(request, projects) {
  const project = projects.find(
    (item) => item.id === request.projectId
  )

  const member = project?.members?.find(
    (item) => item.id === request.submittedById
  )

  return {
    ...request,
    recordKey: request.id,
    projectName: project?.name || 'Unknown project',
    submittedBy: member?.email || request.submittedById || 'Unknown employee',
    submittedByName: member?.name || 'Unknown employee',
    priority: normalizePriority(request.priority),
  }
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
        STATUS_STYLES[status] || STATUS_STYLES.Pending
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

function MetricCard({ label, value, icon, color, description }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-4 transition hover:border-violet-400/25 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-muted">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
            {value}
          </p>
          <p className="mt-1 text-xs text-text-muted">{description}</p>
        </div>

        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>
    </div>
  )
}

function RequestTypeLabel({ type }) {
  const requestType = REQUEST_TYPES.find((item) => item.value === type)

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
      <Icon name={requestType?.icon || 'clipboard'} className="h-3.5 w-3.5" />
      {requestType?.label || 'General Request'}
    </span>
  )
}

function FilterSelect({ label, value, onChange, children }) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-xs font-medium text-text-muted">
        {label}
      </label>
      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
      >
        {children}
      </select>
    </div>
  )
}

export default function ManagerRequestsSupportPage() {
  const { projects = [], user } = useApp()

  const [requests, setRequests] = useState([])
  const [selectedKey, setSelectedKey] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [projectFilter, setProjectFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [employeeFilter, setEmployeeFilter] = useState('All')
  const [responseDraft, setResponseDraft] = useState('')
  const [statusDraft, setStatusDraft] = useState('Pending')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  const refreshRequests = useCallback(async () => {
    if (!user?.accessToken) {
      setRequests([])
      setLoading(false)
      setLoadError('Authentication token is missing. Please log in again.')
      return
    }

    setLoading(true)
    setLoadError('')

    try {
      const data = await fetchSupportRequests(user.accessToken)

      const enriched = data
        .map((request) => enrichRequest(request, projects))
        .sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )

      setRequests(enriched)
    } catch (error) {
      setLoadError(error.message || 'Unable to load employee requests.')
    } finally {
      setLoading(false)
    }
  }, [user?.accessToken, projects])

  useEffect(() => {
    refreshRequests()
  }, [refreshRequests])

  const counts = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((item) => item.status === 'Pending').length,
    inReview: requests.filter((item) => item.status === 'In Review').length,
    resolved: requests.filter((item) => item.status === 'Resolved').length,
  }), [requests])

  const employees = useMemo(() => {
    return [...new Set(
      requests.map((item) => item.submittedBy).filter(Boolean)
    )].sort()
  }, [requests])

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase()

    return requests.filter((request) => {
      const matchesSearch =
        !query ||
        [
          request.title,
          request.description,
          request.projectName,
          request.submittedBy,
          request.submittedByName,
          request.id,
          request.documentName,
        ].some((value) =>
          String(value || '').toLowerCase().includes(query)
        )

      const matchesStatus =
        statusFilter === 'All' || request.status === statusFilter

      const matchesProject =
        projectFilter === 'All' || request.projectId === projectFilter

      const matchesType =
        typeFilter === 'All' || request.type === typeFilter

      const matchesPriority =
        priorityFilter === 'All' || request.priority === priorityFilter

      const matchesEmployee =
        employeeFilter === 'All' || request.submittedBy === employeeFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesProject &&
        matchesType &&
        matchesPriority &&
        matchesEmployee
      )
    })
  }, [
    requests,
    search,
    statusFilter,
    projectFilter,
    typeFilter,
    priorityFilter,
    employeeFilter,
  ])

  const selectedRequest =
    filteredRequests.find((request) => request.recordKey === selectedKey) ||
    filteredRequests[0] ||
    null

  useEffect(() => {
    if (selectedRequest) {
      setSelectedKey(selectedRequest.recordKey)
      setResponseDraft(selectedRequest.response || '')
      setStatusDraft(selectedRequest.status || 'Pending')
      setFeedback('')
    } else {
      setSelectedKey('')
      setResponseDraft('')
      setStatusDraft('Pending')
      setFeedback('')
    }
  }, [
    selectedRequest?.recordKey,
    selectedRequest?.response,
    selectedRequest?.status,
  ])

  async function saveChanges() {
    if (!selectedRequest || saving) return

    setSaving(true)
    setFeedback('')

    try {
      const updated = await updateSupportRequest(
        user?.accessToken,
        selectedRequest.id,
        {
          response: responseDraft.trim(),
          status: statusDraft,
        },
      )

      const savedRequest = enrichRequest(
        updated || {
          ...selectedRequest,
          response: responseDraft.trim(),
          status: statusDraft,
          updatedAt: new Date().toISOString(),
        },
        projects,
      )

      setRequests((current) =>
        current.map((request) =>
          request.id === selectedRequest.id ? savedRequest : request
        )
      )

      setFeedback('Request updated successfully.')
    } catch (error) {
      setFeedback(error.message || 'Unable to update this request.')
    } finally {
      setSaving(false)
    }
  }

  function clearFilters() {
    setSearch('')
    setStatusFilter('All')
    setProjectFilter('All')
    setTypeFilter('All')
    setPriorityFilter('All')
    setEmployeeFilter('All')
  }

  const hasExtraFilters =
    projectFilter !== 'All' ||
    employeeFilter !== 'All' ||
    typeFilter !== 'All' ||
    priorityFilter !== 'All'

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-violet-300">
            <Icon name="clipboard" className="h-4 w-4" />
            MANAGER WORKSPACE
            <span className="text-text-faint">/</span>
            <span className="text-text-muted">Team Support</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-text-primary">
            Requests & Support
          </h2>

          <p className="mt-1.5 text-sm text-text-muted">
            Stay on top of employee requests and keep your team moving forward.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshRequests}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-violet-400/30 hover:bg-surface-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="refreshCw" className="h-4 w-4" />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Overview */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Requests"
          value={counts.total}
          icon="clipboard"
          color="bg-violet-500/10 text-violet-300"
          description="Received from employees"
        />
        <MetricCard
          label="Pending"
          value={counts.pending}
          icon="clock"
          color="bg-amber-500/10 text-amber-300"
          description="Awaiting your attention"
        />
        <MetricCard
          label="In Review"
          value={counts.inReview}
          icon="search"
          color="bg-sky-500/10 text-sky-300"
          description="Currently being reviewed"
        />
        <MetricCard
          label="Resolved"
          value={counts.resolved}
          icon="checkCircle"
          color="bg-emerald-500/10 text-emerald-300"
          description="Successfully addressed"
        />
      </div>

      {/* Main Workspace */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-raised">

        {/* Workspace Heading */}
        <div className="flex flex-col justify-between gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-text-primary">
                Employee Requests
              </h3>
              <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-300">
                {filteredRequests.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Review requests, understand concerns and respond to your team.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Secure project inbox
          </div>
        </div>

        {/* Search and Status Filters */}
        <div className="space-y-3 border-b border-border bg-surface px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search requests, employees or projects..."
                className="w-full rounded-xl border border-border bg-surface-raised py-2.5 pl-9 pr-3 text-sm text-text-primary outline-none transition placeholder:text-text-faint focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
              />
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-xs font-semibold text-text-secondary transition hover:border-violet-400/25 hover:text-violet-300"
            >
              <Icon name="filter" className="h-4 w-4" />
              Clear filters
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['All', 'Pending', 'In Review', 'Resolved'].map((filter) => {
              const active = statusFilter === filter

              const count =
                filter === 'All'
                  ? requests.length
                  : counts[
                      filter === 'In Review'
                        ? 'inReview'
                        : filter.toLowerCase()
                    ]

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setStatusFilter(filter)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? 'bg-violet-600 text-white shadow-sm shadow-violet-950/20'
                      : 'border border-border bg-surface-raised text-text-secondary hover:border-violet-400/25 hover:text-text-primary'
                  }`}
                >
                  {filter}
                  <span className={active ? 'text-white/75' : 'text-text-muted'}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Additional Filters */}
          <details className="group rounded-xl border border-border bg-surface-raised">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-xs font-semibold text-text-secondary [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <Icon name="sliders" className="h-4 w-4 text-violet-300" />
                More filters
                {hasExtraFilters && (
                  <span className="rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300">
                    Active
                  </span>
                )}
              </span>
              <Icon
                name="chevronDown"
                className="h-4 w-4 text-text-muted transition group-open:rotate-180"
              />
            </summary>

            <div className="grid gap-3 border-t border-border p-3 sm:grid-cols-2 xl:grid-cols-4">
              <FilterSelect
                label="Project"
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
              >
                <option value="All">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label="Employee"
                value={employeeFilter}
                onChange={(event) => setEmployeeFilter(event.target.value)}
              >
                <option value="All">All Employees</option>
                {employees.map((employee) => (
                  <option key={employee} value={employee}>
                    {employee}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label="Request Type"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="All">All Request Types</option>
                {REQUEST_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label="Priority"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
              >
                <option value="All">All Priorities</option>
                <option value="High">High Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="Low">Low Priority</option>
              </FilterSelect>
            </div>
          </details>
        </div>

        {/* Inbox and Details */}
        <div className="grid min-h-[560px] xl:grid-cols-[0.9fr_1.1fr]">

          {/* Request Inbox */}
          <section className="min-w-0 border-b border-border xl:border-b-0 xl:border-r">
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3 sm:px-5">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  Request inbox
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Latest submissions first
                </p>
              </div>
              <span className="text-xs text-text-muted">
                {filteredRequests.length} results
              </span>
            </div>

            {loadError && (
              <div className="m-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">
                {loadError}
              </div>
            )}

            {loading ? (
              <div className="px-5 py-16 text-center">
                <Icon name="loader" className="mx-auto h-6 w-6 animate-spin text-violet-300" />
                <p className="mt-3 text-sm text-text-muted">
                  Loading employee requests...
                </p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface text-text-faint">
                  <Icon name="inbox" className="h-6 w-6" />
                </span>
                <h4 className="mt-3 text-sm font-semibold text-text-primary">
                  No requests found
                </h4>
                <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-text-muted">
                  Try changing your search or filters to find employee requests.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-3 text-xs font-semibold text-violet-300 hover:text-violet-200"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="max-h-[680px] overflow-y-auto">
                {filteredRequests.map((request) => {
                  const active = selectedRequest?.recordKey === request.recordKey

                  return (
                    <button
                      key={request.recordKey}
                      type="button"
                      onClick={() => {
                        setSelectedKey(request.recordKey)
                        setFeedback('')
                      }}
                      className={`w-full border-b border-border-subtle p-4 text-left transition last:border-0 sm:p-5 ${
                        active
                          ? 'border-l-2 border-l-violet-400 bg-violet-500/[0.08]'
                          : 'border-l-2 border-l-transparent hover:bg-surface-hover'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                          active
                            ? 'bg-violet-500/15 text-violet-300'
                            : 'border border-border bg-surface text-text-muted'
                        }`}>
                          <Icon
                            name={REQUEST_TYPES.find((item) => item.value === request.type)?.icon || 'clipboard'}
                            className="h-4 w-4"
                          />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
                              {request.title}
                            </p>
                            <StatusBadge status={request.status} />
                          </div>

                          <p className="mt-1 text-xs text-text-muted">
                            {request.submittedByName}
                          </p>

                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-text-secondary">
                            {request.description}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                                PRIORITY_STYLES[request.priority] || PRIORITY_STYLES.Medium
                              }`}>
                                {request.priority}
                              </span>
                              <span className="max-w-[170px] truncate text-[11px] text-text-muted">
                                {request.projectName}
                              </span>
                            </div>

                            <span className="text-[11px] text-text-muted">
                              {formatDate(request.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* Request Details */}
          <section className="min-w-0 bg-surface-raised">
            {!selectedRequest ? (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface text-text-faint">
                  <Icon name="messageSquare" className="h-7 w-7" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-text-primary">
                  Request details
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-text-muted">
                  Select an employee request from the inbox to view its details and send a response.
                </p>
              </div>
            ) : (
              <div>
                {/* Detail Header */}
                <div className="border-b border-border px-5 py-4 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">
                        REQUEST DETAILS
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        Request #{selectedRequest.id}
                      </p>
                    </div>
                    <StatusBadge status={selectedRequest.status} />
                  </div>

                  <h3 className="mt-3 text-lg font-bold leading-snug text-text-primary">
                    {selectedRequest.title}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <RequestTypeLabel type={selectedRequest.type} />
                    <span className="text-text-faint">·</span>
                    <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                      PRIORITY_STYLES[selectedRequest.priority] || PRIORITY_STYLES.Medium
                    }`}>
                      {selectedRequest.priority} Priority
                    </span>
                  </div>
                </div>

                <div className="space-y-5 p-5 sm:p-6">

                  {/* Employee and Project Information */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-surface p-3.5">
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <Icon name="user" className="h-3.5 w-3.5" />
                        Submitted by
                      </div>
                      <p className="mt-2 text-sm font-semibold text-text-primary">
                        {selectedRequest.submittedByName}
                      </p>
                      <p className="mt-0.5 break-all text-xs text-text-muted">
                        {selectedRequest.submittedBy}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border bg-surface p-3.5">
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <Icon name="folder" className="h-3.5 w-3.5" />
                        Related project
                      </div>
                      <p className="mt-2 text-sm font-semibold text-text-primary">
                        {selectedRequest.projectName}
                      </p>
                      <p className="mt-0.5 text-xs text-text-muted">
                        {formatDate(selectedRequest.createdAt)}
                      </p>
                    </div>
                  </div>

                  {/* Requested Document */}
                  {selectedRequest.documentName && (
                    <div className="flex items-center gap-3 rounded-xl border border-violet-400/20 bg-violet-500/[0.07] p-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                        <Icon name="fileText" className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-text-muted">
                          Requested document
                        </p>
                        <p className="mt-1 break-words text-sm font-semibold text-text-primary">
                          {selectedRequest.documentName}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Employee Message */}
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-text-primary">
                        Employee message
                      </h4>
                      <span className="text-[11px] text-text-muted">
                        Original request
                      </span>
                    </div>
                    <div className="rounded-xl border border-border bg-surface p-4">
                      <p className="whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                        {selectedRequest.description || 'No additional details provided.'}
                      </p>
                    </div>
                  </div>

                  {/* Existing Response */}
                  {selectedRequest.response && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
                      <div className="flex items-center gap-2">
                        <Icon name="checkCircle" className="h-4 w-4 text-emerald-300" />
                        <p className="text-xs font-semibold text-emerald-300">
                          Previous manager response
                        </p>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                        {selectedRequest.response}
                      </p>
                    </div>
                  )}

                  {/* Manager Action */}
                  <div className="border-t border-border pt-5">
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-text-primary">
                        Your response
                      </h4>
                      <p className="mt-1 text-xs text-text-muted">
                        Update the request status and communicate with the employee.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-semibold text-text-secondary">
                          Request status
                        </label>

                        <select
                          value={statusDraft}
                          onChange={(event) => setStatusDraft(event.target.value)}
                          className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text-primary outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Review">In Review</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-semibold text-text-secondary">
                          Message to employee
                        </label>

                        <textarea
                          value={responseDraft}
                          onChange={(event) => setResponseDraft(event.target.value)}
                          rows={4}
                          maxLength={1500}
                          placeholder="Write a helpful response or explain the next steps..."
                          className="w-full resize-y rounded-xl border border-border bg-surface px-3 py-3 text-sm leading-6 text-text-primary outline-none transition placeholder:text-text-faint focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                        />
                        <p className="mt-1.5 text-right text-[11px] text-text-muted">
                          {responseDraft.length}/1500
                        </p>
                      </div>

                      {feedback && (
                        <div className={`flex items-start gap-2 rounded-xl border px-3 py-3 text-sm ${
                          feedback.includes('successfully')
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                            : 'border-amber-500/20 bg-amber-500/10 text-amber-300'
                        }`}>
                          <Icon
                            name={feedback.includes('successfully') ? 'checkCircle' : 'alert'}
                            className="mt-0.5 h-4 w-4 shrink-0"
                          />
                          {feedback}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={saveChanges}
                        disabled={saving}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-950/20 transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Icon name="send" className="h-4 w-4" />
                        {saving ? 'Saving changes...' : 'Save Response & Update'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Privacy Note */}
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface-raised px-4 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
          <Icon name="shieldCheck" className="h-4 w-4" />
        </span>
        <div>
          <h4 className="text-sm font-semibold text-text-primary">
            Secure Project Support
          </h4>
          <p className="mt-1 text-xs leading-5 text-text-muted">
            Employee requests, manager responses and status updates are stored
            in KnowFlow and retrieved through the authenticated backend.
          </p>
        </div>
      </div>
    </div>
  )
}
