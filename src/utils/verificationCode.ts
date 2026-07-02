export function normalizeVerificationCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function isVerificationCodeFormatValid(code: string): boolean {
  const normalized = normalizeVerificationCode(code)
  return normalized.length >= 6 && normalized.length <= 12
}
