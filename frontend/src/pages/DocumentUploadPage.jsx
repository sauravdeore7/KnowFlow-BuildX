
import { useMemo, useRef, useState } from 'react'
import { useApp } from '../hooks/useApp'
import Card, { CardHeader } from '../components/common/Card'
import Button from '../components/common/Button'
import Badge from '../components/common/Badge'
import Alert from '../components/common/Alert'
import EmptyState from '../components/common/EmptyState'
import Icon from '../components/common/Icon'
import { formatDate } from '../utils/helpers'
import {
  uploadDocument,
  downloadDocument,
  deleteDocument,
  renameDocument,
} from '../services/documentService'

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt', 'md']
const MAX_FILE_SIZE = 10 * 1024 * 1024

function getExtension(filename) {
  return filename.split('.').pop().toLowerCase()
}

function getFileType(filename) {
  return getExtension(filename).toUpperCase()
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function DocumentUploadPage() {
  const {
    projects,
    params,
    user,
    loadProjects,
    showToast,
    navigate,
  } = useApp()

  const fileInputRef = useRef(null)

  const [selectedProjectId, setSelectedProjectId] = useState(
    params.projectId || '',
  )
  const [pendingFiles, setPendingFiles] = useState([])
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [editingDocumentId, setEditingDocumentId] = useState(null)
  const [renameName, setRenameName] = useState('')
  const [renamingId, setRenamingId] = useState(null)

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId],
  )

  const totalDocuments = projects.reduce(
    (total, project) => total + (project.documents?.length || 0),
    0,
  )

  const projectsWithDocuments = projects.filter(
    (project) => (project.documents?.length || 0) > 0,
  ).length

  const visibleProjects = selectedProject ? [selectedProject] : projects

  function selectProject(projectId) {
    setSelectedProjectId(projectId)
    setPendingFiles([])
    setError('')

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function addFiles(fileList) {
    setError('')

    if (!selectedProject) {
      setError('Please choose a destination project before selecting files.')
      return
    }

    const incomingFiles = Array.from(fileList || [])
    const validFiles = []

    for (const file of incomingFiles) {
      const extension = getExtension(file.name)

      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        setError(
          `${file.name}: Unsupported file type. Use PDF, DOCX, TXT or MD.`,
        )
        continue
      }

      if (file.size === 0) {
        setError(`${file.name}: This file is empty.`)
        continue
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name}: File size must not exceed 10 MB.`)
        continue
      }

      const alreadyAdded =
        pendingFiles.some((item) => item.file.name === file.name) ||
        selectedProject.documents?.some((doc) => doc.name === file.name)

      if (alreadyAdded) {
        setError(
          `${file.name}: This file is already selected or uploaded.`,
        )
        continue
      }

      validFiles.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        authorised: false,
      })
    }

    if (validFiles.length > 0) {
      setPendingFiles((current) => [...current, ...validFiles])
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function removePendingFile(id) {
    setPendingFiles((current) =>
      current.filter((item) => item.id !== id),
    )
  }

  function toggleAuthorisation(id) {
    setPendingFiles((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, authorised: !item.authorised }
          : item,
      ),
    )
  }

  async function handleUpload() {
    if (!selectedProject) {
      setError('Please select a project first.')
      return
    }

    const authorisedFiles = pendingFiles.filter(
      (item) => item.authorised,
    )

    if (authorisedFiles.length === 0) {
      setError(
        'Confirm authorisation for at least one file before uploading.',
      )
      return
    }

    if (!user?.accessToken) {
      setError('Your login session is missing. Please log in again.')
      return
    }

    setUploading(true)
    setError('')

    let successfulUploads = 0
    const uploadedIds = []

    try {
      for (const item of authorisedFiles) {
        await uploadDocument(
          user.accessToken,
          selectedProject.id,
          item.file,
        )

        successfulUploads += 1
        uploadedIds.push(item.id)
      }

      await loadProjects(user.accessToken)

      setPendingFiles((current) =>
        current.filter((item) => !uploadedIds.includes(item.id)),
      )

      showToast(
        `${successfulUploads} document${
          successfulUploads > 1 ? 's' : ''
        } uploaded successfully.`,
        'success',
      )
    } catch (uploadError) {
      if (successfulUploads > 0) {
        await loadProjects(user.accessToken)

        setPendingFiles((current) =>
          current.filter((item) => !uploadedIds.includes(item.id)),
        )
      }

      setError(
        successfulUploads > 0
          ? `${successfulUploads} document(s) uploaded successfully. ${uploadError.message}`
          : uploadError.message ||
              'Could not upload documents. Please try again.',
      )
    } finally {
      setUploading(false)
    }
  }

  async function handleDownloadDocument(document) {
    if (!user?.accessToken) {
      setError('Your login session is missing. Please log in again.')
      return
    }

    setDownloadingId(document.id)
    setError('')

    try {
      const blob = await downloadDocument(
        user.accessToken,
        document.id,
      )

      const fileUrl = URL.createObjectURL(blob)
      const link = window.document.createElement('a')

      link.href = fileUrl
      link.download = document.name
      window.document.body.appendChild(link)
      link.click()
      link.remove()

      URL.revokeObjectURL(fileUrl)

      showToast('Document downloaded successfully.', 'success')
    } catch (downloadError) {
      setError(
        downloadError.message || 'Could not download this document.',
      )
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleRenameDocument(document) {
    const newName = renameName.trim()

    if (!newName) {
      setError('Please enter a document filename.')
      return
    }

    if (!user?.accessToken) {
      setError('Your login session is missing. Please log in again.')
      return
    }

    setRenamingId(document.id)
    setError('')

    try {
      await renameDocument(user.accessToken, document.id, newName)
      await loadProjects(user.accessToken)
      setEditingDocumentId(null)
      setRenameName('')
      showToast('Document renamed successfully.', 'success')
    } catch (renameError) {
      setError(renameError.message || 'Could not rename this document.')
    } finally {
      setRenamingId(null)
    }
  }

  async function handleRemoveDocument(document) {
    if (!selectedProject) return

    const confirmed = window.confirm(
      `Permanently delete "${document.name}" from this project?`,
    )

    if (!confirmed) return

    if (!user?.accessToken) {
      setError('Your login session is missing. Please log in again.')
      return
    }

    setDeletingId(document.id)
    setError('')

    try {
      await deleteDocument(user.accessToken, document.id)

      await loadProjects(user.accessToken)

      showToast('Document deleted successfully.', 'success')
    } catch (removeError) {
      setError(
        removeError.message || 'Could not delete this document.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  if (projects.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="folder"
          title="No projects available"
          description="Create a project before uploading its documents."
          action={
            <Button onClick={() => navigate('projects')}>
              View projects
            </Button>
          }
        />
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-300">
            <Icon name="folder-open" className="h-6 w-6" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-text-primary">
              Document Centre
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Manage project files and knowledge sources
            </p>
          </div>
        </div>

        <Badge tone="info">Manager Workspace</Badge>
      </div>

      {/* OVERVIEW METRICS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-text-secondary">
                Total Documents
              </p>
              <p className="mt-2 text-2xl font-bold text-text-primary">
                {totalDocuments}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Across all projects
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-sky-400/15 bg-sky-500/10 text-sky-300">
              <Icon name="file-text" className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-text-secondary">
                Total Projects
              </p>
              <p className="mt-2 text-2xl font-bold text-text-primary">
                {projects.length}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Managed project libraries
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-300">
              <Icon name="layers" className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium text-text-secondary">
                Active Libraries
              </p>
              <p className="mt-2 text-2xl font-bold text-text-primary">
                {projectsWithDocuments}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Projects with documents
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-500/10 text-emerald-300">
              <Icon name="folder-check" className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {/* UPLOAD DOCUMENTS */}
      <Card>
        <CardHeader
          title="Upload Documents"
          subtitle="Add one or multiple authorised documents to a project library."
          action={<Badge tone="info">Multi-project</Badge>}
        />

        <div className="space-y-5 p-6">
          {/* PROJECT SELECTION */}
          <div>
            <label
              htmlFor="document-project-select"
              className="mb-2 block text-sm font-semibold text-text-secondary"
            >
              Choose destination project
            </label>

            <div className="relative">
              <select
                id="document-project-select"
                value={selectedProjectId}
                onChange={(event) => selectProject(event.target.value)}
                className="w-full appearance-none rounded-xl border-2 border-violet-400/25 bg-violet-500/[0.07] px-4 py-3.5 pr-11 text-sm font-semibold text-text-primary outline-none transition hover:border-violet-400/50 focus:border-violet-500 focus:bg-surface focus:ring-4 focus:ring-violet-500/10"
              >
                <option value="">Choose a project...</option>

                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>

              <Icon
                name="chevron-down"
                className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-violet-300"
              />
            </div>

            {selectedProject ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone="success">
                  {selectedProject.status}
                </Badge>

                <span className="text-xs text-text-muted">
                  {selectedProject.documents?.length || 0} documents
                  currently in this library
                </span>
              </div>
            ) : (
              <p className="mt-2 text-xs font-medium text-violet-300">
                Select a project to enable document upload.
              </p>
            )}
          </div>

          {/* DROP ZONE AND SELECTED FILES */}
          <div
            onDragOver={(event) => {
              event.preventDefault()
              if (selectedProject) setDragging(true)
            }}
            onDragLeave={(event) => {
              event.preventDefault()
              setDragging(false)
            }}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              addFiles(event.dataTransfer.files)
            }}
            className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${
              !selectedProject
                ? 'cursor-not-allowed border-border bg-surface opacity-60'
                : dragging
                  ? 'border-violet-400 bg-violet-500/10'
                  : 'border-border-strong bg-surface/60 hover:border-violet-400/50 hover:bg-violet-500/[0.04]'
            }`}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-300 shadow-lg shadow-violet-950/20">
              <Icon name="cloud-upload" className="h-8 w-8" />
            </div>

            <h3 className="mt-4 text-base font-semibold text-text-primary">
              Upload to a project library
            </h3>

            <p className="mt-2 text-sm text-text-muted">
              {selectedProject
                ? `Selected destination: ${selectedProject.name}`
                : 'Choose a project above before uploading documents.'}
            </p>

            <div className="mt-5">
              <Button
                variant="secondary"
                disabled={!selectedProject || uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="folder-open" className="h-4 w-4" />
                Browse files
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              className="hidden"
              onChange={(event) => addFiles(event.target.files)}
            />

            {/* SELECTED FILES NOW APPEAR INSIDE THE DROP ZONE */}
            {pendingFiles.length > 0 ? (
              <div className="mt-6 text-left">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-text-primary">
                    Selected files ({pendingFiles.length})
                  </h3>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingFiles([])}
                    disabled={uploading}
                  >
                    Clear all
                  </Button>
                </div>

                <div className="space-y-3">
                  {pendingFiles.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-raised p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-violet-400/15 bg-violet-500/10 text-violet-300">
                        <Icon name="file-text" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {item.file.name}
                        </p>

                        <p className="text-xs text-text-muted">
                          {getFileType(item.file.name)} ·{' '}
                          {formatFileSize(item.file.size)}
                        </p>
                      </div>

                      <label className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                        <input
                          type="checkbox"
                          checked={item.authorised}
                          disabled={uploading}
                          onChange={() => toggleAuthorisation(item.id)}
                          className="h-4 w-4 rounded border-border-strong bg-surface text-violet-500 focus:ring-violet-500/30"
                        />
                        Authorised
                      </label>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={uploading}
                        onClick={() => removePendingFile(item.id)}
                      >
                        <Icon name="trash" className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>

                <Alert tone="info" className="mt-4">
                  Only files marked as authorised will be uploaded.
                  Confirm that you have permission to use each document.
                </Alert>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-text-muted">
                    {pendingFiles.filter((item) => item.authorised).length}{' '}
                    of {pendingFiles.length} files authorised
                  </p>

                  <Button
                    onClick={handleUpload}
                    loading={uploading}
                    disabled={
                      !pendingFiles.some((item) => item.authorised) ||
                      uploading
                    }
                  >
                    <Icon name="upload" className="h-4 w-4" />
                    Upload authorised documents
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {['PDF', 'DOCX', 'TXT', 'MD'].map((type) => (
                    <span
                      key={type}
                      className="rounded-md border border-border bg-surface-raised px-3 py-1 text-xs font-medium text-text-secondary"
                    >
                      {type}
                    </span>
                  ))}
                </div>

                <p className="mt-3 text-xs text-text-muted">
                  Maximum file size: 10 MB per document
                </p>
              </>
            )}
          </div>

          {/* AI INFORMATION */}
          <div className="flex items-start gap-3 rounded-xl border border-violet-400/20 bg-violet-500/[0.07] p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-violet-400/15 bg-violet-500/10 text-violet-300">
              <Icon name="sparkles" className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold text-text-primary">
                AI Knowledge Extraction
              </p>

              <p className="mt-1 text-xs leading-5 text-text-secondary">
                Uploaded documents are stored as authorised project
                knowledge sources. AI extraction and source-linked insights
                will use these documents during knowledge processing.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* PROJECT DOCUMENT LIBRARIES */}
      <Card>
        <CardHeader
          title="Project Document Libraries"
          subtitle={
            selectedProject
              ? 'Showing the selected project library.'
              : 'Choose a project to explore its document library.'
          }
          action={<Badge>{visibleProjects.length} projects</Badge>}
        />

        <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
          {visibleProjects.map((project) => {
            const documentCount = project.documents?.length || 0
            const isSelected = project.id === selectedProjectId

            return (
              <button
                key={project.id}
                type="button"
                onClick={() => selectProject(project.id)}
                aria-pressed={isSelected}
                className={`group rounded-xl border p-5 text-left transition ${
                  isSelected
                    ? 'border-violet-400/50 bg-violet-500/[0.08] ring-2 ring-violet-500/10'
                    : 'border-border bg-surface-raised hover:border-violet-400/30 hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      isSelected
                        ? 'border border-violet-400/20 bg-violet-500/15 text-violet-300'
                        : 'border border-border bg-surface-hover text-text-secondary'
                    }`}
                  >
                    <Icon name="folder" className="h-6 w-6" />
                  </div>

                  <div className="flex items-center gap-2">
                    {project.status && (
                      <Badge tone="success">{project.status}</Badge>
                    )}

                    {isSelected && (
                      <Icon
                        name="check-circle"
                        className="h-5 w-5 text-violet-300"
                      />
                    )}
                  </div>
                </div>

                <h3 className="mt-4 text-sm font-semibold text-text-primary">
                  {project.name}
                </h3>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <Icon name="files" className="h-4 w-4" />
                    {documentCount}{' '}
                    {documentCount === 1 ? 'document' : 'documents'}
                  </div>

                  <span className="flex items-center gap-1 text-xs font-semibold text-violet-300">
                    View library
                    <Icon name="chevron-right" className="h-4 w-4" />
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* SELECTED PROJECT DOCUMENTS */}
      <Card>
        <CardHeader
          title={
            selectedProject
              ? `${selectedProject.name} — Documents`
              : 'Project documents'
          }
          subtitle={
            selectedProject
              ? 'Manage documents registered in this project knowledge library.'
              : 'Select a project above to view and manage its documents.'
          }
          action={
            selectedProject && (
              <Badge tone="info">
                {selectedProject.documents?.length || 0} documents
              </Badge>
            )
          }
        />

        {!selectedProject ? (
          <div className="p-6">
            <EmptyState
              icon="folder"
              title="No project selected"
              description="Choose a project from the dropdown or project libraries above to view and manage its documents."
            />
          </div>
        ) : !selectedProject.documents?.length ? (
          <div className="p-6">
            <EmptyState
              icon="file"
              title="No documents in this library"
              description="Upload authorised documents above to build this project's knowledge library."
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {selectedProject.documents.map((document) => (
              <div
                key={document.id}
                className="flex flex-wrap items-center gap-3 px-6 py-4 transition hover:bg-surface-hover/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-violet-400/15 bg-violet-500/10 text-violet-300">
                  <Icon name="file-text" />
                </div>

                <div className="min-w-0 flex-1">
                  {editingDocumentId === document.id ? (
                    <input
                      type="text"
                      value={renameName}
                      onChange={(event) => setRenameName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleRenameDocument(document)
                        if (event.key === 'Escape') {
                          setEditingDocumentId(null)
                          setRenameName('')
                        }
                      }}
                      autoFocus
                      maxLength={255}
                      aria-label="New document filename"
                      className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15"
                    />
                  ) : (
                    <p className="truncate text-sm font-medium text-text-primary">
                      {document.name}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-text-muted">
                    {document.type} · {document.sizeKb} KB ·{' '}
                    {document.uploadedBy}
                  </p>

                  <p className="mt-1 text-xs text-text-faint">
                    Added {formatDate(document.uploadedAt)}
                  </p>
                </div>

                <Badge>{document.sourceId}</Badge>

                {editingDocumentId === document.id ? (
                  <>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={renamingId === document.id}
                      disabled={renamingId !== null || !renameName.trim()}
                      onClick={() => handleRenameDocument(document)}
                    >
                      Save
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={renamingId !== null}
                      onClick={() => {
                        setEditingDocumentId(null)
                        setRenameName('')
                        setError('')
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={editingDocumentId !== null || renamingId !== null || downloadingId !== null || deletingId !== null}
                      onClick={() => {
                        setEditingDocumentId(document.id)
                        setRenameName(document.name)
                        setError('')
                      }}
                    >
                      <Icon name="edit" className="h-4 w-4" />
                      Rename
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      loading={downloadingId === document.id}
                      disabled={editingDocumentId !== null || downloadingId !== null || deletingId !== null || renamingId !== null}
                      onClick={() => handleDownloadDocument(document)}
                    >
                      <Icon name="download" className="h-4 w-4" />
                      Download
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      loading={deletingId === document.id}
                      disabled={editingDocumentId !== null || deletingId !== null || downloadingId !== null || renamingId !== null}
                      onClick={() => handleRemoveDocument(document)}
                    >
                      <Icon name="trash" className="h-4 w-4" />
                      Remove
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
