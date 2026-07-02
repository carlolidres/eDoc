import { CURRENT_PROFILE, type CurrentProfileResponse } from '../graphql/queries'
import { useGraphQLQuery } from './useGraphQLQuery'

export function useCurrentProfile() {
  const query = useGraphQLQuery<CurrentProfileResponse>('current-profile', CURRENT_PROFILE)
  const profile = query.data?.profiles[0] ?? null
  return { ...query, profile }
}
