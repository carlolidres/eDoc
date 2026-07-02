# SQLite Schema Report

Generated: `2026-07-02T07:10:38.335261+00:00`

Source: `database/sqlite/schema.sql`

Tables: **48**

## `audit_events`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `user_id` | TEXT |  |  |  |
| `event_type` | TEXT |  | yes |  |
| `entity_type` | TEXT |  | yes |  |
| `entity_id` | TEXT |  |  |  |
| `document_id` | TEXT |  |  |  |
| `version_id` | TEXT |  |  |  |
| `previous_value` | TEXT |  |  |  |
| `new_value` | TEXT |  |  |  |
| `reason` | TEXT |  |  |  |
| `ip_address` | TEXT |  |  |  |
| `user_agent` | TEXT |  |  |  |
| `request_id` | TEXT |  |  |  |
| `source` | TEXT |  | yes | 'app' |
| `integrity_hash` | TEXT |  |  |  |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `version_id` → `document_versions.id`
- `document_id` → `documents.id`
- `user_id` → `profiles.id`
- `organization_id` → `organizations.id`

**Indexes:**
- `idx_audit_document_created` (`organization_id`, `document_id`, `created_at`)

## `business_units`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `name` | TEXT |  | yes |  |
| `code` | TEXT |  |  |  |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `organization_id` → `organizations.id`

**Indexes:**
- unique `sqlite_autoindex_business_units_2` (`organization_id`, `name`)

## `comment_mentions`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `comment_id` | TEXT |  | yes |  |
| `mentioned_profile_id` | TEXT |  | yes |  |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `mentioned_profile_id` → `profiles.id`
- `comment_id` → `document_comments.id`

## `comment_replies`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `comment_id` | TEXT |  | yes |  |
| `author_id` | TEXT |  | yes |  |
| `body` | TEXT |  | yes |  |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `author_id` → `profiles.id`
- `comment_id` → `document_comments.id`

