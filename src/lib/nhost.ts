import { NhostClient } from '@nhost/nhost-js'
import { env, isNhostConfigured } from './env'

let client: NhostClient | null = null

export function getNhostClient() {
  if (!isNhostConfigured()) return null
  if (!client) {
    client = new NhostClient({
      subdomain: env.nhostSubdomain,
      region: env.nhostRegion,
      autoRefreshToken: true,
      autoSignIn: true,
      clientStorageType: 'web',
      clientStorage: sessionStorage,
    })
  }
  return client
}
