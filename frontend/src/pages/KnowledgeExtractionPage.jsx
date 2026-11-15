
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../hooks/useApp'
import { extractProjectKnowledge } from '../services/knowledgeService'

function PipelineStep({ number, title, description, completed, active }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          completed
            ? 'bg-emerald-500/15 text-emerald-300'
            : active
              ? 'bg-violet-600 text-white'
              : 'bg-surface-hover text-text-muted'
        }`}
      >
        {completed ? '✓' : number}
      </div>

      <div className="min-w-0 pt-0.5">
        <p
          className={`text-sm font-semibold ${
            active || completed ? 'text-text-primary' : 'text-text-muted'
          }`}
        >
          {title}
        </p>
        <p className="mt-1 text-xs leading-5 text-text-muted">
          {description}
        </p>
      </div>
    </div>
  )
}

function SourceCard({ title, description, count, icon, available }) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <p className="mt-1 text-xs leading-5 text-text-muted">
            {description}
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-hover text-xl">
          {icon}
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-bold tracking-tight text-text-primary">
            {count}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {count === 1 ? 'Available record' : 'Available records'}
          </p>
        </div>

        <span
          className={`mb-1 rounded-full px-2.5 py-1 text-xs font-medium ${
            available
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-surface-hover text-text-muted'
          }`}
        >
          {available ? 'Available' : 'No records yet'}
        </span>
      </div>
    </div>
  )
}

function ReportStat({ label, value, description }) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised p-5">
      <p className="text-sm font-medium text-text-muted">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-text-primary">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-text-muted">
        {description}
      </p>
    </div>
  )
}

function DocumentErrorList({ errors }) {
  if (!errors?.length) return null

  return (
    <div className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-5">
      <div className="flex items-start gap-3">
        <span className="text-lg text-amber-300">!</span>
        <div className="min-w-0">
          <h3 className="font-semibold text-amber-200">
            Some documents need attention
          </h3>
          <p className="mt-1 text-sm leading-6 text-amber-300/90">
            The extraction service returned the following document errors.
            Other successfully processed sources are not affected by these
            individual errors.
          </p>
        </div>
      </div>

      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-amber-200">
        {errors.map((item, index) => (
          <li key={index} className="break-words">
            {typeof item === 'string'
              ? item
              : item.message ||
                item.document_name ||
                JSON.stringify(item)}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function KnowledgeExtractionPage() {
  const {
    projects = [],
    params,
    user,
    loadProjects,
    navigate,
  } = useApp()

  const [selectedProjectId, setSelectedProjectId] = useState(
    params.projectId || '',
  )
  const [extracting, setExtracting] = useState(false)
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setSelectedProjectId(params.projectId || '')
    setResult(null)
    setErrorMessage('')
  }, [params.projectId])

  const project = useMemo(
    () => projects.find((item) => item.id === selectedProjectId),
    [projects, selectedProjectId],
  )

  const journals = project?.journalEntries || []
  const documents = project?.documents || []
  const knowledgeItems = project?.knowledge?.items || []

  const hasSources = journals.length > 0 || documents.length > 0

  function handleProjectChange(event) {
    setSelectedProjectId(event.target.value)
    setResult(null)
    setErrorMessage('')
  }

  async function handleExtraction() {
    if (!project || !user?.accessToken) {
      setErrorMessage('Please log in again and select a project.')
      return
    }

    setExtracting(true)
    setResult(null)
    setErrorMessage('')

    try {
      const response = await extractProjectKnowledge(
        user.accessToken,
        project.id,
      )

      await loadProjects(user.accessToken)

      setResult({
        message: response.message || 'Knowledge extraction completed.',
        journals: response.journals_processed ?? 0,
        documents: response.documents_processed ?? 0,
        findings: response.findings_created ?? 0,
        documentErrors: response.document_errors || [],
        method: response.extraction_method || 'rule_based',
      })
    } catch (error) {
      setErrorMessage(
        error.message || 'Unable to extract project knowledge.',
      )
    } finally {
      setExtracting(false)
    }
  }

  function openInsights() {
    if (!project) return

    navigate('insights', {
      projectId: project.id,
    })
  }

  function openKnowledgeGraph() {
    if (!project) return

    navigate('knowledge-graph', {
      projectId: project.id,
    })
  }

  function openHandoverReview() {
    if (!project) return

    navigate('review', {
      projectId: project.id,
    })
  }

  if (!projects.length) {
    return (
      <div className="rounded-xl border border-border bg-surface-raised p-8 text-center">
        <div className="text-3xl">📁</div>
        <h3 className="mt-3 font-semibold text-text-primary">
          No projects available
        </h3>
        <p className="mt-1 text-sm text-text-muted">
          Create a project before extracting its knowledge.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Page heading */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-lg text-violet-300">
              ✦
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-300">
              Manager Workspace
            </span>
          </div>

          <h2 className="mt-3 text-2xl font-bold tracking-tight text-text-primary">
            Knowledge Extraction
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
            Turn authorised project journals and documents into structured
            knowledge. Review the extraction report, then explore the
            resulting findings in Knowledge Insights.
          </p>
        </div>
      </section>

      {/* Process pipeline */}
      <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10">
        <div className="mb-5">
          <h3 className="text-sm font-bold text-text-primary">
            Extraction workflow
          </h3>
          <p className="mt-1 text-xs text-text-muted">
            From project sources to structured knowledge.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <PipelineStep
            number="1"
            title="Select project"
            description="Choose the project to process."
            completed={Boolean(project)}
            active={!project}
          />

          <PipelineStep
            number="2"
            title="Check sources"
            description="Review available journals and documents."
            completed={Boolean(project && hasSources)}
            active={Boolean(project && !result)}
          />

          <PipelineStep
            number="3"
            title="Extract knowledge"
            description="Process sources and generate findings."
            completed={Boolean(result)}
            active={Boolean(project && extracting)}
          />

          <PipelineStep
            number="4"
            title="Explore insights"
            description="Review and use the structured findings."
            completed={false}
            active={Boolean(result)}
          />
        </div>
      </section>

      {/* Project selection */}
      <section className="rounded-xl border border-border bg-surface-raised p-5 shadow-lg shadow-black/10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
              Step 01
            </p>
            <h3 className="mt-1 text-base font-bold text-text-primary">
              Select a project
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Knowledge extraction runs separately for each project.
            </p>
          </div>

          {project && (
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
              Project selected
            </span>
          )}
        </div>

        <select
          value={selectedProjectId}
          onChange={handleProjectChange}
          className="mt-4 w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-primary outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
        >
          <option value="">Choose a project...</option>
          {projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        {project && (
          <div className="mt-3 rounded-lg border border-border bg-surface px-4 py-3">
            <p className="text-sm font-semibold text-text-primary">
              {project.name}
            </p>
            {project.description && (
              <p className="mt-1 text-xs leading-5 text-text-muted">
                {project.description}
              </p>
            )}
          </div>
        )}
      </section>

      {!project ? (
        <section className="rounded-xl border border-dashed border-border bg-surface-raised px-5 py-14 text-center">
          <div className="text-4xl">🧠</div>
          <h3 className="mt-3 font-semibold text-text-primary">
            Your extraction workspace is ready
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-text-muted">
            Select a project above to see its available knowledge sources and
            start processing them.
          </p>
        </section>
      ) : (
        <>
          {/* Source readiness */}
          <section className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
                Step 02
              </p>
              <h3 className="mt-1 text-base font-bold text-text-primary">
                Source readiness
              </h3>
              <p className="mt-1 text-sm leading-6 text-text-muted">
                These are the project records currently available to the
                extraction service.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SourceCard
                title="Employee Journals"
                description="Daily work, completed tasks, decisions, blockers, dependencies and next steps."
                count={journals.length}
                icon="📘"
                available={journals.length > 0}
              />

              <SourceCard
                title="Project Documents"
                description="Files uploaded to this project's document library."
                count={documents.length}
                icon="📄"
                available={documents.length > 0}
              />
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  Existing structured knowledge
                </p>
                <p className="mt-1 text-xs leading-5 text-text-muted">
                  Previously extracted findings are checked to avoid creating
                  duplicate records.
                </p>
              </div>

              <p className="shrink-0 text-2xl font-bold tabular-nums text-text-primary">
                {knowledgeItems.length}
                <span className="ml-2 text-xs font-medium text-text-muted">
                  findings
                </span>
              </p>
            </div>
          </section>

          {/* Extraction action */}
          <section className="rounded-xl border border-violet-500/20 bg-surface-raised p-5 shadow-lg shadow-black/10 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
                  Step 03
                </p>
                <h3 className="mt-1 text-base font-bold text-text-primary">
                  Extract project knowledge
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                  Process the selected project's available journals and
                  supported documents to identify completed work, decisions,
                  blockers, dependencies, pending tasks and next steps.
                </p>
              </div>

              <span className="rounded-full bg-surface-hover px-3 py-1 text-xs font-medium text-text-secondary">
                Rule-based processing
              </span>
            </div>

            {!hasSources && (
              <div className="mt-4 rounded-lg border border-amber-400/25 bg-amber-500/10 p-4">
                <p className="text-sm font-semibold text-amber-200">
                  No sources available yet
                </p>
                <p className="mt-1 text-sm leading-5 text-amber-300/90">
                  Add employee journal entries or project documents before
                  running extraction.
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExtraction}
                disabled={extracting || !hasSources}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {extracting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Processing project knowledge...
                  </>
                ) : (
                  <>
                    <span>✦</span>
                    Extract Project Knowledge
                  </>
                )}
              </button>

              {result && (
                <button
                  type="button"
                  onClick={openInsights}
                  className="rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-text-secondary transition hover:border-violet-500/30 hover:bg-surface-hover hover:text-text-primary"
                >
                  View Knowledge Insights →
                </button>
              )}
            </div>

            {extracting && (
              <p className="mt-3 text-sm text-violet-300">
                Please wait while the available project records are processed.
              </p>
            )}

            {errorMessage && (
              <div className="mt-4 rounded-lg border border-red-400/25 bg-red-500/10 p-4">
                <p className="text-sm font-semibold text-red-300">
                  Extraction could not be completed
                </p>
                <p className="mt-1 text-sm leading-6 text-red-300/90">
                  {errorMessage}
                </p>
              </div>
            )}
          </section>

          {/* Extraction report */}
          {result && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    Step 04
                  </p>
                  <h3 className="mt-1 text-base font-bold text-text-primary">
                    Extraction report
                  </h3>
                  <p className="mt-1 text-sm text-text-muted">
                    Results returned by the extraction service.
                  </p>
                </div>

                <span className="rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                  Extraction completed
                </span>
              </div>

              <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 font-bold text-emerald-300">
                    ✓
                  </span>
                  <div>
                    <h4 className="font-semibold text-emerald-200">
                      Processing finished
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-emerald-300/90">
                      {result.message}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <ReportStat
                  label="Journals processed"
                  value={result.journals}
                  description="Project journal records processed"
                />
                <ReportStat
                  label="Documents processed"
                  value={result.documents}
                  description="Supported project documents processed"
                />
                <ReportStat
                  label="New findings created"
                  value={result.findings}
                  description="New structured knowledge records"
                />
              </div>

              <DocumentErrorList errors={result.documentErrors} />

              <div className="rounded-xl border border-border bg-surface-raised p-5">
                <div className="flex items-start gap-3">
                  <span className="text-lg text-sky-300">ⓘ</span>
                  <div>
                    <h4 className="text-sm font-semibold text-text-primary">
                      About this extraction
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-text-muted">
                      {result.method === 'rule_based'
                        ? 'This run used rule-based extraction from supported journal fields and document text. Advanced semantic AI analysis is not currently enabled.'
                        : `Extraction method: ${result.method}`}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-text-muted">
                      Previously extracted findings are checked to avoid
                      duplicate records. A run can process sources without
                      creating additional findings.
                    </p>
                  </div>
                </div>
              </div>

              {/* Next steps */}
              <div className="rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-surface-raised to-indigo-500/10 p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
                  Continue your workflow
                </p>
                <h4 className="mt-2 text-lg font-bold text-text-primary">
                  Your project's knowledge is ready to explore
                </h4>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
                  Extraction turns raw project records into structured
                  knowledge. Explore the findings, examine their relationships
                  and use them during the handover process.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={openInsights}
                    className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
                  >
                    Explore Knowledge Insights →
                  </button>

                  <button
                    type="button"
                    onClick={openKnowledgeGraph}
                    className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-violet-500/30 hover:bg-surface-hover hover:text-text-primary"
                  >
                    Knowledge Graph
                  </button>

                  <button
                    type="button"
                    onClick={openHandoverReview}
                    className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:border-violet-500/30 hover:bg-surface-hover hover:text-text-primary"
                  >
                    Handover Review
                  </button>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
