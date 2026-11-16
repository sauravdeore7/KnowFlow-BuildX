
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../hooks/useApp'
import { fetchEmployeeReports } from '../services/employeeReportsService'
import Icon from '../components/common/Icon'

const CHART_COLORS = [
  '#A78BFA',
  '#818CF8',
  '#FBBF24',
  '#22D3EE',
  '#FB7185',
  '#34D399',
]

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN')
}

function getDateRange(period, startDate, endDate) {
  if (period === 'custom') return { startDate, endDate }
  if (period === 'all') return { startDate: '', endDate: '' }

  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - (period === '30days' ? 29 : 89))

  const toLocalDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return {
    startDate: toLocalDate(start),
    endDate: toLocalDate(end),
  }
}

function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
            {eyebrow}
          </p>
        )}

        <h2 className="mt-1 text-lg font-bold text-text-primary">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm text-text-muted">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  )
}

function SummaryMetric({ label, value, description, icon, tone = 'blue' }) {
  const tones = {
    blue: 'bg-indigo-500/15 text-indigo-300',
    violet: 'bg-violet-500/15 text-violet-300',
    emerald: 'bg-emerald-500/15 text-emerald-300',
    amber: 'bg-amber-500/15 text-amber-300',
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-1 hover:border-violet-500/30 hover:shadow-xl hover:shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-muted">
            {label}
          </p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-text-primary">
            {formatNumber(value)}
          </p>

          <p className="mt-1 text-xs leading-5 text-text-muted">
            {description}
          </p>
        </div>

        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>
    </div>
  )
}

function EmptyChart({ message = 'No records available for this selection.' }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-5 text-center">
      <Icon name="activity" className="h-7 w-7 text-text-muted" />

      <p className="mt-3 text-sm font-semibold text-text-secondary">
        No data to display
      </p>

      <p className="mt-1 max-w-sm text-xs leading-5 text-text-muted">
        {message}
      </p>
    </div>
  )
}

/* -------------------------------------------------------
   INTERACTIVE ACTIVITY CHART
------------------------------------------------------- */

