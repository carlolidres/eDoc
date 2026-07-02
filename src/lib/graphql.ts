import { GraphQLClient } from 'graphql-request'
import { env } from './env'

/** Nhost JWTs default to the `me` role (auth schema only). App table permissions use `user`. */
const HASURA_APP_ROLE = 'user'

export function createGraphQLClient(accessToken?: string) {
  if (!env.hasuraUrl) return null
  const headers: Record<string, string> = {}
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
    headers['x-hasura-role'] = HASURA_APP_ROLE
  }
  return new GraphQLClient(env.hasuraUrl, { headers })
}
