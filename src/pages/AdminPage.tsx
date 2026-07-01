const sections = ['Users', 'Roles', 'Permissions', 'Organizations', 'Departments', 'Document types', 'Routing templates', 'Security settings', 'Session settings', 'Audit reports']

export function AdminPage() {
  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Administration</span>
          <h2>System administration</h2>
          <p>Configuration pages are scaffolded but disabled until Hasura permissions and Worker operations are ready.</p>
        </div>
      </section>
      <section className="card-grid">
        {sections.map((section) => (
          <article className="panel template-card" key={section}>
            <strong>{section}</strong>
            <p>Planned module.</p>
          </article>
        ))}
      </section>
    </div>
  )
}
