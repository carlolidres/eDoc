import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { useAuth } from '../features/auth/AuthProvider'
import {
  CREATE_DOCUMENT,
  CREATE_DOCUMENT_ROUTE,
  CREATE_DOCUMENT_VERSION,
  UPDATE_DOCUMENT_STATUS,
  type CreateDocumentResponse,
  type CreateDocumentRouteResponse,
  type CreateDocumentVersionResponse,
  type UpdateDocumentStatusResponse,
} from '../graphql/mutations'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { useGraphQLMutation } from '../hooks/useGraphQLMutation'
import { useOrgProfiles } from '../hooks/useOrgProfiles'
import {
  completeDocumentUpload,
  MAX_PDF_BYTES,
  requestUploadUrl,
  uploadPdfToWorker,
} from '../lib/documentUpload'
import { startDocumentRoute } from '../lib/workerApi'
import type { RouteAction } from '../types/domain'
import { validatePdfFile } from '../utils/fileValidation'

const steps = ['Document information', 'Upload', 'Recipients and routing', 'PDF field placement', 'Review and send']

const routeActions: RouteAction[] = ['review', 'approve', 'sign', 'acknowledge']

interface MetadataForm {
  title: string
  referenceNumber: string
  documentType: string
  department: string
  description: string
}

interface RouteStepDraft {
  id: string
  action: RouteAction
  assigneeId: string
  dueAt: string
}

const emptyMetadata: MetadataForm = {
  title: '',
  referenceNumber: '',
  documentType: '',
  department: '',
  description: '',
}

function newRouteStep(): RouteStepDraft {
  return { id: crypto.randomUUID(), action: 'review', assigneeId: '', dueAt: '' }
}

