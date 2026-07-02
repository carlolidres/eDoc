-- eDoc application schema (SQLite-first design)
-- Authoritative source for local validation before PostgreSQL/Nhost migration.
-- UUIDs stored as TEXT; timestamps as ISO-8601 TEXT.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Organization and identity
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'deactivated')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS business_units (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  code TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  business_unit_id TEXT REFERENCES business_units(id),
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS organization_members (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  department_id TEXT REFERENCES departments(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (organization_id, profile_id)
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  name TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, role_id)
);

CREATE TABLE IF NOT EXISTS user_delegations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  delegator_id TEXT NOT NULL REFERENCES profiles(id),
  delegate_id TEXT NOT NULL REFERENCES profiles(id),
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'in_app', 'both')),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  preferences_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS user_signature_profiles (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  signature_image_key TEXT,
  initials_image_key TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (profile_id, organization_id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_activity_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_address TEXT,
  user_agent TEXT,
  ended_at TEXT
);

-- ---------------------------------------------------------------------------
-- Documents
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS document_categories (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES document_categories(id),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS document_types (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  category_id TEXT REFERENCES document_categories(id),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS document_tags (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  owner_id TEXT NOT NULL REFERENCES profiles(id),
  department_id TEXT REFERENCES departments(id),
  document_type_id TEXT REFERENCES document_types(id),
  title TEXT NOT NULL,
  reference_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'preparing', 'ready_for_routing', 'in_routing', 'awaiting_action',
    'returned', 'rejected', 'completed', 'cancelled', 'expired', 'archived'
  )),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  confidentiality TEXT NOT NULL DEFAULT 'internal',
  description TEXT NOT NULL DEFAULT '',
  due_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  lock_version INTEGER NOT NULL DEFAULT 0,
  UNIQUE (organization_id, reference_number)
);

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'superseded', 'completed', 'void')),
  source_version_id TEXT REFERENCES document_versions(id),
  original_sha256 TEXT,
  final_sha256 TEXT,
  created_by TEXT NOT NULL REFERENCES profiles(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (document_id, version_number)
);

