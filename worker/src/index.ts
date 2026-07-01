import { Hono, type Context } from 'hono'
import { z } from 'zod'

type Bindings = {
  EDOC_R2: R2Bucket
  HASURA_GRAPHQL_URL: string
  HASURA_ADMIN_SECRET: string
  NHOST_JWKS_URL: string
}

type AppContext = Context<{ Bindings: Bindings }>
type ErrorStatus = 400 | 401 | 500

const app = new Hono<{ Bindings: Bindings }>()

const uploadUrlSchema = z.object({
  organizationId: z.string().min(1),
  documentId: z.string().min(1),
  versionId: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.literal('application/pdf'),
  size: z.number().int().positive(),
})

function requestId(c: Pick<AppContext, 'req'>) {
  return c.req.header('x-request-id') ?? crypto.randomUUID()
}

function jsonError(c: AppContext, status: ErrorStatus, code: string, message: string) {
  const id = requestId(c)
  return c.json({ error: { code, message, requestId: id } }, status)
}

async function requireAuth(c: AppContext) {
  const authorization = c.req.header('authorization')
  if (!authorization?.startsWith('Bearer ')) return null
  return authorization.slice('Bearer '.length)
}

app.get('/api/health', (c) => c.json({ ok: true, service: 'edoc-worker', requestId: requestId(c) }))

app.post('/api/files/upload-url', async (c) => {
  const token = await requireAuth(c)
  if (!token) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')

  const parsed = uploadUrlSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return jsonError(c, 400, 'VALIDATION_FAILED', 'Upload request is invalid.')

  const body = parsed.data
  const objectKey = `organizations/${body.organizationId}/documents/${body.documentId}/versions/${body.versionId}/original/${body.fileName}`

  return c.json({
    requestId: requestId(c),
    objectKey,
    method: 'PUT',
    uploadUrl: null,
    note: 'Wire R2 presigned upload generation here. Private object path has been reserved.',
  })
})

app.post('/api/files/complete-upload', async (c) => {
  const token = await requireAuth(c)
  if (!token) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')
  return c.json({ requestId: requestId(c), status: 'accepted' })
})

app.get('/api/files/:fileId/preview-url', async (c) => {
  const token = await requireAuth(c)
  if (!token) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')
  return c.json({ requestId: requestId(c), previewUrl: null, expiresInSeconds: 300 })
})

app.get('/api/files/:fileId/download-url', async (c) => {
  const token = await requireAuth(c)
  if (!token) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')
  return c.json({ requestId: requestId(c), downloadUrl: null, expiresInSeconds: 300 })
})

app.post('/api/documents/:documentId/hash', async (c) => {
  const token = await requireAuth(c)
  if (!token) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')
  return c.json({ requestId: requestId(c), hash: null, algorithm: 'SHA-256' })
})

app.post('/api/documents/:documentId/sign', async (c) => {
  const token = await requireAuth(c)
  if (!token) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')
  return c.json({ requestId: requestId(c), status: 'not_implemented' }, 501)
})

app.post('/api/documents/:documentId/certificate', async (c) => {
  const token = await requireAuth(c)
  if (!token) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')
  return c.json({ requestId: requestId(c), status: 'not_implemented' }, 501)
})

app.post('/api/routes/:routeId/advance', async (c) => {
  const token = await requireAuth(c)
  if (!token) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')
  return c.json({ requestId: requestId(c), status: 'not_implemented' }, 501)
})

app.post('/api/routes/:routeId/remind', async (c) => {
  const token = await requireAuth(c)
  if (!token) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')
  return c.json({ requestId: requestId(c), status: 'not_implemented' }, 501)
})

app.post('/api/notifications/send', async (c) => {
  const token = await requireAuth(c)
  if (!token) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')
  return c.json({ requestId: requestId(c), status: 'not_implemented' }, 501)
})

app.get('/api/verification/:certificateId', (c) => {
  return c.json({ requestId: requestId(c), certificateId: c.req.param('certificateId'), status: 'not_configured' })
})

app.onError((error, c) => {
  console.error(error)
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Unexpected server error.', requestId: requestId(c) } }, 500)
})

export default app
