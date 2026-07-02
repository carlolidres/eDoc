"""Apply eDoc SQL migrations to Nhost PostgreSQL via Hasura run_sql API."""
from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIGRATIONS = ROOT / "database" / "migrations"
DEV_VARS = ROOT / ".dev.vars"


def load_dev_vars() -> dict[str, str]:
    if not DEV_VARS.exists():
        raise FileNotFoundError(f"Missing {DEV_VARS}. Copy .dev.vars.example and fill Hasura values.")
    values: dict[str, str] = {}
    for line in DEV_VARS.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def hasura_endpoint(graphql_url: str) -> str:
    base = graphql_url.rstrip("/")
    if base.endswith("/v1/graphql"):
        return base[: -len("/v1/graphql")]
    return base


def run_sql(endpoint: str, admin_secret: str, sql: str) -> dict:
    payload = json.dumps(
        {
            "type": "run_sql",
            "args": {"source": "default", "sql": sql, "cascade": True, "read_only": False},
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        f"{endpoint}/v2/query",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-hasura-admin-secret": admin_secret,
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def split_sql_statements(sql: str) -> list[str]:
    # Strip line comments; keep dollar-quoted function bodies intact.
    lines = []
    for line in sql.splitlines():
        stripped = line.strip()
        if stripped.startswith("--"):
            continue
        lines.append(line)
    body = "\n".join(lines)
    parts = re.split(r";\s*\n", body)
    return [part.strip() for part in parts if part.strip()]


def table_count(endpoint: str, admin_secret: str) -> int:
    sql = """
    SELECT COUNT(*)::text AS count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'hdb_%'
    """
    result = run_sql(endpoint, admin_secret, sql)
    rows = result.get("result", [{}])[1:]  # skip headers row
    if not rows:
        return 0
    return int(rows[0][0])


def main() -> None:
    env = load_dev_vars()
    graphql_url = env.get("HASURA_GRAPHQL_URL", "")
    admin_secret = env.get("HASURA_ADMIN_SECRET", "")
    if not graphql_url or not admin_secret:
        raise RuntimeError("HASURA_GRAPHQL_URL and HASURA_ADMIN_SECRET must be set in .dev.vars")
    if "your-" in graphql_url or "replace" in admin_secret.lower():
        raise RuntimeError("Hasura credentials in .dev.vars are still placeholders")

    endpoint = hasura_endpoint(graphql_url)
    before = table_count(endpoint, admin_secret)
    print(f"Public tables before migration: {before}")

    migration_files = sorted(MIGRATIONS.glob("*.sql"))
    if not migration_files:
        raise FileNotFoundError(f"No migrations found in {MIGRATIONS}")

    for migration in migration_files:
        sql_text = migration.read_text(encoding="utf-8")
        print(f"Applying {migration.name}...")
        try:
            run_sql(endpoint, admin_secret, sql_text)
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            if "already exists" in body.lower():
                print(f"  skipped (already exists)")
                continue
            raise RuntimeError(f"Failed applying {migration.name}: {body}") from error

    after = table_count(endpoint, admin_secret)
    print(f"Public tables after migration: {after}")
    if after < 40:
        raise RuntimeError(f"Expected at least 40 application tables; found {after}")
    print("PASS: Nhost migration applied.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"FAIL: {error}", file=sys.stderr)
        raise SystemExit(1) from error
