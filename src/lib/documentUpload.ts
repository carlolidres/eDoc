import { env } from './env'
import { workerFetch } from './workerApi'

const MAX_PDF_BYTES = 25 * 1024 * 1024

export { MAX_PDF_BYTES }

export interface UploadUrlResponse {
  requestId: string
  objectKey: string
  method: 'PUT'
  uploadUrl: string | null
  uploadHeaders?: Record<string, string>
  note?: string
}

export interface CompleteUploadResponse {
  requestId: string
  status: string
  fileId: string
  sha256: string
}

export async function requestUploadUrl(
  accessToken: string,
  input: {
    organizationId: string
    documentId: string
    versionId: string
    fileName: string
    size: number
  },
) {
  return workerFetch<UploadUrlResponse>(
    '/api/files/upload-url',
    {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        contentType: 'application/pdf',
      }),
    },
    accessToken,
  )
}

export async function uploadPdfToWorker(
  uploadUrl: string,
  file: File,
  accessToken: string,
  uploadHeaders?: Record<string, string>,
) {
  const target = uploadUrl.startsWith('http') ? uploadUrl : `${env.workerApiUrl}${uploadUrl}`
  const response = await fetch(target, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/pdf',
      ...uploadHeaders,
    },
    body: file,
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
    throw new Error(body?.error?.message ?? `Upload failed with ${response.status}`)
  }
}

export async function completeDocumentUpload(
  accessToken: string,
  input: {
    organizationId: string
    documentId: string
    versionId: string
    fileId: string
    objectKey: string
    fileName: string
    sizeBytes: number
  },
) {
  return workerFetch<CompleteUploadResponse>(
    '/api/files/complete-upload',
    {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        mimeType: 'application/pdf',
      }),
    },
    accessToken,
  )
}
