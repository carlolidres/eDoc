import { env } from './env'

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    requestId: string
  }
}

export async function workerFetch<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  if (!env.workerApiUrl) throw new Error('Worker API URL is not configured.')
  const response = await fetch(`${env.workerApiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null
    throw new Error(body?.error.message ?? `Worker request failed with ${response.status}`)
  }
  return (await response.json()) as T
}

export interface StartRouteResponse {
  requestId: string
  routeId: string
  documentId: string
  activeStepIds: string[]
  status: 'active'
}

export function startDocumentRoute(routeId: string, accessToken: string) {
  return workerFetch<StartRouteResponse>(`/api/routes/${routeId}/start`, { method: 'POST' }, accessToken)
}

export interface AdvanceRouteResponse {
  requestId: string
  routeId: string
  assigneeRowId: string
  stepId: string
  action: 'review' | 'approve' | 'acknowledge' | 'reject' | 'return'
  assigneeStatus: string
  stepStatus: string
  routeStatus: string
  documentStatus: string
  routeCompleted: boolean
  nextActiveStepIds: string[]
  idempotent: boolean
}

export function advanceDocumentRoute(
  routeId: string,
  input: {
    assigneeRowId: string
    action: AdvanceRouteResponse['action']
    comment?: string
    reason?: string
    idempotencyKey: string
  },
  accessToken: string,
) {
  return workerFetch<AdvanceRouteResponse>(
    `/api/routes/${routeId}/advance`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': input.idempotencyKey },
      body: JSON.stringify({
        assigneeRowId: input.assigneeRowId,
        action: input.action,
        comment: input.comment,
        reason: input.reason,
      }),
    },
    accessToken,
  )
}

export interface FilePreviewResponse {
  requestId: string
  previewUrl: string
  expiresInSeconds: number
}

export function getFilePreviewUrl(fileId: string, accessToken: string) {
  return workerFetch<FilePreviewResponse>(`/api/files/${fileId}/preview-url`, { method: 'GET' }, accessToken)
}

export interface SignDocumentResponse {
  requestId: string
  signatureEventId: string
  signedFileId: string
  finalPdfHash: string
  documentHash: string
  routeId: string
  assigneeRowId: string
  routeCompleted: boolean
  idempotent: boolean
}

export function signDocument(
  documentId: string,
  input: {
    routeId: string
    assigneeRowId: string
    versionSha256: string
    password: string
    consent: boolean
    signatureMeaning: string
    typedSignature: string
    idempotencyKey: string
  },
  accessToken: string,
) {
  return workerFetch<SignDocumentResponse>(
    `/api/documents/${documentId}/sign`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': input.idempotencyKey },
      body: JSON.stringify({
        routeId: input.routeId,
        assigneeRowId: input.assigneeRowId,
        versionSha256: input.versionSha256,
        password: input.password,
        consent: input.consent,
        signatureMeaning: input.signatureMeaning,
        typedSignature: input.typedSignature,
      }),
    },
    accessToken,
  )
}
