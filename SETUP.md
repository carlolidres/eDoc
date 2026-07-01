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

Only public frontend values belong in `.env`.

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
```
