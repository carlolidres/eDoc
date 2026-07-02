import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SignDialog, type SignDialogValues } from '../components/signing/SignDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { useAuth } from '../features/auth/AuthProvider'
import { useInboxAssignment } from '../hooks/useDocumentData'
import { useFilePreview } from '../hooks/useFilePreview'
import { useRouteAdvance } from '../hooks/useRouteAdvance'
import { useSignDocument } from '../hooks/useSignDocument'
import {
  advanceActionForRouteAction,
  completeActionLabel,
  routeActionLabel,
} from '../types/domain'

const PdfViewer = lazy(() => import('../components/pdf/PdfViewer').then((module) => ({ default: module.PdfViewer })))

export function SigningWorkspacePage() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const { user, accessToken } = useAuth()
  const { task, isLoading, isError, error } = useInboxAssignment(assignmentId)
  const preview = useFilePreview(task?.previewFileId ?? undefined)
  const advanceRoute = useRouteAdvance()
  const signDocument = useSignDocument()
  const [actionError, setActionError] = useState<string | null>(null)
  const [completedMessage, setCompletedMessage] = useState<string | null>(null)
  const [signDialogOpen, setSignDialogOpen] = useState(false)
  const [signError, setSignError] = useState<string | null>(null)

  const advanceAction = task ? advanceActionForRouteAction(task.action) : null
  const isSignTask = task?.action === 'sign'
  const defaultMeaning = isSignTask ? 'I approve the contents of this document.' : ''
  const defaultTypedSignature = user?.displayName ?? ''

  async function handleComplete() {
    if (!task || !advanceAction) return

    setActionError(null)
    setCompletedMessage(null)
    try {
      const result = await advanceRoute.mutateAsync({
        routeId: task.routeId,
        assigneeRowId: task.id,
        action: advanceAction,
      })
      const statusLabel = result.routeCompleted ? 'Route completed.' : 'Step completed.'
      setCompletedMessage(statusLabel)
      navigate('/inbox')
    } catch (advanceError) {
      setActionError(advanceError instanceof Error ? advanceError.message : 'Could not complete this action.')
    }
  }

  async function handleSign(values: SignDialogValues) {
    if (!task?.versionSha256) {
      setSignError('Document version hash is unavailable. Reload and try again.')
      return
    }

    setSignError(null)
    try {
      const result = await signDocument.mutateAsync({
        documentId: task.documentId,
        routeId: task.routeId,
        assigneeRowId: task.id,
        versionSha256: task.versionSha256,
        password: values.password,
        consent: values.consent,
        signatureMeaning: values.signatureMeaning,
        typedSignature: values.typedSignature,
      })
      setSignDialogOpen(false)
      setCompletedMessage(result.routeCompleted ? 'Document signed and route completed.' : 'Document signed.')
      navigate('/inbox')
    } catch (signFailure) {
      setSignError(signFailure instanceof Error ? signFailure.message : 'Signing failed.')
    }
  }

  if (!assignmentId) {
    return (
      <div className="page-stack">
        <EmptyState title="Assignment not found" description="Open a task from your inbox to continue." />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="page-stack">
        <EmptyState title="Loading assignment…" description="Fetching route step details." />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="page-stack">
        <EmptyState title="Could not load assignment" description={error?.message ?? 'Check Hasura permissions.'} />
      </div>
    )
  }

  if (!task) {
    return (
      <div className="page-stack">
        <EmptyState
          title="Assignment unavailable"
          description="This task may already be completed or you may not have access."
        />
        <Link className="button" to="/inbox">Back to inbox</Link>
      </div>
    )
  }

  return (
    <div className="workspace-layout">
      <aside className="panel side-panel">
        <span className="eyebrow">Route progress</span>
        <h2>{task.documentTitle}</h2>
        <p><strong>Action:</strong> {routeActionLabel(task.action)}</p>
        <p><strong>Due:</strong> {task.dueDate}</p>
        {task.previewFileName ? <p><strong>File:</strong> {task.previewFileName}</p> : null}
        {task.instructions ? <p><strong>Reference:</strong> {task.instructions}</p> : null}
        {actionError ? <p className="form-error" role="alert">{actionError}</p> : null}
        {completedMessage ? <p className="form-success" role="status">{completedMessage}</p> : null}
        <div className="button-row">
          <Link className="button secondary" to="/inbox">Back to inbox</Link>
          {isSignTask ? (
            <button
              className="button primary"
              type="button"
              disabled={!task.versionSha256 || signDocument.isPending}
              onClick={() => {
                setSignError(null)
                setSignDialogOpen(true)
              }}
            >
              {signDocument.isPending ? 'Signing…' : completeActionLabel(task.action)}
            </button>
          ) : advanceAction ? (
            <button
              className="button primary"
              type="button"
              disabled={advanceRoute.isPending}
              onClick={() => void handleComplete()}
            >
              {advanceRoute.isPending ? 'Completing…' : completeActionLabel(task.action)}
            </button>
          ) : null}
        </div>
      </aside>
      <section className="panel pdf-panel">
        {!task.previewFileId ? (
          <EmptyState
            title="PDF not available"
            description="This assignment does not have an uploaded PDF yet."
          />
        ) : preview.isLoading ? (
          <EmptyState title="Preparing preview…" description="Requesting a secure preview URL." />
        ) : preview.isError ? (
          <EmptyState title="Could not load preview" description={preview.error?.message ?? 'Worker preview failed.'} />
        ) : preview.data?.previewUrl && accessToken ? (
          <Suspense fallback={<EmptyState title="Loading viewer…" description="Starting PDF.js." />}>
            <PdfViewer url={preview.data.previewUrl} accessToken={accessToken} />
          </Suspense>
        ) : (
          <EmptyState title="Preview unavailable" description="Secure preview URL was not returned." />
        )}
      </section>

      <SignDialog
        open={signDialogOpen}
        defaultMeaning={defaultMeaning}
        defaultTypedSignature={defaultTypedSignature}
        isSubmitting={signDocument.isPending}
        error={signError}
        onCancel={() => setSignDialogOpen(false)}
        onSubmit={handleSign}
      />
    </div>
  )
}
