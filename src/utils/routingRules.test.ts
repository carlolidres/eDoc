import { describe, expect, it } from 'vitest'
import {
  countCompletedAssignees,
  getNextActiveSteps,
  getRequiredCompletionCount,
  isRouteComplete,
  isStepComplete,
  isStepCompleteByRule,
} from './routingRules'

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

  it('computes completion thresholds', () => {
    expect(getRequiredCompletionCount('all', 3)).toBe(3)
    expect(getRequiredCompletionCount('any', 3)).toBe(1)
    expect(getRequiredCompletionCount('majority', 5)).toBe(3)
    expect(getRequiredCompletionCount('minimum_count', 5, 2)).toBe(2)
  })

  it('detects step completion by rule', () => {
    const assignees = [
      { id: 'a', status: 'completed' as const },
      { id: 'b', status: 'active' as const },
    ]
    expect(isStepCompleteByRule('all', assignees)).toBe(false)
    expect(isStepCompleteByRule('any', assignees)).toBe(true)
    expect(countCompletedAssignees(assignees)).toBe(1)
  })

  it('detects route completion', () => {
    expect(isRouteComplete([{ status: 'completed' }, { status: 'skipped' }])).toBe(true)
    expect(isRouteComplete([{ status: 'completed' }, { status: 'active' }])).toBe(false)
  })
})
