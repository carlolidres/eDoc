import { useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { TaskActionButtons } from '../components/inbox/TaskActionButtons'
import { useAuth } from '../features/auth/AuthProvider'
import { useInboxTasksData } from '../hooks/useDocumentData'
import { useRouteAdvance } from '../hooks/useRouteAdvance'
import { advanceActionForRouteAction, routeActionLabel, type InboxTask } from '../types/domain'

export function InboxPage() {
  const { usesNhost } = useAuth()
  const { tasks, isLoading, isError, error } = useInboxTasksData()
  const advanceRoute = useRouteAdvance()
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleAdvance(task: InboxTask) {
    const action = advanceActionForRouteAction(task.action)
    if (!action) return

    setActionError(null)
    setActiveTaskId(task.id)
    try {
      await advanceRoute.mutateAsync({
        routeId: task.routeId,
        assigneeRowId: task.id,
        action,
      })
    } catch (advanceError) {
      setActionError(advanceError instanceof Error ? advanceError.message : 'Could not complete this action.')
    } finally {
      setActiveTaskId(null)
    }
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Assigned work</span>
          <h2>My Inbox</h2>
          <p>Review, approval, signature, and acknowledgment tasks assigned to you.</p>
        </div>
      </section>
      <section className="panel">
        {actionError ? (
          <p className="form-error" role="alert">{actionError}</p>
        ) : null}
        {isLoading ? (
          <EmptyState title="Loading inbox…" description="Fetching your assigned route steps." />
        ) : isError ? (
          <EmptyState title="Could not load inbox" description={error?.message ?? 'Check Hasura permissions.'} />
        ) : !usesNhost ? (
          <EmptyState title="Nhost not configured" description="Set Nhost env values to load live inbox data." />
        ) : tasks.length === 0 ? (
          <EmptyState title="No assignments" description="Assignments will appear here after routes are sent to you." />
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Document</th><th>Action</th><th>Due</th><th>Reference</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <Link to={`/sign/${task.id}`}>{task.documentTitle}</Link>
                  </td>
                  <td>{routeActionLabel(task.action)}</td>
                  <td>{task.dueDate}</td>
                  <td>{task.instructions || '—'}</td>
                  <td>
                    <TaskActionButtons
                      task={task}
                      isAdvancing={activeTaskId === task.id}
                      onAdvance={handleAdvance}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
