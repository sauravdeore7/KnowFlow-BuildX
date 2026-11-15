
import { useMemo, useState } from 'react'
import { useApp } from '../hooks/useApp'
import Icon from '../components/common/Icon'
import { downloadDocument } from '../services/documentService'

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

function formatFileSize(sizeKb) {
  if (sizeKb === undefined || sizeKb === null) return 'Size unavailable'

  if (sizeKb >= 1024) {
    return `${(sizeKb / 1024).toFixed(1)} MB`
  }

  return `${sizeKb} KB`
}

function getVersion(doc) {
  return doc.version || doc.versionNumber || doc.currentVersion || null
}

function MetricCard({ label, value, icon, color, description }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-5 shadow-sm shadow-black/10 transition hover:border-violet-400/25 hover:bg-surface-hover">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text-secondary">{label}</p>
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

function DocumentRow({ document, onDownload, downloading }) {
  const version = getVersion(document.doc)

  return (
    <div className="flex flex-col gap-4 border-b border-border px-5 py-5 last:border-0 sm:flex-row sm:items-center">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-300">
        <Icon name="fileText" className="h-6 w-6" />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-text-primary">
          {document.doc.name || 'Untitled document'}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          <span>{document.doc.type || 'File'}</span>
          <span>{formatFileSize(document.doc.sizeKb)}</span>
          <span>Uploaded by {document.doc.uploadedBy || 'Unknown'}</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-faint">
          <span>{document.project.name}</span>
          <span>·</span>
          <span>{formatDate(document.doc.uploadedAt)}</span>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-center">
        {version ? (
          <span className="rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300">
            Version {version}
          </span>
        ) : (
          <span className="rounded-lg border border-border bg-surface-hover px-3 py-1.5 text-xs font-medium text-text-muted">
            Version not tracked
          </span>
        )}

        <button
          type="button"
          onClick={() => onDownload(document.doc)}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-300 transition hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon
            name={downloading ? 'loader' : 'download'}
            className={`h-4 w-4 ${downloading ? 'animate-spin' : ''}`}
          />
          {downloading ? 'Downloading...' : 'Download'}
        </button>
      </div>
    </div>
  )
}

export default function MyDocumentsPage() {
  const { projects = [], user, showToast } = useApp()

  const [search, setSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState('all')
  const [activeFilter, setActiveFilter] = useState('all')
  const [downloadingId, setDownloadingId] = useState(null)

  async function handleDownload(doc) {
    if (!doc.id) {
      showToast?.('Document ID is unavailable.', 'error')
      return
    }

    if (!user?.accessToken) {
      showToast?.('Please log in again to download this document.', 'error')
      return
    }

    setDownloadingId(doc.id)

    try {
      const blob = await downloadDocument(user.accessToken, doc.id)
      const fileUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = fileUrl
      link.download = doc.name || 'document'
      document.body.appendChild(link)
      link.click()
      link.remove()

      window.URL.revokeObjectURL(fileUrl)

      showToast?.('Document downloaded successfully.')
    } catch (error) {
      showToast?.(error.message || 'Unable to download document.', 'error')
    } finally {
      setDownloadingId(null)
    }
  }

  const documents = useMemo(() => {
    return projects.flatMap((project) =>
      (project.documents || []).map((doc) => ({
        doc,
        project,
      }))
    ).sort((a, b) => {
      return new Date(b.doc.uploadedAt || 0) - new Date(a.doc.uploadedAt || 0)
    })
  }, [projects])

  const recentDocuments = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

    return documents.filter(({ doc }) => {
      const date = new Date(doc.uploadedAt).getTime()
      return Number.isFinite(date) && date >= sevenDaysAgo
    })
  }, [documents])

  const projectsWithDocuments = new Set(
    documents.map(({ project }) => project.id)
  ).size

  const filteredDocuments = useMemo(() => {
    return documents.filter(({ doc, project }) => {
      const matchesProject =
        selectedProject === 'all' || project.id === selectedProject

      const searchText = search.trim().toLowerCase()

      const matchesSearch =
        !searchText ||
        [
          doc.name,
          doc.type,
          doc.uploadedBy,
          project.name,
          doc.sourceId,
        ].some((value) =>
          String(value || '').toLowerCase().includes(searchText)
        )

      const uploadedTime = new Date(doc.uploadedAt).getTime()
      const isRecent =
        Number.isFinite(uploadedTime) &&
        uploadedTime >= Date.now() - 7 * 24 * 60 * 60 * 1000

      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'recent' && isRecent)

      return matchesProject && matchesSearch && matchesFilter
    })
  }, [documents, selectedProject, search, activeFilter])

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
            <Icon name="folder" className="h-4 w-4" />
            Work & Collaboration
          </div>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-text-primary">
            My Documents
          </h2>

          <p className="mt-2 text-sm text-text-muted">
            Access documents shared across your assigned projects.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start rounded-xl border border-violet-400/20 bg-violet-500/[0.08] px-4 py-2.5 text-sm font-medium text-violet-300">
          <Icon name="lock" className="h-4 w-4" />
          Assigned projects only
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="All Documents"
          value={documents.length}
          icon="fileText"
          color="border border-violet-400/15 bg-violet-500/10 text-violet-300"
          description="Available in your projects"
        />

        <MetricCard
          label="Recently Added"
          value={recentDocuments.length}
          icon="clock"
          color="border border-emerald-400/15 bg-emerald-500/10 text-emerald-300"
          description="Uploaded in the last 7 days"
        />

        <MetricCard
          label="Projects with Documents"
          value={projectsWithDocuments}
          icon="folder"
          color="border border-indigo-400/15 bg-indigo-500/10 text-indigo-300"
          description="Assigned projects containing files"
        />
      </div>

      <div className="rounded-2xl border border-border bg-surface-raised shadow-sm shadow-black/10">
        <div className="border-b border-border p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">
                Document Library
              </h3>
              <p className="mt-1 text-sm text-text-muted">
                Browse and find your project documents.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 sm:w-64">
                <Icon
                  name="search"
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search documents..."
                  className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-text-primary outline-none transition placeholder:text-text-faint focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                />
              </div>

              <select
                value={selectedProject}
                onChange={(event) => setSelectedProject(event.target.value)}
                className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text-primary outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
              >
                <option value="all">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeFilter === 'all'
                  ? 'border border-violet-400/30 bg-violet-600 text-white shadow-sm shadow-violet-950/30'
                  : 'border border-border bg-surface text-text-secondary hover:border-violet-400/30 hover:bg-violet-500/[0.07] hover:text-violet-300'
              }`}
            >
              All Documents
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('recent')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeFilter === 'recent'
                  ? 'border border-violet-400/30 bg-violet-600 text-white shadow-sm shadow-violet-950/30'
                  : 'border border-border bg-surface text-text-secondary hover:border-violet-400/30 hover:bg-violet-500/[0.07] hover:text-violet-300'
              }`}
            >
              Recently Added
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Available Documents
          </p>
          <span className="text-xs font-medium text-text-muted">
            {filteredDocuments.length} results
          </span>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-500/10 text-violet-300">
              <Icon name="fileText" className="h-7 w-7" />
            </span>

            <h3 className="mt-4 font-semibold text-text-primary">
              No documents found
            </h3>

            <p className="mt-2 text-sm text-text-muted">
              Try changing your search or project filter.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearch('')
                setSelectedProject('all')
                setActiveFilter('all')
              }}
              className="mt-4 text-sm font-semibold text-violet-300 transition hover:text-violet-200"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div>
            {filteredDocuments.map((document) => (
              <DocumentRow
                key={`${document.project.id}-${document.doc.id}`}
                document={document}
                onDownload={handleDownload}
                downloading={downloadingId === document.doc.id}
              />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.10] via-surface-raised to-indigo-500/[0.08] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-300">
            <Icon name="lock" className="h-5 w-5" />
          </span>

          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Project document access
            </h3>
            <p className="mt-1 text-sm leading-6 text-text-secondary">
              This library displays documents from projects assigned to you.
              Document access remains subject to your project permissions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
