import { describe, expect, it } from 'vitest'
import { DUE_SOON_WINDOW_DAYS, dashboardDueDateBounds } from './dueDateMetrics'

describe('dashboardDueDateBounds', () => {
  it('uses a seven-day due-soon window from the reference instant', () => {
    const reference = new Date('2026-07-02T12:00:00.000Z')
    const bounds = dashboardDueDateBounds(reference)

    expect(bounds.now).toBe('2026-07-02T12:00:00.000Z')
    expect(bounds.dueSoonCutoff).toBe('2026-07-09T12:00:00.000Z')
    expect(DUE_SOON_WINDOW_DAYS).toBe(7)
  })
})
