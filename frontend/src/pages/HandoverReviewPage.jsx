
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../hooks/useApp'
import {
  approveHandover,
  requestHandoverChanges,
  shareHandover,
  revokeHandoverAccess,
} from '../services/handoverService'

const DEFAULT_WISHES =
  'Thank you for your contributions to this project. We appreciate your hard work and dedication. Wishing you every success in your future endeavours!'

const DEFAULT_PERMISSIONS = {
  viewReport: true,
  viewDocuments: true,
  viewSources: true,
  downloadDocuments: false,
}

const CATEGORY_CONFIG = [
  {
    id: 'completed',
    title: 'Completed Work',
    description: 'Work and tasks completed by the outgoing employee.',
    field: 'completedTasks',
    icon: '✓',
    color: 'emerald',
  },
  {
    id: 'decisions',
    title: 'Key Decisions',
    description: 'Technical and project decisions recorded during the work.',
    field: 'decisions',
    icon: '◇',
    color: 'violet',
  },
  {
    id: 'pending',
    title: 'Pending Tasks',
    description: 'Tasks that still need attention or completion.',
    field: 'pendingTasks',
    icon: '◷',
    color: 'amber',
  },
  {
    id: 'dependencies',
    title: 'Dependencies',
    description: 'External requirements affecting project progress.',
    field: 'dependencies',
    icon: '↗',
    color: 'sky',
  },
  {
    id: 'risks',
    title: 'Risks & Blockers',
    description: 'Problems, blockers and risks recorded in journals.',
    field: 'blockers',
    icon: '!',
    color: 'rose',
  },
  {
    id: 'next',
    title: 'Recommended Next Actions',
    description: 'Suggested follow-up work recorded by the employee.',
    field: 'nextSteps',
    icon: '→',
    color: 'indigo',
  },
]

const PERMISSION_CONFIG = [
  {
    key: 'viewReport',
    title: 'View Handover Report',
    description: 'Read the approved project handover summary.',
    icon: '▤',
  },
  {
    key: 'viewDocuments',
    title: 'View Supporting Documents',
    description: 'Access project documents included as references.',
    icon: '▧',
  },
  {
    key: 'viewSources',
    title: 'View Knowledge Sources',
    description: 'See journal dates and source references.',
    icon: '⌕',
  },
  {
    key: 'downloadDocuments',
    title: 'Download Shared Documents',
    description: 'Allow downloads of documents made available.',
    icon: '↓',
  },
]

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
  }).filter(Boolean)
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

function getMemberName(member) {
  return member?.name || member?.email || 'Unknown employee'
}

function getCategoryData(journals) {
  return CATEGORY_CONFIG.map((category) => {
    const items = journals.flatMap((journal, journalIndex) => {
      let values = getLines(journal[category.field])

      if (category.id === 'completed' && values.length === 0) {
        values = getLines(journal.workSummary)
      }

      return values.map((text, itemIndex) => ({
        id: `${category.id}-${journal.id || journalIndex}-${itemIndex}`,
        text,
        date: journal.date || journal.createdAt,
        evidence: journal.evidence,
        journalId: journal.id,
      }))
    })

    return { ...category, items }
  })
}

function Icon({ children, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
    >
      {children}
    </span>
  )
}

function StatusPill({ status }) {
  const config = {
    awaiting_approval: {
      label: 'Pending Review',
      style: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
      dot: 'bg-amber-400',
    },
    pending_employee_review: {
      label: 'Awaiting Employee Review',
      style: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
      dot: 'bg-amber-400',
    },
    changes_requested: {
      label: 'Changes Requested',
      style: 'border-orange-500/25 bg-orange-500/10 text-orange-300',
      dot: 'bg-orange-400',
    },
    approved: {
      label: 'Approved',
      style: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
      dot: 'bg-emerald-400',
    },
    shared: {
      label: 'Shared with Incoming Employee',
      style: 'border-sky-500/25 bg-sky-500/10 text-sky-300',
      dot: 'bg-sky-400',
    },
    not_started: {
      label: 'Not Started',
      style: 'border-border bg-surface-hover text-text-muted',
      dot: 'bg-text-muted',
    },
  }

  const item = config[status] || config.not_started

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${item.style}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
      {item.label}
    </span>
  )
}

function SectionHeading({ number, title, description, right }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-sm font-bold text-violet-300">
          {number}
        </div>

        <div>
          <h2 className="text-base font-bold text-text-primary sm:text-lg">
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-text-muted sm:text-sm">
            {description}
          </p>
        </div>
      </div>

      {right}
    </div>
  )
}

