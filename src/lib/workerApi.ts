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
