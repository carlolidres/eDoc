# Architecture

## Target

GitHub Pages hosts the static React frontend. The frontend uses Nhost for authentication, Hasura GraphQL for authorized data access, GraphQL subscriptions for realtime inbox/notifications, and Cloudflare Workers for privileged backend operations. Cloudflare R2 stores private document objects.

## Frontend

- React + Vite + TypeScript
- HashRouter for GitHub Pages compatibility
- TanStack Query for server state
- Nhost client for user auth only
- Hasura GraphQL through `src/lib/graphql.ts`
- Worker calls through `src/lib/workerApi.ts`

## Worker

Worker endpoints authenticate requests, enforce organization/document authorization, generate temporary storage URLs, perform hashing, process signatures, advance routes, create completion certificates, send notifications, and write audit events.

## Storage

R2 remains private. The browser never receives permanent public URLs or storage credentials.

## Trust Boundaries

Browser code can hold only public config and user JWTs. Hasura admin secret, R2 credentials, email keys, and signing keys live only in Worker or protected backend environments.
