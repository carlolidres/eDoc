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
