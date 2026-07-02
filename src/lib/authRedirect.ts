export function authRedirectUrl(hashPath: string) {
  const path = hashPath.startsWith('/') ? hashPath : `/${hashPath}`
  return `${window.location.origin}${window.location.pathname}#${path}`
}