## `completion_certificates`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `document_id` | TEXT |  | yes |  |
| `version_id` | TEXT |  | yes |  |
| `route_id` | TEXT |  | yes |  |
| `certificate_key` | TEXT |  | yes |  |
| `verification_code` | TEXT |  | yes |  |
| `issued_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `route_id` → `document_routes.id`
- `version_id` → `document_versions.id`
- `document_id` → `documents.id`
- `organization_id` → `organizations.id`

**Indexes:**
- unique `sqlite_autoindex_completion_certificates_3` (`verification_code`)
- unique `sqlite_autoindex_completion_certificates_2` (`certificate_key`)

## `data_export_logs`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `exported_by` | TEXT |  | yes |  |
| `export_type` | TEXT |  | yes |  |
| `filters_json` | TEXT |  | yes | '{}' |
| `row_count` | INTEGER |  | yes | 0 |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `exported_by` → `profiles.id`
- `organization_id` → `organizations.id`

## `departments`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `business_unit_id` | TEXT |  |  |  |
| `name` | TEXT |  | yes |  |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `business_unit_id` → `business_units.id`
- `organization_id` → `organizations.id`

**Indexes:**
- unique `sqlite_autoindex_departments_2` (`organization_id`, `name`)

## `document_access_grants`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `document_id` | TEXT |  | yes |  |
| `grantee_id` | TEXT |  | yes |  |
| `permission_level` | TEXT |  | yes |  |
| `granted_by` | TEXT |  | yes |  |
| `expires_at` | TEXT |  |  |  |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `granted_by` → `profiles.id`
- `grantee_id` → `profiles.id`
- `document_id` → `documents.id`
- `organization_id` → `organizations.id`

## `document_attachments`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `document_id` | TEXT |  | yes |  |
| `version_id` | TEXT |  |  |  |
| `file_name` | TEXT |  | yes |  |
| `mime_type` | TEXT |  | yes |  |
| `size_bytes` | INTEGER |  | yes |  |
| `r2_object_key` | TEXT |  | yes |  |
| `sha256` | TEXT |  |  |  |
| `uploaded_by` | TEXT |  | yes |  |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `uploaded_by` → `profiles.id`
- `version_id` → `document_versions.id`
- `document_id` → `documents.id`
- `organization_id` → `organizations.id`

**Indexes:**
- unique `sqlite_autoindex_document_attachments_2` (`r2_object_key`)

## `document_categories`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `name` | TEXT |  | yes |  |
| `parent_id` | TEXT |  |  |  |

**Foreign keys:**
- `parent_id` → `document_categories.id`
- `organization_id` → `organizations.id`

**Indexes:**
- unique `sqlite_autoindex_document_categories_2` (`organization_id`, `name`)

## `document_comments`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `document_id` | TEXT |  | yes |  |
| `version_id` | TEXT |  |  |  |
| `author_id` | TEXT |  | yes |  |
| `body` | TEXT |  | yes |  |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `author_id` → `profiles.id`
- `version_id` → `document_versions.id`
- `document_id` → `documents.id`
- `organization_id` → `organizations.id`

## `document_files`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `document_id` | TEXT |  | yes |  |
| `version_id` | TEXT |  | yes |  |
| `file_role` | TEXT |  | yes |  |
| `file_name` | TEXT |  | yes |  |
| `mime_type` | TEXT |  | yes |  |
| `size_bytes` | INTEGER |  | yes |  |
| `r2_object_key` | TEXT |  | yes |  |
| `sha256` | TEXT |  |  |  |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `version_id` → `document_versions.id`
- `document_id` → `documents.id`
- `organization_id` → `organizations.id`

**Indexes:**
- unique `sqlite_autoindex_document_files_2` (`r2_object_key`)

## `document_retention_rules`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `document_type_id` | TEXT |  |  |  |
| `retain_years` | INTEGER |  | yes |  |
| `action_on_expiry` | TEXT |  | yes | 'archive' |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `document_type_id` → `document_types.id`
- `organization_id` → `organizations.id`

## `document_routes`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `document_id` | TEXT |  | yes |  |
| `version_id` | TEXT |  | yes |  |
| `template_id` | TEXT |  |  |  |
| `mode` | TEXT |  | yes |  |
| `status` | TEXT |  | yes | 'draft' |
| `started_at` | TEXT |  |  |  |
| `completed_at` | TEXT |  |  |  |

**Foreign keys:**
- `template_id` → `routing_templates.id`
- `version_id` → `document_versions.id`
- `document_id` → `documents.id`
- `organization_id` → `organizations.id`

**Indexes:**
- `idx_document_routes_doc` (`document_id`, `status`)

## `document_tag_assignments`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `document_id` | TEXT | yes | yes |  |
| `tag_id` | TEXT | yes | yes |  |

**Foreign keys:**
- `tag_id` → `document_tags.id`
- `document_id` → `documents.id`

## `document_tags`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `name` | TEXT |  | yes |  |

**Foreign keys:**
- `organization_id` → `organizations.id`

**Indexes:**
- unique `sqlite_autoindex_document_tags_2` (`organization_id`, `name`)

## `document_types`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `name` | TEXT |  | yes |  |
| `category_id` | TEXT |  |  |  |

**Foreign keys:**
- `category_id` → `document_categories.id`
- `organization_id` → `organizations.id`

**Indexes:**
- unique `sqlite_autoindex_document_types_2` (`organization_id`, `name`)

## `document_versions`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `document_id` | TEXT |  | yes |  |
| `version_number` | INTEGER |  | yes |  |
| `status` | TEXT |  | yes | 'draft' |
| `source_version_id` | TEXT |  |  |  |
| `original_sha256` | TEXT |  |  |  |
| `final_sha256` | TEXT |  |  |  |
| `created_by` | TEXT |  | yes |  |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `created_by` → `profiles.id`
- `source_version_id` → `document_versions.id`
- `document_id` → `documents.id`
- `organization_id` → `organizations.id`

**Indexes:**
- `idx_document_versions_doc` (`document_id`, `version_number`)
- unique `sqlite_autoindex_document_versions_2` (`document_id`, `version_number`)

## `documents`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `owner_id` | TEXT |  | yes |  |
| `department_id` | TEXT |  |  |  |
| `document_type_id` | TEXT |  |  |  |
| `title` | TEXT |  | yes |  |
| `reference_number` | TEXT |  |  |  |
| `status` | TEXT |  | yes | 'draft' |
| `priority` | TEXT |  | yes | 'normal' |
| `confidentiality` | TEXT |  | yes | 'internal' |
| `description` | TEXT |  | yes | '' |
| `due_at` | TEXT |  |  |  |
| `created_at` | TEXT |  | yes | datetime('now') |
| `updated_at` | TEXT |  | yes | datetime('now') |
| `lock_version` | INTEGER |  | yes | 0 |

**Foreign keys:**
- `document_type_id` → `document_types.id`
- `department_id` → `departments.id`
- `owner_id` → `profiles.id`
- `organization_id` → `organizations.id`

**Indexes:**
- `idx_documents_org_owner` (`organization_id`, `owner_id`)
- `idx_documents_org_status` (`organization_id`, `status`)
- unique `sqlite_autoindex_documents_2` (`organization_id`, `reference_number`)

## `email_templates`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  |  |  |
| `template_key` | TEXT |  | yes |  |
| `subject` | TEXT |  | yes |  |
| `body_html` | TEXT |  | yes | '' |
| `body_text` | TEXT |  | yes | '' |
| `updated_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `organization_id` → `organizations.id`

