import { lazy, Suspense, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import type { FieldAssigneeOption, SignatureFieldDraft } from '../components/pdf/FieldPlacementViewer'
import { useAuth } from '../features/auth/AuthProvider'
import {
  CREATE_DOCUMENT,
  CREATE_DOCUMENT_ROUTE,
  CREATE_DOCUMENT_VERSION,
  INSERT_SIGNATURE_FIELDS,
  UPDATE_DOCUMENT_STATUS,
  type CreateDocumentResponse,
  type CreateDocumentRouteResponse,
  type CreateDocumentVersionResponse,
  type InsertSignatureFieldsResponse,
  type UpdateDocumentStatusResponse,
} from '../graphql/mutations'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { useFilePreview } from '../hooks/useFilePreview'
import { useGraphQLMutation } from '../hooks/useGraphQLMutation'
import { useOrgProfiles } from '../hooks/useOrgProfiles'
import {
  completeDocumentUpload,
  MAX_PDF_BYTES,
  requestUploadUrl,
  uploadPdfToWorker,
} from '../lib/documentUpload'
import { startDocumentRoute } from '../lib/workerApi'
import { routeActionLabel, type RouteAction } from '../types/domain'
import { validatePdfFile } from '../utils/fileValidation'

const FieldPlacementViewer = lazy(() =>
  import('../components/pdf/FieldPlacementViewer').then((module) => ({ default: module.FieldPlacementViewer })),
)

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
  const insertFields = useGraphQLMutation<InsertSignatureFieldsResponse, { objects: Record<string, unknown>[] }>(
    INSERT_SIGNATURE_FIELDS,
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
  const [previewFileId, setPreviewFileId] = useState<string | null>(null)
  const [routeSteps, setRouteSteps] = useState<RouteStepDraft[]>([newRouteStep()])
  const [isSavingRoute, setIsSavingRoute] = useState(false)
  const [routeId, setRouteId] = useState<string | null>(null)
  const [assigneeOptions, setAssigneeOptions] = useState<FieldAssigneeOption[]>([])
  const [fields, setFields] = useState<SignatureFieldDraft[]>([])
  const [isSending, setIsSending] = useState(false)
  const [routeStarted, setRouteStarted] = useState(false)

  const preview = useFilePreview(activeStep === 3 ? previewFileId ?? undefined : undefined)

  const organizationId = profile?.organization_id ?? null
  const canUseWizard = usesNhost && Boolean(organizationId) && Boolean(accessToken)

  const assigneesMissingFields = useMemo(
    () => assigneeOptions.filter((option) => !fields.some((field) => field.assigneeRowId === option.id)),
    [assigneeOptions, fields],
  )

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

      setPreviewFileId(fileId)
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

      const createdRoute = route.insert_document_routes_one
      if (!createdRoute) throw new Error('Route was not created.')

      const options: FieldAssigneeOption[] = createdRoute.route_steps.flatMap((step) =>
        step.route_step_assignees.map((assignee) => {
          const assigneeProfile = orgProfiles.find((candidate) => candidate.id === assignee.assignee_id)
          const action = step.action as RouteAction
          return {
            id: assignee.id,
            action,
            label: `Step ${step.sequence} — ${routeActionLabel(action)} (${assigneeProfile?.display_name ?? 'Assignee'})`,
          }
        }),
      )

      setRouteId(createdRoute.id)
      setAssigneeOptions(options)
      setFields([])
      setActiveStep(3)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save routing.')
    } finally {
      setIsSavingRoute(false)
    }
  }

  function handleAddField(field: SignatureFieldDraft) {
    setFields((current) => [...current, field])
  }

  function handleRemoveField(localId: string) {
    setFields((current) => current.filter((field) => field.localId !== localId))
  }

  function handleContinueToReview() {
    setFormError(null)
    if (assigneeOptions.length > 0 && assigneesMissingFields.length > 0) {
      setFormError(
        `Place at least one field for: ${assigneesMissingFields.map((option) => option.label).join(', ')}.`,
      )
      return
    }
    setActiveStep(4)
  }

  async function handleSend() {
    setFormError(null)

    if (!canUseWizard || !accessToken || !organizationId || !documentId || !versionId || !routeId) {
      setFormError('Document draft is missing. Complete the earlier steps first.')
      return
    }

    setIsSending(true)
    try {
      if (fields.length > 0) {
        const inserted = await insertFields.mutateAsync({
          objects: fields.map((field) => ({
            organization_id: organizationId,
            document_id: documentId,
            version_id: versionId,
            assignee_id: field.assigneeRowId,
            field_type: field.fieldType,
            page_number: field.pageNumber,
            x: field.x,
            y: field.y,
            width: field.width,
            height: field.height,
            required: true,
          })),
        })
        if (!inserted.insert_signature_fields) throw new Error('Signature fields were not saved.')
      }

      const updated = await updateStatus.mutateAsync({ id: documentId, status: 'ready_for_routing' })
      if (!updated.update_documents_by_pk) throw new Error('Document status was not updated.')

      await startDocumentRoute(routeId, accessToken)
      setRouteStarted(true)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not send the document.')
    } finally {
      setIsSending(false)
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
          <p>Save metadata, upload the PDF, configure routing, place signature fields, then send.</p>
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
        ) : null}

        {activeStep === 3 ? (
          <div className="form-grid">
            <div className="span-2">
              {!previewFileId ? (
                <EmptyState title="PDF not available" description="Upload the document before placing fields." />
              ) : preview.isLoading ? (
                <EmptyState title="Preparing preview…" description="Requesting a secure preview URL." />
              ) : preview.isError ? (
                <EmptyState title="Could not load preview" description={preview.error?.message ?? 'Worker preview failed.'} />
              ) : preview.data?.previewUrl && accessToken ? (
                <Suspense fallback={<EmptyState title="Loading viewer…" description="Starting PDF.js." />}>
                  <FieldPlacementViewer
                    url={preview.data.previewUrl}
                    accessToken={accessToken}
                    assigneeOptions={assigneeOptions}
                    fields={fields}
                    onAddField={handleAddField}
                    onRemoveField={handleRemoveField}
                  />
                </Suspense>
              ) : (
                <EmptyState title="Preview unavailable" description="Secure preview URL was not returned." />
              )}
            </div>
            {fields.length > 0 ? (
              <div className="span-2">
                <span className="eyebrow">Placed fields ({fields.length})</span>
                <ul className="field-placement-list">
                  {fields.map((field) => (
                    <li key={field.localId}>
                      <span>Page {field.pageNumber} — {field.assigneeLabel} — {field.fieldType}</span>
                      <button className="button" type="button" onClick={() => handleRemoveField(field.localId)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="button-row span-2">
              <button className="button" type="button" onClick={() => setActiveStep(2)}>
                Back
              </button>
              <button className="button primary" type="button" onClick={handleContinueToReview}>
                Continue to review
              </button>
            </div>
          </div>
        ) : null}

        {activeStep === 4 ? (
          routeStarted ? (
            <div className="form-grid">
              <div className="span-2">
                <EmptyState
                  title="Route sent"
                  description="The route is active and assignees can see their tasks in the inbox."
                />
              </div>
              <div className="button-row span-2">
                <Link className="button" to="/inbox">Open inbox</Link>
                <Link className="button primary" to="/documents">View documents</Link>
              </div>
            </div>
          ) : (
            <div className="form-grid">
              <div className="span-2">
                <p><strong>Title:</strong> {metadata.title}</p>
                {metadata.referenceNumber ? <p><strong>Reference:</strong> {metadata.referenceNumber}</p> : null}
                <p><strong>Routing steps:</strong> {assigneeOptions.length}</p>
                <p><strong>Signature fields placed:</strong> {fields.length}</p>
              </div>
              <div className="button-row span-2">
                <button className="button" type="button" onClick={() => setActiveStep(3)} disabled={isSending}>
                  Back
                </button>
                <button className="button primary" type="button" onClick={() => void handleSend()} disabled={isSending}>
                  {isSending ? 'Sending…' : 'Send document'}
                </button>
              </div>
            </div>
          )
        ) : null}
      </section>
    </div>
  )
}
