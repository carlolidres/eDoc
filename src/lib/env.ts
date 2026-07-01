export const env = {
  nhostSubdomain: import.meta.env.VITE_NHOST_SUBDOMAIN?.trim() ?? '',
  nhostRegion: import.meta.env.VITE_NHOST_REGION?.trim() ?? '',
  hasuraUrl: import.meta.env.VITE_HASURA_GRAPHQL_URL?.trim() ?? '',
  workerApiUrl: import.meta.env.VITE_WORKER_API_URL?.trim() ?? '',
  sessionTimeoutMinutes: Number(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES ?? 15),
}

export function isNhostConfigured() {
  return Boolean(
    env.nhostSubdomain &&
      env.nhostRegion &&
      !env.nhostSubdomain.includes('your-') &&
      !env.nhostRegion.includes('your-'),
  )
}
