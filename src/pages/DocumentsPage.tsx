import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useAuth } from '../features/auth/AuthProvider'
import { useDocumentListItems } from '../hooks/useDocumentData'

export function DocumentsPage() {
  const { usesNhost } = useAuth()
  const { items, isLoading, isError, error } = useDocumentListItems()

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Document registry</span>
          <h2>All documents</h2>
          <p>Authorized documents from Hasura for your account.</p>
        </div>
        <Link className="button primary" to="/documents/new">New document</Link>
      </section>

      <section className="panel">
        <div className="toolbar">
          <input aria-label="Search documents" placeholder="Search by title, reference, owner, or department" disabled />
          <button className="button" type="button" disabled>Filters</button>
          <button className="button" type="button" disabled>Columns</button>
          <button className="button" type="button" disabled>Export</button>
        </div>
        {isLoading ? (
          <EmptyState title="Loading documents…" description="Fetching authorized records from Hasura." />
        ) : isError ? (
          <EmptyState
            title="Could not load documents"
            description={error?.message ?? 'Check Hasura permissions and profile mapping.'}
          />
        ) : !usesNhost ? (
          <EmptyState title="Nhost not configured" description="Set Nhost env values to load live document data." />
        ) : items.length === 0 ? (
          <EmptyState title="No documents yet" description="Create a document or ensure your profile is linked in the database." />
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Title</th><th>Status</th><th>Owner</th><th>Department</th><th>Due</th></tr>
            </thead>
            <tbody>
              {items.map((document) => (
                <tr key={document.id}>
                  <td>{document.title}</td>
                  <td><StatusBadge status={document.status} /></td>
                  <td>{document.owner}</td>
                  <td>{document.department}</td>
                  <td>{document.dueDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
