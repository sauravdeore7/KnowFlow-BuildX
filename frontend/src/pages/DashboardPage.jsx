
import { useMemo, useState } from 'react'
import { PROJECT_STATUS } from '../data/statusConfig'
import { useApp } from '../hooks/useApp'
import { timeAgo } from '../utils/helpers'
import { createJournal } from '../services/journalService'
import Alert from '../components/common/Alert'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Icon from '../components/common/Icon'
import SampleDataNotice from '../components/common/SampleDataNotice'
import StatCard from '../components/common/StatCard'

function getLocalDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getJournalDate(entry) {
  const value = entry.date || entry.createdAt

  if (!value) return null

  const date =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T00:00:00`)
      : new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

const emptyJournal = {
  date: getLocalDate(),
  workSummary: '',
  completedTasks: '',
  decisions: '',
  blockers: '',
  dependencies: '',
  pendingTasks: '',
  nextSteps: '',
  evidence: '',
}

function getEmployeeEntries(projects, user) {
  return projects.flatMap((project) =>
    (project.journalEntries || [])
      .filter((entry) => entry.createdBy === user.name)
      .map((entry) => ({
        ...entry,
        projectId: project.id,
        projectName: project.name,
      })),
  )
}

function getOpenItems(entries) {
  return entries.flatMap((entry) => {
    const items = []

    if (entry.pendingTasks?.trim()) {
      items.push({
        id: `${entry.id}-pending`,
        type: 'Pending Task',
        text: entry.pendingTasks,
        date: entry.date || entry.createdAt,
        projectName: entry.projectName,
        tone: 'amber',
      })
    }

    if (entry.blockers?.trim()) {
      items.push({
        id: `${entry.id}-blocker`,
        type: 'Reported Blocker',
        text: entry.blockers,
        date: entry.date || entry.createdAt,
        projectName: entry.projectName,
        tone: 'red',
      })
    }

    return items
  })
}

function AnalyticsMetric({ label, value, description, tone = 'slate' }) {
  const tones = {
    blue: 'border-violet-400/20 bg-violet-500/10 text-violet-300',
    green: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
    amber: 'border-amber-400/20 bg-amber-500/10 text-amber-300',
    red: 'border-red-400/20 bg-red-500/10 text-red-300',
    violet: 'border-violet-400/20 bg-violet-500/10 text-violet-300',
    slate: 'border-border bg-surface text-text-secondary',
  }

  return (
    <div className={`rounded-xl border p-4 ${tones[tone] || tones.slate}`}>
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs opacity-80">{description}</p>
    </div>
  )
}

function SectionHeading({ title, description }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-bold text-text-primary">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-text-muted">{description}</p>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* EMPLOYEE DAILY WORKSPACE                                                   */
/* -------------------------------------------------------------------------- */

function EmployeeJournal({
  projects,
  user,
  loadProjects,
  showToast,
  navigate,
}) {
  const assignedProjects = useMemo(
    () =>
      projects.filter((project) =>
        project.members?.some(
          (member) =>
            member.email?.toLowerCase() === user.email?.toLowerCase(),
        ),
      ),
    [projects, user.email],
  )

  const [selectedProjectId, setSelectedProjectId] = useState(
    assignedProjects[0]?.id || '',
  )
  const [form, setForm] = useState({ ...emptyJournal })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedProject =
    assignedProjects.find((project) => project.id === selectedProjectId) ||
    assignedProjects[0]

  const myEntries = useMemo(
    () => getEmployeeEntries(assignedProjects, user),
    [assignedProjects, user],
  )

  const openItems = useMemo(() => getOpenItems(myEntries), [myEntries])

  const thisWeekEntries = useMemo(() => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setHours(0, 0, 0, 0)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

    return myEntries.filter((entry) => {
      const date = getJournalDate(entry)

      if (!date) return false

      return date >= sevenDaysAgo && date <= today
    })
  }, [myEntries])

  const weeklyActivity = useMemo(() => {
    const days = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - i)

      const key = getDateKey(date)

      const count = myEntries.filter((entry) => {
        const entryDate = getJournalDate(entry)

        return entryDate && getDateKey(entryDate) === key
      }).length

      days.push({
        key,
        label: date.toLocaleDateString('en-US', {
          weekday: 'short',
        }),
        count,
      })
    }

    return days
  }, [myEntries])

  const maxWeeklyActivity = Math.max(
    1,
    ...weeklyActivity.map((day) => day.count),
  )

  const hasWeeklyActivity = weeklyActivity.some((day) => day.count > 0)

  const projectCards = useMemo(
    () =>
      assignedProjects.map((project) => {
        const entries = myEntries.filter(
          (entry) => entry.projectId === project.id,
        )

        const latestEntry = [...entries].sort(
          (a, b) =>
            new Date(b.createdAt || b.date).getTime() -
            new Date(a.createdAt || a.date).getTime(),
        )[0]

        return {
          ...project,
          myEntryCount: entries.length,
          latestEntry,
        }
      }),
    [assignedProjects, myEntries],
  )

  function updateField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }))
  }

  async function saveJournal(event) {
    event.preventDefault()

    if (!selectedProject) {
      setError('Please select an assigned project.')
      return
    }

    if (!form.workSummary.trim() && !form.completedTasks.trim()) {
      setError('Please enter your work summary or completed tasks.')
      return
    }

    if (!user.accessToken) {
      setError('Your login session is missing. Please log in again.')
      return
    }

    setSaving(true)
    setError('')

    try {
      await createJournal(user.accessToken, {
        projectId: selectedProject.id,
        date: form.date,
        workSummary: form.workSummary.trim(),
        completedTasks: form.completedTasks.trim(),
        decisions: form.decisions.trim(),
        blockers: form.blockers.trim(),
        dependencies: form.dependencies.trim(),
        pendingTasks: form.pendingTasks.trim(),
        nextSteps: form.nextSteps.trim(),
        evidence: form.evidence.trim(),
      })

      await loadProjects(user.accessToken)

      setForm({ ...emptyJournal, date: getLocalDate() })

      showToast(
        'Daily work journal saved successfully.',
        'success',
      )
    } catch (err) {
      setError(err.message || 'Could not save your daily journal.')
    } finally {
      setSaving(false)
    }
  }

  if (!assignedProjects.length) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-violet-400/20 bg-gradient-to-r from-[#10102a] via-[#17143a] to-[#21164a] p-7 text-white shadow-xl shadow-violet-950/20">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
            Employee Workspace
          </p>
          <h2 className="mt-3 text-2xl font-bold">
            Welcome back, {user.name.split(' ')[0]}
          </h2>
          <p className="mt-2 text-sm text-violet-200">
            Your personal workspace for project knowledge and daily work.
          </p>
        </section>

        <SampleDataNotice />

        <Card className="p-8 text-center">
          <h3 className="font-bold text-text-primary">
            No assigned projects found
          </h3>
          <p className="mt-2 text-sm text-text-muted">
            Ask your manager to add your employee account to a project before
            recording daily work.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      {/* Employee Welcome */}
      <section className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-r from-[#10102a] via-[#17143a] to-[#21164a] p-6 text-white shadow-xl shadow-violet-950/20 sm:p-8">
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
            KnowFlow Employee Workspace
          </p>

          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
            Welcome back, {user.name.split(' ')[0]}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-200">
            Keep track of your assigned projects, record your daily work and
            preserve important project knowledge.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-violet-300/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-violet-50">
              Employee Workspace
            </span>
            <span className="rounded-full border border-violet-300/25 bg-white/10 px-3 py-1.5 text-xs text-violet-100">
              {assignedProjects.length} assigned project
              {assignedProjects.length === 1 ? '' : 's'}
            </span>
          </div>

          <a
            href="#daily-journal"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-100 px-5 py-3 text-sm font-bold text-violet-950 shadow-sm transition hover:bg-white"
          >
            <Icon name="plus" className="h-4 w-4" />
            Record Today's Work
          </a>
        </div>

        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
      </section>

      <SampleDataNotice />

      {/* Employee Overview */}
      <section>
        <SectionHeading
          title="My Workspace Overview"
          description="A summary of your assigned projects and recorded work."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="My Projects"
            value={assignedProjects.length}
            hint="Projects assigned to you"
            onClick={() => navigate('projects')}
          />

          <StatCard
            label="Journal Entries"
            value={myEntries.length}
            hint="Your recorded work history"
            onClick={() => navigate('project-journal')}
          />

          <StatCard
            label="This Week"
            value={thisWeekEntries.length}
            hint="Entries recorded in the last 7 days"
          />

          <StatCard
            label="Open Items"
            value={openItems.length}
            hint="Pending tasks and reported blockers"
            onClick={() =>
              document
                .getElementById('employee-open-items')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          />
        </div>
      </section>

      {/* Employee Quick Actions */}
      <section>
        <SectionHeading
          title="Quick Actions"
          description="Get to your daily work and project information quickly."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <a
            href="#daily-journal"
            className="group flex min-h-36 items-start gap-4 rounded-2xl border border-border bg-surface-raised p-5 shadow-sm transition hover:-translate-y-1 hover:border-violet-400/40 hover:shadow-lg hover:shadow-violet-950/20"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
              <Icon name="notebook-pen" className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-sm font-bold text-text-primary group-hover:text-violet-300">
                Record Daily Work
              </span>
              <span className="mt-2 block text-xs leading-5 text-text-muted">
                Add today's work, decisions and next steps.
              </span>
            </span>
          </a>

          <button
            type="button"
            onClick={() => navigate('projects')}
            className="group flex min-h-36 items-start gap-4 rounded-2xl border border-border bg-surface-raised p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-violet-400/40 hover:shadow-lg hover:shadow-violet-950/20"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
              <Icon name="folder" className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-sm font-bold text-text-primary group-hover:text-violet-300">
                My Projects
              </span>
              <span className="mt-2 block text-xs leading-5 text-text-muted">
                View projects assigned to your account.
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('project-journal')}
            className="group flex min-h-36 items-start gap-4 rounded-2xl border border-border bg-surface-raised p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-violet-400/40 hover:shadow-lg hover:shadow-violet-950/20"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
              <Icon name="book-open" className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-sm font-bold text-text-primary group-hover:text-violet-300">
                Journal History
              </span>
              <span className="mt-2 block text-xs leading-5 text-text-muted">
                Review your previously recorded work.
              </span>
            </span>
          </button>

          <a
            href="#employee-open-items"
            className="group flex min-h-36 items-start gap-4 rounded-2xl border border-border bg-surface-raised p-5 shadow-sm transition hover:-translate-y-1 hover:border-violet-400/40 hover:shadow-lg hover:shadow-violet-950/20"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
              <Icon name="list-checks" className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-sm font-bold text-text-primary group-hover:text-violet-300">
                My Open Items
              </span>
              <span className="mt-2 block text-xs leading-5 text-text-muted">
                Check pending tasks and reported blockers.
              </span>
            </span>
          </a>
        </div>
      </section>

      {/* Assigned Project Overview */}
      <section>
        <SectionHeading
          title="My Project Overview"
          description="Projects where you are an assigned team member."
        />

        <div className="grid gap-4 lg:grid-cols-2">
          {projectCards.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => navigate('projects')}
              className="rounded-2xl border border-border bg-surface-raised p-5 text-left shadow-sm transition hover:border-violet-400/40 hover:shadow-lg hover:shadow-violet-950/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-bold text-text-primary">
                    {project.name}
                  </h4>
                  <p className="mt-1 text-xs text-text-muted">
                    {project.myEntryCount} journal entr
                    {project.myEntryCount === 1 ? 'y' : 'ies'} recorded by you
                  </p>
                </div>

                <span className="shrink-0 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
                  {PROJECT_STATUS[project.status]?.label || 'Status unavailable'}
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <div>
                  <p className="text-xs text-text-muted">Your latest journal</p>
                  <p className="mt-1 text-sm font-medium text-text-secondary">
                    {project.latestEntry
                      ? timeAgo(project.latestEntry.createdAt || project.latestEntry.date)
                      : 'No journal entry yet'}
                  </p>
                </div>

                <span className="text-xs font-bold text-violet-300">
                  View Projects →
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Employee Work Insights */}
      <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
        <SectionHeading
          title="My Work Insights"
          description="Your journal entries recorded over the last seven days."
        />

        <div className="rounded-xl border border-border bg-surface px-3 pb-3 pt-4">
          <div className="grid grid-cols-7 gap-2">
            {weeklyActivity.map((day) => {
              const barHeight =
                day.count === 0
                  ? 5
                  : Math.max(
                      12,
                      (day.count / maxWeeklyActivity) * 116,
                    )

              return (
                <div
                  key={day.key}
                  className="flex min-w-0 flex-col items-center"
                >
                  <span className="mb-2 text-xs font-bold text-text-secondary">
                    {day.count}
                  </span>

                  <div className="flex h-32 w-full items-end justify-center">
                    <div
                      className="w-full max-w-10 rounded-t-lg bg-violet-500 transition-all duration-300"
                      style={{ height: `${barHeight}px` }}
                      title={`${day.label}: ${day.count} entries`}
                    />
                  </div>

                  <span className="mt-2 text-xs text-text-muted">
                    {day.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {!hasWeeklyActivity && (
          <p className="mt-3 text-center text-xs text-text-muted">
            No journal entries recorded in the last seven days yet.
          </p>
        )}

        <p className="mt-4 text-xs text-text-muted">
          This chart reflects saved journal entries only. It is not a
          productivity score or employee performance rating.
        </p>
      </section>

      {/* Employee Open Items */}
      <section
        id="employee-open-items"
        className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6"
      >
        <SectionHeading
          title="My Open Items"
          description="Pending tasks and blockers you have recorded in your journals."
        />

        {openItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-7 text-center">
            <Icon name="check-circle" className="mx-auto h-8 w-8 text-emerald-400" />
            <p className="mt-2 text-sm font-semibold text-text-primary">
              No open items recorded
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Pending tasks and blockers from your future journal entries will
              appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {openItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      item.tone === 'red'
                        ? 'border border-red-400/20 bg-red-500/10 text-red-300'
                        : 'border border-amber-400/20 bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    {item.type}
                  </span>
                  <span className="text-xs text-text-muted">
                    {item.projectName}
                  </span>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-text-secondary">
                  {item.text}
                </p>

                {item.date && (
                  <p className="mt-2 text-xs text-text-muted">
                    Recorded: {new Date(item.date).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Daily Journal Form */}
      <section
        id="daily-journal"
        className="overflow-hidden rounded-2xl border border-violet-400/20 bg-surface-raised shadow-lg shadow-black/10"
      >
        <div className="border-b border-violet-400/20 bg-violet-500/10 p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
            Daily Knowledge Capture
          </p>
          <h3 className="mt-2 text-xl font-bold text-text-primary">
            My Daily Work Journal
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Record what you worked on today. Your entries build a cumulative
            project knowledge history.
          </p>
        </div>

        <form onSubmit={saveJournal} className="space-y-5 p-5 sm:p-6">
          {error && (
            <div className="rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-text-secondary">
                Select Project *
              </label>
              <select
                value={selectedProject?.id || ''}
                onChange={(event) => {
                  setSelectedProjectId(event.target.value)
                  setError('')
                }}
                className="w-full rounded-xl border-2 border-border bg-surface px-4 py-3 text-sm font-semibold text-text-primary outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20"
              >
                {assignedProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-text-secondary">
                Work Date *
              </label>
              <input
                type="date"
                value={form.date}
                max={getLocalDate()}
                onChange={(event) => updateField('date', event.target.value)}
                required
                className="w-full rounded-xl border-2 border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20"
              />
            </div>
          </div>

          {[
            {
              name: 'workSummary',
              title: 'What did you work on today?',
              hint: 'Describe the work you performed and the approach you followed.',
              placeholder: 'Today I worked on...',
              required: true,
            },
            {
              name: 'completedTasks',
              title: 'Tasks completed',
              hint: 'List the tasks you successfully finished.',
              placeholder: '1. Completed...\n2. Tested...',
            },
            {
              name: 'decisions',
              title: 'Decisions made and reasons',
              hint: 'Record important technical or project decisions and why you made them.',
              placeholder: 'Decision: ...\nReason: ...',
            },
            {
              name: 'blockers',
              title: 'Problems and blockers',
              hint: 'Mention errors, issues or unresolved problems.',
              placeholder: 'Describe any problems or blockers...',
            },
            {
              name: 'dependencies',
              title: 'Dependencies on teammates',
              hint: 'Mention who or what you are waiting for, if applicable.',
              placeholder: 'Waiting for... / No dependencies today.',
            },
            {
              name: 'pendingTasks',
              title: 'Pending tasks',
              hint: 'List work that is not yet completed.',
              placeholder: 'Tasks that are still pending...',
            },
            {
              name: 'nextSteps',
              title: 'Next steps',
              hint: 'Explain what you plan to work on next.',
              placeholder: 'Tomorrow I will...',
            },
            {
              name: 'evidence',
              title: 'Supporting evidence',
              hint: 'Add document names, source IDs, ticket references or links.',
              placeholder: 'For example: S1, API Testing Report.pdf, ticket reference...',
            },
          ].map((field) => (
            <div key={field.name}>
              <label className="mb-1.5 block text-sm font-bold text-text-secondary">
                {field.title}
                {field.required && <span className="text-red-400"> *</span>}
              </label>
              <p className="mb-2 text-xs text-text-muted">{field.hint}</p>
              <textarea
                value={form[field.name]}
                onChange={(event) => updateField(field.name, event.target.value)}
                placeholder={field.placeholder}
                rows={3}
                required={field.required}
                className="w-full resize-y rounded-xl border border-border bg-surface px-4 py-3 text-sm leading-6 text-text-primary outline-none transition placeholder:text-text-faint focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20"
              />
            </div>
          ))}

          <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-4">
            <p className="text-sm font-bold text-violet-200">
              How your journal is used
            </p>
            <p className="mt-1 text-xs leading-5 text-violet-200/80">
              Your daily entries are recorded as project knowledge. They are
              not sent to the manager for daily approval. When a handover is
              initiated, the accumulated records can be used to prepare a
              consolidated report.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-5">
            <button
              type="button"
              onClick={() => {
                setForm({ ...emptyJournal, date: getLocalDate() })
                setError('')
              }}
              disabled={saving}
              className="rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-text-secondary transition hover:bg-surface-hover hover:text-text-primary disabled:opacity-50"
            >
              Clear Form
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving Journal...' : 'Save Daily Journal'}
            </button>
          </div>
        </form>
      </section>

      <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200">
        <strong>Database connected:</strong> Daily journal entries are saved
        to the KnowFlow database. The current rule-based knowledge extraction
        organizes recorded journal information and document content into
        structured project findings.
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* MANAGER DASHBOARD                                                          */
/* -------------------------------------------------------------------------- */

const actionCards = [
  {
    label: 'Create Project',
    description: 'Set up a new project and assign team members.',
    icon: 'plus',
    page: 'create-project',
    iconStyle: 'bg-violet-500/15 text-violet-300',
  },
  {
    label: 'Upload Documents',
    description: 'Add authorised project documents and references.',
    icon: 'upload',
    page: 'upload',
    iconStyle: 'bg-indigo-500/15 text-indigo-300',
  },
  {
    label: 'Knowledge Extraction',
    description: 'Review project knowledge extraction status.',
    icon: 'sparkles',
    page: 'extraction',
    iconStyle: 'bg-violet-500/15 text-violet-300',
  },
  {
    label: 'Review Handovers',
    description: 'Verify findings and review pending handovers.',
    icon: 'clipboard',
    page: 'review',
    iconStyle: 'bg-emerald-500/15 text-emerald-300',
  },
]

const statusStyles = {
  active: 'bg-violet-500',
  under_review: 'bg-amber-400',
  completed: 'bg-emerald-500',
}

function buildActivityTimeline(projects) {
  const events = []

  projects.forEach((project) => {
    if (project.createdAt) {
      events.push({
        id: `${project.id}-created`,
        title: 'Project created',
        detail: project.name,
        by: '',
        date: project.createdAt,
        icon: 'folder-plus',
        tone: 'blue',
      })
    }

    ;(project.documents || []).forEach((document) => {
      if (!document.uploadedAt) return

      events.push({
        id: `${project.id}-${document.id}-uploaded`,
        title: 'Document uploaded',
        detail: `${document.name} · ${project.name}`,
        by: document.uploadedBy || '',
        date: document.uploadedAt,
        icon: 'file-text',
        tone: 'violet',
      })
    })

    ;(project.journalEntries || []).forEach((entry) => {
      if (!entry.createdAt) return

      events.push({
        id: `${project.id}-${entry.id}-journal`,
        title: 'Journal entry recorded',
        detail: project.name,
        by: entry.createdBy || '',
        date: entry.createdAt,
        icon: 'book-open',
        tone: 'blue',
      })
    })

    ;(project.handovers || []).forEach((handover) => {
      const employeeName =
        handover.outgoingEmployeeName || 'Team member'

      if (handover.createdAt) {
        events.push({
          id: `${handover.id}-created`,
          title: 'Handover generated',
          detail: project.name,
          by: employeeName,
          date: handover.createdAt,
          icon: 'file-text',
          tone: 'blue',
        })
      }

      const confirmation = handover.employeeConfirmation || {}

      if (confirmation.confirmed_at) {
        events.push({
          id: `${handover.id}-confirmed`,
          title: 'Employee confirmed handover',
          detail: project.name,
          by: employeeName,
          date: confirmation.confirmed_at,
          icon: 'check-circle',
          tone: 'green',
        })
      }

      const approval = handover.managerApproval || {}

      if (approval.approved_at) {
        events.push({
          id: `${handover.id}-approved`,
          title: 'Handover approved',
          detail: project.name,
          by: '',
          date: approval.approved_at,
          icon: 'clipboard-check',
          tone: 'green',
        })
      }

      if (handover.sharedAt) {
        events.push({
          id: `${handover.id}-shared`,
          title: 'Handover shared',
          detail: project.name,
          by: '',
          date: handover.sharedAt,
          icon: 'share-2',
          tone: 'green',
        })
      }
    })
  })

  return events
    .filter((event) => !Number.isNaN(new Date(event.date).getTime()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)
}

export default function DashboardPage() {
  const {
    user,
    isManager,
    projects,
    projectsStatus,
    projectsError,
    loadProjects,
    navigate,
    showToast,
  } = useApp()

  const loading = projectsStatus === 'loading' || projectsStatus === 'idle'
  const firstName = user.name.split(' ')[0]

  const stats = useMemo(() => {
    const documents = projects.reduce(
      (sum, project) => sum + (project.documents?.length || 0),
      0,
    )

    const allHandovers = projects.flatMap(
      (project) => project.handovers || [],
    )

    const pending = allHandovers.filter((handover) => {
      const confirmation = handover.employeeConfirmation || {}
      const approval = handover.managerApproval || {}

      return (
        confirmation.status === 'confirmed' &&
        approval.status !== 'approved' &&
        handover.status !== 'approved'
      )
    }).length

    return { documents, pending }
  }, [projects])

  const projectStatusCounts = useMemo(
    () =>
      Object.keys(PROJECT_STATUS).map((key) => ({
        key,
        label: PROJECT_STATUS[key].label,
        count: projects.filter((project) => project.status === key).length,
      })),
    [projects],
  )

  const knowledgeStats = useMemo(() => {
    const items = projects.flatMap(
      (project) => project.knowledge?.items || [],
    )

    return {
      total: items.length,
      verified: 0,
      needsReview: items.length,
      rejected: 0,
      blockers: items.filter(
        (item) => item.type?.toLowerCase() === 'blocker',
      ).length,
      questions: items.filter(
        (item) => item.type?.toLowerCase() === 'question',
      ).length,
    }
  }, [projects])

  const handoverStats = useMemo(() => {
    const allHandovers = projects.flatMap(
      (project) => project.handovers || [],
    )

    const awaiting = allHandovers.filter((handover) => {
      const confirmation = handover.employeeConfirmation || {}
      const approval = handover.managerApproval || {}

      return (
        confirmation.status === 'confirmed' &&
        approval.status !== 'approved' &&
        handover.status !== 'approved'
      )
    }).length

    const approved = allHandovers.filter((handover) => {
      const approval = handover.managerApproval || {}

      return (
        approval.status === 'approved' ||
        handover.status === 'approved'
      )
    }).length

    const shared = allHandovers.filter((handover) => {
      const permissions = handover.accessPermissions || {}

      return (
        permissions.shared === true ||
        permissions.incoming_employee_access === true ||
        Boolean(handover.sharedAt)
      )
    }).length

    const other = allHandovers.length - awaiting - approved

    return {
      awaiting,
      approved,
      shared,
      other,
      total: allHandovers.length,
    }
  }, [projects])

  const activityTimeline = useMemo(
    () => buildActivityTimeline(projects),
    [projects],
  )

  if (!isManager) {
    return (
      <EmployeeJournal
        projects={projects}
        user={user}
        loadProjects={loadProjects}
        showToast={showToast}
        navigate={navigate}
      />
    )
  }

  return (
    <div className="space-y-7">
      {/* Manager Welcome */}
      <section className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-r from-[#0d0e24] via-[#151538] to-[#21164a] p-6 shadow-xl shadow-violet-950/20 sm:p-8">
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">
            KnowFlow Workspace
          </p>

          <h2 className="mt-3 text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            Welcome back, {firstName}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary sm:text-base">
            Manage project knowledge, monitor handovers and keep your team aligned.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-violet-400/25 bg-white/5 px-3 py-1.5 text-xs font-semibold text-violet-300 shadow-sm">
              Manager Workspace
            </span>
            <span className="rounded-full border border-border bg-white/5 px-3 py-1.5 text-xs font-medium text-text-secondary shadow-sm">
              Project Knowledge Management
            </span>
          </div>
        </div>

        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl" />
      </section>

      <SampleDataNotice />

      {projectsStatus === 'error' && (
        <Alert
          tone="error"
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => loadProjects(user.accessToken)}
            >
              Retry
            </Button>
          }
        >
          {projectsError}
        </Alert>
      )}

      {/* Manager Workspace Overview */}
      <section>
        <SectionHeading
          title="Workspace Overview"
          description="A quick look at your project activity."
        />

        <div className="grid gap-5 md:grid-cols-3">
          <StatCard
            label="Total Projects"
            value={projects.length}
            hint="Projects in your workspace"
            loading={loading}
            onClick={() => navigate('projects')}
          />

          <StatCard
            label="Documents"
            value={stats.documents}
            hint="Authorised project documents"
            loading={loading}
            onClick={() => navigate('upload')}
          />

          <StatCard
            label="Pending Reviews"
            value={stats.pending}
            hint="Handovers awaiting approval"
            loading={loading}
            onClick={() => navigate('review')}
          />
        </div>
      </section>

      {/* Manager Quick Actions */}
      <section>
        <SectionHeading
          title="Quick Actions"
          description="Access your most frequently used workspace tools."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {actionCards.map((action) => (
            <button
              key={action.page}
              type="button"
              onClick={() => navigate(action.page)}
              className="group flex min-h-40 items-start gap-4 rounded-2xl border border-border bg-surface-raised p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-violet-400/40 hover:shadow-lg hover:shadow-violet-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${action.iconStyle}`}>
                <Icon name={action.icon} className="h-6 w-6" />
              </span>

              <span className="min-w-0">
                <span className="block text-sm font-bold text-text-primary group-hover:text-violet-300">
                  {action.label}
                </span>
                <span className="mt-2 block text-xs leading-5 text-text-muted">
                  {action.description}
                </span>
                <span className="mt-3 block text-xs font-bold text-violet-300">
                  Open action →
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Project Analytics */}
      <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
        <SectionHeading
          title="Project Analytics"
          description="Distribution of projects by their current status."
        />

        {loading ? (
          <div className="h-32 animate-pulse rounded-xl bg-surface-hover" />
        ) : projects.length === 0 ? (
          <p className="rounded-xl bg-surface p-6 text-center text-sm text-text-muted">
            Project analytics will appear when projects are available.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {projectStatusCounts.map((row) => (
                <div
                  key={row.key}
                  className="rounded-xl border border-border bg-surface p-4"
                >
                  <p className="text-sm font-medium text-text-muted">
                    {row.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-text-primary">
                    {row.count}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex h-4 overflow-hidden rounded-full bg-surface-hover">
              {projectStatusCounts.map((row) => (
                <div
                  key={row.key}
                  className={statusStyles[row.key] || 'bg-slate-500'}
                  style={{
                    width: `${(row.count / projects.length) * 100}%`,
                  }}
                  title={`${row.label}: ${row.count}`}
                />
              ))}
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {projectStatusCounts.map((row) => (
                <div key={row.key} className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${statusStyles[row.key] || 'bg-slate-500'}`}
                  />
                  <span className="text-xs text-text-secondary">{row.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Knowledge Health */}
      <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
        <SectionHeading
          title="Knowledge Health"
          description="Review status and outstanding knowledge items across your projects."
        />

        {loading ? (
          <div className="h-32 animate-pulse rounded-xl bg-surface-hover" />
        ) : knowledgeStats.total === 0 ? (
          <p className="rounded-xl bg-surface p-6 text-center text-sm text-text-muted">
            No knowledge findings are available yet.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AnalyticsMetric
              label="Verified"
              value={knowledgeStats.verified}
              description="Manager-approved findings"
              tone="green"
            />
            <AnalyticsMetric
              label="Needs Review"
              value={knowledgeStats.needsReview}
              description="Pending verification"
              tone="amber"
            />
            <AnalyticsMetric
              label="Rejected"
              value={knowledgeStats.rejected}
              description="Findings rejected by manager"
              tone="red"
            />
            <AnalyticsMetric
              label="Blocker Findings"
              value={knowledgeStats.blockers}
              description="Recorded project blockers"
              tone="violet"
            />
            <AnalyticsMetric
              label="Open Questions"
              value={knowledgeStats.questions}
              description="Questions recorded in project knowledge"
              tone="blue"
            />
            <AnalyticsMetric
              label="Total Findings"
              value={knowledgeStats.total}
              description="Knowledge items across projects"
              tone="slate"
            />
          </div>
        )}

        <p className="mt-4 text-xs leading-5 text-text-muted">
          Verification counts are based on manager review status. Blockers and
          open questions are counted by their recorded finding type.
        </p>
      </section>

      {/* Handover Analytics */}
      <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
        <SectionHeading
          title="Handover Analytics"
          description="Current handover status across all workspace projects."
        />

        {loading ? (
          <div className="h-28 animate-pulse rounded-xl bg-surface-hover" />
        ) : handoverStats.total === 0 ? (
          <p className="rounded-xl bg-surface p-6 text-center text-sm text-text-muted">
            Handover analytics will appear when handover records are available.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <AnalyticsMetric
                label="Awaiting Approval"
                value={handoverStats.awaiting}
                description="Employee-confirmed, awaiting manager review"
                tone="amber"
              />
              <AnalyticsMetric
                label="Approved"
                value={handoverStats.approved}
                description="Manager-approved handovers"
                tone="green"
              />
              <AnalyticsMetric
                label="Other Statuses"
                value={handoverStats.other}
                description="Not awaiting approval or approved"
                tone="slate"
              />
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-surface-hover">
              <div className="flex h-full">
                <div
                  className="bg-amber-400"
                  style={{
                    width: `${(handoverStats.awaiting / handoverStats.total) * 100}%`,
                  }}
                />
                <div
                  className="bg-emerald-500"
                  style={{
                    width: `${(handoverStats.approved / handoverStats.total) * 100}%`,
                  }}
                />
                <div
                  className="bg-slate-500"
                  style={{
                    width: `${(handoverStats.other / handoverStats.total) * 100}%`,
                  }}
                />
              </div>
            </div>

            <p className="text-xs text-text-muted">
              {handoverStats.shared} of {handoverStats.total} handover
              {handoverStats.total === 1 ? '' : 's'} shared with an incoming
              employee. Sharing is tracked separately from manager approval.
            </p>
          </div>
        )}
      </section>

      {/* Project Activity Timeline */}
      <section className="rounded-2xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
        <SectionHeading
          title="Project Activity Timeline"
          description="Recent events with recorded timestamps."
        />

        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-surface-hover" />
        ) : activityTimeline.length === 0 ? (
          <p className="rounded-xl bg-surface p-6 text-center text-sm text-text-muted">
            No recorded project activity is available yet.
          </p>
        ) : (
          <div className="space-y-5">
            {activityTimeline.map((event) => (
              <div key={event.id} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-300">
                  <Icon name={event.icon} className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-text-primary">
                    {event.title}
                  </p>
                  <p className="mt-1 break-words text-xs leading-5 text-text-secondary">
                    {event.detail}
                  </p>
                  {event.by && (
                    <p className="mt-1 text-xs text-text-muted">
                      By {event.by}
                    </p>
                  )}
                </div>

                <span className="shrink-0 text-xs text-text-muted">
                  {timeAgo(event.date)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200">
        <strong>Backend connected:</strong> Project management, daily journals,
        document storage, knowledge extraction, handover workflows and support
        requests are connected to the KnowFlow backend.
      </div>
    </div>
  )
}
