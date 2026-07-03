import {
  ADMIN_DEPARTMENTS,
  ADMIN_DOCUMENT_TYPES,
  ADMIN_ORGANIZATION,
  ADMIN_ROLES,
  ADMIN_SECURITY_SETTINGS,
  ADMIN_USERS,
  MY_ROLES,
  type AdminDepartmentsResponse,
  type AdminDocumentTypesResponse,
  type AdminOrganizationResponse,
  type AdminRolesResponse,
  type AdminSecuritySettingsResponse,
  type AdminUsersResponse,
  type MyRolesResponse,
} from '../graphql/queries'
import { useAuth } from '../features/auth/AuthProvider'
import { useGraphQLQuery } from './useGraphQLQuery'

const ADMIN_ROLE_NAMES = new Set(['Organization Administrator', 'Super Administrator'])

export function useAdminOrganization() {
  const query = useGraphQLQuery<AdminOrganizationResponse>('admin-organization', ADMIN_ORGANIZATION)
  return { ...query, organization: query.data?.organizations[0] ?? null }
}

/**
 * Every user may read their own role names, independent of admin scope (see Hasura `user_roles`
 * self filter). Filters by the Nhost user id directly rather than `profiles(limit: 1)`, since an
 * unordered, unfiltered `profiles` query can return any org peer's row once more than one profile
 * shares the organization.
 */
export function useMyRoles() {
  const { user } = useAuth()
  const enabled = Boolean(user?.id)
  const query = useGraphQLQuery<MyRolesResponse>(
    'my-roles',
    MY_ROLES,
    enabled ? { profileId: user!.id } : undefined,
    { enabled },
  )
  const roles = (query.data?.user_roles ?? [])
    .map((entry) => entry.role?.name)
    .filter((name): name is string => Boolean(name))
  return { ...query, roles }
}

/** Admin-scoped tables return zero rows for non-admins (Hasura row filter), not an error. */
export function useIsOrgAdmin() {
  const { roles, isLoading } = useMyRoles()
  const isAdmin = roles.some((role) => ADMIN_ROLE_NAMES.has(role))
  return { isAdmin, isLoading }
}

export function useAdminUsers() {
  const query = useGraphQLQuery<AdminUsersResponse>('admin-users', ADMIN_USERS)
  const users = (query.data?.profiles ?? []).map((profile) => ({
    id: profile.id,
    displayName: profile.display_name,
    email: profile.email,
    status: profile.status,
    roles: profile.user_roles.map((entry) => entry.role?.name).filter((name): name is string => Boolean(name)),
  }))
  return { ...query, users }
}

export function useAdminRoles() {
  const query = useGraphQLQuery<AdminRolesResponse>('admin-roles', ADMIN_ROLES)
  const roles = (query.data?.roles ?? []).map((role) => ({
    id: role.id,
    name: role.name,
    isSystem: Boolean(role.is_system),
  }))
  return { ...query, roles }
}

export function useAdminDepartments() {
  const query = useGraphQLQuery<AdminDepartmentsResponse>('admin-departments', ADMIN_DEPARTMENTS)
  return { ...query, departments: query.data?.departments ?? [] }
}

export function useAdminDocumentTypes() {
  const query = useGraphQLQuery<AdminDocumentTypesResponse>('admin-document-types', ADMIN_DOCUMENT_TYPES)
  const documentTypes = (query.data?.document_types ?? []).map((type) => ({
    id: type.id,
    name: type.name,
    category: type.category?.name ?? '—',
  }))
  return { ...query, documentTypes }
}

export function useAdminSecuritySettings() {
  const query = useGraphQLQuery<AdminSecuritySettingsResponse>('admin-security-settings', ADMIN_SECURITY_SETTINGS)
  return { ...query, settings: query.data?.security_settings[0] ?? null }
}
