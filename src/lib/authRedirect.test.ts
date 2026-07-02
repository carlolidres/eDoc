/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { authRedirectUrl } from './authRedirect'

describe('authRedirectUrl', () => {
  it('builds hash-router redirect URLs', () => {
    expect(authRedirectUrl('/change-password')).toBe(`${window.location.origin}${window.location.pathname}#/change-password`)
  })
})
