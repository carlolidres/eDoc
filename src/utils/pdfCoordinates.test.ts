import { describe, expect, it } from 'vitest'
import { normalizedFieldToPdfRect } from './pdfCoordinates'

describe('normalizedFieldToPdfRect', () => {
  it('converts top-left normalized coordinates to PDF bottom-left space', () => {
    const rect = normalizedFieldToPdfRect(1000, 800, { x: 0.1, y: 0.2, width: 0.3, height: 0.1 })
    expect(rect.x).toBeCloseTo(100)
    expect(rect.width).toBeCloseTo(300)
    expect(rect.height).toBeCloseTo(80)
    expect(rect.y).toBeCloseTo(560)
  })
})
