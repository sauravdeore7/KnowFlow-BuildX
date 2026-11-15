
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../hooks/useApp'
import { fetchContributions } from '../services/contributionsService'

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN')
}

function formatDate(value) {
  if (!value) return 'Date unavailable'

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function SectionHeader({ title, description, action }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-5 text-text-muted">
          {description}
        </p>
      </div>
      {action}
    </div>
  )
}

function MetricCard({ title, value, description, icon, accent }) {
  const accents = {
    indigo: 'bg-indigo-500/10 text-indigo-300 ring-indigo-400/15',
    blue: 'bg-sky-500/10 text-sky-300 ring-sky-400/15',
    violet: 'bg-violet-500/10 text-violet-300 ring-violet-400/15',
    emerald: 'bg-emerald-500/10 text-emerald-300 ring-emerald-400/15',
  }

  return (
    <div className="group rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:border-violet-400/25 hover:shadow-lg hover:shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-muted">{title}</p>
          <p className="mt-4 text-3xl font-bold tracking-tight text-text-primary">
            {formatNumber(value)}
          </p>
        </div>

        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ring-1 ${
            accents[accent] || accents.indigo
          }`}
        >
          {icon}
        </span>
      </div>

      <p className="mt-3 text-xs leading-5 text-text-muted">
        {description}
      </p>
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface px-5 py-10 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-raised text-xl text-text-faint shadow-sm">
        ◌
      </div>
      <p className="mt-3 text-sm text-text-muted">{message}</p>
    </div>
  )
}

function TrendChart({ title, description, data, dataKey, color, icon }) {
  const values = data.map((item) => Number(item[dataKey] || 0))
  const maximum = Math.max(1, ...values)
  const total = values.reduce((sum, value) => sum + value, 0)

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <p className="mt-1 text-xs text-text-muted">{description}</p>
        </div>
        <span className="text-lg text-text-faint">{icon}</span>
      </div>

      <div className="mt-5 flex h-32 items-end gap-2 overflow-x-auto pb-1">
        {data.map((item, index) => {
          const value = Number(item[dataKey] || 0)
          const height = value > 0 ? Math.max(8, (value / maximum) * 100) : 3

          return (
            <div
              key={`${item.period}-${index}`}
              className="flex min-w-0 flex-1 flex-col items-center justify-end"
            >
              <span className="mb-2 text-xs font-semibold text-text-secondary">
                {formatNumber(value)}
              </span>
              <div className="flex h-20 w-full items-end justify-center rounded-t-md bg-surface">
                <div
                  className={`w-full max-w-8 rounded-t-md ${color} transition-all duration-300`}
                  style={{ height: `${height}%` }}
                  title={`${item.label}: ${value}`}
                />
              </div>
              <span className="mt-2 max-w-full truncate text-center text-[10px] text-text-muted">
                {item.label}
              </span>
            </div>
          )
        })}
      </div>

      <div className="mt-3 border-t border-border-subtle pt-3">
        <p className="text-xs text-text-muted">
          Total recorded: <span className="font-semibold text-text-primary">{formatNumber(total)}</span>
        </p>
      </div>
    </div>
  )
}

function ProjectCard({ project, maximumJournalEntries }) {
  const journalEntries = Number(project.journalEntries || 0)
  const decisions = Number(project.decisionsRecorded || 0)
  const knowledge = Number(project.knowledgeAdded || 0)
  const activeDays = Number(project.activeDays || 0)
  const documents = Number(project.documentsUploaded || 0)

  const hasActivity =
    journalEntries > 0 || decisions > 0 || knowledge > 0 || documents > 0

  const journalWidth =
    journalEntries > 0
      ? Math.max(5, (journalEntries / maximumJournalEntries) * 100)
      : 0

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-4 transition hover:border-violet-400/25 hover:shadow-md hover:shadow-black/10 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/15 bg-indigo-500/10 text-lg text-indigo-300">
          ◈
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="break-words text-sm font-semibold leading-5 text-text-primary">
            {project.projectName}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                hasActivity
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                  : 'border-border bg-surface-hover text-text-muted'
              }`}
            >
              {hasActivity ? 'Contribution recorded' : 'No activity recorded'}
            </span>
            <span className="text-xs text-text-muted">
              {activeDays} active {activeDays === 1 ? 'day' : 'days'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex justify-between text-xs">
          <span className="font-medium text-text-secondary">Journal entries</span>
          <span className="font-semibold text-text-primary">
            {formatNumber(journalEntries)}
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-violet-500 transition-all duration-300"
            style={{ width: `${journalWidth}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-text-muted">
          Compared with the highest journal count in this selection
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border-subtle pt-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-text-muted">Decisions</p>
          <p className="mt-1 text-lg font-semibold text-text-primary">
            {formatNumber(decisions)}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Knowledge</p>
          <p className="mt-1 text-lg font-semibold text-text-primary">
            {formatNumber(knowledge)}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Documents</p>
          <p className="mt-1 text-lg font-semibold text-text-primary">
            {formatNumber(documents)}
          </p>
        </div>
      </div>
    </div>
  )
}

function MilestoneItem({ milestone, index, total }) {
  return (
    <div className="relative flex gap-4">
      <div className="relative flex w-5 shrink-0 justify-center">
        {index !== total - 1 && (
          <span className="absolute bottom-0 top-5 w-px bg-border" />
        )}
        <span className="z-10 mt-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-emerald-400 bg-surface-raised text-[10px] text-emerald-300">
          ✓
        </span>
      </div>

      <div className="mb-5 min-w-0 flex-1 rounded-xl border border-border bg-surface p-4 last:mb-0">
        <p className="break-words text-sm font-medium leading-6 text-text-primary">
          {milestone.title}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          <span className="font-medium text-violet-300">
            {milestone.projectName}
          </span>
          <span>{formatDate(milestone.date)}</span>
        </div>
      </div>
    </div>
  )
}

function isMeaningfulMilestone(milestone) {
  const title = String(milestone.title || '').trim()
  const normalized = title.toLowerCase()

  if (title.length < 10) return false

  const excludedPatterns = [
    /\btest journal\b/,
    /\bcreated a test\b/,
    /\btest entry\b/,
    /\btesting journal\b/,
    /\bverified the .* api\b/,
    /\bverify the .* api\b/,
    /\bswagger\b/,
  ]

  if (excludedPatterns.some((pattern) => pattern.test(normalized))) {
    return false
  }

  const words = normalized.match(/[a-z]{2,}/g) || []
  return words.length >= 3
}

export default function ContributionAnalyticsPage() {
  const { user } = useApp()

  const [period, setPeriod] = useState('weekly')
  const [projectId, setProjectId] = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadAnalytics() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchContributions(user?.accessToken, {
          period,
          projectId,
        })

        if (!cancelled) {
          setAnalytics(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load contribution analytics.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadAnalytics()

    return () => {
      cancelled = true
    }
  }, [user?.accessToken, period, projectId, retryKey])

  const summary = analytics?.summary || {}
  const trends = analytics?.activityTrends || []
  const projects = analytics?.projects || []
  const involvement = analytics?.projectInvolvement || []
  const milestones = analytics?.milestones || []

  const activeProjects = useMemo(
    () =>
      involvement.filter(
        (project) =>
          Number(project.journalEntries || 0) > 0 ||
          Number(project.decisionsRecorded || 0) > 0 ||
          Number(project.knowledgeAdded || 0) > 0 ||
          Number(project.documentsUploaded || 0) > 0,
      ),
    [involvement],
  )

  const maximumJournalEntries = useMemo(
    () =>
      Math.max(
        1,
        ...activeProjects.map((project) =>
          Number(project.journalEntries || 0),
        ),
      ),
    [activeProjects],
  )

  const meaningfulMilestones = useMemo(
    () => milestones.filter(isMeaningfulMilestone),
    [milestones],
  )

  const trendTotals = useMemo(
    () =>
      trends.reduce(
        (totals, item) => ({
          journalEntries:
            totals.journalEntries + Number(item.journalEntries || 0),
          activeDays: totals.activeDays + Number(item.activeDays || 0),
          decisions:
            totals.decisions + Number(item.decisionsRecorded || 0),
          knowledge:
            totals.knowledge + Number(item.knowledgeAdded || 0),
        }),
        {
          journalEntries: 0,
          activeDays: 0,
          decisions: 0,
          knowledge: 0,
        },
      ),
    [trends],
  )

  return (
    <div className="space-y-7 pb-8">
      {/* Page Header and Filters */}
      <section className="overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-[#17133b] via-[#21164c] to-[#111a3d] text-white shadow-lg shadow-violet-950/20">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sm font-medium text-violet-200">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/10">
                  ◈
                </span>
                Employee Workspace
              </div>

              <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                Contribution Analytics
              </h1>

              <p className="mt-2 text-sm leading-6 text-indigo-100 sm:text-base">
                Understand your work activity, project involvement, recorded
                decisions and knowledge contributions.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-w-[390px]">
              <div>
                <label
                  htmlFor="contribution-project"
                  className="mb-1.5 block text-xs font-medium text-violet-200"
                >
                  Project
                </label>
                <select
                  id="contribution-project"
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0b0c1f] px-4 py-3 text-sm font-medium text-text-primary outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                >
                  <option value="">All Projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="contribution-period"
                  className="mb-1.5 block text-xs font-medium text-violet-200"
                >
                  Time period
                </label>
                <select
                  id="contribution-period"
                  value={period}
                  onChange={(event) => setPeriod(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0b0c1f] px-4 py-3 text-sm font-medium text-text-primary outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                >
                  <option value="weekly">Weekly View</option>
                  <option value="monthly">Monthly View</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 border-t border-white/10 bg-white/[0.03] sm:grid-cols-4">
          <div className="border-r border-white/10 px-5 py-4">
            <p className="text-xs text-violet-200">Projects involved</p>
            <p className="mt-1 text-xl font-semibold">
              {formatNumber(summary.projectsInvolved)}
            </p>
          </div>
          <div className="border-r border-white/10 px-5 py-4">
            <p className="text-xs text-violet-200">Active days</p>
            <p className="mt-1 text-xl font-semibold">
              {formatNumber(summary.activeDays)}
            </p>
          </div>
          <div className="border-r border-white/10 px-5 py-4">
            <p className="text-xs text-violet-200">Decisions</p>
            <p className="mt-1 text-xl font-semibold">
              {formatNumber(summary.decisionsRecorded)}
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs text-violet-200">Knowledge added</p>
            <p className="mt-1 text-xl font-semibold">
              {formatNumber(summary.knowledgeAdded)}
            </p>
          </div>
        </div>
      </section>

      {/* Loading State */}
      {loading && (
        <div className="rounded-2xl border border-border bg-surface-raised p-12 text-center shadow-sm shadow-black/10">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-violet-400/20 border-t-violet-400" />
          <p className="mt-4 text-sm font-medium text-text-primary">
            Loading your contribution analytics...
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Fetching your recorded project activity
          </p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-lg text-rose-300">
              !
            </span>
            <div className="flex-1">
              <p className="font-semibold text-rose-300">
                Unable to load analytics
              </p>
              <p className="mt-1 text-sm leading-5 text-rose-200/80">{error}</p>
              <button
                onClick={() => setRetryKey((current) => current + 1)}
                className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Content */}
      {!loading && !error && analytics && (
        <>
          {/* Overall Contribution Summary */}
          <section>
            <SectionHeader
              title="Overall Contribution Summary"
              description="A snapshot of your recorded contributions across the selected projects and period."
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Projects Involved"
                value={summary.projectsInvolved}
                description="Projects with recorded personal contributions"
                icon="◈"
                accent="indigo"
              />
              <MetricCard
                title="Active Days"
                value={summary.activeDays}
                description="Distinct dates with journal activity"
                icon="▦"
                accent="blue"
              />
              <MetricCard
                title="Decisions Recorded"
                value={summary.decisionsRecorded}
                description="Individual decisions documented in your journals"
                icon="◇"
                accent="violet"
              />
              <MetricCard
                title="Knowledge Added"
                value={summary.knowledgeAdded}
                description="Extracted knowledge linked to your own sources"
                icon="✧"
                accent="emerald"
              />
            </div>
          </section>

          {/* Work Activity Trends */}
          <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/10 sm:p-6">
            <SectionHeader
              title="Work Activity Trends"
              description={`Track your journal activity and recorded contributions across ${
                period === 'weekly' ? 'weeks' : 'months'
              }.`}
            />

            {trends.length === 0 ? (
              <EmptyState message="No recorded work activity is available for this period." />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TrendChart
                    title="Active Days"
                    description="Days with journal activity"
                    data={trends}
                    dataKey="activeDays"
                    color="bg-violet-500"
                    icon="▦"
                  />
                  <TrendChart
                    title="Journal Entries"
                    description="Daily work records created"
                    data={trends}
                    dataKey="journalEntries"
                    color="bg-sky-500"
                    icon="▤"
                  />
                  <TrendChart
                    title="Decisions Recorded"
                    description="Individual decisions documented"
                    data={trends}
                    dataKey="decisionsRecorded"
                    color="bg-indigo-500"
                    icon="◇"
                  />
                  <TrendChart
                    title="Knowledge Added"
                    description="Extracted knowledge linked to your sources"
                    data={trends}
                    dataKey="knowledgeAdded"
                    color="bg-emerald-500"
                    icon="✧"
                  />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    {
                      label: 'Active Days',
                      value: trendTotals.activeDays,
                    },
                    {
                      label: 'Journal Entries',
                      value: trendTotals.journalEntries,
                    },
                    {
                      label: 'Decisions',
                      value: trendTotals.decisions,
                    },
                    {
                      label: 'Knowledge Added',
                      value: trendTotals.knowledge,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-border bg-surface p-4"
                    >
                      <p className="text-xs text-text-muted">{item.label}</p>
                      <p className="mt-1 text-xl font-semibold text-text-primary">
                        {formatNumber(item.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Project Involvement */}
          <section>
            <SectionHeader
              title="Project Involvement"
              description="Explore how your recorded journal activity and knowledge contributions are distributed across projects."
              action={
                <span className="text-xs text-text-muted">
                  {activeProjects.length} active {activeProjects.length === 1 ? 'project' : 'projects'}
                </span>
              }
            />

            {activeProjects.length === 0 ? (
              <EmptyState message="No project contribution activity is available for the selected filters." />
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {activeProjects.map((project) => (
                  <ProjectCard
                    key={project.projectId}
                    project={project}
                    maximumJournalEntries={maximumJournalEntries}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Work Contribution Breakdown */}
          <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/10 sm:p-6">
            <SectionHeader
              title="Work Contribution Breakdown"
              description="Understand the categories of work represented in your contributions."
            />

            {analytics.workBreakdownAvailable &&
            analytics.workBreakdown?.length > 0 ? (
              <div className="space-y-5">
                {analytics.workBreakdown.map((item) => (
                  <div key={item.category}>
                    <div className="mb-2 flex justify-between gap-3 text-sm">
                      <span className="font-medium text-text-secondary">
                        {item.category}
                      </span>
                      <span className="font-semibold text-text-primary">
                        {item.percentage}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-violet-500 transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(0, item.percentage))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-4 rounded-xl border border-dashed border-border bg-surface p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-raised text-lg text-text-muted shadow-sm">
                  ⓘ
                </span>
                <div>
                  <p className="font-semibold text-text-primary">
                    Work categories are not available yet
                  </p>
                  <p className="mt-1 text-sm leading-6 text-text-muted">
                    {analytics.workBreakdownMessage ||
                      'Work categories are not currently recorded in journal entries. Category percentages are therefore not estimated.'}
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Recent Milestones and Achievements */}
          <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/10 sm:p-6">
            <SectionHeader
              title="Recent Milestones & Achievements"
              description="A timeline of meaningful completed work recorded in your journals."
              action={
                <span className="text-xs text-text-muted">
                  {meaningfulMilestones.length} recorded
                </span>
              }
            />

            {meaningfulMilestones.length === 0 ? (
              <EmptyState message="No meaningful completed milestones are available for the selected filters." />
            ) : (
              <div className="pt-1">
                {meaningfulMilestones.map((milestone, index) => (
                  <MilestoneItem
                    key={milestone.id}
                    milestone={milestone}
                    index={index}
                    total={meaningfulMilestones.length}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
