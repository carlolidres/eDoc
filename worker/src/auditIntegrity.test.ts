import { describe, expect, it } from 'vitest'
import { buildAuditHashPayload, computeAuditIntegrityHash } from './auditIntegrity'

describe('auditIntegrity', () => {
  it('builds a stable canonical payload', () => {
    const payload = buildAuditHashPayload({
      organization_id: 'org-1',
      user_id: 'user-1',
      event_type: 'route.started',
      entity_type: 'document_route',
      entity_id: 'route-1',
      document_id: 'doc-1',
      version_id: 'ver-1',
      previous_value: { route_status: 'draft' },
      new_value: { route_status: 'active', active_step_ids: ['step-1'] },
      request_id: 'req-1',
      source: 'worker',
    })

    expect(payload).toEqual({
      id: null,
      organization_id: 'org-1',
      user_id: 'user-1',
      event_type: 'route.started',
      entity_type: 'document_route',
      entity_id: 'route-1',
      document_id: 'doc-1',
      version_id: 'ver-1',
      previous_value: { route_status: 'draft' },
      new_value: { route_status: 'active', active_step_ids: ['step-1'] },
      reason: null,
      ip_address: null,
      user_agent: null,
      request_id: 'req-1',
      source: 'worker',
    })
  })

  it('hashes nested objects deterministically', async () => {
    const input = {
      id: 'audit-1',
      organization_id: 'org-1',
      user_id: 'user-1',
      event_type: 'assignee.approved',
      entity_type: 'route_step_assignee',
      entity_id: 'assignee-1',
      document_id: 'doc-1',
      version_id: 'ver-1',
      previous_value: { step_status: 'active', route_status: 'active' },
      new_value: { action: 'approve', response: { routeCompleted: false } },
      reason: null,
      request_id: 'idem-1',
      source: 'worker',
    }

    const first = await computeAuditIntegrityHash(input)
    const second = await computeAuditIntegrityHash({
      ...input,
      new_value: { response: { routeCompleted: false }, action: 'approve' },
    })

    expect(first).toMatch(/^[a-f0-9]{64}$/)
    expect(first).toBe(second)
  })
})
