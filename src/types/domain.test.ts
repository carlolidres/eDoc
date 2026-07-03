import { describe, expect, it } from 'vitest'
import { fieldTypesForAction, signatureFieldTypeLabel } from './domain'

describe('field types for route actions', () => {
  it('offers signature-oriented types for sign steps', () => {
    expect(fieldTypesForAction('sign')).toContain('signature')
  })

  it('offers a meaning field matching each non-sign action', () => {
    expect(fieldTypesForAction('approve')[0]).toBe('approval_meaning')
    expect(fieldTypesForAction('review')[0]).toBe('review_meaning')
    expect(fieldTypesForAction('acknowledge')[0]).toBe('acknowledgment')
  })

  it('labels every field type with non-empty text', () => {
    for (const fieldType of fieldTypesForAction('sign')) {
      expect(signatureFieldTypeLabel(fieldType).length).toBeGreaterThan(0)
    }
  })
})