**Indexes:**
- unique `sqlite_autoindex_email_templates_2` (`organization_id`, `template_key`)

## `file_access_logs`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `file_id` | TEXT |  | yes |  |
| `profile_id` | TEXT |  | yes |  |
| `access_type` | TEXT |  | yes |  |
| `ip_address` | TEXT |  |  |  |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `profile_id` → `profiles.id`
- `file_id` → `document_files.id`
- `organization_id` → `organizations.id`

## `notification_deliveries`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `notification_id` | TEXT |  | yes |  |
| `channel` | TEXT |  | yes |  |
| `status` | TEXT |  | yes | 'pending' |
| `delivered_at` | TEXT |  |  |  |
| `error_message` | TEXT |  |  |  |

**Foreign keys:**
- `notification_id` → `notifications.id`

## `notifications`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `recipient_id` | TEXT |  | yes |  |
| `type` | TEXT |  | yes |  |
| `title` | TEXT |  | yes |  |
| `body` | TEXT |  | yes | '' |
| `entity_type` | TEXT |  |  |  |
| `entity_id` | TEXT |  |  |  |
| `read_at` | TEXT |  |  |  |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `recipient_id` → `profiles.id`
- `organization_id` → `organizations.id`

**Indexes:**
- `idx_notifications_recipient` (`organization_id`, `recipient_id`, `read_at`)

## `organization_members`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `profile_id` | TEXT |  | yes |  |
| `department_id` | TEXT |  |  |  |
| `status` | TEXT |  | yes | 'active' |
| `joined_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `department_id` → `departments.id`
- `profile_id` → `profiles.id`
- `organization_id` → `organizations.id`

**Indexes:**
- `idx_organization_members_org` (`organization_id`, `profile_id`)
- unique `sqlite_autoindex_organization_members_2` (`organization_id`, `profile_id`)

## `organizations`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `name` | TEXT |  | yes |  |
| `slug` | TEXT |  | yes |  |
| `created_at` | TEXT |  | yes | datetime('now') |
| `updated_at` | TEXT |  | yes | datetime('now') |

**Indexes:**
- unique `sqlite_autoindex_organizations_2` (`slug`)

## `permissions`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `key` | TEXT |  | yes |  |
| `description` | TEXT |  | yes |  |

**Indexes:**
- unique `sqlite_autoindex_permissions_2` (`key`)

## `profiles`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  |  |  |
| `display_name` | TEXT |  | yes |  |
| `email` | TEXT |  | yes |  |
| `status` | TEXT |  | yes | 'active' |
| `created_at` | TEXT |  | yes | datetime('now') |
| `updated_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `organization_id` → `organizations.id`

**Indexes:**
- `idx_profiles_org` (`organization_id`)

## `role_permissions`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `role_id` | TEXT | yes | yes |  |
| `permission_id` | TEXT | yes | yes |  |

**Foreign keys:**
- `permission_id` → `permissions.id`
- `role_id` → `roles.id`

## `roles`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  |  |  |
| `name` | TEXT |  | yes |  |
| `is_system` | INTEGER |  | yes | 0 |

**Foreign keys:**
- `organization_id` → `organizations.id`

**Indexes:**
- unique `sqlite_autoindex_roles_2` (`organization_id`, `name`)

