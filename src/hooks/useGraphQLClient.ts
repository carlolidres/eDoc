import { useMemo } from 'react'
import { useAuth } from '../features/auth/AuthProvider'
import { createGraphQLClient } from '../lib/graphql'

export function useGraphQLClient() {
  const { accessToken } = useAuth()
  return useMemo(() => createGraphQLClient(accessToken ?? undefined), [accessToken])
}
