import { useMemo } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { useRecentAuditEvents } from '../hooks/useDocumentAudit'

function formatEventType(eventType: string) {
  return eventType.replace(/\./g, ' · ')
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function ReportsPage() {
  const { events, isLoading, isError, error } = useRecentAuditEvents()

  const exportRows = useMemo(
    () => [
      ['Event', 'Document', 'Actor', 'Source', 'Integrity hash', 'Timestamp'],
      ...events.map((event) => [
        formatEventType(event.event_type),
        event.document?.title ?? event.document_id ?? '',
        event.user?.display_name ?? 'System',
        event.source,
        event.integrity_hash ?? '',
        new Date(event.created_at).toISOString(),
      ]),
    ],
    [events],
  )

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Analytics</span>
          <h2>Reports</h2>
          <p>Authorized audit activity and export. Auditors see organization-wide events.</p>
        </div>
        <button
          className="button"
          type="button"
          disabled={!events.length}
          onClick={() => downloadCsv('edoc-audit-events.csv', exportRows)}
        >
          Export CSV
        </button>
      </section>
      <section className="panel">
        {isLoading ? (
          <EmptyState title="Loading audit events…" description="Fetching recent activity from Hasura." />
        ) : isError ? (
          <EmptyState
            title="Could not load audit events"
            description={error?.message ?? 'Check Hasura audit_events permissions.'}
          />
        ) : !events.length ? (
          <EmptyState title="No audit activity yet" description="Reports populate after document workflow events exist." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Document</th>
                <th>Actor</th>
                <th>Source</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{formatEventType(event.event_type)}</td>
                  <td>{event.document?.title ?? '—'}</td>
                  <td>{event.user?.display_name ?? 'System'}</td>
                  <td>{event.source}</td>
                  <td>{new Date(event.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
