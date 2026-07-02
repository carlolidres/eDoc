export interface AuthClaims {
  sub: string
  exp: number
}

interface JwkKey {
  kid?: string
  kty: string
  n?: string
  e?: string
  alg?: string
  use?: string
}

interface JwksResponse {
  keys: JwkKey[]
}

interface JwksCache {
  keys: Map<string, CryptoKey>
  expiresAt: number
}

let jwksCache: JwksCache | null = null
const JWKS_TTL_MS = 60 * 60 * 1000

function decodeBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function parseJwt(token: string) {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0]))) as { alg?: string; kid?: string }
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1]))) as AuthClaims
    const signature = decodeBase64Url(parts[2])
    const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    return { header, payload, signature, signed }
  } catch {
    return null
  }
}

async function loadJwks(jwksUrl: string) {
  const now = Date.now()
  if (jwksCache && jwksCache.expiresAt > now) return jwksCache.keys

  const response = await fetch(jwksUrl)
  if (!response.ok) throw new Error('Failed to load JWKS.')

  const body = (await response.json()) as JwksResponse
  const keys = new Map<string, CryptoKey>()

  for (const jwk of body.keys) {
    if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e || !jwk.kid) continue
    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    keys.set(jwk.kid, key)
  }

  jwksCache = { keys, expiresAt: now + JWKS_TTL_MS }
  return keys
}

export async function verifyBearerToken(token: string, jwksUrl: string): Promise<AuthClaims | null> {
  if (!jwksUrl || jwksUrl.includes('your-')) return null

  const parsed = parseJwt(token)
  if (!parsed || parsed.header.alg !== 'RS256' || !parsed.header.kid) return null
  if (!parsed.payload.sub || !parsed.payload.exp || parsed.payload.exp * 1000 <= Date.now()) return null

  const keys = await loadJwks(jwksUrl)
  const key = keys.get(parsed.header.kid)
  if (!key) return null

  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, parsed.signature, parsed.signed)
  return valid ? parsed.payload : null
}
