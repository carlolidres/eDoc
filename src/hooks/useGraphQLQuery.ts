import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query'
import type { RequestDocument, Variables } from 'graphql-request'
import { useGraphQLClient } from './useGraphQLClient'

type GraphQLQueryKey = readonly [string, string, Variables | undefined]

export function useGraphQLQuery<TData, TVariables extends Variables = Variables>(
  key: string,
  document: RequestDocument,
  variables?: TVariables,
  options?: Omit<UseQueryOptions<TData, Error, TData, GraphQLQueryKey>, 'queryKey' | 'queryFn'>,
): UseQueryResult<TData, Error> {
  const client = useGraphQLClient()

  return useQuery<TData, Error, TData, GraphQLQueryKey>({
    queryKey: [key, String(document), variables],
    enabled: Boolean(client) && (options?.enabled ?? true),
    queryFn: async () => {
      if (!client) throw new Error('GraphQL is not configured.')
      return client.request<TData>(document, variables)
    },
    ...options,
  })
}
