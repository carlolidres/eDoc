import { describe, expect, it } from 'vitest'
import { isVerificationCodeFormatValid, normalizeVerificationCode } from './verificationCode'

describe('verificationCode', () => {
  it('normalizes codes to uppercase alphanumerics', () => {
    expect(normalizeVerificationCode(' ab-12cd ')).toBe('AB12CD')
  })

  it('accepts valid verification code lengths', () => {
    expect(isVerificationCodeFormatValid('AB12CD')).toBe(true)
    expect(isVerificationCodeFormatValid('ab')).toBe(false)
  })
})
