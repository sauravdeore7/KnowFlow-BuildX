
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../hooks/useApp'
import { fetchReports } from '../services/reportsService'
import Card from '../components/common/Card'
import Icon from '../components/common/Icon'

const PERIOD_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last 12 months' },
  { value: 'all', label: 'All time' },
]

function getDate(value) {
  if (!value) return null

  const date =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function isWithinPeriod(value, period) {
  if (period === 'all') return true

  const date = getDate(value)
  if (!date) return false

  const now = new Date()
  const start = new Date()
  start.setDate(now.getDate() - Number(period))
  start.setHours(0, 0, 0, 0)

  return date >= start && date <= now
}

function getJournalDate(entry) {
  return entry.date || entry.createdAt
}

function getJournalText(entry, field) {
  const value = entry[field]

  if (Array.isArray(value)) {
    return value.filter(Boolean).join('\n')
  }

  return typeof value === 'string' ? value : ''
}

function getProjectHealth(project) {
  const entries = project.journalEntries || []
  const handovers = project.handovers || []

  const blockers = entries.filter((entry) =>
    getJournalText(entry, 'blockers').trim(),
  ).length

  const pendingTasks = entries.filter((entry) =>
    getJournalText(entry, 'pendingTasks').trim(),
  ).length

  const unresolvedHandovers = handovers.some((handover) =>
    ['pending_employee_review', 'pending_manager_review', 'changes_requested']
      .includes(handover.status),
  )

  if (blockers > 0 || unresolvedHandovers) {
    return {
      label: 'At Risk',
      tone: 'red',
      reason: blockers
        ? `${blockers} journal entries report blockers`
        : 'An unresolved handover needs attention',
    }
  }

  if (pendingTasks > 0 || !entries.length) {
    return {
      label: 'Needs Attention',
      tone: 'amber',
      reason: pendingTasks
        ? `${pendingTasks} entries contain pending tasks`
        : 'No journal activity recorded',
    }
  }

  return {
    label: 'Healthy',
    tone: 'green',
    reason: 'No recorded blockers or unresolved handovers',
  }
}

function getHandoverLabel(status) {
  const labels = {
    pending_employee_review: 'Pending Employee Review',
    pending_manager_review: 'Pending Manager Review',
    changes_requested: 'Changes Requested',
    approved: 'Approved',
    shared: 'Shared',
  }

  return labels[status] || status || 'Not Started'
}

function SectionHeader({ number, title, description, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-xs font-bold text-violet-300">
          {number}
        </div>

        <div>
          <h2 className="text-lg font-bold tracking-tight text-text-primary">
            {title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-text-muted">
            {description}
          </p>
        </div>
      </div>

      {action}
    </div>
  )
}

function Panel({ children, className = '' }) {
  return (
    <Card className={`min-w-0 overflow-hidden ${className}`}>
      {children}
    </Card>
  )
}

function PanelHeading({ title, description, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-bold text-text-primary">{title}</h3>
        {description && (
          <p className="mt-1 text-xs leading-5 text-text-muted">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}

function MetricCard({ label, value, description, icon, tone = 'violet' }) {
  const tones = {
    blue: 'bg-sky-500/10 text-sky-300 ring-sky-500/15',
    green: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/15',
    amber: 'bg-amber-500/10 text-amber-300 ring-amber-500/15',
    red: 'bg-rose-500/10 text-rose-300 ring-rose-500/15',
    violet: 'bg-violet-500/10 text-violet-300 ring-violet-500/15',
    slate: 'bg-surface-hover text-text-secondary ring-border',
  }

  return (
    <Card className="group relative overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:border-violet-500/30">
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-500/[0.04] blur-2xl transition group-hover:bg-violet-500/[0.10]" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text-muted">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-text-primary">
            {value}
          </p>
        </div>

        <div className={`rounded-xl p-3 ring-1 ${tones[tone] || tones.violet}`}>
          <Icon name={icon} className="h-5 w-5" />
        </div>
      </div>

      <p className="relative mt-3 text-[11px] leading-5 text-text-muted">
        {description}
      </p>
    </Card>
  )
}

function StatusBadge({ label, tone = 'slate' }) {
  const styles = {
    green: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    red: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
    blue: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
    violet: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
    slate: 'border-border bg-surface-hover text-text-secondary',
  }

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${styles[tone] || styles.slate}`}
    >
      {label}
    </span>
  )
}

function EmptyMessage({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong bg-surface px-5 py-8 text-center text-xs leading-5 text-text-muted">
      {children}
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[11px] font-semibold text-text-muted">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-xs text-text-primary outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function MiniStat({ label, value, tone = 'violet' }) {
  const colors = {
    violet: 'text-violet-300',
    green: 'text-emerald-300',
    amber: 'text-amber-300',
    red: 'text-rose-300',
    blue: 'text-sky-300',
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-[10px] font-medium text-text-muted">{label}</p>
      <p className={`mt-1.5 text-xl font-bold ${colors[tone] || colors.violet}`}>
        {value}
      </p>
    </div>
  )
}

export default function ReportsAnalyticsPage() {
  const { user } = useApp()

  const [projects, setProjects] = useState([])
  const [reportsStatus, setReportsStatus] = useState('loading')
  const [reportsError, setReportsError] = useState('')

  const [projectFilter, setProjectFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('30')
  const [memberFilter, setMemberFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    let cancelled = false

    async function loadReports() {
      if (!user?.accessToken) {
        setProjects([])
        setReportsError('Your session is unavailable. Please sign in again.')
        setReportsStatus('error')
        return
      }

      setReportsStatus('loading')
      setReportsError('')

      try {
        const reportProjects = await fetchReports(user.accessToken)

        if (!cancelled) {
          setProjects(reportProjects)
          setReportsStatus('success')
        }
      } catch (error) {
        if (!cancelled) {
          setProjects([])
          setReportsError(
            error.message || 'Unable to load project analytics.',
          )
          setReportsStatus('error')
        }
      }
    }

    loadReports()

    return () => {
      cancelled = true
    }
  }, [user?.accessToken])

  const allMembers = useMemo(() => {
    const members = new Map()

    projects.forEach((project) => {
      ;(project.members || []).forEach((member) => {
        if (
          member.id &&
          !['project manager', 'manager'].includes(
            String(member.role || '').toLowerCase(),
          )
        ) {
          members.set(member.id, member)
        }
      })
    })

    return Array.from(members.values())
  }, [projects])

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (projectFilter !== 'all' && project.id !== projectFilter) {
        return false
      }

      if (statusFilter !== 'all' && project.status !== statusFilter) {
        return false
      }

      if (
        memberFilter !== 'all' &&
        !(project.members || []).some(
          (member) => member.id === memberFilter,
        )
      ) {
        return false
      }

      return true
    })
  }, [projects, projectFilter, statusFilter, memberFilter])

  const analytics = useMemo(() => {
    const journals = filteredProjects.flatMap((project) =>
      (project.journalEntries || [])
        .filter((entry) =>
          isWithinPeriod(getJournalDate(entry), periodFilter),
        )
        .map((entry) => ({
          ...entry,
          projectId: project.id,
          projectName: project.name,
        })),
    )

    const documents = filteredProjects.flatMap((project) =>
      (project.documents || [])
        .filter((document) =>
          isWithinPeriod(document.uploadedAt, periodFilter),
        )
        .map((document) => ({
          ...document,
          projectId: project.id,
          projectName: project.name,
        })),
    )

    const knowledge = filteredProjects.flatMap((project) =>
      (project.knowledge?.items || []).map((item) => ({
        ...item,
        projectId: project.id,
        projectName: project.name,
      })),
    )

    const handovers = filteredProjects.flatMap((project) =>
      (project.handovers || []).map((handover) => ({
        ...handover,
        projectId: project.id,
        projectName: project.name,
      })),
    )

    const members = new Map()

    filteredProjects.forEach((project) => {
      ;(project.members || []).forEach((member) => {
        if (
          member.id &&
          !['project manager', 'manager'].includes(
            String(member.role || '').toLowerCase(),
          )
        ) {
          members.set(member.id, member)
        }
      })
    })

    const blockers = journals.filter((entry) =>
      getJournalText(entry, 'blockers').trim(),
    )

    const dependencies = journals.filter((entry) =>
      getJournalText(entry, 'dependencies').trim(),
    )

    const pendingTasks = journals.filter((entry) =>
      getJournalText(entry, 'pendingTasks').trim(),
    )

    const decisions = journals.filter((entry) =>
      getJournalText(entry, 'decisions').trim(),
    )

    const pendingHandovers = handovers.filter((handover) =>
      [
        'pending_employee_review',
        'pending_manager_review',
        'changes_requested',
      ].includes(handover.status),
    )

    const approvedHandovers = handovers.filter((handover) =>
      ['approved', 'shared'].includes(handover.status),
    )

    const health = filteredProjects.map((project) => ({
      ...project,
      health: getProjectHealth(project),
    }))

    const healthCounts = {
      healthy: health.filter((project) => project.health.label === 'Healthy').length,
      attention: health.filter((project) => project.health.label === 'Needs Attention').length,
      risk: health.filter((project) => project.health.label === 'At Risk').length,
    }

    const memberContributions = Array.from(members.values())
      .map((member) => {
        const memberJournals = journals.filter(
          (entry) => entry.createdById === member.id,
        )

        const memberDocuments = documents.filter(
          (document) => document.uploadedById === member.id,
        )

        const memberDecisions = memberJournals.filter((entry) =>
          getJournalText(entry, 'decisions').trim(),
        )

        return {
          ...member,
          journals: memberJournals.length,
          documents: memberDocuments.length,
          decisions: memberDecisions.length,
          total: memberJournals.length + memberDocuments.length,
        }
      })
      .sort((a, b) => b.total - a.total)

    const activityByDay = Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (6 - index))

      const key = date.toLocaleDateString('en-CA')

      const journalCount = journals.filter((entry) => {
        const entryDate = getDate(getJournalDate(entry))
        return entryDate?.toLocaleDateString('en-CA') === key
      }).length

      const documentCount = documents.filter((document) => {
        const dateValue = getDate(document.uploadedAt)
        return dateValue?.toLocaleDateString('en-CA') === key
      }).length

      return {
        key,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        journals: journalCount,
        documents: documentCount,
        total: journalCount + documentCount,
      }
    })

    const maxActivity = Math.max(
      1,
      ...activityByDay.map((day) => day.total),
    )

    const riskItems = [
      ...blockers.map((entry) => ({
        id: `blocker-${entry.id}`,
        type: 'Reported blocker',
        detail: getJournalText(entry, 'blockers'),
        project: entry.projectName,
        source: `Journal · ${entry.createdBy || 'Team member'}`,
        tone: 'red',
      })),
      ...dependencies.map((entry) => ({
        id: `dependency-${entry.id}`,
        type: 'Reported dependency',
        detail: getJournalText(entry, 'dependencies'),
        project: entry.projectName,
        source: `Journal · ${entry.createdBy || 'Team member'}`,
        tone: 'amber',
      })),
      ...pendingTasks.map((entry) => ({
        id: `pending-${entry.id}`,
        type: 'Pending task',
        detail: getJournalText(entry, 'pendingTasks'),
        project: entry.projectName,
        source: `Journal · ${entry.createdBy || 'Team member'}`,
        tone: 'violet',
      })),
    ]

    const knowledgeTypes = knowledge.reduce((counts, item) => {
      const type = item.type || 'other'
      counts[type] = (counts[type] || 0) + 1
      return counts
    }, {})

    return {
      journals,
      documents,
      knowledge,
      handovers,
      members: Array.from(members.values()),
      memberContributions,
      blockers,
      dependencies,
      pendingTasks,
      decisions,
      pendingHandovers,
      approvedHandovers,
      health,
      healthCounts,
      activityByDay,
      maxActivity,
      riskItems,
      knowledgeTypes,
      totalActivity: journals.length + documents.length,
    }
  }, [filteredProjects, periodFilter])

  const resetFilters = () => {
    setProjectFilter('all')
    setPeriodFilter('30')
    setMemberFilter('all')
    setStatusFilter('all')
  }

  const exportCSV = () => {
    const rows = [
      ['KnowFlow Project Intelligence Centre'],
      ['Report generated', new Date().toLocaleString()],
      ['Reporting period', PERIOD_OPTIONS.find((item) => item.value === periodFilter)?.label],
      [],
      ['Project', 'Status', 'Health', 'Members', 'Journals', 'Documents', 'Knowledge Items', 'Handovers'],
      ...analytics.health.map((project) => [
        project.name,
        project.status,
        project.health.label,
        (project.members || []).filter(
          (member) =>
            !['project manager', 'manager'].includes(
              String(member.role || '').toLowerCase(),
            ),
        ).length,
        (project.journalEntries || []).filter((entry) =>
          isWithinPeriod(getJournalDate(entry), periodFilter),
        ).length,
        (project.documents || []).filter((document) =>
          isWithinPeriod(document.uploadedAt, periodFilter),
        ).length,
        (project.knowledge?.items || []).length,
        (project.handovers || []).length,
      ]),
      [],
      ['Knowledge risks'],
      ['Project', 'Risk type', 'Details', 'Source'],
      ...analytics.riskItems.map((risk) => [
        risk.project,
        risk.type,
        risk.detail,
        risk.source,
      ]),
    ]

    const csv = rows
      .map((row) =>
        row.map((cell) => {
          const value = String(cell ?? '').replace(/"/g, '""')
          return `"${value}"`
        }).join(','),
      )
      .join('\n')

    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'knowflow-project-intelligence-report.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const selectedPeriod =
    PERIOD_OPTIONS.find((item) => item.value === periodFilter)?.label

  const hasProjects = filteredProjects.length > 0

  const insights = []

  if (analytics.blockers.length) {
    insights.push({
      title: 'Reported blockers need review',
      description: `${analytics.blockers.length} journal entries contain reported blockers. Review their source journals and coordinate with the relevant team members.`,
      tone: 'red',
    })
  }

  if (analytics.pendingHandovers.length) {
    insights.push({
      title: 'Handover actions are pending',
      description: `${analytics.pendingHandovers.length} handover records are awaiting review or have requested changes.`,
      tone: 'amber',
    })
  }

  if (!analytics.journals.length && hasProjects) {
    insights.push({
      title: 'No journal activity in this period',
      description: 'There are no journal entries within the selected reporting period. Confirm whether the team has recorded its recent work.',
      tone: 'blue',
    })
  }

  if (!analytics.riskItems.length && hasProjects) {
    insights.push({
      title: 'No recorded knowledge risks',
      description: 'No blockers, dependencies or pending tasks were found in the selected journal records. This does not prove that projects are risk-free.',
      tone: 'green',
    })
  }

  const healthTotal =
    analytics.healthCounts.healthy +
    analytics.healthCounts.attention +
    analytics.healthCounts.risk

  const healthRows = [
    {
      label: 'Healthy',
      count: analytics.healthCounts.healthy,
      color: 'bg-emerald-400',
      tone: 'green',
    },
    {
      label: 'Needs Attention',
      count: analytics.healthCounts.attention,
      color: 'bg-amber-400',
      tone: 'amber',
    },
    {
      label: 'At Risk',
      count: analytics.healthCounts.risk,
      color: 'bg-rose-400',
      tone: 'red',
    },
  ]

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-7 pb-10">

      {/* PAGE HEADER */}
      <section className="relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-[#090a1c] via-[#15132f] to-[#29184b] p-6 shadow-xl shadow-violet-950/15 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-violet-200/75">
              <span>Manager Workspace</span>
              <span className="text-violet-400/50">/</span>
              <span>Reports & Analytics</span>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Project Intelligence
            </span>
          </div>

          <div className="mt-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-violet-200">
                  <Icon name="chart" className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-violet-200">
                  KnowFlow Analytics
                </p>
              </div>

              <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Project Intelligence Centre
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-violet-100/70">
                A unified view of project health, knowledge activity, team
                contributions and handover continuity.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-medium uppercase tracking-wider text-violet-200/60">
                  Reporting date
                </p>
                <p className="mt-1.5 text-sm font-semibold text-white">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] font-medium uppercase tracking-wider text-violet-200/60">
                  Workspace
                </p>
                <p className="mt-1.5 text-sm font-semibold text-white">
                  {user?.name || 'Manager'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-[11px] text-violet-100/60">
            <span className="inline-flex items-center gap-2">
              <Icon name="folder" className="h-3.5 w-3.5" />
              Portfolio monitoring
            </span>
            <span className="inline-flex items-center gap-2">
              <Icon name="activity" className="h-3.5 w-3.5" />
              Knowledge activity
            </span>
            <span className="inline-flex items-center gap-2">
              <Icon name="shield-check" className="h-3.5 w-3.5" />
              Handover continuity
            </span>
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
              <Icon name="sliders" className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">
                Analytics Filters
              </h2>
              <p className="mt-0.5 text-[11px] text-text-muted">
                Refine the data displayed across your reports
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[11px] font-semibold text-text-secondary transition hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-violet-300"
          >
            <Icon name="refreshCw" className="h-3.5 w-3.5" />
            Reset filters
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4 sm:px-6">
          <FilterSelect
            label="Project"
            value={projectFilter}
            onChange={setProjectFilter}
            options={[
              { value: 'all', label: 'All projects' },
              ...projects.map((project) => ({
                value: project.id,
                label: project.name,
              })),
            ]}
          />

          <FilterSelect
            label="Reporting period"
            value={periodFilter}
            onChange={setPeriodFilter}
            options={PERIOD_OPTIONS}
          />

          <FilterSelect
            label="Team member"
            value={memberFilter}
            onChange={setMemberFilter}
            options={[
              { value: 'all', label: 'All members' },
              ...allMembers.map((member) => ({
                value: member.id,
                label: member.name,
              })),
            ]}
          />

          <FilterSelect
            label="Project status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All statuses' },
              ...Array.from(new Set(projects.map((project) => project.status)))
                .filter(Boolean)
                .map((status) => ({
                  value: status,
                  label: status.replace(/_/g, ' '),
                })),
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border bg-surface px-5 py-3 text-[10px] text-text-muted sm:px-6">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="info" className="h-3.5 w-3.5 text-violet-300" />
            Project and member filters apply across project analytics.
          </span>
          <span>
            Reporting period applies to journal and document activity.
          </span>
        </div>
      </Card>

      {reportsStatus === 'loading' && (
        <Card className="flex items-center gap-3 p-6 text-sm text-text-muted">
          <Icon name="loader" className="h-4 w-4 animate-spin text-violet-300" />
          Loading project analytics...
        </Card>
      )}

      {reportsStatus === 'error' && (
        <Card className="border border-rose-500/25 p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-rose-500/10 p-3 text-rose-300">
              <Icon name="alert-triangle" className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-rose-300">
                Unable to load project analytics
              </p>
              <p className="mt-1 text-sm text-text-muted">
                {reportsError || 'Please refresh the page and try again.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {reportsStatus === 'success' && (
        <>
          {!hasProjects ? (
            <Card className="p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-hover text-text-muted">
                <Icon name="folder" className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-text-primary">
                No matching projects
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
                There are no projects matching your selected filters. Try
                resetting the filters to see your full portfolio.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-violet-500"
              >
                Reset all filters
              </button>
            </Card>
          ) : (
            <>
              {/* 01 MANAGEMENT OVERVIEW */}
              <section>
                <SectionHeader
                  number="01"
                  title="Management Overview"
                  description="Your portfolio at a glance — key indicators from the selected projects."
                />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="Total Projects"
                    value={filteredProjects.length}
                    description="Projects in the selected portfolio"
                    icon="folder"
                    tone="blue"
                  />

                  <MetricCard
                    label="Team Members"
                    value={analytics.members.length}
                    description="Distinct assigned employees"
                    icon="users"
                    tone="violet"
                  />

                  <MetricCard
                    label="Knowledge Risks"
                    value={analytics.riskItems.length}
                    description="Reported blockers, dependencies and pending tasks"
                    icon="alert-triangle"
                    tone="red"
                  />

                  <MetricCard
                    label="Shared Handovers"
                    value={analytics.approvedHandovers.length}
                    description="Handovers approved or shared"
                    icon="clipboard-check"
                    tone="green"
                  />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MiniStat
                    label="Pending handovers"
                    value={analytics.pendingHandovers.length}
                    tone="amber"
                  />
                  <MiniStat
                    label="Knowledge activity"
                    value={analytics.totalActivity}
                    tone="blue"
                  />
                  <MiniStat
                    label="Knowledge records"
                    value={analytics.knowledge.length}
                    tone="violet"
                  />
                  <MiniStat
                    label="Knowledge coverage"
                    value="Not measured"
                    tone="amber"
                  />
                </div>
              </section>

              {/* 02 PROJECT HEALTH */}
              <section>
                <SectionHeader
                  number="02"
                  title="Project Health Intelligence"
                  description="Compare portfolio health and identify projects that may need management attention."
                />

                <div className="grid gap-4 xl:grid-cols-5">
                  <Panel className="p-5 xl:col-span-2">
                    <PanelHeading
                      title="Portfolio Health Distribution"
                      description="Current classification across selected projects"
                    />

                    <div className="mt-6 flex items-center gap-6">
                      <div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: `conic-gradient(#34d399 0% ${healthTotal ? (analytics.healthCounts.healthy / healthTotal) * 100 : 0}%, #fbbf24 ${healthTotal ? (analytics.healthCounts.healthy / healthTotal) * 100 : 0}% ${healthTotal ? ((analytics.healthCounts.healthy + analytics.healthCounts.attention) / healthTotal) * 100 : 0}%, #fb7185 ${healthTotal ? ((analytics.healthCounts.healthy + analytics.healthCounts.attention) / healthTotal) * 100 : 0}% 100%)`,
                        }}
                      >
                        <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-surface">
                          <span className="text-2xl font-bold text-text-primary">
                            {healthTotal}
                          </span>
                          <span className="text-[9px] text-text-muted">
                            Projects
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 space-y-3">
                        {healthRows.map((item) => (
                          <div key={item.label} className="flex items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.color}`} />
                              <span className="truncate text-xs text-text-secondary">
                                {item.label}
                              </span>
                            </div>
                            <span className="text-sm font-bold text-text-primary">
                              {item.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 space-y-4 border-t border-border pt-5">
                      {healthRows.map((item) => (
                        <div key={item.label}>
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="font-medium text-text-secondary">
                              {item.label}
                            </span>
                            <span className="font-semibold text-text-primary">
                              {healthTotal
                                ? Math.round((item.count / healthTotal) * 100)
                                : 0}%
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                              style={{
                                width: `${healthTotal ? (item.count / healthTotal) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-xl border border-border bg-surface p-3">
                      <p className="text-[10px] leading-5 text-text-muted">
                        Health is a rule-based classification using recorded
                        blockers, pending tasks, journal activity and
                        unresolved handovers. It is not an automated
                        project-delivery assessment.
                      </p>
                    </div>
                  </Panel>

                  <Panel className="xl:col-span-3">
                    <div className="border-b border-border p-5">
                      <PanelHeading
                        title="Project Performance Matrix"
                        description="A project-by-project view of recorded operational signals"
                        action={
                          <StatusBadge
                            label={`${analytics.health.length} projects`}
                            tone="violet"
                          />
                        }
                      />
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[620px] text-left text-xs">
                        <thead className="bg-surface text-[10px] uppercase tracking-wider text-text-muted">
                          <tr>
                            <th className="px-5 py-3 font-semibold">Project</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 font-semibold">Health</th>
                            <th className="px-4 py-3 text-center font-semibold">Team</th>
                            <th className="px-5 py-3 text-center font-semibold">Journals</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-border">
                          {analytics.health.map((project) => (
                            <tr
                              key={project.id}
                              className="transition hover:bg-surface-hover/50"
                            >
                              <td className="max-w-[240px] px-5 py-4">
                                <p className="truncate font-semibold text-text-primary">
                                  {project.name}
                                </p>
                                <p className="mt-1 truncate text-[10px] text-text-faint">
                                  {project.health.reason}
                                </p>
                              </td>

                              <td className="px-4 py-4">
                                <StatusBadge
                                  label={(project.status || 'Unknown').replace(/_/g, ' ')}
                                  tone="blue"
                                />
                              </td>

                              <td className="px-4 py-4">
                                <StatusBadge
                                  label={project.health.label}
                                  tone={project.health.tone}
                                />
                              </td>

                              <td className="px-4 py-4 text-center font-semibold text-text-secondary">
                                {(project.members || []).filter(
                                  (member) =>
                                    !['project manager', 'manager'].includes(
                                      String(member.role || '').toLowerCase(),
                                    ),
                                ).length}
                              </td>

                              <td className="px-5 py-4 text-center font-semibold text-text-primary">
                                {(project.journalEntries || []).filter(
                                  (entry) => isWithinPeriod(
                                    getJournalDate(entry),
                                    periodFilter,
                                  ),
                                ).length}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Panel>
                </div>
              </section>

              {/* 03 KNOWLEDGE INTELLIGENCE */}
              <section>
                <SectionHeader
                  number="03"
                  title="Knowledge Intelligence"
                  description="Explore the knowledge captured across journals, documents and project records."
                />

                <div className="grid gap-4 xl:grid-cols-3">
                  <Panel className="p-5">
                    <PanelHeading
                      title="Knowledge Records"
                      description="Records from the current extraction workflow"
                      action={
                        <div className="rounded-xl bg-violet-500/10 px-3 py-2 text-right">
                          <p className="text-xl font-bold text-violet-300">
                            {analytics.knowledge.length}
                          </p>
                          <p className="text-[9px] text-text-muted">Total records</p>
                        </div>
                      }
                    />

                    <div className="mt-5 space-y-3">
                      {Object.entries(analytics.knowledgeTypes).length ? (
                        Object.entries(analytics.knowledgeTypes)
                          .sort((a, b) => b[1] - a[1])
                          .map(([type, count]) => {
                            const percentage = analytics.knowledge.length
                              ? (count / analytics.knowledge.length) * 100
                              : 0

                            return (
                              <div key={type}>
                                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                                  <span className="capitalize text-text-secondary">
                                    {type.replace(/_/g, ' ')}
                                  </span>
                                  <span className="font-semibold text-text-primary">
                                    {count}
                                  </span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
                                  <div
                                    className="h-full rounded-full bg-violet-500"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            )
                          })
                      ) : (
                        <EmptyMessage>
                          No extracted knowledge records available.
                        </EmptyMessage>
                      )}
                    </div>
                  </Panel>

                  <Panel className="p-5">
                    <PanelHeading
                      title="Documentation Quality"
                      description="Available documentation evidence"
                    />

                    <div className="mt-5 space-y-3">
                      <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-sky-500/10 p-2 text-sky-300">
                            <Icon name="file-text" className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-text-primary">
                              Documents uploaded
                            </p>
                            <p className="mt-0.5 text-[10px] text-text-muted">
                              In selected reporting period
                            </p>
                          </div>
                        </div>
                        <span className="text-xl font-bold text-text-primary">
                          {analytics.documents.length}
                        </span>
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-violet-500/10 p-2 text-violet-300">
                            <Icon name="book-open" className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-text-primary">
                              Journal records
                            </p>
                            <p className="mt-0.5 text-[10px] text-text-muted">
                              Work records submitted
                            </p>
                          </div>
                        </div>
                        <span className="text-xl font-bold text-text-primary">
                          {analytics.journals.length}
                        </span>
                      </div>

                      <div className="rounded-xl border border-border bg-surface p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Icon name="shield-check" className="h-4 w-4 text-text-muted" />
                            <p className="text-xs font-semibold text-text-primary">
                              Review verification
                            </p>
                          </div>
                          <StatusBadge label="Not available" tone="slate" />
                        </div>
                        <p className="mt-2 text-[10px] leading-5 text-text-muted">
                          Review status is not currently exposed by the
                          available knowledge response.
                        </p>
                      </div>
                    </div>
                  </Panel>

                  <Panel className="p-5">
                    <PanelHeading
                      title="Knowledge Activity Timeline"
                      description="Journal and document activity over the last seven days"
                      action={
                        <StatusBadge label="7 days" tone="violet" />
                      }
                    />

                    <div className="mt-6 flex h-36 items-end gap-2">
                      {analytics.activityByDay.map((day) => (
                        <div
                          key={day.key}
                          className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                        >
                          <span className="text-[10px] font-semibold text-text-muted">
                            {day.total || ''}
                          </span>

                          <div className="flex h-24 w-full items-end justify-center rounded-t-md bg-surface">
                            <div
                              className="w-full max-w-8 rounded-t-md bg-gradient-to-t from-violet-700 to-violet-400 transition-all duration-500"
                              style={{
                                height: `${day.total ? Math.max(8, (day.total / analytics.maxActivity) * 100) : 3}%`,
                              }}
                              title={`${day.total} recorded activities`}
                            />
                          </div>

                          <span className="text-[10px] text-text-faint">
                            {day.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
                      <div>
                        <p className="text-[10px] text-text-muted">Journals</p>
                        <p className="mt-1 text-lg font-bold text-text-primary">
                          {analytics.journals.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-muted">Documents</p>
                        <p className="mt-1 text-lg font-bold text-text-primary">
                          {analytics.documents.length}
                        </p>
                      </div>
                    </div>
                  </Panel>
                </div>
              </section>

              {/* 04 TEAM CONTRIBUTIONS */}
              <section>
                <SectionHeader
                  number="04"
                  title="Team Contribution Intelligence"
                  description="Understand how project knowledge is created and maintained across the team."
                />

                <Panel>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
                    <PanelHeading
                      title="Contribution Overview"
                      description="Journal and document contributions attributed using team member IDs"
                    />
                    <StatusBadge
                      label={`${analytics.memberContributions.length} members`}
                      tone="violet"
                    />
                  </div>

                  {analytics.memberContributions.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[650px] text-left text-xs">
                        <thead className="bg-surface text-[10px] uppercase tracking-wider text-text-muted">
                          <tr>
                            <th className="px-5 py-3 font-semibold">Team Member</th>
                            <th className="px-5 py-3 font-semibold">Journals</th>
                            <th className="px-5 py-3 font-semibold">Documents</th>
                            <th className="px-5 py-3 font-semibold">Decision Records</th>
                            <th className="px-5 py-3 font-semibold">Total Contributions</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-border">
                          {analytics.memberContributions.map((member) => (
                            <tr
                              key={member.id}
                              className="transition hover:bg-surface-hover/50"
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-xs font-bold text-violet-300">
                                    {(member.name || 'M')
                                      .split(' ')
                                      .map((part) => part[0])
                                      .join('')
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-text-primary">
                                      {member.name}
                                    </p>
                                    <p className="truncate text-[10px] text-text-faint">
                                      {member.email}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 font-medium text-text-secondary">
                                {member.journals}
                              </td>
                              <td className="px-5 py-4 font-medium text-text-secondary">
                                {member.documents}
                              </td>
                              <td className="px-5 py-4 font-medium text-text-secondary">
                                {member.decisions}
                              </td>
                              <td className="px-5 py-4">
                                <span className="inline-flex min-w-9 items-center justify-center rounded-lg bg-violet-500/10 px-2.5 py-1.5 font-bold text-violet-300">
                                  {member.total}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-5">
                      <EmptyMessage>
                        No team contribution records are available for these filters.
                      </EmptyMessage>
                    </div>
                  )}

                  <div className="grid gap-3 border-t border-border bg-surface p-5 sm:grid-cols-3">
                    <MiniStat
                      label="Journal contributions"
                      value={analytics.journals.length}
                      tone="violet"
                    />
                    <MiniStat
                      label="Documents contributed"
                      value={analytics.documents.length}
                      tone="blue"
                    />
                    <MiniStat
                      label="Decisions documented"
                      value={analytics.decisions.length}
                      tone="green"
                    />
                  </div>
                </Panel>
              </section>

              {/* 05 HANDOVER ANALYTICS */}
              <section>
                <SectionHeader
                  number="05"
                  title="Handover & Continuity Analytics"
                  description="Track knowledge transitions and identify handovers that still need action."
                />

                <div className="grid gap-4 xl:grid-cols-3">
                  <Panel className="p-5">
                    <PanelHeading
                      title="Handover Status"
                      description="Current handover distribution"
                    />

                    <div className="mt-5 grid grid-cols-1 gap-3">
                      <div className="rounded-xl border border-border bg-surface p-4">
                        <p className="text-[10px] text-text-muted">
                          Total handovers
                        </p>
                        <p className="mt-1 text-2xl font-bold text-text-primary">
                          {analytics.handovers.length}
                        </p>
                      </div>

                      <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
                        <p className="text-[10px] text-text-muted">
                          Awaiting action
                        </p>
                        <p className="mt-1 text-2xl font-bold text-amber-300">
                          {analytics.pendingHandovers.length}
                        </p>
                      </div>

                      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
                        <p className="text-[10px] text-text-muted">
                          Approved or shared
                        </p>
                        <p className="mt-1 text-2xl font-bold text-emerald-300">
                          {analytics.approvedHandovers.length}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-border bg-surface p-3">
                      <p className="text-[10px] leading-5 text-text-muted">
                        Continuity rate is not calculated because a verified
                        transfer denominator is not available.
                      </p>
                    </div>
                  </Panel>

                  <Panel className="xl:col-span-2">
                    <div className="border-b border-border p-5">
                      <PanelHeading
                        title="Handover Register"
                        description="Current handover records across selected projects"
                        action={
                          <StatusBadge
                            label={`${analytics.handovers.length} records`}
                            tone="violet"
                          />
                        }
                      />
                    </div>

                    {analytics.handovers.length ? (
                      <div className="divide-y divide-border">
                        {analytics.handovers.slice(0, 8).map((handover) => (
                          <div
                            key={handover.id}
                            className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-surface-hover/40"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                                <Icon name="arrow-left-right" className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold text-text-primary">
                                  {handover.projectName}
                                </p>
                                <p className="mt-1 truncate text-[10px] text-text-muted">
                                  {handover.outgoingEmployeeName || 'Outgoing member'}
                                  {' → '}
                                  {handover.incomingEmployeeName || 'Incoming member'}
                                </p>
                              </div>
                            </div>

                            <StatusBadge
                              label={getHandoverLabel(handover.status)}
                              tone={
                                ['approved', 'shared'].includes(handover.status)
                                  ? 'green'
                                  : handover.status === 'changes_requested'
                                    ? 'red'
                                    : 'amber'
                              }
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-5">
                        <EmptyMessage>
                          No handover records found for the selected projects.
                        </EmptyMessage>
                      </div>
                    )}
                  </Panel>
                </div>
              </section>

              {/* 06 RISK REGISTER */}
              <section>
                <SectionHeader
                  number="06"
                  title="Risk & Knowledge Gap Intelligence"
                  description="Review reported blockers, dependencies and pending work recorded by team members."
                />

                <Panel>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
                    <PanelHeading
                      title="Knowledge Risk Register"
                      description="Evidence-linked items from recorded journals"
                    />
                    <StatusBadge
                      label={`${analytics.riskItems.length} recorded items`}
                      tone={analytics.riskItems.length ? 'amber' : 'green'}
                    />
                  </div>

                  {analytics.riskItems.length ? (
                    <div className="divide-y divide-border">
                      {analytics.riskItems.slice(0, 12).map((risk) => (
                        <div
                          key={risk.id}
                          className="flex gap-3 p-5 transition hover:bg-surface-hover/30"
                        >
                          <div
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              risk.tone === 'red'
                                ? 'bg-rose-500/10 text-rose-300'
                                : risk.tone === 'amber'
                                  ? 'bg-amber-500/10 text-amber-300'
                                  : 'bg-violet-500/10 text-violet-300'
                            }`}
                          >
                            <Icon
                              name={
                                risk.tone === 'red'
                                  ? 'alert-triangle'
                                  : risk.tone === 'amber'
                                    ? 'git-branch'
                                    : 'clock'
                              }
                              className="h-4 w-4"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge
                                label={risk.type}
                                tone={risk.tone}
                              />
                              <span className="text-[10px] text-text-faint">
                                {risk.project}
                              </span>
                            </div>

                            <p className="mt-2 whitespace-pre-line break-words text-xs leading-6 text-text-secondary">
                              {risk.detail}
                            </p>

                            <p className="mt-2 flex items-center gap-1.5 text-[10px] text-text-faint">
                              <Icon name="file-text" className="h-3 w-3" />
                              {risk.source}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-5">
                      <EmptyMessage>
                        No blockers, dependencies or pending tasks were
                        recorded in the selected reporting period.
                      </EmptyMessage>
                    </div>
                  )}

                  {analytics.riskItems.length > 12 && (
                    <div className="border-t border-border bg-surface px-5 py-3 text-[10px] text-text-muted">
                      Showing 12 of {analytics.riskItems.length} recorded items.
                      The CSV export includes the full risk register.
                    </div>
                  )}

                  <div className="border-t border-border bg-surface px-5 py-3 text-[10px] leading-5 text-text-muted">
                    These are reported knowledge risks, not independently
                    verified or automatically resolved risk cases.
                  </div>
                </Panel>
              </section>

              {/* 07 REPORT GENERATION */}
              <section>
                <SectionHeader
                  number="07"
                  title="Report Generation & Export"
                  description="Generate management-ready reports from your current filtered dataset."
                />

                <Panel className="p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-violet-500/10 p-3 text-violet-300">
                        <Icon name="file-bar-chart" className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-text-primary">
                          Project Intelligence Report
                        </h3>
                        <p className="mt-1 max-w-xl text-xs leading-5 text-text-muted">
                          Export selected projects, reporting period, portfolio
                          metrics and source-linked risk records.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={exportCSV}
                        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-xs font-semibold text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                      >
                        <Icon name="download" className="h-4 w-4" />
                        Export CSV
                      </button>

                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-xs font-semibold text-text-secondary transition hover:bg-surface-hover hover:text-text-primary"
                      >
                        <Icon name="printer" className="h-4 w-4" />
                        Print / Save PDF
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 border-t border-border pt-5 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      'Project Health Report',
                      'Knowledge Records Report',
                      'Team Contribution Report',
                      'Handover Report',
                      'Risk & Gap Report',
                      'Activity Report',
                    ].map((report) => (
                      <div
                        key={report}
                        className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
                      >
                        <div className="rounded-lg bg-violet-500/10 p-2 text-violet-300">
                          <Icon name="file-text" className="h-4 w-4" />
                        </div>
                        <span className="text-xs font-medium text-text-secondary">
                          {report}
                        </span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </section>

              {/* 08 MANAGEMENT INSIGHTS */}
              <section>
                <SectionHeader
                  number="08"
                  title="Intelligent Management Insights"
                  description="Management observations based on the available project evidence."
                />

                <Panel>
                  <div className="relative overflow-hidden bg-gradient-to-r from-[#11112e] via-[#211747] to-[#2a1850] p-5 sm:p-6">
                    <div className="pointer-events-none absolute -right-10 -top-20 h-48 w-48 rounded-full bg-violet-400/10 blur-3xl" />

                    <div className="relative flex items-start gap-3">
                      <div className="rounded-xl border border-white/10 bg-white/10 p-3 text-violet-200">
                        <Icon name="brain" className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-200/70">
                          KnowFlow Intelligence
                        </p>
                        <h3 className="mt-1 text-base font-bold text-white">
                          Management Observations
                        </h3>
                        <p className="mt-2 max-w-2xl text-xs leading-5 text-violet-100/65">
                          Transparent, rule-based observations generated from
                          the available project records. These are not
                          AI-generated recommendations.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 p-5">
                    {insights.length ? (
                      insights.map((insight, index) => (
                        <div
                          key={insight.title}
                          className="flex gap-3 rounded-xl border border-border bg-surface p-4"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-[10px] font-bold text-violet-300">
                            {String(index + 1).padStart(2, '0')}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-xs font-bold text-text-primary">
                                {insight.title}
                              </h4>
                              <StatusBadge
                                label={
                                  insight.tone === 'red'
                                    ? 'Review'
                                    : insight.tone === 'amber'
                                      ? 'Attention'
                                      : insight.tone === 'green'
                                        ? 'Informational'
                                        : 'Observation'
                                }
                                tone={insight.tone}
                              />
                            </div>

                            <p className="mt-2 text-xs leading-5 text-text-secondary">
                              {insight.description}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyMessage>
                        There are not enough recorded events to generate
                        management observations for this selection.
                      </EmptyMessage>
                    )}
                  </div>

                  <div className="border-t border-border bg-surface px-5 py-4 text-[10px] leading-5 text-text-muted">
                    Future AI insights should include supporting source
                    records, confidence indicators, uncertainty labels and
                    human review before management decisions are made.
                  </div>
                </Panel>
              </section>

              {/* FOOTER */}
              <div className="flex flex-col justify-between gap-2 border-t border-border pt-5 text-[10px] text-text-faint sm:flex-row">
                <span>KnowFlow · Project Intelligence Centre</span>
                <span>
                  {filteredProjects.length} projects · {selectedPeriod}
                </span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
