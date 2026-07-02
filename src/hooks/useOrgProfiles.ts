import { ORG_PROFILES, type OrgProfilesResponse } from '../graphql/queries'
import { useGraphQLQuery } from './useGraphQLQuery'

export function useOrgProfiles() {
  const query = useGraphQLQuery<OrgProfilesResponse>('org-profiles', ORG_PROFILES)
  return { ...query, profiles: query.data?.profiles ?? [] }
}