## `route_escalations`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `route_id` | TEXT |  | yes |  |
| `step_id` | TEXT |  |  |  |
| `escalated_to_id` | TEXT |  | yes |  |
| `reason` | TEXT |  | yes |  |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `escalated_to_id` → `profiles.id`
- `step_id` → `route_steps.id`
- `route_id` → `document_routes.id`
- `organization_id` → `organizations.id`

## `route_reminders`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `route_id` | TEXT |  | yes |  |
| `step_id` | TEXT |  |  |  |
| `assignee_id` | TEXT |  | yes |  |
| `channel` | TEXT |  | yes | 'email' |
| `sent_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `assignee_id` → `profiles.id`
- `step_id` → `route_steps.id`
- `route_id` → `document_routes.id`
- `organization_id` → `organizations.id`

## `route_step_actions`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `step_id` | TEXT |  | yes |  |
| `assignee_id` | TEXT |  | yes |  |
| `action` | TEXT |  | yes |  |
| `status` | TEXT |  | yes |  |
| `comment` | TEXT |  | yes | '' |
| `reason` | TEXT |  |  |  |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `assignee_id` → `route_step_assignees.id`
- `step_id` → `route_steps.id`
- `organization_id` → `organizations.id`

## `route_step_assignees`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `step_id` | TEXT |  | yes |  |
| `assignee_id` | TEXT |  | yes |  |
| `delegated_from_id` | TEXT |  |  |  |
| `status` | TEXT |  | yes | 'pending' |
| `completed_at` | TEXT |  |  |  |

**Foreign keys:**
- `delegated_from_id` → `profiles.id`
- `assignee_id` → `profiles.id`
- `step_id` → `route_steps.id`
- `organization_id` → `organizations.id`

**Indexes:**
- `idx_route_assignees_user_status` (`organization_id`, `assignee_id`, `status`)

## `route_step_delegations`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `assignee_id` | TEXT |  | yes |  |
| `from_profile_id` | TEXT |  | yes |  |
| `to_profile_id` | TEXT |  | yes |  |
| `reason` | TEXT |  | yes |  |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `to_profile_id` → `profiles.id`
- `from_profile_id` → `profiles.id`
- `assignee_id` → `route_step_assignees.id`
- `organization_id` → `organizations.id`

## `route_steps`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `route_id` | TEXT |  | yes |  |
| `sequence` | INTEGER |  | yes |  |
| `action` | TEXT |  | yes |  |
| `completion_rule` | TEXT |  | yes | 'all' |
| `minimum_count` | INTEGER |  |  |  |
| `status` | TEXT |  | yes | 'pending' |
| `due_at` | TEXT |  |  |  |

**Foreign keys:**
- `route_id` → `document_routes.id`
- `organization_id` → `organizations.id`

**Indexes:**
- unique `sqlite_autoindex_route_steps_2` (`route_id`, `sequence`)

## `routing_template_steps`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `template_id` | TEXT |  | yes |  |
| `sequence` | INTEGER |  | yes |  |
| `action` | TEXT |  | yes |  |
| `completion_rule` | TEXT |  | yes | 'all' |
| `minimum_count` | INTEGER |  |  |  |

**Foreign keys:**
- `template_id` → `routing_templates.id`
- `organization_id` → `organizations.id`

**Indexes:**
- unique `sqlite_autoindex_routing_template_steps_2` (`template_id`, `sequence`)

## `routing_templates`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `name` | TEXT |  | yes |  |
| `description` | TEXT |  | yes | '' |
| `mode` | TEXT |  | yes |  |
| `created_by` | TEXT |  | yes |  |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `created_by` → `profiles.id`
- `organization_id` → `organizations.id`

**Indexes:**
- unique `sqlite_autoindex_routing_templates_2` (`organization_id`, `name`)

## `security_settings`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `session_timeout_minutes` | INTEGER |  | yes | 15 |
| `mfa_required` | INTEGER |  | yes | 0 |
| `password_policy_json` | TEXT |  | yes | '{}' |
| `updated_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `organization_id` → `organizations.id`

**Indexes:**
- unique `sqlite_autoindex_security_settings_2` (`organization_id`)

## `signature_authentication_events`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `signature_event_id` | TEXT |  | yes |  |
| `auth_method` | TEXT |  | yes |  |
| `success` | INTEGER |  | yes |  |
| `ip_address` | TEXT |  |  |  |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `signature_event_id` → `signature_events.id`
- `organization_id` → `organizations.id`

