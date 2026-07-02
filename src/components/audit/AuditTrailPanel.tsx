import { EmptyState } from '../ui/EmptyState'
import { useDocumentAuditTrail } from '../../hooks/useDocumentAudit'

function formatEventType(eventType: string) {
  return eventType.replace(/\./g, ' · ')
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString()
}

export function AuditTrailPanel({ documentId }: { documentId: string }) {
  const { events, isLoading, isError, error } = useDocumentAuditTrail(documentId)

  if (isLoading) {
    return <EmptyState title="Loading audit trail…" description="Fetching append-only events for this document." />
  }

  if (isError) {
    return (
      <EmptyState
        title="Audit trail unavailable"
        description={error?.message ?? 'Check Hasura audit_events permissions.'}
      />
    )
  }

  if (!events.length) {
    return <EmptyState title="No audit events yet" description="Activity will appear here as the route progresses." />
  }

  return (
    <div className="audit-trail">
      <ul className="audit-trail-list">
        {events.map((event) => (
          <li key={event.id} className="audit-trail-item">
            <div className="audit-trail-item-header">
              <strong>{formatEventType(event.event_type)}</strong>
              <span>{formatTimestamp(event.created_at)}</span>
            </div>
            <p>
              {event.user?.display_name ?? 'System'}
              {event.source ? ` · ${event.source}` : ''}
            </p>
            {event.reason ? <p className="audit-trail-reason">{event.reason}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
