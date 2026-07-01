import { Activity, AlertTriangle, CheckCircle2, Clock, FileText, Inbox, RotateCcw, Send } from 'lucide-react'
import { dashboardMetrics } from '../data/placeholderData'
import { EmptyState } from '../components/ui/EmptyState'

const cards = [
  { label: 'Awaiting my action', value: dashboardMetrics.awaitingMyAction, icon: Inbox, tone: 'blue' },
  { label: 'My drafts', value: dashboardMetrics.myDrafts, icon: FileText, tone: 'neutral' },
  { label: 'In routing', value: dashboardMetrics.inRouting, icon: Send, tone: 'teal' },
  { label: 'Due soon', value: dashboardMetrics.dueSoon, icon: Clock, tone: 'amber' },
  { label: 'Overdue', value: dashboardMetrics.overdue, icon: AlertTriangle, tone: 'red' },
  { label: 'Returned', value: dashboardMetrics.returned, icon: RotateCcw, tone: 'violet' },
  { label: 'Rejected', value: dashboardMetrics.rejected, icon: AlertTriangle, tone: 'red' },
  { label: 'Completed', value: dashboardMetrics.completed, icon: CheckCircle2, tone: 'green' },
]

export function DashboardPage() {
  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Operational overview</span>
          <h2>Document routing dashboard</h2>
          <p>Live metrics will come from Hasura once Nhost is configured. No permanent production mock data is wired here.</p>
        </div>
        <button className="button primary" type="button" disabled>Create document</button>
      </section>

      <section className="metric-grid">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <article className="metric-card" key={card.label}>
              <span className={`metric-icon tone-${card.tone}`}><Icon size={20} /></span>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </article>
          )
        })}
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Throughput</span>
              <h3>Monthly document volume</h3>
            </div>
          </div>
          <EmptyState title="No document volume yet" description="Connect Hasura and create routed documents to populate this chart." />
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
