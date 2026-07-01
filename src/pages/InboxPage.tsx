import { EmptyState } from '../components/ui/EmptyState'
import { sampleInboxTasks } from '../data/placeholderData'

export function InboxPage() {
  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Assigned work</span>
          <h2>My Inbox</h2>
          <p>Review, approval, signature, acknowledgment, returned, delegated, and overdue tasks.</p>
        </div>
      </section>
      <section className="panel">
        {sampleInboxTasks.length === 0 ? (
          <EmptyState title="No assignments" description="Assignments will appear here after routes are sent." />
        ) : null}
      </section>
    </div>
  )
}
