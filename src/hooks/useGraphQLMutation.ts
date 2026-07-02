import { useMutation, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query'
import type { RequestDocument, Variables } from 'graphql-request'
import { useGraphQLClient } from './useGraphQLClient'

export function useGraphQLMutation<TData, TVariables extends Variables = Variables>(
  document: RequestDocument,
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, 'mutationFn'>,
): UseMutationResult<TData, Error, TVariables> {
  const client = useGraphQLClient()

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      if (!client) throw new Error('GraphQL is not configured.')
      return client.request<TData>(document, variables)
    },
    ...options,
  })
}
