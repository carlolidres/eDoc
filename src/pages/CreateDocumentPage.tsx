const steps = ['Document information', 'Upload', 'Recipients and routing', 'PDF field placement', 'Review and send']

export function CreateDocumentPage() {
  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Wizard</span>
          <h2>Create document</h2>
          <p>This scaffold defines the full workflow while keeping unavailable actions disabled until storage and Hasura are connected.</p>
        </div>
      </section>
      <section className="panel">
        <div className="stepper">
          {steps.map((step, index) => (
            <div className={index === 0 ? 'step in-progress' : 'step'} key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
        <form className="form-grid">
          <label>Title<input placeholder="Document title" disabled /></label>
          <label>Reference number<input placeholder="Reference number" disabled /></label>
          <label>Document type<input placeholder="Document type" disabled /></label>
          <label>Department<input placeholder="Department" disabled /></label>
          <label className="span-2">Description<textarea placeholder="Description" disabled /></label>
          <div className="button-row span-2">
            <button className="button primary" type="button" disabled>Continue to upload</button>
          </div>
        </form>
      </section>
    </div>
  )
}
