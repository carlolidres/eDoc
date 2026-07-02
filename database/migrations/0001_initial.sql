-- eDoc initial PostgreSQL/Hasura schema draft.
-- Derived from validated SQLite schema in database/sqlite/schema.sql.
-- Apply through a reviewed Nhost/Hasura migration flow after local validation.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Organization and identity

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id),
  display_name text NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'deactivated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  business_unit_id uuid REFERENCES business_units(id),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  department_id uuid REFERENCES departments(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, profile_id)
);

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  name text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  description text NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  delegator_id uuid NOT NULL REFERENCES profiles(id),
  delegate_id uuid NOT NULL REFERENCES profiles(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  channel text NOT NULL CHECK (channel IN ('email', 'in_app', 'both')),
  enabled boolean NOT NULL DEFAULT true,
  preferences_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS user_signature_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  signature_image_key text,
  initials_image_key text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, organization_id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text,
  ended_at timestamptz
);

-- Documents

CREATE TABLE IF NOT EXISTS document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  parent_id uuid REFERENCES document_categories(id),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  category_id uuid REFERENCES document_categories(id),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS document_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  owner_id uuid NOT NULL REFERENCES profiles(id),
  department_id uuid REFERENCES departments(id),
  document_type_id uuid REFERENCES document_types(id),
  title text NOT NULL,
  reference_number text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'preparing', 'ready_for_routing', 'in_routing', 'awaiting_action',
    'returned', 'rejected', 'completed', 'cancelled', 'expired', 'archived'
  )),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  confidentiality text NOT NULL DEFAULT 'internal',
  description text NOT NULL DEFAULT '',
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  lock_version integer NOT NULL DEFAULT 0,
  UNIQUE (organization_id, reference_number)
);

CREATE TABLE IF NOT EXISTS document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'superseded', 'completed', 'void')),
  source_version_id uuid REFERENCES document_versions(id),
  original_sha256 text,
  final_sha256 text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, version_number)
);

CREATE TABLE IF NOT EXISTS document_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  file_role text NOT NULL CHECK (file_role IN ('original', 'revised', 'signed', 'certificate', 'attachment')),
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  r2_object_key text NOT NULL UNIQUE,
  sha256 text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id uuid REFERENCES document_versions(id),
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  r2_object_key text NOT NULL UNIQUE,
  sha256 text,
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_tag_assignments (
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES document_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);

CREATE TABLE IF NOT EXISTS document_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  grantee_id uuid NOT NULL REFERENCES profiles(id),
  permission_level text NOT NULL CHECK (permission_level IN ('view', 'comment', 'edit')),
  granted_by uuid NOT NULL REFERENCES profiles(id),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_retention_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  document_type_id uuid REFERENCES document_types(id),
  retain_years integer NOT NULL CHECK (retain_years > 0),
  action_on_expiry text NOT NULL DEFAULT 'archive' CHECK (action_on_expiry IN ('archive', 'notify', 'delete')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Routing

CREATE TABLE IF NOT EXISTS routing_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  mode text NOT NULL CHECK (mode IN ('sequential', 'parallel', 'mixed')),
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS routing_template_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  template_id uuid NOT NULL REFERENCES routing_templates(id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  action text NOT NULL CHECK (action IN ('review', 'approve', 'sign', 'acknowledge')),
  completion_rule text NOT NULL DEFAULT 'all' CHECK (completion_rule IN ('all', 'any', 'majority', 'minimum_count')),
  minimum_count integer,
  UNIQUE (template_id, sequence)
);

CREATE TABLE IF NOT EXISTS document_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES document_versions(id),
  template_id uuid REFERENCES routing_templates(id),
  mode text NOT NULL CHECK (mode IN ('sequential', 'parallel', 'mixed')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'rejected', 'returned', 'cancelled', 'expired')),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS route_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  route_id uuid NOT NULL REFERENCES document_routes(id) ON DELETE CASCADE,
  sequence integer NOT NULL,
  action text NOT NULL CHECK (action IN ('review', 'approve', 'sign', 'acknowledge')),
  completion_rule text NOT NULL DEFAULT 'all' CHECK (completion_rule IN ('all', 'any', 'majority', 'minimum_count')),
  minimum_count integer,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'rejected', 'returned', 'skipped', 'invalidated')),
  due_at timestamptz,
  UNIQUE (route_id, sequence)
);

