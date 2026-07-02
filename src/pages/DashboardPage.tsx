import { Activity, AlertTriangle, CheckCircle2, Clock, FileText, Inbox, RotateCcw, Send } from 'lucide-react'
import { EmptyState } from '../components/ui/EmptyState'
import { useAuth } from '../features/auth/AuthProvider'
import { useDashboardMetricsData } from '../hooks/useDocumentData'

export function DashboardPage() {
  const { usesNhost } = useAuth()
  const { metrics, isLoading, isError, error } = useDashboardMetricsData()

  const cards = [
    { label: 'Awaiting my action', value: metrics.awaitingMyAction, icon: Inbox, tone: 'blue' },
    { label: 'My drafts', value: metrics.myDrafts, icon: FileText, tone: 'neutral' },
    { label: 'In routing', value: metrics.inRouting, icon: Send, tone: 'teal' },
    { label: 'Due soon', value: metrics.dueSoon, icon: Clock, tone: 'amber' },
    { label: 'Overdue', value: metrics.overdue, icon: AlertTriangle, tone: 'red' },
    { label: 'Returned', value: metrics.returned, icon: RotateCcw, tone: 'violet' },
    { label: 'Rejected', value: metrics.rejected, icon: AlertTriangle, tone: 'red' },
    { label: 'Completed', value: metrics.completed, icon: CheckCircle2, tone: 'green' },
  ]

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Operational overview</span>
          <h2>Document routing dashboard</h2>
          <p>Live metrics from Hasura for documents you own and assignments in your inbox.</p>
        </div>
        <button className="button primary" type="button" disabled>Create document</button>
      </section>

      {isError ? (
        <EmptyState title="Could not load metrics" description={error?.message ?? 'Check Hasura configuration.'} />
      ) : (
        <section className="metric-grid">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <article className="metric-card" key={card.label}>
                <span className={`metric-icon tone-${card.tone}`}><Icon size={20} /></span>
                <span>{card.label}</span>
                <strong>{isLoading ? '…' : card.value}</strong>
              </article>
            )
          })}
        </section>
      )}

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Throughput</span>
              <h3>Monthly document volume</h3>
            </div>
          </div>
          <EmptyState
            title="Chart not configured"
            description={usesNhost ? 'Volume analytics will be added in a later reporting phase.' : 'Connect Nhost to enable live metrics.'}
          />
        </article>
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Bottlenecks</span>
              <h3>Current route bottlenecks</h3>
            </div>
            <Activity size={18} />
          </div>
          <EmptyState title="No active bottlenecks" description="Routing analytics will appear after assignments are active." />
        </article>
      </section>
    </div>
  )
}
