import { Hono, type Context } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { verifyBearerToken } from './auth'
import {
  assertDocumentOwner,
  advanceDocumentRoute,
  hashR2Object,
  insertDocumentFile,
  markDocumentPreparing,
  startDocumentRoute,
} from './hasura'
import { assertFileAccess, logFileAccess } from './files'
import { signDocument } from './signing'

type Bindings = {
  EDOC_R2: R2Bucket
  HASURA_GRAPHQL_URL: string
  HASURA_ADMIN_SECRET: string
  NHOST_JWKS_URL: string
}

type AppContext = Context<{ Bindings: Bindings }>
type ErrorStatus = 400 | 401 | 403 | 404 | 500

const app = new Hono<{ Bindings: Bindings }>()

const ALLOWED_ORIGINS = new Set([
  'https://carlolidres.github.io',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
])

app.use(
  '*',
  cors({
    origin: (origin) => (ALLOWED_ORIGINS.has(origin) ? origin : ''),
    allowHeaders: ['Content-Type', 'Authorization', 'X-Object-Key', 'X-Request-Id', 'Idempotency-Key'],
    allowMethods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    maxAge: 86400,
  }),
)

const uploadUrlSchema = z.object({
  organizationId: z.string().min(1),
  documentId: z.string().min(1),
  versionId: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.literal('application/pdf'),
  size: z.number().int().positive(),
})

const completeUploadSchema = z.object({
  organizationId: z.string().min(1),
  documentId: z.string().min(1),
  versionId: z.string().min(1),
  fileId: z.string().min(1),
  objectKey: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.literal('application/pdf'),
  sizeBytes: z.number().int().positive(),
})

const signDocumentSchema = z.object({
  routeId: z.string().min(1),
  assigneeRowId: z.string().min(1),
  versionSha256: z.string().min(64).max(64),
  password: z.string().min(1),
  consent: z.literal(true),
  signatureMeaning: z.string().min(1),
  typedSignature: z.string().min(1),
})

const advanceRouteSchema = z
  .object({
    assigneeRowId: z.string().min(1),
    action: z.enum(['review', 'approve', 'acknowledge', 'reject', 'return']),
    comment: z.string().optional(),
    reason: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.action === 'reject' || value.action === 'return') && !value.reason?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Reason is required for reject and return actions.' })
    }
  })

function requestId(c: Pick<AppContext, 'req'>) {
  return c.req.header('x-request-id') ?? crypto.randomUUID()
}

function jsonError(c: AppContext, status: ErrorStatus, code: string, message: string) {
  const id = requestId(c)
  return c.json({ error: { code, message, requestId: id } }, status)
}

function hasR2(c: AppContext) {
  return Boolean(c.env.EDOC_R2)
}

async function requireAuth(c: AppContext) {
  const authorization = c.req.header('authorization')
  if (!authorization?.startsWith('Bearer ')) return null

  const token = authorization.slice('Bearer '.length)
  const jwksUrl = c.env.NHOST_JWKS_URL
  if (!jwksUrl || jwksUrl.includes('your-')) {
    return token.length > 0 ? { sub: 'dev-unverified' } : null
  }

  try {
    return await verifyBearerToken(token, jwksUrl)
  } catch {
    return null
  }
}

function buildObjectKey(input: {
  organizationId: string
  documentId: string
  versionId: string
  fileName: string
}) {
  return `organizations/${input.organizationId}/documents/${input.documentId}/versions/${input.versionId}/original/${input.fileName}`
}

app.get('/api/health', (c) => c.json({ ok: true, service: 'edoc-worker', requestId: requestId(c) }))

app.post('/api/files/upload-url', async (c) => {
  const claims = await requireAuth(c)
  if (!claims) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')

  const parsed = uploadUrlSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return jsonError(c, 400, 'VALIDATION_FAILED', 'Upload request is invalid.')

  const body = parsed.data
  const objectKey = buildObjectKey(body)

  try {
    await assertDocumentOwner(c.env, body.documentId, claims.sub)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authorization failed.'
    const status: ErrorStatus = message.includes('not authorized') ? 403 : 400
    return jsonError(c, status, 'FORBIDDEN', message)
  }

  if (!hasR2(c)) {
    return c.json({
      requestId: requestId(c),
      objectKey,
      method: 'PUT',
      uploadUrl: null,
      note: 'R2 binding is not configured. Enable Cloudflare R2 and redeploy the Worker.',
      userId: claims.sub,
    })
  }

  return c.json({
    requestId: requestId(c),
    objectKey,
    method: 'PUT',
    uploadUrl: '/api/files/upload-content',
    uploadHeaders: { 'X-Object-Key': objectKey },
    userId: claims.sub,
  })
})