function MetricCard({ label, value, description, icon, tone = 'violet' }) {
  const tones = {
    violet: 'border-violet-500/20 bg-violet-500/5 text-violet-300',
    emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300',
    amber: 'border-amber-500/20 bg-amber-500/5 text-amber-300',
    rose: 'border-rose-500/20 bg-rose-500/5 text-rose-300',
    sky: 'border-sky-500/20 bg-sky-500/5 text-sky-300',
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 transition hover:border-violet-500/30">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-text-muted">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm ${tones[tone]}`}>
          {icon}
        </div>
      </div>

      <p className="mt-3 text-2xl font-bold tracking-tight text-text-primary">
        {value}
      </p>

      <p className="mt-1 text-xs text-text-muted">{description}</p>
    </div>
  )
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong bg-surface p-8 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-raised text-lg text-text-muted">
        —
      </div>
      <p className="mt-3 text-sm font-semibold text-text-secondary">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-text-muted">
        {description}
      </p>
    </div>
  )
}

export default function HandoverReviewPage() {
  const {
    projects,
    params,
    user,
    loadProjects,
    showToast,
  } = useApp()

  const [selectedProjectId, setSelectedProjectId] = useState(
    params.projectId || '',
  )
  const [selectedOutgoingId, setSelectedOutgoingId] = useState('')
  const [selectedIncomingId, setSelectedIncomingId] = useState('')
  const [expandedCategory, setExpandedCategory] = useState('completed')
  const [expandedAll, setExpandedAll] = useState(false)
  const [reportSearch, setReportSearch] = useState('')
  const [goodWishes, setGoodWishes] = useState(DEFAULT_WISHES)
  const [managerFeedback, setManagerFeedback] = useState('')
  const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const project = useMemo(
    () => projects.find((item) => item.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  )

  const members = project?.members || []

  const outgoingMembers = useMemo(
    () => members.filter((member) => member.departing),
    [members],
  )

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(params.projectId || projects[0].id)
    }
  }, [projects, selectedProjectId, params.projectId])

  useEffect(() => {
    setSelectedOutgoingId('')
    setSelectedIncomingId('')
    setExpandedCategory('completed')
    setExpandedAll(false)
    setReportSearch('')
    setError('')
  }, [selectedProjectId])

  const outgoingEmployee = useMemo(
    () =>
      outgoingMembers.find((member) => member.id === selectedOutgoingId) ||
      outgoingMembers[0] ||
      null,
    [outgoingMembers, selectedOutgoingId],
  )

  const incomingMembers = useMemo(
    () =>
      members.filter((member) => {
        const role = String(member.role || '').toLowerCase()

        return (
          !member.departing &&
          member.id !== outgoingEmployee?.id &&
          !role.includes('manager') &&
          member.email !== user?.email
        )
      }),
    [members, outgoingEmployee, user?.email],
  )

  const journals = useMemo(() => {
    if (!project || !outgoingEmployee) return []

    return (project.journalEntries || [])
      .filter((entry) => {
        const author = String(entry.createdBy || '').toLowerCase()

        return (
          author === String(outgoingEmployee.name || '').toLowerCase() ||
          author === String(outgoingEmployee.email || '').toLowerCase() ||
          author === String(outgoingEmployee.id || '').toLowerCase()
        )
      })
      .sort(
        (a, b) =>
          new Date(a.date || a.createdAt || 0) -
          new Date(b.date || b.createdAt || 0),
      )
  }, [project, outgoingEmployee])

  const categories = useMemo(() => getCategoryData(journals), [journals])

  const filteredCategories = useMemo(() => {
    const query = reportSearch.trim().toLowerCase()

    if (!query) return categories

    return categories.map((category) => ({
      ...category,
      items: category.items.filter((item) => {
        return (
          item.text.toLowerCase().includes(query) ||
          String(item.evidence || '').toLowerCase().includes(query) ||
          category.title.toLowerCase().includes(query)
        )
      }),
    }))
  }, [categories, reportSearch])

  const totalKnowledgeItems = categories.reduce(
    (total, category) => total + category.items.length,
    0,
  )

  const completedCount =
    categories.find((category) => category.id === 'completed')?.items.length || 0

  const pendingCount =
    categories.find((category) => category.id === 'pending')?.items.length || 0

  const blockerCount =
    categories.find((category) => category.id === 'risks')?.items.length || 0

  const dependencyCount =
    categories.find((category) => category.id === 'dependencies')?.items.length || 0

  const attentionCount = pendingCount + blockerCount

  const documents = project?.documents || []
  const review = project?.handoverReview || {}
  const handoverId = review.id || review.handoverId

  const access = review.access || {}
  const employeeConfirmation = review.employeeConfirmation || {}

  const isEmployeeConfirmed = Boolean(
    employeeConfirmation.confirmedAt ||
    employeeConfirmation.status === 'confirmed',
  )

  const isApproved = Boolean(
    review.approvedAt ||
    project?.handoverStatus === 'approved',
  )

  const isShared = Boolean(
    review.sharedAt &&
    access.status === 'active' &&
    !access.revokedAt,
  )

  const currentStatus = isShared
    ? 'shared'
    : project?.handoverStatus || 'not_started'

  const hasRevokedAccess = Boolean(
    access.revokedAt || access.status === 'revoked',
  )

  useEffect(() => {
    setGoodWishes(review.goodWishes || DEFAULT_WISHES)
    setManagerFeedback(review.managerFeedback || '')
    setPermissions({
      ...DEFAULT_PERMISSIONS,
      ...(review.permissions || {}),
    })
    setSelectedIncomingId(review.incomingEmployeeId || '')
  }, [selectedProjectId])

  const refreshProject = async () => {
    await loadProjects(user?.accessToken)
  }

  const performAction = async (action, successMessage) => {
    if (!handoverId) {
      setError('Handover record ID is missing. Please refresh the page.')
      return false
    }

    setBusy(true)
    setError('')

    try {
      await action()
      await refreshProject()

      showToast?.(successMessage, 'success')
      return true
    } catch (actionError) {
      const message =
        actionError?.message ||
        'The handover action could not be completed.'

      setError(message)
      showToast?.(message, 'error')
      return false
    } finally {
      setBusy(false)
    }
  }

  const handleAccept = async () => {
    if (!isEmployeeConfirmed) {
      setError('The outgoing employee must confirm the handover first.')
      return
    }

    if (!journals.length) {
      setError('No journal entries were found for the outgoing employee.')
      return
    }

    if (!goodWishes.trim()) {
      setError('Please enter a good-wishes message before approving.')
      return
    }

    const success = await performAction(
      () =>
        approveHandover(
          user?.accessToken,
          handoverId,
          goodWishes.trim(),
        ),
      'Handover approved successfully.',
    )

    if (success) {
      setManagerFeedback('')
    }
  }

  const handleRequestChanges = async () => {
    if (!managerFeedback.trim()) {
      setError('Please describe the changes required.')
      return
    }

    const success = await performAction(
      () =>
        requestHandoverChanges(
          user?.accessToken,
          handoverId,
          managerFeedback.trim(),
        ),
      'Handover returned to the employee for corrections.',
    )

    if (success) {
      setSelectedIncomingId('')
    }
  }

  const handleShare = async () => {
    const incomingEmployee = incomingMembers.find(
      (member) => member.id === selectedIncomingId,
    )

    if (!isApproved) {
      setError('Approve the handover before sharing it.')
      return
    }

    if (!incomingEmployee) {
      setError('Please select an incoming employee.')
      return
    }

    if (!permissions.viewReport) {
      setError('Report access must be enabled before sharing.')
      return
    }

    await performAction(
      () =>
        shareHandover(
          user?.accessToken,
          handoverId,
          incomingEmployee.id,
          permissions,
        ),
      `Approved handover shared with ${getMemberName(incomingEmployee)}.`,
    )
  }

  const handleRevoke = async () => {
    await performAction(
      () => revokeHandoverAccess(user?.accessToken, handoverId),
      'Incoming employee access has been revoked.',
    )
  }

  const togglePermission = (key) => {
    setPermissions((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }

  const toggleAllCategories = () => {
    if (expandedAll) {
      setExpandedAll(false)
      setExpandedCategory('')
    } else {
      setExpandedAll(true)
      setExpandedCategory('__all__')
    }
  }

  const getExpanded = (categoryId) => {
    return expandedAll || expandedCategory === categoryId
  }

  if (!projects.length) {
    return (
      <div className="rounded-2xl border border-border bg-surface-raised p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface text-xl text-text-muted">
          ▤
        </div>
        <h2 className="mt-4 text-lg font-bold text-text-primary">
          No projects available
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          Projects assigned to your manager account will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-10">

      {/* PAGE HEADER */}
      <section className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-[#17152f] via-[#19172f] to-[#241943] p-6 shadow-lg shadow-violet-950/10 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              Manager Workspace
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Handover Review
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
              Review project knowledge, verify the handover and manage its secure transfer to an incoming employee.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-violet-100 backdrop-blur-sm">
            <span className="text-lg">⇄</span>
            Project Knowledge Transfer
          </div>
        </div>

        <div className="relative mt-7 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="text-violet-300">⌂</span>
            Manager Workspace
          </div>
          <span className="text-slate-600">/</span>
          <span className="text-xs font-semibold text-white">Handover Review</span>
        </div>
      </section>

      {/* PROJECT SELECTOR */}
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-raised p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Workspace
          </p>
          <h2 className="mt-1 text-sm font-bold text-text-primary">
            Select a project to review
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            Switch between your managed project handovers.
          </p>
        </div>

        <div className="w-full sm:max-w-md">
          <select
            id="handover-project"
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
          >
            <option value="">Choose a project...</option>
            {projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {project && (
        <>
          {/* PROJECT OVERVIEW */}
          <section className="overflow-hidden rounded-2xl border border-border bg-surface-raised">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-xl text-violet-300">
                  ◈
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Project overview
                  </p>
                  <h2 className="mt-1 break-words text-lg font-bold text-text-primary sm:text-xl">
                    {project.name}
                  </h2>
                  <p className="mt-1 text-xs text-text-muted">
                    Review the knowledge transfer associated with this project.
                  </p>
                </div>
              </div>

              <StatusPill status={currentStatus} />
            </div>

            <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-surface-raised p-4 sm:p-5">
                <p className="text-xs text-text-muted">Outgoing Employee</p>
                <p className="mt-2 truncate text-sm font-bold text-text-primary">
                  {outgoingEmployee ? getMemberName(outgoingEmployee) : 'Not assigned'}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {outgoingEmployee?.role || 'No departing member marked'}
                </p>
              </div>

              <div className="bg-surface-raised p-4 sm:p-5">
                <p className="text-xs text-text-muted">Journal Entries</p>
                <p className="mt-2 text-xl font-bold text-text-primary">
                  {journals.length}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Outgoing employee records
                </p>
              </div>

              <div className="bg-surface-raised p-4 sm:p-5">
                <p className="text-xs text-text-muted">Knowledge Items</p>
                <p className="mt-2 text-xl font-bold text-text-primary">
                  {totalKnowledgeItems}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Organised from journals
                </p>
              </div>

              <div className="bg-surface-raised p-4 sm:p-5">
                <p className="text-xs text-text-muted">Needs Attention</p>
                <p className="mt-2 text-xl font-bold text-amber-300">
                  {attentionCount}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Pending tasks and blockers
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border p-4 sm:px-6">
              {outgoingMembers.length > 1 ? (
                <div className="w-full sm:max-w-sm">
                  <label
                    htmlFor="outgoing-employee"
                    className="mb-2 block text-xs font-semibold text-text-secondary"
                  >
                    Outgoing employee
                  </label>
                  <select
                    id="outgoing-employee"
                    value={outgoingEmployee?.id || ''}
                    onChange={(event) => {
                      setSelectedOutgoingId(event.target.value)
                      setError('')
                    }}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none focus:border-violet-500"
                  >
                    {outgoingMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {getMemberName(member)} — {member.role}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-xs text-text-muted">
                  <span className="font-semibold text-text-secondary">Outgoing employee:</span>{' '}
                  {outgoingEmployee ? getMemberName(outgoingEmployee) : 'Not assigned'}
                </p>
              )}

              {project.handoverStatus === 'changes_requested' && review.managerFeedback && (
                <div className="w-full rounded-xl border border-orange-500/25 bg-orange-500/5 p-4">
                  <p className="text-xs font-bold text-orange-300">
                    Previous Manager Feedback
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                    {review.managerFeedback}
                  </p>
                  <p className="mt-2 text-xs text-orange-300">
                    Waiting for the outgoing employee to correct and resubmit the handover.
                  </p>
                </div>
              )}

              {!outgoingEmployee && (
                <div className="w-full rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-200">
                  No project member is currently marked as departing.
                </div>
              )}

              {!handoverId && (
                <div className="w-full rounded-xl border border-rose-500/25 bg-rose-500/5 p-4 text-sm text-rose-200">
                  Handover record ID is missing. Refresh the project data before taking action.
                </div>
              )}
            </div>
          </section>

          {/* REPORT SUMMARY STRIP */}
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              label="Completed Work"
              value={completedCount}
              description="Recorded accomplishments"
              icon="✓"
              tone="emerald"
            />
            <MetricCard
              label="Pending Tasks"
              value={pendingCount}
              description="Work requiring follow-up"
              icon="◷"
              tone="amber"
            />
            <MetricCard
              label="Blockers"
              value={blockerCount}
              description="Recorded project obstacles"
              icon="!"
              tone="rose"
            />
            <MetricCard
              label="Dependencies"
              value={dependencyCount}
              description="External requirements"
              icon="↗"
              tone="sky"
            />
          </section>

          {/* 01 HANDOVER REPORT */}
          <section className="rounded-2xl border border-border bg-surface-raised p-5 sm:p-6">
            <SectionHeading
              number="01"
              title="Handover Report"
              description="Explore the work, decisions, outstanding tasks and knowledge recorded by the outgoing employee."
              right={
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                  Journal-based details
                </span>
              }
            />

            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                  ⌕
                </span>
                <input
                  type="search"
                  value={reportSearch}
                  onChange={(event) => setReportSearch(event.target.value)}
                  placeholder="Search handover knowledge..."
                  className="w-full rounded-xl border border-border bg-surface py-3 pl-9 pr-4 text-sm text-text-primary outline-none transition placeholder:text-text-faint focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                />
              </div>

              <button
                type="button"
                onClick={toggleAllCategories}
                disabled={Boolean(reportSearch.trim())}
                className="rounded-xl border border-border bg-surface px-4 py-3 text-xs font-semibold text-text-secondary transition hover:border-violet-500/40 hover:bg-violet-500/5 hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reportSearch.trim()
                  ? 'Search results expanded'
                  : expandedAll
                    ? 'Collapse all sections'
                    : 'Expand all sections'}
              </button>
            </div>

            {!outgoingEmployee || journals.length === 0 ? (
              <EmptyState
                title="No outgoing employee journal details found"
                description="Journal entries belonging to the departing employee will appear here once available."
              />
            ) : (
              <div className="space-y-3">
                {filteredCategories.map((category) => {
                  const isExpanded = reportSearch.trim()
                    ? true
                    : getExpanded(category.id)

                  return (
                    <div
                      key={category.id}
                      className={`overflow-hidden rounded-xl border transition-colors ${
                        isExpanded
                          ? 'border-violet-500/35 bg-violet-500/[0.025]'
                          : 'border-border bg-surface'
                      }`}
                    >
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => {
                          setExpandedAll(false)
                          setExpandedCategory(
                            expandedCategory === category.id && !expandedAll
                              ? ''
                              : category.id,
                          )
                        }}
                        className="flex w-full items-center justify-between gap-4 p-4 text-left transition hover:bg-surface-hover sm:p-5"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-lg font-bold text-violet-300">
                            {category.icon}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-bold text-text-primary">
                              {category.title}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-text-muted">
                              {category.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <span className="rounded-full border border-border bg-surface-raised px-3 py-1 text-xs font-semibold tabular-nums text-text-secondary">
                            {category.items.length}
                          </span>
                          <span className={`flex h-7 w-7 items-center justify-center rounded-lg border border-border text-sm text-text-muted transition ${isExpanded ? 'rotate-180 bg-violet-500/10 text-violet-300' : ''}`}>
                            ⌄
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border p-4 sm:p-5">
                          {category.items.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border bg-surface p-5 text-center">
                              <p className="text-sm text-text-muted">
                                {reportSearch
                                  ? 'No matching items in this category.'
                                  : 'No entries in this category were recorded.'}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {category.items.map((item, index) => (
                                <div
                                  key={item.id}
                                  className="group rounded-xl border border-border bg-surface p-4 transition hover:border-violet-500/30"
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised text-xs font-bold text-text-muted">
                                      {index + 1}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm leading-6 text-text-secondary">
                                        {item.text}
                                      </p>

                                      <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <span className="rounded-md border border-violet-500/15 bg-violet-500/5 px-2 py-1 text-[11px] font-medium text-violet-300">
                                          Journal source
                                        </span>
                                        <span className="text-xs text-text-muted">
                                          {formatDate(item.date)}
                                        </span>
                                      </div>

                                      {item.evidence && (
                                        <div className="mt-3 rounded-lg border border-border bg-surface-raised p-3">
                                          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                                            Evidence noted
                                          </p>
                                          <p className="mt-1 text-xs leading-5 text-text-secondary">
                                            {item.evidence}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {reportSearch && filteredCategories.every(
                  (category) => category.items.length === 0,
                ) && (
                  <EmptyState
                    title="No matching knowledge found"
                    description="Try another search term or clear the search field to view all recorded knowledge."
                  />
                )}
              </div>
            )}

            <div className="mt-5 flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
              <span className="mt-0.5 text-sm text-sky-300">ⓘ</span>
              <div>
                <p className="text-xs font-bold text-sky-200">
                  Source and verification notice
                </p>
                <p className="mt-1 text-xs leading-5 text-sky-200/80">
                  These details are organised from the outgoing employee's journal entries. They are not independently verified AI findings. Review the supporting information before making a decision.
                </p>
              </div>
            </div>
          </section>

          {/* 02 SUPPORTING DOCUMENTS */}
          <section className="rounded-2xl border border-border bg-surface-raised p-5 sm:p-6">
            <SectionHeading
              number="02"
              title="Supporting Documents"
              description="Project documents registered in Document Centre and associated with this handover."
              right={
                <span className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary">
                  {documents.length} {documents.length === 1 ? 'document' : 'documents'}
                </span>
              }
            />

            {documents.length === 0 ? (
              <EmptyState
                title="No supporting documents"
                description="Documents registered in the project's Document Centre will appear here."
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="hidden grid-cols-[minmax(0,1.7fr)_minmax(110px,0.8fr)_minmax(100px,0.7fr)_auto] gap-4 border-b border-border bg-surface px-4 py-3 sm:grid">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Document
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Uploaded by
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Uploaded on
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Size
                  </span>
                </div>

                <div className="divide-y divide-border">
                  {documents.map((document) => (
                    <div
                      key={document.id}
                      className="grid gap-3 p-4 transition hover:bg-surface-hover sm:grid-cols-[minmax(0,1.7fr)_minmax(110px,0.8fr)_minmax(100px,0.7fr)_auto] sm:items-center sm:gap-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10 text-xs font-bold text-violet-300">
                          {String(document.type || 'FILE').slice(0, 4).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="break-all text-sm font-semibold text-text-primary">
                            {document.name || 'Untitled document'}
                          </p>
                          <p className="mt-1 text-xs text-text-muted">
                            Project document
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-text-muted sm:hidden">Uploaded by</p>
                        <p className="mt-1 text-xs font-medium text-text-secondary sm:mt-0">
                          {document.uploadedBy || 'Unknown'}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-text-muted sm:hidden">Uploaded on</p>
                        <p className="mt-1 text-xs text-text-secondary sm:mt-0">
                          {formatDate(document.uploadedAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-text-muted sm:hidden">File size</p>
                        <span className="text-xs font-medium text-text-secondary">
                          {document.sizeKb ? `${document.sizeKb} KB` : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
              <span className="text-sm text-sky-300">ⓘ</span>
              <p className="text-xs leading-5 text-sky-200/80">
                Document records are displayed here. Document download permissions are managed separately through the document service.
              </p>
            </div>
          </section>

          {/* 03 MANAGER REVIEW */}
          <section className="rounded-2xl border border-border bg-surface-raised p-5 sm:p-6">
            <SectionHeading
              number="03"
              title="Manager Review & Decision"
              description="Review employee confirmation, approve the submitted handover or return it with correction instructions."
            />

            {/* Confirmation status */}
            <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg ${
                  isEmployeeConfirmed
                    ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                    : 'border-amber-500/25 bg-amber-500/10 text-amber-300'
                }`}>
                  {isEmployeeConfirmed ? '✓' : '◷'}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-text-primary">
                      Employee Confirmation
                    </p>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                      isEmployeeConfirmed
                        ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-300'
                        : 'border-amber-500/25 bg-amber-500/5 text-amber-300'
                    }`}>
                      {isEmployeeConfirmed ? 'Confirmed' : 'Awaiting confirmation'}
                    </span>
                  </div>

                  <p className="mt-1 text-xs leading-5 text-text-muted">
                    {isEmployeeConfirmed
                      ? 'The outgoing employee has confirmed the handover.'
                      : 'The outgoing employee must confirm the handover before manager approval becomes available.'}
                  </p>

                  {isEmployeeConfirmed && (
                    <p className="mt-3 text-xs text-text-secondary">
                      Confirmed by{' '}
                      <span className="font-semibold text-text-primary">
                        {employeeConfirmation.confirmedBy || 'Outgoing Employee'}
                      </span>
                      {' · '}
                      {formatDate(employeeConfirmation.confirmedAt)}
                    </p>
                  )}
                </div>
              </div>

              {isEmployeeConfirmed && employeeConfirmation.employeeResponse && (
                <div className="mt-4 rounded-lg border border-border bg-surface-raised p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                    Employee Response
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                    {employeeConfirmation.employeeResponse}
                  </p>
                </div>
              )}
            </div>

            {/* Approved state */}
            {isApproved ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-emerald-500/25 bg-emerald-500/[0.035]">
                <div className="flex items-center gap-3 border-b border-emerald-500/15 p-4 sm:p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-lg text-emerald-300">
                    ✓
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-emerald-200">
                      Handover Approved
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      Approved by {review.approvedBy || 'Manager'}
                      {review.approvedAt
                        ? ` · ${formatDate(review.approvedAt)}`
                        : ''}
                    </p>
                  </div>

                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                    Approved
                  </span>
                </div>

                {review.goodWishes && (
                  <div className="p-4 sm:p-5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                      Good Wishes Sent
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                      {review.goodWishes}
                    </p>
                  </div>
                )}

                <div className="border-t border-emerald-500/15 px-4 py-3 sm:px-5">
                  <p className="text-xs text-emerald-300">
                    The handover is approved. Incoming employee access can be managed below.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {/* APPROVE */}
                <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                      ✓
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">
                        Accept Handover
                      </h3>
                      <p className="mt-1 text-xs text-text-muted">
                        Approve the submitted project knowledge transfer.
                      </p>
                    </div>
                  </div>

                  <label
                    htmlFor="good-wishes"
                    className="mb-2 mt-5 block text-xs font-semibold text-text-secondary"
                  >
                    Good-wishes message
                  </label>

                  <textarea
                    id="good-wishes"
                    rows={5}
                    value={goodWishes}
                    onChange={(event) => setGoodWishes(event.target.value)}
                    placeholder="Write a message for the outgoing employee..."
                    className="w-full resize-y rounded-xl border border-border bg-surface-raised px-3 py-3 text-sm leading-6 text-text-primary outline-none transition placeholder:text-text-faint focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                  />

                  <button
                    type="button"
                    onClick={handleAccept}
                    disabled={
                      busy ||
                      !handoverId ||
                      !outgoingEmployee ||
                      journals.length === 0 ||
                      !isEmployeeConfirmed ||
                      !goodWishes.trim()
                    }
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? 'Processing...' : '✓ Approve Handover'}
                  </button>

                  {!isEmployeeConfirmed && (
                    <p className="mt-3 text-xs leading-5 text-amber-300">
                      Employee confirmation is required before approval.
                    </p>
                  )}
                </div>

                {/* REQUEST CHANGES */}
                <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10 text-orange-300">
                      ↩
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">
                        Request Corrections
                      </h3>
                      <p className="mt-1 text-xs text-text-muted">
                        Return the handover with specific feedback.
                      </p>
                    </div>
                  </div>

                  <label
                    htmlFor="manager-feedback"
                    className="mb-2 mt-5 block text-xs font-semibold text-text-secondary"
                  >
                    Feedback for outgoing employee
                    <span className="ml-1 text-rose-400">*</span>
                  </label>

                  <textarea
                    id="manager-feedback"
                    rows={5}
                    value={managerFeedback}
                    onChange={(event) => setManagerFeedback(event.target.value)}
                    placeholder="Explain what is missing, unclear or needs correction..."
                    className="w-full resize-y rounded-xl border border-border bg-surface-raised px-3 py-3 text-sm leading-6 text-text-primary outline-none transition placeholder:text-text-faint focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                  />

                  <button
                    type="button"
                    onClick={handleRequestChanges}
                    disabled={busy || !handoverId || !managerFeedback.trim()}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500/25 bg-orange-500/10 px-4 py-3 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? 'Processing...' : '↩ Send Back for Corrections'}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* 04 ACCESS AND PERMISSIONS */}
          <section className="overflow-hidden rounded-2xl border border-violet-500/20 bg-surface-raised">
            <div className="border-b border-border bg-gradient-to-r from-violet-500/[0.07] via-transparent to-indigo-500/[0.06] p-5 sm:p-6">
              <SectionHeading
                number="04"
                title="Handover Access & Permissions"
                description="Assign the approved handover to an incoming employee and control their access."
                right={
                  <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    isApproved
                      ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-300'
                      : 'border-border bg-surface text-text-muted'
                  }`}>
                    {isApproved ? 'Approval Complete' : 'Approval Required'}
                  </span>
                }
              />
            </div>

            <div className="space-y-6 p-5 sm:p-6">
              {!isApproved ? (
                <EmptyState
                  title="Sharing is not available yet"
                  description="The handover must be approved before you can assign an incoming employee and configure access."
                />
              ) : (
                <>
                  {/* ACCESS STATUS */}
                  <div className={`rounded-xl border p-4 ${
                    isShared
                      ? 'border-sky-500/25 bg-sky-500/5'
                      : hasRevokedAccess
                        ? 'border-rose-500/25 bg-rose-500/5'
                        : 'border-border bg-surface'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg ${
                        isShared
                          ? 'border-sky-500/20 bg-sky-500/10 text-sky-300'
                          : hasRevokedAccess
                            ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                            : 'border-border bg-surface-raised text-text-muted'
                      }`}>
                        {isShared ? '↗' : hasRevokedAccess ? '×' : '○'}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold text-text-primary">
                            {isShared
                              ? 'Handover Access Active'
                              : hasRevokedAccess
                                ? 'Incoming Employee Access Revoked'
                                : 'Handover Not Yet Shared'}
                          </p>

                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            isShared
                              ? 'border-sky-500/25 bg-sky-500/10 text-sky-300'
                              : hasRevokedAccess
                                ? 'border-rose-500/25 bg-rose-500/10 text-rose-300'
                                : 'border-border bg-surface-raised text-text-muted'
                          }`}>
                            {isShared ? 'Active Access' : hasRevokedAccess ? 'Revoked' : 'Not Shared'}
                          </span>
                        </div>

                        <p className="mt-1 text-xs leading-5 text-text-muted">
                          {isShared
                            ? `The approved handover is currently accessible to ${review.incomingEmployeeName || 'the assigned employee'}.`
                            : hasRevokedAccess
                              ? `Previous access was revoked on ${formatDate(access.revokedAt)}. You can assign an eligible employee again.`
                              : 'No active incoming employee access is currently recorded.'}
                        </p>

                        {isShared && review.sharedAt && (
                          <p className="mt-2 text-xs text-sky-300">
                            Shared on {formatDate(review.sharedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RECIPIENT */}
                  <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.035] p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-violet-300">
                          Recipient Assignment
                        </p>
                        <h3 className="mt-1 text-sm font-bold text-text-primary">
                          Select Incoming Employee
                        </h3>
                        <p className="mt-1 text-xs leading-5 text-text-muted">
                          Choose the team member who will receive this approved handover.
                        </p>
                      </div>

                      <span className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-300">
                        {incomingMembers.length} eligible
                      </span>
                    </div>

                    <div className="mt-4">
                      <select
                        id="incoming-employee"
                        value={selectedIncomingId}
                        onChange={(event) => {
                          setSelectedIncomingId(event.target.value)
                          setError('')
                        }}
                        disabled={isShared}
                        className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm font-medium text-text-primary outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">Choose an incoming employee...</option>
                        {incomingMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {getMemberName(member)} — {member.role}
                          </option>
                        ))}
                      </select>
                    </div>

                    {incomingMembers.length === 0 && (
                      <p className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-200">
                        No eligible incoming employee is available in this project's member list.
                      </p>
                    )}

                    {isShared && (
                      <p className="mt-3 text-xs text-sky-300">
                        Revoke existing access before assigning a different employee.
                      </p>
                    )}
                  </div>

                  {/* PERMISSIONS */}
                  <div>
                    <div className="mb-4">
                      <h3 className="text-sm font-bold text-text-primary">
                        Access Permissions
                      </h3>
                      <p className="mt-1 text-xs text-text-muted">
                        Configure the resources the incoming employee is allowed to access.
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {PERMISSION_CONFIG.map((permission) => (
                        <label
                          key={permission.key}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                            permissions[permission.key]
                              ? 'border-violet-500/35 bg-violet-500/[0.045]'
                              : 'border-border bg-surface hover:border-violet-500/25'
                          } ${isShared ? 'cursor-not-allowed opacity-70' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(permissions[permission.key])}
                            onChange={() => togglePermission(permission.key)}
                            disabled={isShared}
                            className="mt-1 h-4 w-4 shrink-0 accent-violet-500"
                          />

                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="text-sm text-violet-300">
                                {permission.icon}
                              </span>
                              <span className="text-sm font-semibold text-text-primary">
                                {permission.title}
                              </span>
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-text-muted">
                              {permission.description}
                            </span>
                          </span>

                          <span className={`mt-0.5 rounded-full px-2 py-1 text-[10px] font-semibold ${
                            permissions[permission.key]
                              ? 'bg-violet-500/10 text-violet-300'
                              : 'bg-surface-hover text-text-muted'
                          }`}>
                            {permissions[permission.key] ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* RESTRICTED ACTIONS */}
                  <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                    <div className="flex items-center gap-2">
                      <span className="text-rose-300">⊘</span>
                      <h3 className="text-sm font-bold text-text-primary">
                        Restricted Actions
                      </h3>
                    </div>

                    <p className="mt-1 text-xs text-text-muted">
                      These actions remain restricted for the incoming employee.
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[
                        'Edit or modify the approved handover',
                        'Delete handover records',
                        'Change project permissions',
                        'Access private employee journals',
                      ].map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-2.5 text-xs text-text-secondary"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-500/10 text-[11px] font-bold text-rose-300">
                            ×
                          </span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ACCESS SUMMARY */}
                  <div className="rounded-xl border border-sky-500/20 bg-sky-500/[0.035] p-4 sm:p-5">
                    <div className="flex items-center gap-2">
                      <span className="text-sky-300">ⓘ</span>
                      <h3 className="text-sm font-bold text-sky-200">
                        Access Summary
                      </h3>
                    </div>

                    <p className="mt-2 text-xs leading-6 text-sky-200/80">
                      {selectedIncomingId
                        ? `The selected employee will receive the approved handover with ${PERMISSION_CONFIG.filter((item) => permissions[item.key]).length} of ${PERMISSION_CONFIG.length} permissions enabled.`
                        : 'Select an incoming employee to configure the handover recipient.'}
                      {' '}Access can be revoked by the manager.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {PERMISSION_CONFIG.map((item) => (
                        <span
                          key={item.key}
                          className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium ${
                            permissions[item.key]
                              ? 'border-sky-500/20 bg-sky-500/10 text-sky-200'
                              : 'border-border bg-surface text-text-muted line-through'
                          }`}
                        >
                          {item.title}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* ACTION BUTTON */}
                  {!isShared ? (
                    <button
                      type="button"
                      onClick={handleShare}
                      disabled={
                        busy ||
                        !handoverId ||
                        !selectedIncomingId ||
                        !permissions.viewReport
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? 'Sharing...' : '↗ Share Approved Handover'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRevoke}
                      disabled={busy || !handoverId}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 text-sm font-bold text-rose-300 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy ? 'Revoking...' : '× Revoke Incoming Employee Access'}
                    </button>
                  )}
                </>
              )}
            </div>
          </section>

          {/* ERROR FEEDBACK */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/5 p-4"
            >
              <span className="mt-0.5 text-rose-300">!</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-rose-200">
                  Action could not be completed
                </p>
                <p className="mt-1 text-xs leading-5 text-rose-200/80">
                  {error}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                aria-label="Dismiss error"
                className="rounded-lg px-2 py-1 text-sm text-rose-300 transition hover:bg-rose-500/10"
              >
                ×
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
