import { useMemo, useState } from 'react'
import { PROJECT_STATUS } from '../data/statusConfig'
import { useApp } from '../hooks/useApp'
import Alert from '../components/common/Alert'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import EmptyState from '../components/common/EmptyState'
import Icon from '../components/common/Icon'
import SampleDataNotice from '../components/common/SampleDataNotice'
import SearchInput from '../components/common/SearchInput'
import ProjectCard from '../components/projects/ProjectCard'
import ProjectListSkeleton from '../components/projects/ProjectListSkeleton'

const FILTERS = [
  { value: 'all', label: 'All' },
  ...Object.entries(PROJECT_STATUS).map(([value, entry]) => ({
    value,
    label: entry.label,
  })),
]

function getEmployeeData(project, email) {
  const member = project.members?.find(
    (item) => item.email === email
  )

  const journalEntries = (project.journalEntries ?? []).filter(
    (entry) => entry.createdBy === member?.name
  )

  const pendingTasks = journalEntries.reduce((total, entry) => {
    return (
      total +
      (entry.pendingTasks ?? '')
        .split('\n')
        .filter((task) => task.trim()).length
    )
  }, 0)

  return {
    role: member?.role ?? 'Team Member',
    contributions: journalEntries.length,
    pendingTasks,
  }
}

