export type AuditEventHashInput = {
  id?: string
  organization_id: string
  user_id?: string | null
  event_type: string
  entity_type: string
  entity_id?: string | null
  document_id?: string | null
  version_id?: string | null
  previous_value?: unknown
  new_value?: unknown
  reason?: string | null
  ip_address?: string | null
  user_agent?: string | null
  request_id?: string | null
  source: string
}

const HASH_FIELD_ORDER = [
  'id',
  'organization_id',
  'user_id',
  'event_type',
  'entity_type',
  'entity_id',
  'document_id',
  'version_id',
  'previous_value',
  'new_value',
  'reason',
  'ip_address',
  'user_agent',
  'request_id',
  'source',
] as const

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalize(entry)).join(',')}]`
  }

  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(',')}}`
}

export function buildAuditHashPayload(input: AuditEventHashInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {}
  for (const key of HASH_FIELD_ORDER) {
    const value = input[key]
    payload[key] = value === undefined ? null : value
  }
  return payload
}

export async function computeAuditIntegrityHash(input: AuditEventHashInput): Promise<string> {
  const canonical = canonicalize(buildAuditHashPayload(input))
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function withIntegrityHash<T extends AuditEventHashInput>(input: T): Promise<T & { integrity_hash: string }> {
  return {
    ...input,
    integrity_hash: await computeAuditIntegrityHash(input),
  }
}