export function CreateDocumentPage() {
  const { accessToken, usesNhost } = useAuth()
  const { profile, isLoading: profileLoading, isError: profileError, error: profileQueryError } = useCurrentProfile()
  const { profiles: orgProfiles, isLoading: profilesLoading } = useOrgProfiles()
  const createDocument = useGraphQLMutation<CreateDocumentResponse, { object: Record<string, unknown> }>(CREATE_DOCUMENT)
  const createVersion = useGraphQLMutation<CreateDocumentVersionResponse, { object: Record<string, unknown> }>(
    CREATE_DOCUMENT_VERSION,
  )
  const createRoute = useGraphQLMutation<CreateDocumentRouteResponse, { object: Record<string, unknown> }>(
    CREATE_DOCUMENT_ROUTE,
  )
  const updateStatus = useGraphQLMutation<UpdateDocumentStatusResponse, { id: string; status: string }>(
    UPDATE_DOCUMENT_STATUS,
  )

  const [activeStep, setActiveStep] = useState(0)
  const [metadata, setMetadata] = useState<MetadataForm>(emptyMetadata)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [versionId, setVersionId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [routeSteps, setRouteSteps] = useState<RouteStepDraft[]>([newRouteStep()])
  const [isSavingRoute, setIsSavingRoute] = useState(false)
  const [routeSaved, setRouteSaved] = useState(false)
  const [routeStarted, setRouteStarted] = useState(false)

  const organizationId = profile?.organization_id ?? null
  const canUseWizard = usesNhost && Boolean(organizationId) && Boolean(accessToken)

  function updateRouteStep(stepId: string, patch: Partial<RouteStepDraft>) {
    setRouteSteps((current) => current.map((step) => (step.id === stepId ? { ...step, ...patch } : step)))
  }

  function addRouteStep() {
    setRouteSteps((current) => [...current, newRouteStep()])
  }

  function removeRouteStep(stepId: string) {
    setRouteSteps((current) => (current.length <= 1 ? current : current.filter((step) => step.id !== stepId)))
  }

  async function handleMetadataSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)

    if (!canUseWizard || !organizationId || !profile) {
      setFormError('Sign in with Nhost and ensure your profile is linked to an organization.')
      return
    }
    if (!metadata.title.trim()) {
      setFormError('Title is required.')
      return
    }

    try {
      const document = await createDocument.mutateAsync({
        object: {
          organization_id: organizationId,
          title: metadata.title.trim(),
          reference_number: metadata.referenceNumber.trim() || null,
          description: metadata.description.trim(),
          status: 'draft',
          priority: 'normal',
          confidentiality: 'internal',
        },
      })

      const createdDocument = document.insert_documents_one
      if (!createdDocument) throw new Error('Document was not created.')

      const version = await createVersion.mutateAsync({
        object: {
          organization_id: organizationId,
          document_id: createdDocument.id,
          version_number: 1,
          status: 'draft',
        },
      })

      const createdVersion = version.insert_document_versions_one
      if (!createdVersion) throw new Error('Document version was not created.')

      setDocumentId(createdDocument.id)
      setVersionId(createdVersion.id)
      setActiveStep(1)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save document metadata.')
    }
  }

  async function handleUploadSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)

    if (!canUseWizard || !accessToken || !organizationId || !documentId || !versionId) {
      setFormError('Document draft is missing. Go back and save metadata first.')
      return
    }
    if (!selectedFile) {
      setFormError('Select a PDF file to upload.')
      return
    }

    const validationError = validatePdfFile(selectedFile, MAX_PDF_BYTES)
    if (validationError) {
      setFormError(validationError)
      return
    }

    setIsUploading(true)
    try {
      const fileId = crypto.randomUUID()
      const upload = await requestUploadUrl(accessToken, {
        organizationId,
        documentId,
        versionId,
        fileName: selectedFile.name,
        size: selectedFile.size,
      })

      if (!upload.uploadUrl) {
        throw new Error(upload.note ?? 'File storage is not configured. Enable Cloudflare R2 per SETUP.md.')
      }

      await uploadPdfToWorker(upload.uploadUrl, selectedFile, accessToken, upload.uploadHeaders)

      await completeDocumentUpload(accessToken, {
        organizationId,
        documentId,
        versionId,
        fileId,
        objectKey: upload.objectKey,
        fileName: selectedFile.name,
        sizeBytes: selectedFile.size,
      })

      setUploadComplete(true)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleRoutingSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)

    if (!canUseWizard || !organizationId || !documentId || !versionId) {
      setFormError('Document draft is missing. Complete metadata and upload first.')
      return
    }
    if (!uploadComplete) {
      setFormError('Upload the PDF before configuring routing.')
      return
    }
    if (routeSteps.some((step) => !step.assigneeId)) {
      setFormError('Every routing step needs an assignee.')
      return
    }

    setIsSavingRoute(true)
    try {
      const route = await createRoute.mutateAsync({
        object: {
          organization_id: organizationId,
          document_id: documentId,
          version_id: versionId,
          mode: 'sequential',
          status: 'draft',
          route_steps: {
            data: routeSteps.map((step, index) => ({
              organization_id: organizationId,
              sequence: index + 1,
              action: step.action,
              completion_rule: 'all',
              status: 'pending',
              due_at: step.dueAt ? `${step.dueAt}T00:00:00Z` : null,
              route_step_assignees: {
                data: [
                  {
                    organization_id: organizationId,
                    assignee_id: step.assigneeId,
                    status: 'pending',
                  },
                ],
              },
            })),
          },
        },
      })

      if (!route.insert_document_routes_one) throw new Error('Route was not created.')

      const updated = await updateStatus.mutateAsync({ id: documentId, status: 'ready_for_routing' })
      if (!updated.update_documents_by_pk) throw new Error('Document status was not updated.')

      if (!accessToken) throw new Error('Sign in again to start the route.')
      await startDocumentRoute(route.insert_document_routes_one.id, accessToken)

      setRouteSaved(true)
      setRouteStarted(true)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save routing.')
    } finally {
      setIsSavingRoute(false)
    }
  }

  if (!usesNhost) {
    return (
      <div className="page-stack">
        <section className="page-header">
          <div>
            <span className="eyebrow">Wizard</span>
            <h2>Create document</h2>
          </div>
        </section>
        <EmptyState title="Nhost not configured" description="Set Nhost environment values to create documents." />
      </div>
    )
  }

  if (profileLoading) {
    return (
      <div className="page-stack">
        <EmptyState title="Loading profile…" description="Checking your organization membership." />
      </div>
    )
  }

  if (profileError || !profile?.organization_id) {
    return (
      <div className="page-stack">
        <section className="page-header">
          <div>
            <span className="eyebrow">Wizard</span>
            <h2>Create document</h2>
          </div>
        </section>
        <EmptyState
          title="Profile not linked"
          description={
            profileQueryError?.message
              ?? 'Insert a profiles row in Nhost with your auth user UUID and organization_id before creating documents.'
          }
        />
      </div>
    )
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Wizard</span>
          <h2>Create document</h2>
          <p>Save metadata, upload the PDF, and configure sequential routing. Field placement and send come in later phases.</p>
        </div>
      </section>

      <section className="panel">
        <div className="stepper">
          {steps.map((step, index) => (
            <div
              className={
                index < activeStep ? 'step complete' : index === activeStep ? 'step in-progress' : 'step'
              }
              key={step}
            >
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>

        {formError ? <p className="form-error span-2">{formError}</p> : null}

        {activeStep === 0 ? (
          <form className="form-grid" onSubmit={handleMetadataSubmit}>
            <label>
              Title
              <input
                placeholder="Document title"
                required
                value={metadata.title}
                onChange={(event) => setMetadata((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <label>
              Reference number
              <input
                placeholder="Reference number"
                value={metadata.referenceNumber}
                onChange={(event) => setMetadata((current) => ({ ...current, referenceNumber: event.target.value }))}
              />
            </label>
            <label>
              Document type
              <input
                placeholder="Document type"
                value={metadata.documentType}
                onChange={(event) => setMetadata((current) => ({ ...current, documentType: event.target.value }))}
                disabled
              />
            </label>
            <label>
              Department
              <input
                placeholder="Department"
                value={metadata.department}
                onChange={(event) => setMetadata((current) => ({ ...current, department: event.target.value }))}
                disabled
              />
            </label>
            <label className="span-2">
              Description
              <textarea
                placeholder="Description"
                value={metadata.description}
                onChange={(event) => setMetadata((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
            <div className="button-row span-2">
              <button
                className="button primary"
                type="submit"
                disabled={createDocument.isPending || createVersion.isPending}
              >
                {createDocument.isPending || createVersion.isPending ? 'Saving…' : 'Continue to upload'}
              </button>
            </div>
          </form>
        ) : null}

        {activeStep === 1 ? (
          uploadComplete ? (
            <div className="form-grid">
              <div className="span-2">
                <EmptyState
                  title="Upload complete"
                  description="The PDF is stored privately and linked to version 1. Continue to add recipients and routing steps."
                />
              </div>
              <div className="button-row span-2">
                <Link className="button" to="/documents">View documents</Link>
                <button className="button primary" type="button" onClick={() => setActiveStep(2)}>
                  Continue to routing
                </button>
              </div>
            </div>
          ) : (
            <form className="form-grid" onSubmit={handleUploadSubmit}>
              <label className="span-2">
                PDF file
                <input
                  accept="application/pdf"
                  type="file"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                />
              </label>
              {selectedFile ? (
                <p className="span-2">
                  Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                </p>
              ) : null}
              <div className="button-row span-2">
                <button className="button" type="button" onClick={() => setActiveStep(0)} disabled={isUploading}>
                  Back
                </button>
                <button className="button primary" type="submit" disabled={isUploading || !selectedFile}>
                  {isUploading ? 'Uploading…' : 'Upload and save'}
                </button>
              </div>
            </form>
          )
        ) : null}

        {activeStep === 2 ? (
          routeSaved ? (
            <div className="form-grid">
              <div className="span-2">
                <EmptyState
                  title={routeStarted ? 'Route sent' : 'Routing saved'}
                  description={
                    routeStarted
                      ? 'The route is active and assignees can see their tasks in the inbox.'
                      : 'The draft route is stored and the document is ready for routing.'
                  }
                />
              </div>
              <div className="button-row span-2">
                {routeStarted ? <Link className="button" to="/inbox">Open inbox</Link> : null}
                <Link className="button primary" to="/documents">View documents</Link>
              </div>
            </div>
          ) : (
            <form className="form-grid" onSubmit={handleRoutingSubmit}>
              <p className="span-2">
                Sequential routing — each step runs in order. Assign at least one recipient per step.
              </p>
              {profilesLoading ? (
                <p className="span-2">Loading organization members…</p>
              ) : orgProfiles.length === 0 ? (
                <p className="span-2 form-error">
                  No organization profiles found. Sync your Nhost user via database/scripts/sync_nhost_profile.py.
                </p>
              ) : (
                routeSteps.map((step, index) => (
                  <div className="span-2 form-grid" key={step.id}>
                    <label>
                      Step {index + 1} — action
                      <select
                        value={step.action}
                        onChange={(event) =>
                          updateRouteStep(step.id, { action: event.target.value as RouteAction })
                        }
                      >
                        {routeActions.map((action) => (
                          <option key={action} value={action}>
                            {action}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Assignee
                      <select
                        required
                        value={step.assigneeId}
                        onChange={(event) => updateRouteStep(step.id, { assigneeId: event.target.value })}
                      >
                        <option value="">Select assignee</option>
                        {orgProfiles.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.display_name} ({member.email})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Due date (optional)
                      <input
                        type="date"
                        value={step.dueAt}
                        onChange={(event) => updateRouteStep(step.id, { dueAt: event.target.value })}
                      />
                    </label>
                    <div className="button-row">
                      {routeSteps.length > 1 ? (
                        <button className="button" type="button" onClick={() => removeRouteStep(step.id)}>
                          Remove step
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
              <div className="button-row span-2">
                <button className="button" type="button" onClick={addRouteStep} disabled={isSavingRoute}>
                  Add step
                </button>
              </div>
              <div className="button-row span-2">
                <button
                  className="button"
                  type="button"
                  onClick={() => setActiveStep(1)}
                  disabled={isSavingRoute}
                >
                  Back
                </button>
                <button
                  className="button primary"
                  type="submit"
                  disabled={isSavingRoute || profilesLoading || orgProfiles.length === 0}
                >
                  {isSavingRoute ? 'Saving…' : 'Save routing'}
                </button>
              </div>
            </form>
          )
        ) : null}

        {activeStep > 2 ? (
          <EmptyState
            title="Step not available yet"
            description="PDF field placement and send actions will be enabled in later phases."
          />
        ) : null}
      </section>
    </div>
  )
}
