# Hasura Metadata

This folder is reserved for Hasura metadata exported from Nhost after the SQL schema is validated.

Draft design (before export): [`permissions-design.md`](permissions-design.md)

Required metadata after Nhost dev apply:

- relationships for all foreign keys in `database/migrations/0001_initial.sql`
- role permissions for super administrator, organization administrator, document controller, document owner, reviewer, approver, signer, viewer, and auditor
- row filters enforcing `organization_id`
- insert/update/delete permissions that match Worker transaction boundaries
- subscriptions for inbox tasks, notifications, and document activity
