-- Development seed data for Nhost PostgreSQL (idempotent).
-- Profile IDs must match Nhost auth user UUIDs for live GraphQL tests.
-- Replace profile UUIDs after creating users in Nhost dashboard.

INSERT INTO organizations (id, name, slug, created_at, updated_at) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Acme Quality Systems', 'acme-quality', '2026-07-01T00:00:00Z', '2026-07-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ponytail: Seed profiles use fixed UUIDs; map to real Nhost user IDs before production use.

INSERT INTO permissions (id, key, description) VALUES
  ('00000000-0000-4000-8000-000000000060', 'documents.create', 'Create documents'),
  ('00000000-0000-4000-8000-000000000061', 'documents.view', 'View authorized documents'),
  ('00000000-0000-4000-8000-000000000062', 'routes.act', 'Complete assigned route actions'),
  ('00000000-0000-4000-8000-000000000063', 'admin.manage', 'Manage organization settings')
ON CONFLICT (id) DO NOTHING;

INSERT INTO roles (id, organization_id, name, is_system) VALUES
  ('00000000-0000-4000-8000-000000000050', '00000000-0000-4000-8000-000000000001', 'Document Owner', false),
  ('00000000-0000-4000-8000-000000000051', '00000000-0000-4000-8000-000000000001', 'Reviewer', false),
  ('00000000-0000-4000-8000-000000000052', '00000000-0000-4000-8000-000000000001', 'Organization Administrator', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO security_settings (id, organization_id, session_timeout_minutes, mfa_required) VALUES
  ('00000000-0000-4000-8000-000000000070', '00000000-0000-4000-8000-000000000001', 15, false)
ON CONFLICT (id) DO NOTHING;
