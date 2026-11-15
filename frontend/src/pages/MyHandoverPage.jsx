
import { useMemo, useState } from 'react'
import { useApp } from '../hooks/useApp'
import {
  createHandover,
  confirmHandover,
} from '../services/handoverService'
import { downloadDocument } from '../services/documentService'

const CATEGORIES = [
  { id: 'completedTasks', title: 'Completed Work', icon: '✓', color: 'emerald' },
  { id: 'decisions', title: 'Key Decisions', icon: '◇', color: 'blue' },
  { id: 'pendingTasks', title: 'Pending Tasks', icon: '◷', color: 'amber' },
  { id: 'dependencies', title: 'Dependencies', icon: '↗', color: 'violet' },
  { id: 'blockers', title: 'Risks & Blockers', icon: '!', color: 'rose' },
  { id: 'nextSteps', title: 'Recommended Next Actions', icon: '→', color: 'cyan' },
]

function getMemberName(member) {
  return member?.name || member?.email || 'Unknown employee'
}

function getJournalAuthor(entry) {
  return entry?.createdBy || entry?.employeeName || entry?.employee || ''
}

function matchesEmployee(member, user) {
  if (!member || !user) return false

  return (
    (member.email && member.email.toLowerCase() === user.email?.toLowerCase()) ||
    (member.id && member.id === user.id) ||
    (member.user_id && member.user_id === user.id) ||
    (member.name && member.name.toLowerCase() === user.name?.toLowerCase())
  )
}

function getLines(value) {
  if (!value) return []

  const values = Array.isArray(value) ? value : [value]

  return values.flatMap((entry) => {
    if (typeof entry === 'string') {
      return entry
        .split('\n')
        .map((line) => line.replace(/^[\s•\-*]+/, '').trim())
        .filter(Boolean)
    }

    if (entry && typeof entry === 'object') {
      const text = entry.text || entry.title || entry.description || ''
      return text ? [String(text).trim()] : []
    }

    return []
  })
}

function formatDate(value) {
  if (!value) return 'Date not available'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getCategories(journals) {
  return CATEGORIES.map((category) => ({
    ...category,
    items: journals.flatMap((journal, index) => {
      let values = getLines(journal[category.id])

      if (category.id === 'completedTasks' && values.length === 0) {
        values = getLines(journal.workSummary)
      }

      return values.map((text, itemIndex) => ({
        id: `${journal.id || index}-${category.id}-${itemIndex}`,
        text,
        date: journal.date || journal.createdAt,
        journalId: journal.id,
        evidence: journal.evidence,
      }))
    }),
  }))
}

function StatusBadge({ status, shared }) {
  if (shared) {
    return (
      <span className="rounded-full bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-300 ring-1 ring-sky-400/25">
        Shared with you
      </span>
    )
  }

  const styles = {
    not_started: 'bg-surface-hover text-text-secondary ring-border',
    awaiting_approval: 'bg-amber-500/15 text-amber-300 ring-amber-400/25',
    changes_requested: 'bg-orange-500/15 text-orange-300 ring-orange-400/25',
    approved: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/25',
  }

  const labels = {
    not_started: 'Not submitted',
    awaiting_approval: 'Awaiting manager review',
    changes_requested: 'Changes requested',
    approved: 'Approved',
  }

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
        styles[status] || styles.not_started
      }`}
    >
      {labels[status] || status || 'Not submitted'}
    </span>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface-raised px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-hover text-2xl text-text-muted">
        ↗
      </div>
      <h3 className="mt-4 text-base font-bold text-text-primary">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
        {description}
      </p>
    </div>
  )
}

function ProgressStep({ number, title, description, complete, active }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          complete
            ? 'bg-emerald-500/15 text-emerald-300'
            : active
              ? 'bg-violet-600 text-white'
              : 'bg-surface-hover text-text-muted'
        }`}
      >
        {complete ? '✓' : number}
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <p className="mt-1 text-xs leading-5 text-text-muted">{description}</p>
      </div>
    </div>
  )
}