app.put('/api/files/upload-content', async (c) => {
  const claims = await requireAuth(c)
  if (!claims) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')
  if (!hasR2(c)) return jsonError(c, 500, 'R2_NOT_CONFIGURED', 'R2 binding is not configured.')

  const objectKey = c.req.header('x-object-key')
  if (!objectKey) return jsonError(c, 400, 'VALIDATION_FAILED', 'X-Object-Key header is required.')

  const body = await c.req.arrayBuffer()
  if (!body.byteLength) return jsonError(c, 400, 'VALIDATION_FAILED', 'Upload body is empty.')

  await c.env.EDOC_R2.put(objectKey, body, {
    httpMetadata: { contentType: c.req.header('content-type') ?? 'application/pdf' },
  })

  return c.json({ requestId: requestId(c), objectKey, sizeBytes: body.byteLength })
})

app.post('/api/files/complete-upload', async (c) => {
  const claims = await requireAuth(c)
  if (!claims) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')

  const parsed = completeUploadSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return jsonError(c, 400, 'VALIDATION_FAILED', 'Upload completion request is invalid.')

  const body = parsed.data
  const expectedKey = buildObjectKey({
    organizationId: body.organizationId,
    documentId: body.documentId,
    versionId: body.versionId,
    fileName: body.fileName,
  })

  if (body.objectKey !== expectedKey) {
    return jsonError(c, 400, 'VALIDATION_FAILED', 'Object key does not match the reserved upload path.')
  }

  try {
    const document = await assertDocumentOwner(c.env, body.documentId, claims.sub)
    if (document.organization_id !== body.organizationId) {
      return jsonError(c, 403, 'FORBIDDEN', 'Organization mismatch for this document.')
    }

    if (!hasR2(c)) {
      return jsonError(c, 500, 'R2_NOT_CONFIGURED', 'R2 binding is not configured.')
    }

    const sha256 = await hashR2Object(c.env.EDOC_R2, body.objectKey)

    await insertDocumentFile(c.env, {
      id: body.fileId,
      organizationId: body.organizationId,
      documentId: body.documentId,
      versionId: body.versionId,
      fileName: body.fileName,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      objectKey: body.objectKey,
      sha256,
    })

    await markDocumentPreparing(c.env, body.documentId, body.versionId, sha256)

    return c.json({ requestId: requestId(c), status: 'completed', fileId: body.fileId, sha256 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload completion failed.'
    const status: ErrorStatus = message.includes('not authorized') ? 403 : 500
    return jsonError(c, status, 'UPLOAD_COMPLETE_FAILED', message)
  }
})

app.get('/api/files/:fileId/preview-url', async (c) => {
  const claims = await requireAuth(c)
  if (!claims) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')

  const fileId = c.req.param('fileId')
  if (!fileId) return jsonError(c, 400, 'VALIDATION_FAILED', 'File id is required.')

  try {
    await assertFileAccess(c.env, fileId, claims.sub)
    const previewUrl = `${new URL(c.req.url).origin}/api/files/${fileId}/preview-content`
    return c.json({ requestId: requestId(c), previewUrl, expiresInSeconds: 300 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Preview authorization failed.'
    const status: ErrorStatus = message.includes('not authorized') ? 403 : 400
    return jsonError(c, status, 'FORBIDDEN', message)
  }
})

app.get('/api/files/:fileId/preview-content', async (c) => {
  const claims = await requireAuth(c)
  if (!claims) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')
  if (!hasR2(c)) return jsonError(c, 500, 'R2_NOT_CONFIGURED', 'R2 binding is not configured.')

  const fileId = c.req.param('fileId')
  if (!fileId) return jsonError(c, 400, 'VALIDATION_FAILED', 'File id is required.')

  try {
    const file = await assertFileAccess(c.env, fileId, claims.sub)
    const object = await c.env.EDOC_R2.get(file.r2_object_key)
    if (!object) return jsonError(c, 404, 'FILE_NOT_FOUND', 'PDF file was not found in storage.')

    await logFileAccess(c.env, {
      organizationId: file.organization_id,
      fileId: file.id,
      userId: claims.sub,
      accessType: 'preview',
      ipAddress: c.req.header('cf-connecting-ip') ?? undefined,
    })

    const headers = new Headers()
    headers.set('Content-Type', file.mime_type || 'application/pdf')
    headers.set('Cache-Control', 'private, max-age=300')
    return new Response(object.body, { headers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Preview failed.'
    const status: ErrorStatus = message.includes('not authorized') ? 403 : 500
    return jsonError(c, status, 'PREVIEW_FAILED', message)
  }
})

app.get('/api/files/:fileId/download-url', async (c) => {
  const claims = await requireAuth(c)
  if (!claims) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')
  return c.json({ requestId: requestId(c), downloadUrl: null, expiresInSeconds: 300 })
})

app.post('/api/documents/:documentId/hash', async (c) => {
  const claims = await requireAuth(c)
  if (!claims) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')
  return c.json({ requestId: requestId(c), hash: null, algorithm: 'SHA-256' })
})

app.post('/api/documents/:documentId/sign', async (c) => {
  const claims = await requireAuth(c)
  if (!claims) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')
  if (!hasR2(c)) return jsonError(c, 500, 'R2_NOT_CONFIGURED', 'R2 binding is not configured.')

  const idempotencyKey = c.req.header('idempotency-key')?.trim()
  if (!idempotencyKey) {
    return jsonError(c, 400, 'VALIDATION_FAILED', 'Idempotency-Key header is required.')
  }

  const documentId = c.req.param('documentId')
  if (!documentId) return jsonError(c, 400, 'VALIDATION_FAILED', 'Document id is required.')

  const parsed = signDocumentSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return jsonError(c, 400, 'VALIDATION_FAILED', 'Sign request is invalid.')

  try {
    const result = await signDocument(c.env, c.env.EDOC_R2, {
      documentId,
      routeId: parsed.data.routeId,
      assigneeRowId: parsed.data.assigneeRowId,
      userId: claims.sub,
      versionSha256: parsed.data.versionSha256,
      password: parsed.data.password,
      consent: parsed.data.consent,
      signatureMeaning: parsed.data.signatureMeaning,
      typedSignature: parsed.data.typedSignature,
      idempotencyKey,
      requestId: requestId(c),
      ipAddress: c.req.header('cf-connecting-ip') ?? undefined,
      userAgent: c.req.header('user-agent') ?? undefined,
    })
    return c.json({ requestId: requestId(c), ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signing failed.'
    const status: ErrorStatus =
      message.includes('not authorized') || message.includes('version changed') ? 403 : 400
    return jsonError(c, status, 'SIGN_FAILED', message)
  }
})

app.post('/api/documents/:documentId/certificate', async (c) => {
  const claims = await requireAuth(c)
  if (!claims) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')
  return c.json({ requestId: requestId(c), status: 'not_implemented' }, 501)
})

app.post('/api/routes/:routeId/start', async (c) => {
  const claims = await requireAuth(c)
  if (!claims) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')

  const routeId = c.req.param('routeId')
  if (!routeId) return jsonError(c, 400, 'VALIDATION_FAILED', 'Route id is required.')

  try {
    const result = await startDocumentRoute(c.env, routeId, claims.sub, requestId(c))
    return c.json({ requestId: requestId(c), ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Route start failed.'
    const status: ErrorStatus =
      message.includes('not authorized') || message.includes('not found') ? 403 : 400
    return jsonError(c, status, 'ROUTE_START_FAILED', message)
  }
})

app.post('/api/routes/:routeId/advance', async (c) => {
  const claims = await requireAuth(c)
  if (!claims) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')

  const idempotencyKey = c.req.header('idempotency-key')?.trim()
  if (!idempotencyKey) {
    return jsonError(c, 400, 'VALIDATION_FAILED', 'Idempotency-Key header is required.')
  }

  const routeId = c.req.param('routeId')
  if (!routeId) return jsonError(c, 400, 'VALIDATION_FAILED', 'Route id is required.')

  const parsed = advanceRouteSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return jsonError(c, 400, 'VALIDATION_FAILED', 'Advance request is invalid.')

  try {
    const result = await advanceDocumentRoute(c.env, {
      routeId,
      assigneeRowId: parsed.data.assigneeRowId,
      userId: claims.sub,
      action: parsed.data.action,
      comment: parsed.data.comment,
      reason: parsed.data.reason,
      idempotencyKey,
      requestId: requestId(c),
    })
    return c.json({ requestId: requestId(c), ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Route advance failed.'
    const status: ErrorStatus =
      message.includes('not authorized') || message.includes('not found') ? 403 : 400
    return jsonError(c, status, 'ROUTE_ADVANCE_FAILED', message)
  }
})

app.post('/api/routes/:routeId/remind', async (c) => {
  const claims = await requireAuth(c)
  if (!claims) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')
  return c.json({ requestId: requestId(c), status: 'not_implemented' }, 501)
})

app.post('/api/notifications/send', async (c) => {
  const claims = await requireAuth(c)
  if (!claims) return jsonError(c, 401, 'UNAUTHENTICATED', 'Authentication is required.')
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
