import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { useAuth } from '../features/auth/AuthProvider'
import {
  CREATE_DOCUMENT,
  CREATE_DOCUMENT_VERSION,
  type CreateDocumentResponse,
  type CreateDocumentVersionResponse,
} from '../graphql/mutations'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { useGraphQLMutation } from '../hooks/useGraphQLMutation'
import {
  completeDocumentUpload,
  MAX_PDF_BYTES,
  requestUploadUrl,
  uploadPdfToWorker,
} from '../lib/documentUpload'
import { validatePdfFile } from '../utils/fileValidation'

const steps = ['Document information', 'Upload', 'Recipients and routing', 'PDF field placement', 'Review and send']

interface MetadataForm {
  title: string
  referenceNumber: string
  documentType: string
  department: string
  description: string
}

const emptyMetadata: MetadataForm = {
  title: '',
  referenceNumber: '',
  documentType: '',
  department: '',
  description: '',
}

export function CreateDocumentPage() {
  const { accessToken, usesNhost } = useAuth()
  const { profile, isLoading: profileLoading, isError: profileError, error: profileQueryError } = useCurrentProfile()
  const createDocument = useGraphQLMutation<CreateDocumentResponse, { object: Record<string, unknown> }>(CREATE_DOCUMENT)
  const createVersion = useGraphQLMutation<CreateDocumentVersionResponse, { object: Record<string, unknown> }>(
    CREATE_DOCUMENT_VERSION,
  )

  const [activeStep, setActiveStep] = useState(0)
  const [metadata, setMetadata] = useState<MetadataForm>(emptyMetadata)
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [versionId, setVersionId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)

  const organizationId = profile?.organization_id ?? null
  const canUseWizard = usesNhost && Boolean(organizationId) && Boolean(accessToken)

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
          <p>Save metadata and upload the original PDF. Later steps stay disabled until routing and signing are implemented.</p>
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
                  description="The PDF is stored privately and linked to version 1. Continue routing when that phase is ready."
                />
              </div>
              <div className="button-row span-2">
                <Link className="button primary" to="/documents">View documents</Link>
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

        {activeStep > 1 ? (
          <EmptyState
            title="Step not available yet"
            description="Recipients, field placement, and send actions will be enabled in later phases."
          />
        ) : null}
      </section>
    </div>
  )
}
