-- eDoc initial PostgreSQL/Hasura schema draft.
-- Apply through a reviewed Nhost/Hasura migration flow after local validation.

create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key,
  organization_id uuid references organizations(id),
  display_name text not null,
  email text not null,
  status text not null default 'active' check (status in ('active','invited','deactivated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name text not null,
  unique (organization_id, name)
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  name text not null,
  is_system boolean not null default false,
  unique (organization_id, name)
);

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text not null
);

create table if not exists role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists user_roles (
  profile_id uuid not null references profiles(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  primary key (profile_id, role_id)
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_id uuid not null references profiles(id),
  department_id uuid references departments(id),
  title text not null,
  reference_number text,
  status text not null default 'draft' check (status in ('draft','preparing','ready_for_routing','in_routing','awaiting_my_action','returned','rejected','completed','cancelled','expired','archived')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  confidentiality text not null default 'internal',
  description text not null default '',
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lock_version integer not null default 0,
  unique (organization_id, reference_number)
);

create table if not exists document_versions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  document_id uuid not null references documents(id) on delete cascade,
  version_number integer not null,
  status text not null default 'draft' check (status in ('draft','active','superseded','completed','void')),
  source_version_id uuid references document_versions(id),
  original_sha256 text,
  final_sha256 text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  unique (document_id, version_number)
);

create table if not exists document_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  document_id uuid not null references documents(id) on delete cascade,
  version_id uuid not null references document_versions(id) on delete cascade,
  file_role text not null check (file_role in ('original','revised','signed','certificate','attachment')),
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  r2_object_key text not null unique,
  sha256 text,
  created_at timestamptz not null default now()
);

create table if not exists document_routes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  document_id uuid not null references documents(id) on delete cascade,
  version_id uuid not null references document_versions(id),
  mode text not null check (mode in ('sequential','parallel','mixed')),
  status text not null default 'draft' check (status in ('draft','active','completed','rejected','returned','cancelled','expired')),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists route_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  route_id uuid not null references document_routes(id) on delete cascade,
  sequence integer not null,
  action text not null check (action in ('review','approve','sign','acknowledge')),
  completion_rule text not null default 'all' check (completion_rule in ('all','any','majority','minimum_count')),
  minimum_count integer,
  status text not null default 'pending' check (status in ('pending','active','completed','rejected','returned','skipped','invalidated')),
  due_at timestamptz,
  unique (route_id, sequence)
);

create table if not exists route_step_assignees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  step_id uuid not null references route_steps(id) on delete cascade,
  assignee_id uuid not null references profiles(id),
  delegated_from_id uuid references profiles(id),
  status text not null default 'pending' check (status in ('pending','active','completed','rejected','returned','delegated','invalidated')),
  completed_at timestamptz
);

create table if not exists signature_fields (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  document_id uuid not null references documents(id) on delete cascade,
  version_id uuid not null references document_versions(id) on delete cascade,
  assignee_id uuid not null references route_step_assignees(id) on delete cascade,
  field_type text not null check (field_type in ('signature','initial','name','job_title','date_signed','text','checkbox','approval_meaning','review_meaning','acknowledgment')),
  page_number integer not null check (page_number > 0),
  x numeric not null check (x >= 0 and x <= 1),
  y numeric not null check (y >= 0 and y <= 1),
  width numeric not null check (width > 0 and width <= 1),
  height numeric not null check (height > 0 and height <= 1),
  required boolean not null default true
);

create table if not exists signature_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  document_id uuid not null references documents(id),
  version_id uuid not null references document_versions(id),
  assignee_id uuid not null references route_step_assignees(id),
  signer_id uuid not null references profiles(id),
  signature_meaning text not null,
  auth_method text not null,
  document_hash text not null,
  final_pdf_hash text,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  user_id uuid references profiles(id),
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  document_id uuid references documents(id),
  version_id uuid references document_versions(id),
  previous_value jsonb,
  new_value jsonb,
  reason text,
  ip_address inet,
  user_agent text,
  request_id text,
  source text not null default 'app',
  integrity_hash text,
  created_at timestamptz not null default now()
);

create index if not exists idx_documents_org_status on documents (organization_id, status);
create index if not exists idx_documents_org_owner on documents (organization_id, owner_id);
create index if not exists idx_route_assignees_user_status on route_step_assignees (organization_id, assignee_id, status);
create index if not exists idx_audit_document_created on audit_events (organization_id, document_id, created_at desc);
