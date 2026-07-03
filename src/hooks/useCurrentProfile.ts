import { CURRENT_PROFILE, type CurrentProfileResponse } from '../graphql/queries'
import { useAuth } from '../features/auth/AuthProvider'
import { useGraphQLQuery } from './useGraphQLQuery'

/**
 * Filters by the Nhost user id rather than an unfiltered `profiles(limit: 1)`, since that query
 * is ambiguous (and returns an arbitrary org peer's row) once an organization has more than one profile.
 */
export function useCurrentProfile() {
  const { user } = useAuth()
  const enabled = Boolean(user?.id)
  const query = useGraphQLQuery<CurrentProfileResponse>(
    'current-profile',
    CURRENT_PROFILE,
    enabled ? { profileId: user!.id } : undefined,
    { enabled },
  )
  const profile = query.data?.profiles[0] ?? null
  return { ...query, profile }
}