CREATE TABLE IF NOT EXISTS document_files (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id TEXT NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  file_role TEXT NOT NULL CHECK (file_role IN ('original', 'revised', 'signed', 'certificate', 'attachment')),
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  r2_object_key TEXT NOT NULL UNIQUE,
  sha256 TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS document_attachments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id TEXT REFERENCES document_versions(id),
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0),
  r2_object_key TEXT NOT NULL UNIQUE,
  sha256 TEXT,
  uploaded_by TEXT NOT NULL REFERENCES profiles(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS document_tag_assignments (
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES document_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (document_id, tag_id)
);

CREATE TABLE IF NOT EXISTS document_access_grants (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  grantee_id TEXT NOT NULL REFERENCES profiles(id),
  permission_level TEXT NOT NULL CHECK (permission_level IN ('view', 'comment', 'edit')),
  granted_by TEXT NOT NULL REFERENCES profiles(id),
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS document_retention_rules (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  document_type_id TEXT REFERENCES document_types(id),
  retain_years INTEGER NOT NULL CHECK (retain_years > 0),
  action_on_expiry TEXT NOT NULL DEFAULT 'archive' CHECK (action_on_expiry IN ('archive', 'notify', 'delete')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Routing
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS routing_templates (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL CHECK (mode IN ('sequential', 'parallel', 'mixed')),
  created_by TEXT NOT NULL REFERENCES profiles(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS routing_template_steps (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  template_id TEXT NOT NULL REFERENCES routing_templates(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('review', 'approve', 'sign', 'acknowledge')),
  completion_rule TEXT NOT NULL DEFAULT 'all' CHECK (completion_rule IN ('all', 'any', 'majority', 'minimum_count')),
  minimum_count INTEGER,
  UNIQUE (template_id, sequence)
);

CREATE TABLE IF NOT EXISTS document_routes (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id TEXT NOT NULL REFERENCES document_versions(id),
  template_id TEXT REFERENCES routing_templates(id),
  mode TEXT NOT NULL CHECK (mode IN ('sequential', 'parallel', 'mixed')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'rejected', 'returned', 'cancelled', 'expired')),
  started_at TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS route_steps (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  route_id TEXT NOT NULL REFERENCES document_routes(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('review', 'approve', 'sign', 'acknowledge')),
  completion_rule TEXT NOT NULL DEFAULT 'all' CHECK (completion_rule IN ('all', 'any', 'majority', 'minimum_count')),
  minimum_count INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'rejected', 'returned', 'skipped', 'invalidated')),
  due_at TEXT,
  UNIQUE (route_id, sequence)
);

CREATE TABLE IF NOT EXISTS route_step_assignees (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  step_id TEXT NOT NULL REFERENCES route_steps(id) ON DELETE CASCADE,
  assignee_id TEXT NOT NULL REFERENCES profiles(id),
  delegated_from_id TEXT REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'rejected', 'returned', 'delegated', 'invalidated')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS route_step_actions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  step_id TEXT NOT NULL REFERENCES route_steps(id) ON DELETE CASCADE,
  assignee_id TEXT NOT NULL REFERENCES route_step_assignees(id),
  action TEXT NOT NULL CHECK (action IN ('review', 'approve', 'sign', 'acknowledge', 'reject', 'return', 'delegate')),
  status TEXT NOT NULL CHECK (status IN ('completed', 'rejected', 'returned', 'delegated')),
  comment TEXT NOT NULL DEFAULT '',
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS route_step_delegations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  assignee_id TEXT NOT NULL REFERENCES route_step_assignees(id) ON DELETE CASCADE,
  from_profile_id TEXT NOT NULL REFERENCES profiles(id),
  to_profile_id TEXT NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS route_reminders (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  route_id TEXT NOT NULL REFERENCES document_routes(id) ON DELETE CASCADE,
  step_id TEXT REFERENCES route_steps(id),
  assignee_id TEXT NOT NULL REFERENCES profiles(id),
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'in_app')),
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS route_escalations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  route_id TEXT NOT NULL REFERENCES document_routes(id) ON DELETE CASCADE,
  step_id TEXT REFERENCES route_steps(id),
  escalated_to_id TEXT NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Signatures
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS signature_fields (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id TEXT NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  assignee_id TEXT NOT NULL REFERENCES route_step_assignees(id) ON DELETE CASCADE,
  field_type TEXT NOT NULL CHECK (field_type IN (
    'signature', 'initial', 'name', 'job_title', 'date_signed', 'text', 'checkbox',
    'approval_meaning', 'review_meaning', 'acknowledgment'
  )),
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  x REAL NOT NULL CHECK (x >= 0 AND x <= 1),
  y REAL NOT NULL CHECK (y >= 0 AND y <= 1),
  width REAL NOT NULL CHECK (width > 0 AND width <= 1),
  height REAL NOT NULL CHECK (height > 0 AND height <= 1),
  required INTEGER NOT NULL DEFAULT 1 CHECK (required IN (0, 1))
);

CREATE TABLE IF NOT EXISTS signature_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  document_id TEXT NOT NULL REFERENCES documents(id),
  version_id TEXT NOT NULL REFERENCES document_versions(id),
  assignee_id TEXT NOT NULL REFERENCES route_step_assignees(id),
  signer_id TEXT NOT NULL REFERENCES profiles(id),
  signature_meaning TEXT NOT NULL,
  auth_method TEXT NOT NULL,
  document_hash TEXT NOT NULL,
  final_pdf_hash TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS signature_authentication_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  signature_event_id TEXT NOT NULL REFERENCES signature_events(id) ON DELETE CASCADE,
  auth_method TEXT NOT NULL,
  success INTEGER NOT NULL CHECK (success IN (0, 1)),
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS completion_certificates (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  document_id TEXT NOT NULL REFERENCES documents(id),
  version_id TEXT NOT NULL REFERENCES document_versions(id),
  route_id TEXT NOT NULL REFERENCES document_routes(id),
  certificate_key TEXT NOT NULL UNIQUE,
  verification_code TEXT NOT NULL UNIQUE,
  issued_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Collaboration
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS document_comments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id TEXT REFERENCES document_versions(id),
  author_id TEXT NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comment_replies (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES document_comments(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL REFERENCES profiles(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comment_mentions (
  id TEXT PRIMARY KEY,
  comment_id TEXT NOT NULL REFERENCES document_comments(id) ON DELETE CASCADE,
  mentioned_profile_id TEXT NOT NULL REFERENCES profiles(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  recipient_id TEXT NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  entity_type TEXT,
  entity_id TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'in_app')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  delivered_at TEXT,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  template_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (organization_id, template_key)
);

-- ---------------------------------------------------------------------------
-- Compliance and system
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  user_id TEXT REFERENCES profiles(id),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  document_id TEXT REFERENCES documents(id),
  version_id TEXT REFERENCES document_versions(id),
  previous_value TEXT,
  new_value TEXT,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  source TEXT NOT NULL DEFAULT 'app',
  integrity_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  setting_key TEXT NOT NULL,
  setting_value_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (organization_id, setting_key)
);

CREATE TABLE IF NOT EXISTS security_settings (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) UNIQUE,
  session_timeout_minutes INTEGER NOT NULL DEFAULT 15 CHECK (session_timeout_minutes > 0),
  mfa_required INTEGER NOT NULL DEFAULT 0 CHECK (mfa_required IN (0, 1)),
  password_policy_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  context_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS file_access_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  file_id TEXT NOT NULL REFERENCES document_files(id),
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  access_type TEXT NOT NULL CHECK (access_type IN ('preview', 'download')),
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS data_export_logs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  exported_by TEXT NOT NULL REFERENCES profiles(id),
  export_type TEXT NOT NULL,
  filters_json TEXT NOT NULL DEFAULT '{}',
  row_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles (organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org ON organization_members (organization_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_documents_org_status ON documents (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_org_owner ON documents (organization_id, owner_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_doc ON document_versions (document_id, version_number);
CREATE INDEX IF NOT EXISTS idx_document_routes_doc ON document_routes (document_id, status);
CREATE INDEX IF NOT EXISTS idx_route_assignees_user_status ON route_step_assignees (organization_id, assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications (organization_id, recipient_id, read_at);
CREATE INDEX IF NOT EXISTS idx_audit_document_created ON audit_events (organization_id, document_id, created_at);

-- ---------------------------------------------------------------------------
-- Append-only audit protection
-- ---------------------------------------------------------------------------

CREATE TRIGGER IF NOT EXISTS prevent_audit_events_update
BEFORE UPDATE ON audit_events
BEGIN
  SELECT RAISE(ABORT, 'audit_events are append-only');
END;

CREATE TRIGGER IF NOT EXISTS prevent_audit_events_delete
BEFORE DELETE ON audit_events
BEGIN
  SELECT RAISE(ABORT, 'audit_events cannot be deleted');
END;
