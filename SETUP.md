# Setup

## Install

```powershell
npm install
```

## Configure

Copy examples and fill development values:

```powershell
Copy-Item .env.example .env
Copy-Item .dev.vars.example .dev.vars
```

Only public frontend values belong in `.env`. Never commit `.env` or `.dev.vars`.

### Nhost project (Phase 3)

1. Create a Nhost project at [nhost.io](https://nhost.io) and note the **subdomain** and **region**.
2. In Nhost dashboard → **Authentication** → **Settings**, set allowed redirect URLs for local dev:
   - `http://127.0.0.1:5173/#/change-password`
   - `http://127.0.0.1:5173/#/verify-email`
   - Add production URLs when deploying to GitHub Pages:
     - `https://carlolidres.github.io/eDoc/#/login`
     - `https://carlolidres.github.io/eDoc/#/change-password`
     - `https://carlolidres.github.io/eDoc/#/verify-email`
3. Map values into `.env`:

| Variable | Source |
|---|---|
| `VITE_NHOST_SUBDOMAIN` | Nhost project subdomain |
| `VITE_NHOST_REGION` | Nhost region (e.g. `eu-central-1`) |
| `VITE_HASURA_GRAPHQL_URL` | Nhost → Hasura → GraphQL URL |
| `VITE_WORKER_API_URL` | Local Worker default `http://127.0.0.1:8787` |
| `VITE_SESSION_TIMEOUT_MINUTES` | Inactivity timeout (default `15`) |

4. Map Worker secrets into `.dev.vars`:

| Variable | Source |
|---|---|
| `NHOST_JWKS_URL` | `https://<subdomain>.auth.<region>.nhost.run/v1/.well-known/jwks.json` |
| `HASURA_GRAPHQL_URL` | Same Hasura GraphQL URL as frontend |
| `HASURA_ADMIN_SECRET` | Nhost → Hasura → admin secret (local dev only) |

5. Restart `npm run dev` after changing `.env`. Restart `npm run worker:dev` after changing `.dev.vars`.

When `VITE_NHOST_SUBDOMAIN` and `VITE_NHOST_REGION` are set to real values (not `your-*` placeholders), the app uses live Nhost auth. Otherwise it falls back to local development auth.

### Nhost production redirect URLs (project owner)

Complete these steps in the Nhost dashboard before testing password reset or email verification on GitHub Pages:

1. Open **Authentication** → **Settings** → **Allowed redirect URLs**.
2. Add each production URL (HashRouter paths):
   - `https://carlolidres.github.io/eDoc/#/login`
   - `https://carlolidres.github.io/eDoc/#/change-password`
   - `https://carlolidres.github.io/eDoc/#/verify-email`
3. Save and wait for Nhost to propagate settings (~1 minute).
4. Verify: sign in at https://carlolidres.github.io/eDoc/#/login, then test **Forgot password** and confirm the reset link lands on `#/change-password`.

### Cloudflare R2 storage (project owner)

Required before Worker file upload/preview endpoints return real presigned URLs.

1. In [Cloudflare Dashboard](https://dash.cloudflare.com) → **R2** → enable R2 if not already enabled.
2. Create bucket `edoc-dev` (private; no public access).
3. Confirm `worker/wrangler.toml` has the R2 binding (default):

```toml
[[r2_buckets]]
binding = "EDOC_R2"
bucket_name = "edoc-dev"
```

4. Set Worker secrets (if not already set):

```powershell
cd worker
npx wrangler secret put NHOST_JWKS_URL
npx wrangler secret put HASURA_GRAPHQL_URL
npx wrangler secret put HASURA_ADMIN_SECRET
```

5. Redeploy Worker:

```powershell
npx wrangler deploy --config wrangler.toml
```

6. Verify health: `https://edoc-worker.carlolidres.workers.dev/api/health`

### Link Nhost user to eDoc profile (required for GraphQL + wizard)

Signed-in Nhost users need a matching `profiles` row (`profiles.id` = Nhost auth user UUID).

1. In Nhost dashboard → **Authentication** → **Users**, copy the user UUID and email.
2. Run (fills `.dev.vars` Hasura admin credentials):

```powershell
python database/scripts/sync_nhost_profile.py `
  --user-id "<nhost-user-uuid>" `
  --email "you@example.com" `
  --display-name "Your Name"
```

3. Re-apply Hasura metadata if `document_versions` insert fails:

```powershell
python database/scripts/setup_hasura_metadata.py
```

4. Sign in at the app and open **Create document** — the wizard should load your organization context.

## Run Frontend

```powershell
npm run dev
```

## Run Worker

```powershell
npm run worker:dev
```

## Verify

```powershell
npm run lint
npm run type-check
npm run test
npm run build
npm run worker:check
python database/scripts/validate_schema.py
python database/scripts/generate_schema_map.py
python database/scripts/apply_nhost_migration.py
python database/scripts/setup_hasura_metadata.py
python database/scripts/sync_nhost_profile.py --user-id "<uuid>" --email "you@example.com" --display-name "Your Name"
```

### Manual auth walkthrough

1. Open `http://127.0.0.1:5173/#/login` and sign in with a Nhost user.
2. Confirm protected routes load without a flash of the login page.
3. Use **Forgot password** → complete reset on `#/change-password`.
4. If email is unverified, use the banner to resend verification email.
