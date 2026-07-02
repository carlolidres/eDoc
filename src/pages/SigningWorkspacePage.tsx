import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { useInboxAssignment } from '../hooks/useDocumentData'
import { useRouteAdvance } from '../hooks/useRouteAdvance'
import {
  advanceActionForRouteAction,
  completeActionLabel,
  routeActionLabel,
} from '../types/domain'

export function SigningWorkspacePage() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const { task, isLoading, isError, error } = useInboxAssignment(assignmentId)
  const advanceRoute = useRouteAdvance()
  const [actionError, setActionError] = useState<string | null>(null)
  const [completedMessage, setCompletedMessage] = useState<string | null>(null)

  const advanceAction = task ? advanceActionForRouteAction(task.action) : null

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
        {task.instructions ? <p><strong>Reference:</strong> {task.instructions}</p> : null}
        {actionError ? <p className="form-error" role="alert">{actionError}</p> : null}
        {completedMessage ? <p className="form-success" role="status">{completedMessage}</p> : null}
        <div className="button-row">
          <Link className="button secondary" to="/inbox">Back to inbox</Link>
          {advanceAction ? (
            <button
              className="button primary"
              type="button"
              disabled={advanceRoute.isPending}
              onClick={() => void handleComplete()}
            >
              {advanceRoute.isPending ? 'Completing…' : completeActionLabel(task.action)}
            </button>
          ) : (
            <button className="button primary" type="button" disabled>
              Signing workspace coming soon
            </button>
          )}
        </div>
      </aside>
      <section className="panel pdf-panel">
        <div className="pdf-toolbar">
          <button className="button" type="button" disabled>Zoom out</button>
          <button className="button" type="button" disabled>Zoom in</button>
        </div>
        <EmptyState
          title="PDF viewer not connected"
          description="PDF.js rendering and signing controls will be enabled after secure preview URLs are implemented."
        />
      </section>
    </div>
  )
}