export default function MyHandoverPage() {
  const {
    projects,
    user,
    loadProjects,
    showToast,
  } = useApp()

  const [activeTab, setActiveTab] = useState('outgoing')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [employeeResponse, setEmployeeResponse] = useState('')
  const [expandedCategory, setExpandedCategory] = useState('completedTasks')
  const [busy, setBusy] = useState(false)
  const [documentBusy, setDocumentBusy] = useState('')
  const [error, setError] = useState('')

  // Create handover form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createProjectId, setCreateProjectId] = useState('')
  const [createComments, setCreateComments] = useState('')
  const [creating, setCreating] = useState(false)

  const outgoingHandovers = useMemo(() => {
    return projects
      .filter((project) =>
        (project.members || []).some(
          (member) => member.departing && matchesEmployee(member, user),
        ),
      )
      .map((project) => {
        const outgoingMember = project.members.find(
          (member) => member.departing && matchesEmployee(member, user),
        )
        return { ...project, outgoingMember }
      })
  }, [projects, user])

  // Projects where the logged-in employee is an assigned employee
  // and does not already have an outgoing handover.
  const availableProjects = useMemo(() => {
    return projects.filter((project) => {
      const isAssignedEmployee = (project.members || []).some((member) => {
        const role = String(member.role || '').toLowerCase()

        return (
          matchesEmployee(member, user) &&
          (role === 'employee' || role === '')
        )
      })

      const alreadyHasHandover = outgoingHandovers.some(
        (handover) => handover.id === project.id,
      )

      return isAssignedEmployee && !alreadyHasHandover
    })
  }, [projects, user, outgoingHandovers])

  const incomingHandovers = useMemo(() => {
    return projects.filter((project) => {
      const review = project.handoverReview || {}
      const access = review.access || {}

      const isRecipient =
        (review.incomingEmployeeEmail &&
          review.incomingEmployeeEmail.toLowerCase() === user?.email?.toLowerCase()) ||
        (review.incomingEmployeeId && review.incomingEmployeeId === user?.id)

      return (
        isRecipient &&
        Boolean(review.sharedAt) &&
        !access.revokedAt &&
        access.status === 'active'
      )
    })
  }, [projects, user])

  const selectedOutgoing = outgoingHandovers.find(
    (project) => project.id === selectedProjectId,
  ) || outgoingHandovers[0] || null

  const selectedIncoming = incomingHandovers.find(
    (project) => project.id === selectedProjectId,
  ) || incomingHandovers[0] || null

  const outgoingReview = selectedOutgoing?.handoverReview || {}
  const employeeConfirmation = outgoingReview.employeeConfirmation || {}

  const outgoingJournals = useMemo(() => {
    if (!selectedOutgoing) return []

    const member = selectedOutgoing.outgoingMember

    return (selectedOutgoing.journalEntries || [])
      .filter((entry) => {
        const author = getJournalAuthor(entry).toLowerCase()

        return (
          author === String(member?.name || '').toLowerCase() ||
          author === String(member?.email || '').toLowerCase() ||
          author === String(member?.id || '').toLowerCase()
        )
      })
      .sort(
        (a, b) =>
          new Date(a.date || a.createdAt || 0) -
          new Date(b.date || b.createdAt || 0),
      )
  }, [selectedOutgoing])

  const categories = useMemo(
    () => getCategories(outgoingJournals),
    [outgoingJournals],
  )

  const totalItems = categories.reduce(
    (total, category) => total + category.items.length,
    0,
  )

  const incomingReview = selectedIncoming?.handoverReview || {}
  const incomingPermissions = incomingReview.permissions || {}

  const canConfirm =
    !busy &&
    outgoingJournals.length > 0 &&
    Boolean(outgoingReview.id) &&
    selectedOutgoing &&
    selectedOutgoing.handoverStatus !== 'approved' &&
    !outgoingReview.approvedAt &&
    (
      !employeeConfirmation.confirmedAt ||
      selectedOutgoing.handoverStatus === 'changes_requested'
    )

  // Create a handover for the selected project
  const handleCreateHandover = async (event) => {
    event.preventDefault()

    if (!createProjectId) {
      setError('Please select a project.')
      return
    }

    setCreating(true)
    setError('')

    try {
      await createHandover(
        user?.accessToken,
        createProjectId,
        createComments.trim(),
      )

      await loadProjects(user?.accessToken)

      setSelectedProjectId(createProjectId)
      setCreateProjectId('')
      setCreateComments('')
      setShowCreateForm(false)
      setActiveTab('outgoing')

      showToast?.(
        'Handover created successfully. You can now review your project knowledge.',
      )
    } catch (createError) {
      const message =
        createError?.message || 'Could not create the handover. Please try again.'

      setError(message)
      showToast?.(message, 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleSubmitConfirmation = async () => {
    if (!selectedOutgoing) return

    if (!outgoingReview.id) {
      setError('Handover record not found. Please refresh the page.')
      return
    }

    if (outgoingJournals.length === 0) {
      setError('There are no journal entries available to submit for this handover.')
      return
    }

    setBusy(true)
    setError('')

    try {
      await confirmHandover(
        user?.accessToken,
        outgoingReview.id,
        employeeResponse.trim(),
      )

      await loadProjects(user?.accessToken)

      setEmployeeResponse('')
      showToast?.(
        'Your handover confirmation has been saved. It is now awaiting manager review.',
      )
    } catch (submitError) {
      const message =
        submitError?.message || 'Could not submit your handover. Please try again.'

      setError(message)
      showToast?.(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const openDocument = async (document) => {
    if (!document?.id) {
      showToast?.('Document ID is missing.', 'error')
      return
    }

    if (!user?.accessToken) {
      showToast?.('Please log in again to access this document.', 'error')
      return
    }

    setDocumentBusy(document.id)

    const previewWindow = window.open('', '_blank')

    try {
      const fileBlob = await downloadDocument(
        user.accessToken,
        document.id,
      )

      const fileUrl = URL.createObjectURL(fileBlob)
      const fileName = String(document.name || '').toLowerCase()
      const isWordDocument = fileName.endsWith('.docx')

      if (incomingPermissions.downloadDocuments || isWordDocument) {
        previewWindow?.close()

        const link = window.document.createElement('a')
        link.href = fileUrl
        link.download = document.name || 'handover-document'
        link.style.display = 'none'

        window.document.body.appendChild(link)
        link.click()
        window.document.body.removeChild(link)
      } else if (previewWindow) {
        previewWindow.location.href = fileUrl
      } else {
        window.open(fileUrl, '_blank', 'noopener,noreferrer')
      }

      setTimeout(() => URL.revokeObjectURL(fileUrl), 60000)
    } catch (documentError) {
      previewWindow?.close()

      showToast?.(
        documentError?.message || 'Could not open this document.',
        'error',
      )
    } finally {
      setDocumentBusy('')
    }
  }

  const renderReport = (project, readOnly = false) => {
    const review = project.handoverReview || {}
    const outgoingMember = (project.members || []).find(
      (member) => member.departing,
    )

    const reportJournals = (project.journalEntries || [])
      .filter((entry) => {
        const author = getJournalAuthor(entry).toLowerCase()
        return (
          author === String(outgoingMember?.name || '').toLowerCase() ||
          author === String(outgoingMember?.email || '').toLowerCase() ||
          author === String(outgoingMember?.id || '').toLowerCase()
        )
      })
      .sort(
        (a, b) =>
          new Date(a.date || a.createdAt || 0) -
          new Date(b.date || b.createdAt || 0),
      )

    const reportCategories = getCategories(reportJournals)
    const permissions = review.permissions || {}

    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-medium text-text-muted">Journal entries</p>
            <p className="mt-2 text-2xl font-bold text-text-primary">
              {reportJournals.length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-medium text-text-muted">Knowledge items</p>
            <p className="mt-2 text-2xl font-bold text-text-primary">
              {reportCategories.reduce((sum, item) => sum + item.items.length, 0)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-medium text-text-muted">Outgoing employee</p>
            <p className="mt-2 truncate text-base font-bold text-text-primary">
              {getMemberName(outgoingMember)}
            </p>
          </div>
        </div>

        {reportCategories.map((category) => (
          <section
            key={category.id}
            className="overflow-hidden rounded-xl border border-border"
          >
            <button
              type="button"
              onClick={() =>
                setExpandedCategory((current) =>
                  current === category.id ? '' : category.id,
                )
              }
              className="flex w-full items-center justify-between gap-3 bg-surface-raised p-4 text-left transition hover:bg-surface-hover"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-hover font-bold text-violet-300">
                  {category.icon}
                </span>
                <div>
                  <p className="text-sm font-bold text-text-primary">
                    {category.title}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {category.items.length} recorded items
                  </p>
                </div>
              </div>
              <span className="text-lg text-text-muted">
                {expandedCategory === category.id ? '−' : '+'}
              </span>
            </button>

            {expandedCategory === category.id && (
              <div className="space-y-3 border-t border-border bg-surface p-4">
                {category.items.length === 0 ? (
                  <p className="text-sm text-text-muted">
                    No entries were recorded in this category.
                  </p>
                ) : (
                  category.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-surface-raised p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-xs font-bold text-text-secondary">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-6 text-text-secondary">
                            {item.text}
                          </p>
                          {permissions.viewSources !== false && (
                            <p className="mt-2 text-xs text-text-muted">
                              Journal source · {formatDate(item.date)}
                              {item.journalId ? ` · ${item.journalId}` : ''}
                            </p>
                          )}
                          {permissions.viewSources !== false && item.evidence && (
                            <p className="mt-2 text-xs leading-5 text-text-muted">
                              Evidence: {item.evidence}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        ))}

        {!readOnly && (
          <p className="rounded-xl border border-sky-400/25 bg-sky-500/10 p-4 text-xs leading-5 text-sky-200">
            This report is organised from your recorded journal entries. Review
            the information carefully before confirming it. It is not an
            independently verified AI-generated report.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="overflow-hidden rounded-2xl border border-violet-400/15 bg-gradient-to-r from-[#09091d] via-[#11112b] to-[#211344] p-6 text-white shadow-lg shadow-violet-950/20 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
              Employee Workspace
            </p>
            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">My Handover</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Review the knowledge you are handing over or access project
              knowledge that has been shared with you.
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs text-violet-200">Signed in as</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {user?.name || user?.email}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('outgoing')
            setSelectedProjectId('')
            setError('')
          }}
          className={`rounded-2xl border p-5 text-left transition ${
            activeTab === 'outgoing'
              ? 'border-violet-500/50 bg-violet-500/10 shadow-lg shadow-violet-950/15 ring-1 ring-violet-500/30'
              : 'border-border bg-surface-raised hover:border-violet-500/30 hover:bg-surface-hover'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-secondary">
              Outgoing handovers
            </span>
            <span className="rounded-lg border border-border bg-surface-hover px-3 py-1 text-sm font-bold text-text-primary">
              {outgoingHandovers.length}
            </span>
          </div>
          <p className="mt-3 text-lg font-bold text-text-primary">
            My knowledge transfer
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Review and confirm the knowledge recorded during your work.
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('incoming')
            setSelectedProjectId('')
            setError('')
            setShowCreateForm(false)
          }}
          className={`rounded-2xl border p-5 text-left transition ${
            activeTab === 'incoming'
              ? 'border-violet-500/50 bg-violet-500/10 shadow-lg shadow-violet-950/15 ring-1 ring-violet-500/30'
              : 'border-border bg-surface-raised hover:border-violet-500/30 hover:bg-surface-hover'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-secondary">
              Incoming handovers
            </span>
            <span className="rounded-lg border border-border bg-surface-hover px-3 py-1 text-sm font-bold text-text-primary">
              {incomingHandovers.length}
            </span>
          </div>
          <p className="mt-3 text-lg font-bold text-text-primary">
            Shared with me
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Explore approved project knowledge assigned to you.
          </p>
        </button>
      </div>

      {activeTab === 'outgoing' && (
        <>
          {/* Create Handover action */}
          <section className="rounded-2xl border border-violet-400/20 bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-text-primary">
                  Start a new handover
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  Create a knowledge transfer for any project you're assigned to.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCreateForm((current) => !current)
                  setError('')
                  setCreateProjectId('')
                  setCreateComments('')
                }}
                disabled={availableProjects.length === 0 && !showCreateForm}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/25 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-lg leading-none">+</span>
                {showCreateForm ? 'Close form' : 'Create Handover'}
              </button>
            </div>

            {showCreateForm && (
              <form
                onSubmit={handleCreateHandover}
                className="mt-6 space-y-5 border-t border-border pt-5"
              >
                <div>
                  <label
                    htmlFor="create-handover-project"
                    className="mb-2 block text-sm font-semibold text-text-primary"
                  >
                    Select project
                  </label>
                  <select
                    id="create-handover-project"
                    value={createProjectId}
                    onChange={(event) => setCreateProjectId(event.target.value)}
                    required
                    disabled={creating}
                    className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 disabled:opacity-60"
                  >
                    <option value="">Choose an assigned project</option>
                    {availableProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-text-muted">
                    Only projects where you are assigned as an employee are listed.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="create-handover-comments"
                    className="mb-2 block text-sm font-semibold text-text-primary"
                  >
                    Initial handover note
                    <span className="ml-2 font-normal text-text-muted">
                      (Optional)
                    </span>
                  </label>
                  <textarea
                    id="create-handover-comments"
                    rows={4}
                    maxLength={2000}
                    value={createComments}
                    onChange={(event) => setCreateComments(event.target.value)}
                    disabled={creating}
                    placeholder="Add context about why this handover is being created or anything your manager should know..."
                    className="w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-6 text-text-primary outline-none transition placeholder:text-text-muted focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 disabled:opacity-60"
                  />
                  <p className="mt-1 text-right text-xs text-text-muted">
                    {createComments.length}/2000
                  </p>
                </div>

                {error && (
                  <p className="rounded-lg border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-300">
                    {error}
                  </p>
                )}

                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false)
                      setCreateProjectId('')
                      setCreateComments('')
                      setError('')
                    }}
                    disabled={creating}
                    className="rounded-xl border border-border px-5 py-3 text-sm font-semibold text-text-secondary transition hover:bg-surface-hover disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={creating || !createProjectId}
                    className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/25 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Handover'}
                  </button>
                </div>
              </form>
            )}

            {!showCreateForm && availableProjects.length === 0 && (
              <p className="mt-4 text-xs text-text-muted">
                There are no additional assigned projects available for a new handover.
              </p>
            )}
          </section>

          {outgoingHandovers.length === 0 ? (
            <EmptyState
              title="No outgoing handovers yet"
              description="Create a handover for one of your assigned projects. Your project journals will be organised into a report for review."
            />
          ) : (
            <>
              <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10">
                <label
                  htmlFor="outgoing-project"
                  className="mb-2 block text-sm font-bold text-text-primary"
                >
                  Select project
                </label>
                <select
                  id="outgoing-project"
                  value={selectedOutgoing?.id || ''}
                  onChange={(event) => {
                    setSelectedProjectId(event.target.value)
                    setEmployeeResponse('')
                    setError('')
                  }}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15"
                >
                  {outgoingHandovers.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </section>

              {selectedOutgoing && (
                <>
                  <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                          Outgoing project
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-text-primary">
                          {selectedOutgoing.name}
                        </h2>
                        <p className="mt-1 text-sm text-text-muted">
                          {getMemberName(selectedOutgoing.outgoingMember)}
                        </p>
                      </div>
                      <StatusBadge status={selectedOutgoing.handoverStatus} />
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-border bg-surface p-4">
                        <p className="text-xs text-text-muted">Journal entries</p>
                        <p className="mt-2 text-2xl font-bold text-text-primary">
                          {outgoingJournals.length}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-surface p-4">
                        <p className="text-xs text-text-muted">Knowledge items</p>
                        <p className="mt-2 text-2xl font-bold text-text-primary">
                          {totalItems}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-surface p-4">
                        <p className="text-xs text-text-muted">Confirmation</p>
                        <p className="mt-2 text-sm font-bold text-text-primary">
                          {employeeConfirmation.confirmedAt
                            ? 'Submitted'
                            : 'Pending'}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
                    <div className="mb-5">
                      <h2 className="text-lg font-bold text-text-primary">
                        Handover progress
                      </h2>
                      <p className="mt-1 text-sm text-text-muted">
                        Follow each stage of your knowledge transfer.
                      </p>
                    </div>
                    <div className="grid gap-5 md:grid-cols-3">
                      <ProgressStep
                        number="1"
                        title="Employee confirmation"
                        description="Review and confirm your recorded project knowledge."
                        complete={Boolean(employeeConfirmation.confirmedAt)}
                        active={!employeeConfirmation.confirmedAt}
                      />
                      <ProgressStep
                        number="2"
                        title="Manager approval"
                        description="Your manager reviews the submitted handover."
                        complete={Boolean(outgoingReview.approvedAt)}
                        active={
                          Boolean(employeeConfirmation.confirmedAt) &&
                          !outgoingReview.approvedAt
                        }
                      />
                      <ProgressStep
                        number="3"
                        title="Shared with successor"
                        description="The approved handover is shared with the incoming employee."
                        complete={Boolean(outgoingReview.sharedAt)}
                        active={Boolean(outgoingReview.approvedAt)}
                      />
                    </div>
                  </section>

                  {selectedOutgoing.handoverStatus === 'changes_requested' &&
                    outgoingReview.managerFeedback && (
                      <section className="rounded-2xl border border-orange-400/25 bg-orange-500/10 p-5">
                        <p className="text-sm font-bold text-orange-300">
                          Manager requested changes
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-orange-200">
                          {outgoingReview.managerFeedback}
                        </p>
                        <p className="mt-3 text-xs text-orange-300">
                          Review the report again, make any necessary updates
                          to your records, and add a response before resubmitting.
                        </p>
                      </section>
                    )}

                  <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
                    <div className="mb-5">
                      <h2 className="text-lg font-bold text-text-primary">
                        Review your handover report
                      </h2>
                      <p className="mt-1 text-sm text-text-muted">
                        Check the work, decisions, pending tasks, dependencies,
                        risks and next actions recorded in your journals.
                      </p>
                    </div>
                    {renderReport(selectedOutgoing)}
                  </section>

                  {outgoingReview.approvedAt ? (
                    <section className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-5">
                      <p className="font-bold text-emerald-300">
                        Your handover has been approved
                      </p>
                      <p className="mt-2 text-sm text-emerald-200">
                        Approved by {outgoingReview.approvedBy || 'Manager'}
                        {outgoingReview.approvedAt
                          ? ` · ${formatDate(outgoingReview.approvedAt)}`
                          : ''}
                      </p>
                      {outgoingReview.goodWishes && (
                        <div className="mt-4 rounded-xl border border-border bg-surface-raised p-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                            Message from your manager
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                            {outgoingReview.goodWishes}
                          </p>
                        </div>
                      )}
                    </section>
                  ) : (
                    <section className="rounded-2xl border border-violet-400/25 bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
                      <h2 className="text-lg font-bold text-text-primary">
                        Employee confirmation
                      </h2>
                      <p className="mt-1 text-sm leading-6 text-text-muted">
                        Confirm that you have reviewed the knowledge organised
                        from your journal entries. Your confirmation sends the
                        handover to your manager for review.
                      </p>

                      {employeeConfirmation.confirmedAt && (
                        <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4">
                          <p className="text-sm font-bold text-emerald-300">
                            Previously submitted
                          </p>
                          <p className="mt-1 text-xs text-emerald-200">
                            {formatDate(employeeConfirmation.confirmedAt)}
                          </p>
                          {selectedOutgoing.handoverStatus !== 'changes_requested' && (
                            <p className="mt-2 text-xs text-emerald-200">
                              Your confirmation is recorded and awaiting manager review.
                            </p>
                          )}
                        </div>
                      )}

                      <label
                        htmlFor="employee-response"
                        className="mb-2 mt-5 block text-sm font-semibold text-text-secondary"
                      >
                        Response or clarification (optional)
                      </label>
                      <textarea
                        id="employee-response"
                        rows={4}
                        value={employeeResponse}
                        onChange={(event) => setEmployeeResponse(event.target.value)}
                        placeholder="Add any clarification for your manager..."
                        disabled={
                          busy ||
                          (Boolean(employeeConfirmation.confirmedAt) &&
                            selectedOutgoing.handoverStatus !== 'changes_requested')
                        }
                        className="w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-6 text-text-primary outline-none transition placeholder:text-text-muted focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15 disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-text-muted"
                      />

                      {error && (
                        <p className="mt-3 rounded-lg border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-300">
                          {error}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={handleSubmitConfirmation}
                        disabled={!canConfirm}
                        className="mt-4 w-full rounded-xl bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/25 transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busy
                          ? 'Submitting...'
                          : employeeConfirmation.confirmedAt
                            ? 'Resubmit Handover'
                            : 'Confirm & Submit to Manager'}
                      </button>

                      {selectedOutgoing.handoverStatus === 'awaiting_approval' &&
                        employeeConfirmation.confirmedAt && (
                          <p className="mt-3 text-center text-xs text-text-muted">
                            Your confirmation is recorded. The manager can now
                            review your handover.
                          </p>
                        )}
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'incoming' && (
        <>
          {incomingHandovers.length === 0 ? (
            <EmptyState
              title="No handovers shared with you yet"
              description="When your manager approves and shares a project handover with your account, it will appear here."
            />
          ) : (
            <>
              <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10">
                <label
                  htmlFor="incoming-project"
                  className="mb-2 block text-sm font-bold text-text-primary"
                >
                  Select shared project
                </label>
                <select
                  id="incoming-project"
                  value={selectedIncoming?.id || ''}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15"
                >
                  {incomingHandovers.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </section>

              {selectedIncoming && (
                <>
                  <section className="rounded-2xl border border-violet-400/25 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 p-5 shadow-lg shadow-violet-950/10 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-violet-300">
                          Knowledge transfer received
                        </p>
                        <h2 className="mt-2 text-xl font-bold text-text-primary">
                          {selectedIncoming.name}
                        </h2>
                        <p className="mt-2 text-sm text-text-secondary">
                          Shared by {incomingReview.sharedBy || 'Project manager'}
                          {incomingReview.sharedAt
                            ? ` · ${formatDate(incomingReview.sharedAt)}`
                            : ''}
                        </p>
                      </div>
                      <StatusBadge status="shared" shared />
                    </div>
                  </section>

                  {incomingPermissions.viewReport !== false ? (
                    <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
                      <h2 className="mb-5 text-lg font-bold text-text-primary">
                        Approved handover report
                      </h2>
                      {renderReport(selectedIncoming, true)}
                    </section>
                  ) : (
                    <EmptyState
                      title="Report access is restricted"
                      description="Your manager has not enabled access to the handover report."
                    />
                  )}

                  {incomingPermissions.viewDocuments && (
                    <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
                      <div className="mb-4">
                        <h2 className="text-lg font-bold text-text-primary">
                          Supporting documents
                        </h2>
                        <p className="mt-1 text-sm text-text-muted">
                          Project documents available under your assigned permissions.
                        </p>
                      </div>

                      {(selectedIncoming.documents || []).length === 0 ? (
                        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-text-muted">
                          No supporting documents are registered for this project.
                        </p>
                      ) : (
                        <div className="divide-y divide-border rounded-xl border border-border">
                          {selectedIncoming.documents.map((document) => (
                            <div
                              key={document.id}
                              className="flex flex-wrap items-center justify-between gap-3 p-4"
                            >
                              <div className="min-w-0">
                                <p className="break-all text-sm font-semibold text-text-primary">
                                  {document.name}
                                </p>
                                <p className="mt-1 text-xs text-text-muted">
                                  {document.type || 'Project document'} ·{' '}
                                  {document.sizeKb || '—'} KB
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => openDocument(document)}
                                disabled={documentBusy === document.id}
                                className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {documentBusy === document.id
                                  ? 'Opening...'
                                  : incomingPermissions.downloadDocuments
                                    ? 'Download'
                                    : 'Open'}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                  <section className="rounded-xl border border-border bg-surface p-4">
                    <p className="text-sm font-bold text-text-primary">
                      Read-only access
                    </p>
                    <p className="mt-1 text-xs leading-5 text-text-secondary">
                      This handover is provided for reference. You cannot edit
                      the approved report or change its permissions. Your
                      manager controls access.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        ['Report', incomingPermissions.viewReport],
                        ['Documents', incomingPermissions.viewDocuments],
                        ['Sources', incomingPermissions.viewSources],
                        ['Downloads', incomingPermissions.downloadDocuments],
                      ].map(([label, enabled]) => (
                        <span
                          key={label}
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            enabled
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-surface-hover text-text-muted'
                          }`}
                        >
                          {label}: {enabled ? 'Allowed' : 'Restricted'}
                        </span>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </>
      )}

      <p className="rounded-xl border border-sky-400/25 bg-sky-500/10 p-4 text-xs leading-5 text-sky-200">
        <strong>Backend connected:</strong> Employee handover creation and
        confirmations are saved to the project database. The manager review
        and sharing stages are handled separately.
      </p>
    </div>
  )
}
