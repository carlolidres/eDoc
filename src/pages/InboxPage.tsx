import { EmptyState } from '../components/ui/EmptyState'
import { useAuth } from '../features/auth/AuthProvider'
import { useInboxTasksData } from '../hooks/useDocumentData'

export function InboxPage() {
  const { usesNhost } = useAuth()
  const { tasks, isLoading, isError, error } = useInboxTasksData()

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
              <tr><th>Document</th><th>Action</th><th>Due</th><th>Reference</th></tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.documentTitle}</td>
                  <td>{task.action}</td>
                  <td>{task.dueDate}</td>
                  <td>{task.instructions || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
