import { NhostClient } from '@nhost/nhost-js'
import { env, isNhostConfigured } from './env'

type AuthChangedListener = Parameters<NhostClient['auth']['onAuthStateChanged']>[0]

let client: NhostClient | null = null
const authListeners = new Set<AuthChangedListener>()
let authBridgeAttached = false

function attachAuthBridge(nhost: NhostClient) {
  if (authBridgeAttached) return
  authBridgeAttached = true
  // Single permanent Nhost subscription; React listeners detach via authListeners only.
  nhost.auth.onAuthStateChanged((event, session) => {
    authListeners.forEach((listener) => listener(event, session))
  })
}

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
    attachAuthBridge(client)
  }
  return client
}

export function subscribeNhostAuth(listener: AuthChangedListener) {
  const nhost = getNhostClient()
  if (!nhost) return () => {}
  attachAuthBridge(nhost)
  authListeners.add(listener)
  return () => {
    authListeners.delete(listener)
  }
}
