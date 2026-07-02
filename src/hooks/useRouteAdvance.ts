import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../features/auth/AuthProvider'
import { advanceDocumentRoute } from '../lib/workerApi'
import type { AdvanceRouteAction } from '../types/domain'

interface AdvanceInput {
  routeId: string
  assigneeRowId: string
  action: AdvanceRouteAction
  comment?: string
  reason?: string
}

export function useRouteAdvance() {
  const { accessToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: AdvanceInput) => {
      if (!accessToken) throw new Error('Sign in again to complete this action.')
      return advanceDocumentRoute(
        input.routeId,
        {
          assigneeRowId: input.assigneeRowId,
          action: input.action,
          comment: input.comment,
          reason: input.reason,
          idempotencyKey: crypto.randomUUID(),
        },
        accessToken,
      )
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inbox-tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['inbox-assignment'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] }),
        queryClient.invalidateQueries({ queryKey: ['documents-list'] }),
      ])
    },
  })
}
