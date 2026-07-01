# Deployment

## Frontend

The frontend is static and deploys to GitHub Pages through `.github/workflows/pages.yml`.

Set `VITE_GITHUB_PAGES_BASE` when deploying under a repository subpath.

## Backend

Deploy Cloudflare Worker separately with Wrangler after secrets and R2 bindings are configured.

## Nhost

Apply database migrations and Hasura metadata in a development Nhost project first. Do not apply production migrations until schema, permissions, and rollback have been reviewed.

## Verification

Do not claim deployment success until the GitHub Pages URL, Worker health endpoint, Nhost auth, and Hasura permissions are manually verified.
