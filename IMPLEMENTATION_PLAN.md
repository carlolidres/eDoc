# eDoc Implementation Plan

## Summary

Build eDoc incrementally as a static React + Vite + TypeScript frontend deployed to GitHub Pages, backed by Nhost authentication, Hasura GraphQL, Cloudflare Workers, and private Cloudflare R2 storage.

## Implemented First Slice

- Vite React app scaffold
- HashRouter and protected routes
- Nhost-ready auth with local development fallback
- 15-minute inactivity timeout default
- UI shell adapted from the supplied reference visual language
- dashboard, inbox, documents, create document, templates, signing workspace, reports, and admin scaffolds
- Hasura/Worker service boundaries
- Cloudflare Worker route scaffold
- database migration draft
- required documentation and environment examples
- unit tests for initial routing and file validation utilities

## Next Phases

1. Connect Nhost auth and Hasura metadata.
2. Apply and validate PostgreSQL migrations in a development Nhost project.
3. Replace placeholder lists with authorized GraphQL queries.
4. Implement R2 upload authorization and completion records.
5. Build document creation wizard persistence.
6. Implement route creation, assignment activation, and task inbox.
7. Add PDF.js viewer and normalized field placement.
8. Implement re-authenticated signing and immutable PDF generation.
9. Add certificates, verification, reports, notifications, and admin screens.

## Package Decisions

Added: React, Vite, TypeScript, React Router, TanStack Query, Nhost JS, graphql-request, Hono, Zod, pdf-lib, pdfjs-dist, lucide-react, Vitest, Playwright, Wrangler.

Rejected: Ant Design, Prisma, Remix, Documenso package imports, Supabase client.
