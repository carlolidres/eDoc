import { routingTemplates } from '../data/placeholderData'

export function RoutingTemplatesPage() {
  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Reusable routes</span>
          <h2>Routing templates</h2>
          <p>Templates will store reviewers, approvers, signers, acknowledgments, reminders, escalations, and delegation rules.</p>
        </div>
        <button className="button primary" type="button" disabled>New template</button>
      </section>
      <section className="card-grid">
        {routingTemplates.map((template) => (
          <article className="panel template-card" key={template}>
            <strong>{template}</strong>
            <p>Template setup will be available after the routing schema is connected.</p>
          </article>
        ))}
      </section>
    </div>
  )
}
