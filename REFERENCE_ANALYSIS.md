# Reference Analysis

## Active Project

The active eDoc folder had no runnable frontend application: `src/` contained only `.gitkeep`, and no root `package.json` existed. Existing workflow documents were generic scaffolding for the local workflow app.

## UI Reference Adaptation

Adapted concepts from `reference/src`:

- collapsible sidebar and mobile drawer behavior
- sticky topbar with icon actions
- professional dashboard card and panel layout
- login split-screen structure
- light/dark theme token pattern
- protected-route pattern and no protected-page flash
- disabled controls for unavailable actions

Rejected from the UI reference:

- Supabase client and mock Supabase service names
- VRMS/VMP page labels and mock business records
- default mock auth as production behavior

## Documenso Reference

Documenso was used as a workflow and architecture reference for document/envelope lifecycle, recipients, signing order, fields, audit logs, storage abstraction, reminders, and completion concepts.

Rejected from Documenso:

- Remix application architecture
- Prisma-specific implementation
- direct code copying
- Documenso branding and product names
- server app deployment assumptions incompatible with GitHub Pages

## Licensing

The Documenso reference is AGPL-3.0. This implementation does not copy Documenso source code. Any future substantial reuse must be reviewed for AGPL obligations and attribution requirements before merging.

## eDoc-Specific Components

Created specifically for eDoc:

- Nhost-oriented auth provider
- Hasura GraphQL client boundary
- Cloudflare Worker API boundary
- eDoc navigation model
- eDoc dashboard, inbox, documents, routing template, signing workspace, reports, and admin scaffold
- initial PostgreSQL/Hasura schema draft
- Worker endpoint scaffold for privileged operations
