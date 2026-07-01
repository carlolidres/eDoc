import { describe, expect, it } from 'vitest'
import { getNextActiveSteps, isStepComplete } from './routingRules'

describe('routing rules', () => {
  it('activates only the first pending step for sequential routes', () => {
    expect(getNextActiveSteps('sequential', [
      { id: 'b', sequence: 2, status: 'pending', requiredCount: 1, completedCount: 0 },
      { id: 'a', sequence: 1, status: 'completed', requiredCount: 1, completedCount: 1 },
      { id: 'c', sequence: 3, status: 'pending', requiredCount: 1, completedCount: 0 },
    ])).toEqual(['b'])
  })

  it('activates all pending steps for parallel routes', () => {
    expect(getNextActiveSteps('parallel', [
      { id: 'a', sequence: 1, status: 'pending', requiredCount: 1, completedCount: 0 },
      { id: 'b', sequence: 2, status: 'pending', requiredCount: 1, completedCount: 0 },
    ])).toEqual(['a', 'b'])
  })

  it('checks required completion count', () => {
    expect(isStepComplete({ id: 'x', sequence: 1, status: 'active', requiredCount: 2, completedCount: 2 })).toBe(true)
  })
})