## `signature_events`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `document_id` | TEXT |  | yes |  |
| `version_id` | TEXT |  | yes |  |
| `assignee_id` | TEXT |  | yes |  |
| `signer_id` | TEXT |  | yes |  |
| `signature_meaning` | TEXT |  | yes |  |
| `auth_method` | TEXT |  | yes |  |
| `document_hash` | TEXT |  | yes |  |
| `final_pdf_hash` | TEXT |  |  |  |
| `ip_address` | TEXT |  |  |  |
| `user_agent` | TEXT |  |  |  |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `signer_id` → `profiles.id`
- `assignee_id` → `route_step_assignees.id`
- `version_id` → `document_versions.id`
- `document_id` → `documents.id`
- `organization_id` → `organizations.id`

## `signature_fields`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `document_id` | TEXT |  | yes |  |
| `version_id` | TEXT |  | yes |  |
| `assignee_id` | TEXT |  | yes |  |
| `field_type` | TEXT |  | yes |  |
| `page_number` | INTEGER |  | yes |  |
| `x` | REAL |  | yes |  |
| `y` | REAL |  | yes |  |
| `width` | REAL |  | yes |  |
| `height` | REAL |  | yes |  |
| `required` | INTEGER |  | yes | 1 |

**Foreign keys:**
- `assignee_id` → `route_step_assignees.id`
- `version_id` → `document_versions.id`
- `document_id` → `documents.id`
- `organization_id` → `organizations.id`

## `system_logs`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  |  |  |
| `level` | TEXT |  | yes |  |
| `message` | TEXT |  | yes |  |
| `context_json` | TEXT |  | yes | '{}' |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `organization_id` → `organizations.id`

## `system_settings`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  |  |  |
| `setting_key` | TEXT |  | yes |  |
| `setting_value_json` | TEXT |  | yes | '{}' |
| `updated_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `organization_id` → `organizations.id`

**Indexes:**
- unique `sqlite_autoindex_system_settings_2` (`organization_id`, `setting_key`)

## `user_delegations`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `organization_id` | TEXT |  | yes |  |
| `delegator_id` | TEXT |  | yes |  |
| `delegate_id` | TEXT |  | yes |  |
| `starts_at` | TEXT |  | yes |  |
| `ends_at` | TEXT |  |  |  |
| `reason` | TEXT |  | yes | '' |
| `created_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `delegate_id` → `profiles.id`
- `delegator_id` → `profiles.id`
- `organization_id` → `organizations.id`

## `user_notification_preferences`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `profile_id` | TEXT |  | yes |  |
| `organization_id` | TEXT |  | yes |  |
| `channel` | TEXT |  | yes |  |
| `enabled` | INTEGER |  | yes | 1 |
| `preferences_json` | TEXT |  | yes | '{}' |

**Foreign keys:**
- `organization_id` → `organizations.id`
- `profile_id` → `profiles.id`

## `user_roles`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `profile_id` | TEXT | yes | yes |  |
| `role_id` | TEXT | yes | yes |  |

**Foreign keys:**
- `role_id` → `roles.id`
- `profile_id` → `profiles.id`

## `user_sessions`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `profile_id` | TEXT |  | yes |  |
| `organization_id` | TEXT |  | yes |  |
| `started_at` | TEXT |  | yes | datetime('now') |
| `last_activity_at` | TEXT |  | yes | datetime('now') |
| `ip_address` | TEXT |  |  |  |
| `user_agent` | TEXT |  |  |  |
| `ended_at` | TEXT |  |  |  |

**Foreign keys:**
- `organization_id` → `organizations.id`
- `profile_id` → `profiles.id`

## `user_signature_profiles`

| Column | Type | PK | Not null | Default |
|---|---|:---:|:---:|---|
| `id` | TEXT | yes |  |  |
| `profile_id` | TEXT |  | yes |  |
| `organization_id` | TEXT |  | yes |  |
| `signature_image_key` | TEXT |  |  |  |
| `initials_image_key` | TEXT |  |  |  |
| `updated_at` | TEXT |  | yes | datetime('now') |

**Foreign keys:**
- `organization_id` → `organizations.id`
- `profile_id` → `profiles.id`

**Indexes:**
- unique `sqlite_autoindex_user_signature_profiles_2` (`profile_id`, `organization_id`)
