
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../hooks/useApp'
import Icon from '../components/common/Icon'
import {
  fetchSupportRequests,
  createSupportRequest,
} from '../services/supportService'

const REQUEST_TYPES = [
  {
    value: 'document',
    label: 'Document Access',
    description: 'Request access to a project document.',
    icon: 'fileText',
  },
  {
    value: 'blocker',
    label: 'Report a Blocker',
    description: 'Report an issue preventing your progress.',
    icon: 'alert',
  },
  {
    value: 'clarification',
    label: 'Request Clarification',
    description: 'Ask for clarification about a task or decision.',
    icon: 'help-circle',
  },
]

const STATUS_STYLES = {
  Pending: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  'In Review': 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  Resolved: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
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

function MetricCard({ label, value, icon, color, description }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/10 transition hover:border-violet-400/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-muted">{label}</p>
          <p className="mt-2 text-2xl font-bold text-text-primary">{value}</p>
          <p className="mt-1 text-xs text-text-muted">{description}</p>
        </div>

        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-lg border px-3 py-1.5 text-xs font-semibold ${
        STATUS_STYLES[status] || STATUS_STYLES.Pending
      }`}
    >
      {status}
    </span>
  )
}

function RequestRow({ request }) {
  const type = REQUEST_TYPES.find((item) => item.value === request.type)

  return (
    <div className="flex flex-col gap-4 border-b border-border-subtle px-5 py-5 last:border-0 sm:flex-row sm:items-center">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-300">
        <Icon name={type?.icon || 'clipboard'} className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-text-primary">
            {request.title}
          </h3>
          <span className="text-xs text-text-muted">
            #{request.id}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          <span>{type?.label || 'General Request'}</span>
          <span>·</span>
          <span>{request.projectName || 'Project'}</span>
          <span>·</span>
          <span>{formatDate(request.createdAt)}</span>
        </div>

        <p className="mt-2 line-clamp-2 text-sm text-text-secondary">
          {request.description}
        </p>

        {request.response && (
          <div className="mt-3 rounded-lg border border-emerald-500/15 bg-emerald-500/10 p-3">
            <p className="text-xs font-semibold text-emerald-300">
              Response
            </p>
            <p className="mt-1 text-sm text-emerald-200/90">
              {request.response}
            </p>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
        <StatusBadge status={request.status} />
        <span className="text-xs text-text-muted">
          {request.priority} priority
        </span>
      </div>
    </div>
  )
}

export default function RequestsSupportPage() {
  const { user, projects = [] } = useApp()

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [selectedType, setSelectedType] = useState('document')
  const [selectedProject, setSelectedProject] = useState(projects[0]?.id || '')
  const [selectedDocument, setSelectedDocument] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [activeFilter, setActiveFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState('error')

  useEffect(() => {
    let active = true

    async function loadRequests() {
      setLoading(true)

      try {
        const data = await fetchSupportRequests(user?.accessToken)

        if (!active) return

        const enrichedRequests = data.map((request) => {
          const project = projects.find(
            (item) => item.id === request.projectId,
          )

          return {
            ...request,
            projectName: project?.name || 'Project',
          }
        })

        setRequests(enrichedRequests)
      } catch (error) {
        if (active) {
          setFeedback(error.message || 'Could not load your requests.')
          setFeedbackType('error')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadRequests()

    return () => {
      active = false
    }
  }, [user?.accessToken, projects])

  const currentProject = projects.find(
    (project) => project.id === selectedProject,
  )

  const projectDocuments = currentProject?.documents || []

  const counts = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((request) => request.status === 'Pending').length,
    inReview: requests.filter((request) => request.status === 'In Review').length,
    resolved: requests.filter((request) => request.status === 'Resolved').length,
  }), [requests])

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase()

    return requests.filter((request) => {
      const matchesStatus =
        activeFilter === 'All' || request.status === activeFilter

      const matchesSearch =
        !query ||
        [
          request.title,
          request.description,
          request.projectName,
          request.id,
          request.type,
        ].some((value) =>
          String(value || '').toLowerCase().includes(query)
        )

      return matchesStatus && matchesSearch
    }).sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  }, [requests, activeFilter, search])

  async function handleSubmit(event) {
    event.preventDefault()
    setFeedback('')

    if (!selectedProject || !currentProject) {
      setFeedback('Please select a project.')
      setFeedbackType('error')
      return
    }

    if (!title.trim() || !description.trim()) {
      setFeedback('Please complete the title and description.')
      setFeedbackType('error')
      return
    }

    if (selectedType === 'document' && !selectedDocument) {
      setFeedback('Please select the document you need access to.')
      setFeedbackType('error')
      return
    }

    const documentName =
      selectedType === 'document'
        ? projectDocuments.find((doc) => doc.id === selectedDocument)?.name || ''
        : ''

    setSubmitting(true)

    try {
      const createdRequest = await createSupportRequest(
        user?.accessToken,
        {
          type: selectedType,
          title: title.trim(),
          description: description.trim(),
          projectId: currentProject.id,
          documentName,
          priority,
        },
      )

      setRequests((previous) => [
        {
          ...createdRequest,
          projectName: currentProject.name,
        },
        ...previous,
      ])

      setTitle('')
      setDescription('')
      setSelectedDocument('')
      setPriority('Medium')
      setFeedback('Your request has been submitted successfully.')
      setFeedbackType('success')
    } catch (error) {
      setFeedback(error.message || 'Could not submit your request.')
      setFeedbackType('error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
            <Icon name="clipboard" className="h-4 w-4" />
            Work & Collaboration
          </div>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
            Requests & Support
          </h2>

          <p className="mt-2 text-sm text-text-muted">
            Raise project-related requests and keep track of their progress.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-300">
          <Icon name="lock" className="h-4 w-4" />
          Your project workspace
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Requests"
          value={counts.total}
          icon="clipboard"
          color="border border-violet-400/15 bg-violet-500/10 text-violet-300"
          description="Requests submitted"
        />
        <MetricCard
          label="Pending"
          value={counts.pending}
          icon="clock"
          color="border border-amber-400/15 bg-amber-500/10 text-amber-300"
          description="Awaiting review"
        />
        <MetricCard
          label="In Review"
          value={counts.inReview}
          icon="search"
          color="border border-sky-400/15 bg-sky-500/10 text-sky-300"
          description="Being reviewed"
        />
        <MetricCard
          label="Resolved"
          value={counts.resolved}
          icon="checkCircle"
          color="border border-emerald-400/15 bg-emerald-500/10 text-emerald-300"
          description="Completed requests"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <div className="rounded-2xl border border-border bg-surface-raised shadow-sm shadow-black/10">
          <div className="border-b border-border p-5">
            <h3 className="text-lg font-semibold text-text-primary">
              Submit a Request
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Tell your project manager what support you need.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-text-secondary">
                Request Type
              </label>

              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                {REQUEST_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => {
                      setSelectedType(type.value)
                      setFeedback('')
                    }}
                    className={`rounded-xl border p-3 text-left transition ${
                      selectedType === type.value
                        ? 'border-violet-400/50 bg-violet-500/10 ring-2 ring-violet-500/15'
                        : 'border-border bg-surface hover:border-violet-400/25 hover:bg-surface-hover'
                    }`}
                  >
                    <Icon
                      name={type.icon}
                      className={`h-5 w-5 ${
                        selectedType === type.value
                          ? 'text-violet-300'
                          : 'text-text-muted'
                      }`}
                    />
                    <p className="mt-2 text-xs font-semibold text-text-primary">
                      {type.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-text-secondary">
                Project
              </label>
              <select
                value={selectedProject}
                onChange={(event) => {
                  setSelectedProject(event.target.value)
                  setSelectedDocument('')
                }}
                required
                className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text-primary outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedType === 'document' && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-text-secondary">
                  Document
                </label>
                <select
                  value={selectedDocument}
                  onChange={(event) => setSelectedDocument(event.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text-primary outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                >
                  <option value="">Select a document</option>
                  {projectDocuments.map((doc, index) => (
                    <option
                      key={doc.id || `${doc.name}-${index}`}
                      value={doc.id || ''}
                      disabled={!doc.id}
                    >
                      {doc.name || 'Untitled document'}
                    </option>
                  ))}
                </select>
                {projectDocuments.length === 0 && (
                  <p className="mt-2 text-xs text-amber-300">
                    No documents are currently listed for this project.
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-text-secondary">
                Request Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={
                  selectedType === 'blocker'
                    ? 'Briefly describe the blocker'
                    : selectedType === 'clarification'
                      ? 'What do you need clarified?'
                      : 'Enter a request title'
                }
                maxLength={100}
                required
                className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text-primary outline-none placeholder:text-text-faint transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-text-secondary">
                Description
              </label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Provide the details your manager needs to understand your request..."
                rows={4}
                maxLength={1500}
                required
                className="w-full resize-y rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text-primary outline-none placeholder:text-text-faint transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-text-secondary">
                Priority
              </label>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text-primary outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            {feedback && (
              <div
                className={`rounded-xl px-4 py-3 text-sm ${
                  feedbackType === 'success'
                    ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                    : 'border border-amber-500/20 bg-amber-500/10 text-amber-300'
                }`}
              >
                {feedback}
              </div>
            )}

            <button
              type="submit"
              disabled={projects.length === 0 || submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-violet-950/20 transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="plus" className="h-4 w-4" />
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-border bg-surface-raised shadow-sm shadow-black/10">
          <div className="border-b border-border p-5">
            <h3 className="text-lg font-semibold text-text-primary">
              My Request History
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Follow the status of requests you have submitted.
            </p>
          </div>

          <div className="space-y-4 p-5">
            <div className="relative">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint"
              />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your requests..."
                className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-faint transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {['All', 'Pending', 'In Review', 'Resolved'].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    activeFilter === filter
                      ? 'bg-violet-600 text-white shadow-sm shadow-violet-950/20'
                      : 'bg-surface-hover text-text-secondary hover:bg-surface-overlay hover:text-text-primary'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-y border-border-subtle bg-surface px-5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Submitted Requests
            </p>
            <span className="text-xs font-medium text-text-muted">
              {loading ? 'Loading...' : `${filteredRequests.length} results`}
            </span>
          </div>

          {loading ? (
            <div className="px-5 py-14 text-center text-sm text-text-muted">
              Loading your requests...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface text-text-faint">
                <Icon name="clipboard" className="h-7 w-7" />
              </span>
              <h3 className="mt-4 font-semibold text-text-primary">
                No requests found
              </h3>
              <p className="mt-2 text-sm text-text-muted">
                Your submitted requests will appear here.
              </p>
            </div>
          ) : (
            <div>
              {filteredRequests.map((request) => (
                <RequestRow key={request.id} request={request} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-300">
            <Icon name="lock" className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Request privacy
            </h3>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              Your requests are associated with your signed-in account and
              selected project. They are stored in the KnowFlow database and
              can be reviewed by your project manager.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
