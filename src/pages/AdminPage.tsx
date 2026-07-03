import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { useAuth } from '../features/auth/AuthProvider'
import {
  useAdminDepartments,
  useAdminDocumentTypes,
  useAdminOrganization,
  useAdminRoles,
  useAdminSecuritySettings,
  useAdminUsers,
  useIsOrgAdmin,
} from '../hooks/useAdminData'

const plannedSections = ['Permissions matrix', 'Retention rules', 'Email templates']

export function AdminPage() {
  const { usesNhost } = useAuth()
  const { isAdmin, isLoading: isRoleLoading } = useIsOrgAdmin()
  const { organization } = useAdminOrganization()
  const { users, isLoading: usersLoading, isError: usersError } = useAdminUsers()
  const { roles, isLoading: rolesLoading } = useAdminRoles()
  const { departments, isLoading: departmentsLoading } = useAdminDepartments()
  const { documentTypes, isLoading: documentTypesLoading } = useAdminDocumentTypes()
  const { settings, isLoading: settingsLoading } = useAdminSecuritySettings()

  if (!usesNhost) {
    return (
      <div className="page-stack">
        <section className="page-header">
          <div>
            <span className="eyebrow">Administration</span>
            <h2>System administration</h2>
          </div>
        </section>
        <EmptyState title="Nhost not configured" description="Set Nhost env values to load live administration data." />
      </div>
    )
  }

  if (!isRoleLoading && !isAdmin) {
    return (
      <div className="page-stack">
        <section className="page-header">
          <div>
            <span className="eyebrow">Administration</span>
            <h2>System administration</h2>
          </div>
        </section>
        <EmptyState
          title="Administrator access required"
          description="This area is limited to Organization Administrators. Contact your admin if you need access."
        />
      </div>
    )
  }

  return (
    <div className="page-stack">
      <section className="page-header">
        <div>
          <span className="eyebrow">Administration</span>
          <h2>System administration</h2>
          <p>Organization structure, users, and security configuration for {organization?.name ?? 'your organization'}.</p>
        </div>
      </section>

      <section className="panel">
        <h3>Users and roles</h3>
        {usersLoading ? (
          <EmptyState title="Loading users…" description="Fetching organization members from Hasura." />
        ) : usersError ? (
          <EmptyState title="Could not load users" description="Check Hasura admin permissions and profile mapping." />
        ) : users.length === 0 ? (
          <EmptyState title="No users found" description="Sync a Nhost profile to populate organization members." />
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Status</th><th>Roles</th></tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.displayName}</td>
                  <td>{user.email}</td>
                  <td>{user.status}</td>
                  <td>{user.roles.length ? user.roles.join(', ') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h3>Roles</h3>
        {rolesLoading ? (
          <EmptyState title="Loading roles…" description="Fetching organization roles from Hasura." />
        ) : roles.length === 0 ? (
          <EmptyState title="No roles found" description="Roles are seeded via database migrations." />
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Role</th><th>Type</th></tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td>{role.name}</td>
                  <td>{role.isSystem ? 'System' : 'Custom'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h3>Departments</h3>
        {departmentsLoading ? (
          <EmptyState title="Loading departments…" description="Fetching org structure from Hasura." />
        ) : departments.length === 0 ? (
          <EmptyState title="No departments yet" description="Departments are created via database migrations." />
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Department</th></tr>
            </thead>
            <tbody>
              {departments.map((department) => (
                <tr key={department.id}><td>{department.name}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h3>Document types</h3>
        {documentTypesLoading ? (
          <EmptyState title="Loading document types…" description="Fetching document taxonomy from Hasura." />
        ) : documentTypes.length === 0 ? (
          <EmptyState title="No document types yet" description="Document types are created via database migrations." />
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Type</th><th>Category</th></tr>
            </thead>
            <tbody>
              {documentTypes.map((type) => (
                <tr key={type.id}><td>{type.name}</td><td>{type.category}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h3>Security settings</h3>
        {settingsLoading ? (
          <EmptyState title="Loading security settings…" description="Fetching session and MFA policy from Hasura." />
        ) : !settings ? (
          <EmptyState title="No security settings configured" description="Configure via database migrations." />
        ) : (
          <table className="data-table">
            <tbody>
              <tr><th>Session timeout</th><td>{settings.session_timeout_minutes} minutes</td></tr>
              <tr><th>MFA required</th><td>{settings.mfa_required ? 'Yes' : 'No'}</td></tr>
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <h3>Related modules</h3>
        <p>
          Manage reusable routing sequences on <Link to="/routing-templates">Routing templates</Link> and review
          organization-wide activity on <Link to="/reports">Reports</Link>.
        </p>
      </section>

      <section className="card-grid">
        {plannedSections.map((section) => (
          <article className="panel template-card" key={section}>
            <strong>{section}</strong>
            <p>Planned module.</p>
          </article>
        ))}
      </section>
    </div>
  )
}
