import { EmptyState } from '../components/ui/EmptyState'

export function ReportsPage() {
  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Analytics</span>
          <h2>Reports</h2>
          <p>Authorized CSV and Excel exports will be generated from Hasura and Worker-backed report endpoints.</p>
        </div>
      </section>
      <section className="panel">
        <EmptyState title="No report data" description="Reports populate after document activity exists." />
      </section>
    </div>
  )
}
