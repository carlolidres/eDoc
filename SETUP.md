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
| `NHOST_JWKS_URL` | `https://<subdomain>.auth.<region>.nhost.run/.well-known/jwks.json` |
| `HASURA_GRAPHQL_URL` | Same Hasura GraphQL URL as frontend |
| `HASURA_ADMIN_SECRET` | Nhost → Hasura → admin secret (local dev only) |

5. Restart `npm run dev` after changing `.env`. Restart `npm run worker:dev` after changing `.dev.vars`.

When `VITE_NHOST_SUBDOMAIN` and `VITE_NHOST_REGION` are set to real values (not `your-*` placeholders), the app uses live Nhost auth. Otherwise it falls back to local development auth.

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
```

### Manual auth walkthrough

1. Open `http://127.0.0.1:5173/#/login` and sign in with a Nhost user.
2. Confirm protected routes load without a flash of the login page.
3. Use **Forgot password** → complete reset on `#/change-password`.
4. If email is unverified, use the banner to resend verification email.