export default function ProjectsPage() {
  const {
    user,
    isManager,
    projects,
    projectsStatus,
    projectsError,
    loadProjects,
    navigate,
  } = useApp()

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const loading =
    projectsStatus === 'loading' || projectsStatus === 'idle'

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase()

    return projects.filter((project) => {
      if (filter !== 'all' && project.status !== filter) return false
      if (!text) return true

      return (
        project.name.toLowerCase().includes(text) ||
        project.description.toLowerCase().includes(text) ||
        project.members.some((member) =>
          member.name.toLowerCase().includes(text)
        )
      )
    })
  }, [projects, query, filter])

  const overview = useMemo(() => {
    const total = projects.length

    return {
      total,
      active: projects.filter((project) => project.status === 'active').length,
      underReview: projects.filter(
        (project) => project.status === 'under_review'
      ).length,
      completed: projects.filter(
        (project) => project.status === 'completed'
      ).length,
    }
  }, [projects])

  const employeeOverview = useMemo(() => {
    return projects.reduce(
      (result, project) => {
        const data = getEmployeeData(project, user?.email)

        result.contributions += data.contributions
        result.pendingTasks += data.pendingTasks

        return result
      },
      {
        assigned: projects.length,
        contributions: 0,
        pendingTasks: 0,
      }
    )
  }, [projects, user?.email])

  const statusDistribution = [
    {
      value: 'active',
      label: 'Active',
      count: overview.active,
      color: 'bg-emerald-400',
      textColor: 'text-emerald-300',
    },
    {
      value: 'under_review',
      label: 'Under Review',
      count: overview.underReview,
      color: 'bg-amber-400',
      textColor: 'text-amber-300',
    },
    {
      value: 'completed',
      label: 'Completed',
      count: overview.completed,
      color: 'bg-violet-500',
      textColor: 'text-violet-300',
    },
  ]

  function clearFilters() {
    setQuery('')
    setFilter('all')
  }

  const hasFilters = query.trim() !== '' || filter !== 'all'

  const managerOverviewCards = [
    {
      label: 'Total Projects',
      value: overview.total,
      description: 'Across your workspace',
      icon: 'folder',
      iconStyle: 'bg-violet-500/15 text-violet-300',
    },
    {
      label: 'Active Projects',
      value: overview.active,
      description: 'Currently in progress',
      icon: 'activity',
      iconStyle: 'bg-emerald-500/15 text-emerald-300',
    },
    {
      label: 'Under Review',
      value: overview.underReview,
      description: 'Awaiting review',
      icon: 'clipboard-check',
      iconStyle: 'bg-amber-500/15 text-amber-300',
    },
    {
      label: 'Completed',
      value: overview.completed,
      description: 'Marked as completed',
      icon: 'check-circle',
      iconStyle: 'bg-indigo-500/15 text-indigo-300',
    },
  ]

  const employeeOverviewCards = [
    {
      label: 'Assigned Projects',
      value: employeeOverview.assigned,
      description: 'Projects assigned to you',
      icon: 'folder',
      iconStyle: 'bg-violet-500/15 text-violet-300',
    },
    {
      label: 'My Contributions',
      value: employeeOverview.contributions,
      description: 'Your recorded journal entries',
      icon: 'book',
      iconStyle: 'bg-emerald-500/15 text-emerald-300',
    },
    {
      label: 'Pending Tasks',
      value: employeeOverview.pendingTasks,
      description: 'Tasks recorded in your journals',
      icon: 'list-checks',
      iconStyle: 'bg-amber-500/15 text-amber-300',
    },
  ]

  const overviewCards = isManager
    ? managerOverviewCards
    : employeeOverviewCards

  return (
    <div className="space-y-7">
      {/* Page heading */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">
            {isManager ? 'All Projects' : 'My Projects'}
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            {isManager
              ? 'Manage projects, track progress and preserve team knowledge.'
              : 'View your assigned projects, contributions and ongoing work.'}
          </p>
        </div>

        {isManager && (
          <Button onClick={() => navigate('create-project')}>
            <Icon name="plus" className="h-4 w-4" />
            Create Project
          </Button>
        )}
      </div>

      <SampleDataNotice />

      {/* Overview cards */}
      {!loading && projectsStatus !== 'error' && projects.length > 0 && (
        <div
          className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
            isManager ? 'xl:grid-cols-4' : 'xl:grid-cols-3'
          }`}
        >
          {overviewCards.map((item) => (
            <Card key={item.label} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text-muted">
                    {item.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-text-primary">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs text-text-faint">
                    {item.description}
                  </p>
                </div>

                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.iconStyle}`}
                >
                  <Icon name={item.icon} className="h-5 w-5" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Search and filters */}
      <div className="rounded-2xl border border-border bg-surface-raised p-4 shadow-sm shadow-black/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-sm">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={
                isManager
                  ? 'Search projects or team members...'
                  : 'Search your assigned projects...'
              }
            />
          </div>

          <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filter projects by status"
          >
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                aria-pressed={filter === item.value}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  filter === item.value
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/30'
                    : 'border border-border bg-surface text-text-secondary hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-violet-300'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Project list */}
      {projectsStatus === 'error' ? (
        <Alert
          tone="error"
          action={
            <Button size="sm" variant="secondary" onClick={loadProjects}>
              Retry
            </Button>
          }
        >
          {projectsError}
        </Alert>
      ) : loading ? (
        <ProjectListSkeleton />
      ) : filtered.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            title={
              hasFilters
                ? 'No projects match your search'
                : isManager
                  ? 'No projects yet'
                  : 'No assigned projects yet'
            }
            description={
              hasFilters
                ? 'Try a different keyword or clear the filters.'
                : isManager
                  ? 'Create your first project to start preserving knowledge.'
                  : 'Projects assigned to you will appear here.'
            }
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                isManager && (
                  <Button onClick={() => navigate('create-project')}>
                    Create Project
                  </Button>
                )
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-text-primary">
                {isManager ? 'Your Projects' : 'Assigned Projects'}
              </h3>
              <p className="mt-1 text-sm text-text-muted">
                Showing {filtered.length} of {projects.length} projects
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isManager={isManager}
                currentUserEmail={user?.email}
                onOpen={(projectId) =>
                  navigate('project-details', { projectId })
                }
                onEdit={(projectId) =>
                  navigate('edit-project', { projectId })
                }
                onManageMembers={(projectId) =>
                  navigate('manage-members', { projectId })
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Manager-only portfolio overview */}
      {isManager &&
        !loading &&
        projectsStatus !== 'error' &&
        projects.length > 0 && (
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-text-primary">
                  Portfolio Overview
                </h3>
                <p className="mt-1 text-sm text-text-muted">
                  Distribution of projects by current status
                </p>
              </div>

              <span className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary">
                {overview.total} Total
              </span>
            </div>

            <div className="mt-6 flex h-3 w-full overflow-hidden rounded-full bg-surface">
              {statusDistribution.map((item) => (
                <div
                  key={item.value}
                  className={`${item.color} transition-all duration-300`}
                  style={{
                    width:
                      overview.total > 0
                        ? `${(item.count / overview.total) * 100}%`
                        : '0%',
                  }}
                  title={`${item.label}: ${item.count}`}
                />
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {statusDistribution.map((item) => (
                <div key={item.value} className="flex items-center gap-3">
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full ${item.color}`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-secondary">
                      {item.label}
                    </p>
                    <p className={`mt-0.5 text-xl font-bold ${item.textColor}`}>
                      {item.count}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
    </div>
  )
}