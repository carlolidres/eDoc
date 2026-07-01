import { describe, expect, it } from 'vitest'
import { validatePdfFile } from './fileValidation'

describe('file validation', () => {
  it('accepts PDFs under the size limit', () => {
    const file = new File(['abc'], 'test.pdf', { type: 'application/pdf' })
    expect(validatePdfFile(file, 10)).toBeNull()
  })

  it('rejects non-PDF files', () => {
    const file = new File(['abc'], 'test.txt', { type: 'text/plain' })
    expect(validatePdfFile(file, 10)).toBe('Only PDF files are allowed.')
  })
})