function ActivityChart({ data = [] }) {
  const [activePoint, setActivePoint] = useState(null)

  const hasData = data.some(
    (item) =>
      Number(item.journalEntries || 0) > 0 ||
      Number(item.completedTasks || 0) > 0,
  )

  if (!hasData) return <EmptyChart />

  const maxValue = Math.max(
    1,
    ...data.flatMap((item) => [
      Number(item.journalEntries || 0),
      Number(item.completedTasks || 0),
    ]),
  )

  const chartPoints = data.map((item, index) => {
    const x = data.length === 1
      ? 50
      : 8 + (index / (data.length - 1)) * 84

    return {
      ...item,
      x,
      journalY: 88 - (Number(item.journalEntries || 0) / maxValue) * 72,
      taskY: 88 - (Number(item.completedTasks || 0) / maxValue) * 72,
    }
  })

  const journalLine = chartPoints
    .map((item) => `${item.x},${item.journalY}`)
    .join(' ')

  const taskLine = chartPoints
    .map((item) => `${item.x},${item.taskY}`)
    .join(' ')

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-5 text-xs font-semibold text-text-secondary">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-400" />
            Journal entries
          </span>

          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            Completed tasks
          </span>
        </div>

        <span className="text-xs text-text-muted">
          Hover over a point to view details
        </span>
      </div>

      <div className="relative h-64 w-full pl-7">
        <div className="absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="flex h-0 items-center border-t border-dashed border-border"
            >
              <span className="absolute -left-1 -translate-x-full text-[10px] text-text-muted">
                {Math.round((maxValue * (3 - item)) / 3)}
              </span>
            </div>
          ))}
        </div>

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <polyline
            points={journalLine}
            fill="none"
            stroke="#A78BFA"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <polyline
            points={taskLine}
            fill="none"
            stroke="#34D399"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {chartPoints.map((item, index) => (
            <g key={`${item.label}-${index}`}>
              <circle
                cx={item.x}
                cy={item.journalY}
                r={activePoint?.index === index ? 3 : 2}
                fill="#A78BFA"
                stroke="#12132B"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() =>
                  setActivePoint({ ...item, index, type: 'journal' })
                }
                onMouseLeave={() => setActivePoint(null)}
                tabIndex={0}
                role="button"
                aria-label={`${item.label}: ${item.journalEntries} journal entries`}
              >
                <title>
                  {`${item.label}: ${item.journalEntries} journal entries`}
                </title>
              </circle>

              <circle
                cx={item.x}
                cy={item.taskY}
                r={activePoint?.index === index ? 3 : 2}
                fill="#34D399"
                stroke="#12132B"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() =>
                  setActivePoint({ ...item, index, type: 'tasks' })
                }
                onMouseLeave={() => setActivePoint(null)}
                tabIndex={0}
                role="button"
                aria-label={`${item.label}: ${item.completedTasks} completed tasks`}
              >
                <title>
                  {`${item.label}: ${item.completedTasks} completed tasks`}
                </title>
              </circle>
            </g>
          ))}
        </svg>

        {activePoint && (
          <div
            className="pointer-events-none absolute z-10 min-w-36 -translate-x-1/2 -translate-y-full rounded-xl border border-border bg-surface-overlay px-3 py-2 shadow-xl shadow-black/30"
            style={{
              left: `${activePoint.x}%`,
              top: `${activePoint.type === 'journal' ? activePoint.journalY : activePoint.taskY}%`,
            }}
          >
            <p className="text-xs font-bold text-text-primary">
              {activePoint.label}
            </p>

            <p className="mt-1 text-xs text-text-muted">
              Journal entries:{' '}
              <strong className="text-violet-300">
                {formatNumber(activePoint.journalEntries)}
              </strong>
            </p>

            <p className="mt-1 text-xs text-text-muted">
              Completed tasks:{' '}
              <strong className="text-emerald-300">
                {formatNumber(activePoint.completedTasks)}
              </strong>
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-between gap-2">
        {chartPoints.map((item, index) => (
          <span
            key={`${item.label}-${index}`}
            className="min-w-0 flex-1 truncate text-center text-[10px] font-medium text-text-muted"
            title={item.label}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------
   KNOWLEDGE DISTRIBUTION DONUT CHART
------------------------------------------------------- */

function KnowledgeDonutChart({ data = [] }) {
  const [activeIndex, setActiveIndex] = useState(null)

  const chartData = data
    .map((item, index) => ({
      label: item.label,
      count: Number(item.count || 0),
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))
    .filter((item) => item.count > 0)

  const total = chartData.reduce(
    (sum, item) => sum + item.count,
    0,
  )

  if (!total) return <EmptyChart />

  const radius = 76
  const circumference = 2 * Math.PI * radius
  const activeItem =
    activeIndex !== null ? chartData[activeIndex] : null

  let accumulated = 0

  return (
    <div>
      <div className="mb-7">
        <h3 className="text-base font-bold text-text-primary">
          Knowledge distribution
        </h3>

        <p className="mt-1 text-sm text-text-muted">
          Explore how your captured knowledge is distributed across categories.
        </p>
      </div>

      <div className="grid items-center gap-8 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]">
        {/* DONUT */}

        <div className="flex justify-center">
          <div className="relative h-72 w-72 max-w-full">
            <svg
              viewBox="0 0 200 200"
              className="h-full w-full overflow-visible"
              role="img"
              aria-label={`Knowledge distribution, ${total} total items`}
            >
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke="#252640"
                strokeWidth="28"
              />

              {chartData.map((item, index) => {
                const segmentLength =
                  (item.count / total) * circumference

                const offset = accumulated
                accumulated += segmentLength

                return (
                  <circle
                    key={item.label}
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={activeIndex === index ? 35 : 29}
                    strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
                    strokeDashoffset={-offset}
                    transform="rotate(-90 100 100)"
                    className="cursor-pointer transition-all duration-200"
                    opacity={
                      activeIndex === null || activeIndex === index
                        ? 1
                        : 0.3
                    }
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onFocus={() => setActiveIndex(index)}
                    onBlur={() => setActiveIndex(null)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${item.label}: ${item.count}`}
                  >
                    <title>
                      {`${item.label}: ${formatNumber(item.count)}`}
                    </title>
                  </circle>
                )
              })}
            </svg>

            {/* DONUT CENTER */}

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              {activeItem ? (
                <>
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: activeItem.color }}
                  />

                  <span className="mt-2 max-w-32 text-sm font-semibold text-text-secondary">
                    {activeItem.label}
                  </span>

                  <span className="mt-1 text-4xl font-bold text-text-primary">
                    {formatNumber(activeItem.count)}
                  </span>

                  <span className="mt-1 text-xs text-text-muted">
                    {((activeItem.count / total) * 100).toFixed(1)}% of total
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted">
                    Total captured
                  </span>

                  <span className="mt-1 text-5xl font-bold tracking-tight text-text-primary">
                    {formatNumber(total)}
                  </span>

                  <span className="mt-1 text-xs text-text-muted">
                    Knowledge items
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* CATEGORY LEGEND */}

        <div className="min-w-0 space-y-4">
          {chartData.map((item, index) => {
            const percentage = (item.count / total) * 100
            const active = activeIndex === index

            return (
              <button
                key={item.label}
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                className={`block w-full rounded-xl p-3 text-left transition duration-200 ${
                  active
                    ? 'bg-surface-hover ring-1 ring-violet-500/30'
                    : 'hover:bg-surface-hover'
                }`}
                aria-label={`${item.label}: ${item.count} items, ${percentage.toFixed(1)} percent`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />

                    <span className="truncate text-sm font-semibold text-text-secondary">
                      {item.label}
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-4">
                    <span className="text-xs tabular-nums text-text-muted">
                      {percentage.toFixed(1)}%
                    </span>

                    <span className="w-8 text-right text-sm font-bold tabular-nums text-text-primary">
                      {formatNumber(item.count)}
                    </span>
                  </span>
                </div>

                <div className="ml-6 mt-3 h-2 overflow-hidden rounded-full bg-surface-hover">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------
   PROJECT ENGAGEMENT BARS
------------------------------------------------------- */

function HorizontalBars({
  data = [],
  nameKey = 'label',
  valueKey = 'count',
}) {
  const maxValue = Math.max(
    1,
    ...data.map((item) => Number(item[valueKey] || 0)),
  )

  if (
    !data.length ||
    !data.some((item) => Number(item[valueKey] || 0) > 0)
  ) {
    return <EmptyChart />
  }

  return (
    <div className="space-y-5">
      {data.map((item, index) => {
        const value = Number(item[valueKey] || 0)
        const width = (value / maxValue) * 100

        return (
          <div key={`${item[nameKey]}-${index}`}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="truncate text-sm font-medium text-text-secondary">
                {item[nameKey]}
              </span>

              <span className="shrink-0 text-sm font-bold tabular-nums text-text-primary">
                {formatNumber(value)}
              </span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-surface-hover">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{ width: `${width}%` }}
                title={`${item[nameKey]}: ${value}`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------
   WORK REGISTER
------------------------------------------------------- */

function RegisterRow({ label, count, icon }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-hover text-text-secondary">
          <Icon name={icon} className="h-4 w-4" />
        </span>

        <span className="truncate text-sm font-medium text-text-secondary">
          {label}
        </span>
      </div>

      <span className="text-sm font-bold tabular-nums text-text-primary">
        {formatNumber(count)}
      </span>
    </div>
  )
}

function StatusCount({ label, count, tone }) {
  const tones = {
    green: 'bg-emerald-500/15 text-emerald-300',
    amber: 'bg-amber-500/15 text-amber-300',
    red: 'bg-rose-500/15 text-rose-300',
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
      <span className="text-sm font-medium text-text-secondary">
        {label}
      </span>

      <span className={`rounded-lg px-3 py-1.5 text-sm font-bold tabular-nums ${tones[tone]}`}>
        {formatNumber(count)}
      </span>
    </div>
  )
}

function OutstandingItem({ label, count, description, icon }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 transition hover:border-amber-500/30 hover:bg-surface-hover">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
        <Icon name={icon} className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">
          {label}
        </p>

        <p className="mt-1 text-xs leading-5 text-text-muted">
          {description}
        </p>
      </div>

      <span className="text-xl font-bold tabular-nums text-text-primary">
        {formatNumber(count)}
      </span>
    </div>
  )
}

/* -------------------------------------------------------
   MAIN EMPLOYEE REPORTS PAGE
------------------------------------------------------- */

export default function EmployeeReportsAnalyticsPage() {
  const { user } = useApp()

  const [projectId, setProjectId] = useState('all')
  const [period, setPeriod] = useState('30days')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryKey, setRetryKey] = useState(0)

  const dateRange = useMemo(
    () => getDateRange(period, startDate, endDate),
    [period, startDate, endDate],
  )

  useEffect(() => {
    let active = true

    async function loadReport() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchEmployeeReports(user?.accessToken, {
          projectId: projectId === 'all' ? '' : projectId,
          ...dateRange,
        })

        if (active) setReport(data)
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load your reports.')
          setReport(null)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadReport()

    return () => {
      active = false
    }
  }, [user?.accessToken, projectId, dateRange, retryKey])

  const projects = report?.projects || []
  const summary = report?.summary || {}
  const activityTrends = report?.activityTrends || []
  const projectEngagement = report?.projectEngagement || []
  const knowledgeContributions = report?.knowledgeContributions || []
  const workRecordRegister = report?.workRecordRegister || []
  const handoverSummary = report?.handoverSummary || {}
  const outstandingWork = report?.outstandingWork || {}

  const hasRecords =
    Number(summary.workRecords || 0) > 0 ||
    Number(summary.knowledgeCaptured || 0) > 0 ||
    Number(summary.handoverParticipation || 0) > 0

  const clearDateRange = () => {
    setPeriod('30days')
    setStartDate('')
    setEndDate('')
  }

  return (
    <div className="space-y-8">
      {/* PAGE HEADER */}

      <section className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
            Employee Workspace / Insights
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-text-primary">
            Reports & Analytics
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
            A consolidated view of your work activity, knowledge contributions
            and handover participation across your projects.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          disabled={loading || !hasRecords}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm font-semibold text-text-secondary shadow-sm transition hover:border-violet-500/40 hover:bg-surface-hover hover:text-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="fileText" className="h-4 w-4" />
          Export / Print Report
        </button>
      </section>

      {/* REPORTING CONTROLS */}

      <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-text-primary">
              Reporting Controls
            </h2>

            <p className="mt-1 text-xs text-text-muted">
              Choose the project and period for your reports.
            </p>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300">
            <Icon name="lock" className="h-3.5 w-3.5" />
            Personal analytics
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold text-text-secondary">
            Project

            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm font-medium text-text-primary outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
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
            Reporting Period

            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm font-medium text-text-primary outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </label>
        </div>

        {period === 'custom' && (
          <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-text-secondary">
              From

              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm font-normal text-text-primary outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </label>

            <label className="text-xs font-semibold text-text-secondary">
              To

              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm font-normal text-text-primary outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </label>
          </div>
        )}

        {period === 'custom' && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={clearDateRange}
              className="text-xs font-semibold text-violet-300 transition hover:text-violet-200"
            >
              Reset date range
            </button>
          </div>
        )}
      </section>

      {/* LOADING */}

      {loading && (
        <div className="rounded-2xl border border-border bg-surface-raised px-5 py-16 text-center shadow-lg shadow-black/10">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-violet-500/20 border-t-violet-400" />

          <p className="mt-4 text-sm font-semibold text-text-primary">
            Preparing your reports
          </p>

          <p className="mt-1 text-xs text-text-muted">
            Fetching your authorised work and project records.
          </p>
        </div>
      )}

      {/* ERROR */}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-6">
          <div className="flex items-start gap-3">
            <Icon name="alertTriangle" className="mt-0.5 h-5 w-5 text-rose-300" />

            <div className="flex-1">
              <h2 className="text-sm font-bold text-rose-200">
                Unable to load reports
              </h2>

              <p className="mt-1 text-sm leading-6 text-rose-300">
                {error}
              </p>

              <button
                type="button"
                onClick={() => setRetryKey((value) => value + 1)}
                className="mt-4 rounded-lg bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/30"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT CONTENT */}

      {!loading && !error && report && (
        <>
          {!hasRecords ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-raised px-6 py-16 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                <Icon name="activity" className="h-7 w-7" />
              </span>

              <h2 className="mt-4 text-lg font-bold text-text-primary">
                No report data available yet
              </h2>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-text-muted">
                Your work activity and knowledge contributions will appear here
                when records are available for the selected project and period.
              </p>
            </div>
          ) : (
            <>
              {/* CONTRIBUTION SUMMARY */}

              <section>
                <SectionHeading
                  eyebrow="Your overview"
                  title="Contribution Summary"
                  description="A snapshot of your recorded activity within the selected scope."
                />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryMetric
                    label="Projects Involved"
                    value={summary.projectsInvolved}
                    description="Projects with your records"
                    icon="folder"
                    tone="blue"
                  />

                  <SummaryMetric
                    label="Work Records"
                    value={summary.workRecords}
                    description="Journal entries in this period"
                    icon="notebookPen"
                    tone="violet"
                  />

                  <SummaryMetric
                    label="Knowledge Captured"
                    value={summary.knowledgeCaptured}
                    description="Knowledge items attributed to your work"
                    icon="brain"
                    tone="emerald"
                  />

                  <SummaryMetric
                    label="Handover Participation"
                    value={summary.handoverParticipation}
                    description="Handover records involving you"
                    icon="users"
                    tone="amber"
                  />
                </div>
              </section>

              {/* WORK ACTIVITY */}

              <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
                <SectionHeading
                  eyebrow="Activity over time"
                  title="Work Activity Analysis"
                  description="Compare your journal submissions and completed tasks over the reporting period."
                />

                <ActivityChart data={activityTrends} />
              </section>

              {/* PROJECT ENGAGEMENT */}

              <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
                <SectionHeading
                  eyebrow="Project distribution"
                  title="Project Engagement"
                  description="Your recorded work across assigned projects."
                />

                <HorizontalBars
                  data={projectEngagement}
                  nameKey="projectName"
                  valueKey="workRecords"
                />
              </section>

              {/* KNOWLEDGE CONTRIBUTION - SINGLE VISUALIZATION */}

              <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-7">
                <SectionHeading
                  eyebrow="Knowledge categories"
                  title="Knowledge Contribution Analysis"
                  description="Classification of knowledge captured from your work."
                />

                <KnowledgeDonutChart data={knowledgeContributions} />
              </section>

              {/* WORK RECORD REGISTER */}

              <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
                <SectionHeading
                  eyebrow="Detailed contribution register"
                  title="Work Record Register"
                  description="A category-wise breakdown of information recorded in your journals."
                />

                {workRecordRegister.length ? (
                  <div className="grid gap-x-10 sm:grid-cols-2">
                    {workRecordRegister.map((item, index) => (
                      <RegisterRow
                        key={`${item.category}-${index}`}
                        label={item.category}
                        count={item.count}
                        icon={item.icon || 'fileText'}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyChart />
                )}
              </section>

              {/* HANDOVER PARTICIPATION */}

              <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
                <SectionHeading
                  eyebrow="Knowledge continuity"
                  title="Handover Participation"
                  description="Status of handover records in which you are involved."
                />

                <div className="grid gap-3 md:grid-cols-3">
                  <StatusCount
                    label="Approved"
                    count={handoverSummary.approved}
                    tone="green"
                  />

                  <StatusCount
                    label="Pending"
                    count={handoverSummary.pending}
                    tone="amber"
                  />

                  <StatusCount
                    label="Changes Requested"
                    count={handoverSummary.changesRequested}
                    tone="red"
                  />
                </div>
              </section>

              {/* OUTSTANDING WORK */}

              <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
                <SectionHeading
                  eyebrow="Open work visibility"
                  title="Outstanding Work & Dependencies"
                  description="Items recorded as pending or unresolved in your work journals."
                />

                <div className="grid gap-3 md:grid-cols-3">
                  <OutstandingItem
                    label="Pending Tasks"
                    count={outstandingWork.pendingTasks}
                    description="Tasks recorded as not yet completed."
                    icon="clipboardList"
                  />

                  <OutstandingItem
                    label="Unresolved Blockers"
                    count={outstandingWork.blockers}
                    description="Blockers recorded in your journals."
                    icon="alertTriangle"
                  />

                  <OutstandingItem
                    label="Open Dependencies"
                    count={outstandingWork.dependencies}
                    description="Dependencies recorded for follow-up."
                    icon="network"
                  />
                </div>
              </section>

              {/* REPORT CENTRE */}

              <section className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-[#17132F] via-[#11122B] to-[#101B32] p-6 shadow-lg shadow-violet-950/10">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
                      Report Centre
                    </p>

                    <h2 className="mt-2 text-xl font-bold text-text-primary">
                      Your contribution report
                    </h2>

                    <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">
                      Print or save the currently filtered report as a PDF using your browser's print dialog.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#11122B]"
                  >
                    <Icon name="fileText" className="h-4 w-4" />
                    Generate PDF
                  </button>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}
