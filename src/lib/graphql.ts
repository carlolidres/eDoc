import { GraphQLClient } from 'graphql-request'
import { env } from './env'

export function createGraphQLClient(accessToken?: string) {
  if (!env.hasuraUrl) return null
  return new GraphQLClient(env.hasuraUrl, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  })
}
