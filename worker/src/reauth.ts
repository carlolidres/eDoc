type ReauthEnv = {
  NHOST_JWKS_URL: string
}

function nhostAuthBaseUrl(jwksUrl: string): string | null {
  const marker = '/v1/.well-known/jwks.json'
  if (!jwksUrl.includes(marker)) return null
  return jwksUrl.slice(0, jwksUrl.indexOf(marker))
}

export async function verifyPasswordReauth(
  env: ReauthEnv,
  email: string,
  password: string,
): Promise<{ method: string; skipped: boolean }> {
  if (!password.trim()) throw new Error('Password is required to sign.')

  const jwksUrl = env.NHOST_JWKS_URL
  if (!jwksUrl || jwksUrl.includes('your-')) {
    // ponytail: Local dev without Nhost skips remote password verification.
    return { method: 'password', skipped: true }
  }

  const authBase = nhostAuthBaseUrl(jwksUrl)
  if (!authBase) throw new Error('Nhost auth URL is not configured.')

  const response = await fetch(`${authBase}/v1/signin/email-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error('Re-authentication failed. Check your password and try again.')
  }

  return { method: 'password', skipped: false }
}