CREATE TABLE IF NOT EXISTS route_step_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  step_id uuid NOT NULL REFERENCES route_steps(id) ON DELETE CASCADE,
  assignee_id uuid NOT NULL REFERENCES profiles(id),
  delegated_from_id uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'rejected', 'returned', 'delegated', 'invalidated')),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS route_step_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  step_id uuid NOT NULL REFERENCES route_steps(id) ON DELETE CASCADE,
  assignee_id uuid NOT NULL REFERENCES route_step_assignees(id),
  action text NOT NULL CHECK (action IN ('review', 'approve', 'sign', 'acknowledge', 'reject', 'return', 'delegate')),
  status text NOT NULL CHECK (status IN ('completed', 'rejected', 'returned', 'delegated')),
  comment text NOT NULL DEFAULT '',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS route_step_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  assignee_id uuid NOT NULL REFERENCES route_step_assignees(id) ON DELETE CASCADE,
  from_profile_id uuid NOT NULL REFERENCES profiles(id),
  to_profile_id uuid NOT NULL REFERENCES profiles(id),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS route_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  route_id uuid NOT NULL REFERENCES document_routes(id) ON DELETE CASCADE,
  step_id uuid REFERENCES route_steps(id),
  assignee_id uuid NOT NULL REFERENCES profiles(id),
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'in_app')),
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS route_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  route_id uuid NOT NULL REFERENCES document_routes(id) ON DELETE CASCADE,
  step_id uuid REFERENCES route_steps(id),
  escalated_to_id uuid NOT NULL REFERENCES profiles(id),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Signatures

CREATE TABLE IF NOT EXISTS signature_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  assignee_id uuid NOT NULL REFERENCES route_step_assignees(id) ON DELETE CASCADE,
  field_type text NOT NULL CHECK (field_type IN (
    'signature', 'initial', 'name', 'job_title', 'date_signed', 'text', 'checkbox',
    'approval_meaning', 'review_meaning', 'acknowledgment'
  )),
  page_number integer NOT NULL CHECK (page_number > 0),
  x numeric NOT NULL CHECK (x >= 0 AND x <= 1),
  y numeric NOT NULL CHECK (y >= 0 AND y <= 1),
  width numeric NOT NULL CHECK (width > 0 AND width <= 1),
  height numeric NOT NULL CHECK (height > 0 AND height <= 1),
  required boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS signature_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  document_id uuid NOT NULL REFERENCES documents(id),
  version_id uuid NOT NULL REFERENCES document_versions(id),
  assignee_id uuid NOT NULL REFERENCES route_step_assignees(id),
  signer_id uuid NOT NULL REFERENCES profiles(id),
  signature_meaning text NOT NULL,
  auth_method text NOT NULL,
  document_hash text NOT NULL,
  final_pdf_hash text,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS signature_authentication_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  signature_event_id uuid NOT NULL REFERENCES signature_events(id) ON DELETE CASCADE,
  auth_method text NOT NULL,
  success boolean NOT NULL,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS completion_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  document_id uuid NOT NULL REFERENCES documents(id),
  version_id uuid NOT NULL REFERENCES document_versions(id),
  route_id uuid NOT NULL REFERENCES document_routes(id),
  certificate_key text NOT NULL UNIQUE,
  verification_code text NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now()
);

-- Collaboration

CREATE TABLE IF NOT EXISTS document_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id uuid REFERENCES document_versions(id),
  author_id uuid NOT NULL REFERENCES profiles(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comment_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES document_comments(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comment_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES document_comments(id) ON DELETE CASCADE,
  mentioned_profile_id uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  recipient_id uuid NOT NULL REFERENCES profiles(id),
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email', 'in_app')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  delivered_at timestamptz,
  error_message text
);

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  template_key text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  body_text text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, template_key)
);

-- Compliance and system

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid REFERENCES profiles(id),
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  document_id uuid REFERENCES documents(id),
  version_id uuid REFERENCES document_versions(id),
  previous_value jsonb,
  new_value jsonb,
  reason text,
  ip_address inet,
  user_agent text,
  request_id text,
  source text NOT NULL DEFAULT 'app',
  integrity_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  setting_key text NOT NULL,
  setting_value_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, setting_key)
);

CREATE TABLE IF NOT EXISTS security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) UNIQUE,
  session_timeout_minutes integer NOT NULL DEFAULT 15 CHECK (session_timeout_minutes > 0),
  mfa_required boolean NOT NULL DEFAULT false,
  password_policy_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  level text NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message text NOT NULL,
  context_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS file_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  file_id uuid NOT NULL REFERENCES document_files(id),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  access_type text NOT NULL CHECK (access_type IN ('preview', 'download')),
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS data_export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  exported_by uuid NOT NULL REFERENCES profiles(id),
  export_type text NOT NULL,
  filters_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  row_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes

CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles (organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org ON organization_members (organization_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_documents_org_status ON documents (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_org_owner ON documents (organization_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_doc ON document_versions (document_id, version_number);
CREATE INDEX IF NOT EXISTS idx_document_routes_doc ON document_routes (document_id, status);
CREATE INDEX IF NOT EXISTS idx_route_assignees_user_status ON route_step_assignees (organization_id, assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (organization_id, recipient_id, read_at);
CREATE INDEX IF NOT EXISTS idx_audit_document_created ON audit_events (organization_id, document_id, created_at DESC);

-- Append-only audit protection

CREATE OR REPLACE FUNCTION prevent_audit_events_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events are append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_audit_events_update ON audit_events;
CREATE TRIGGER prevent_audit_events_update
  BEFORE UPDATE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_events_mutation();

DROP TRIGGER IF EXISTS prevent_audit_events_delete ON audit_events;
CREATE TRIGGER prevent_audit_events_delete
  BEFORE DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_events_mutation();
