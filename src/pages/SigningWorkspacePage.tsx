import { EmptyState } from '../components/ui/EmptyState'

export function SigningWorkspacePage() {
  return (
    <div className="workspace-layout">
      <aside className="panel side-panel">
        <span className="eyebrow">Route progress</span>
        <h2>Assignment</h2>
        <p>Recipient list, instructions, comments, and audit activity will appear here.</p>
      </aside>
      <section className="panel pdf-panel">
        <div className="pdf-toolbar">
          <button className="button" type="button" disabled>Zoom out</button>
          <button className="button" type="button" disabled>Zoom in</button>
          <button className="button primary" type="button" disabled>Complete action</button>
        </div>
        <EmptyState title="PDF viewer not connected" description="PDF.js rendering, field navigation, and signing controls will be enabled after secure preview URLs are implemented." />
      </section>
    </div>
  )
}
