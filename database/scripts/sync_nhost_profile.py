"""Link a Nhost auth user UUID to an eDoc profile row (idempotent)."""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEV_VARS = ROOT / ".dev.vars"

DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001"
DEFAULT_DEPT_ID = "00000000-0000-4000-8000-000000000030"
DEFAULT_ROLE_ID = "00000000-0000-4000-8000-000000000050"  # Document Owner


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


def escape_sql(value: str) -> str:
    return value.replace("'", "''")


def build_sync_sql(
    user_id: str,
    email: str,
    display_name: str,
    organization_id: str,
    department_id: str | None,
    role_id: str,
) -> str:
    dept_value = f"'{department_id}'" if department_id else "NULL"
    return f"""
INSERT INTO profiles (id, organization_id, display_name, email, status, created_at, updated_at)
VALUES (
  '{user_id}',
  '{organization_id}',
  '{escape_sql(display_name)}',
  '{escape_sql(email)}',
  'active',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email,
  status = 'active',
  updated_at = now();

INSERT INTO organization_members (id, organization_id, profile_id, department_id, status)
SELECT gen_random_uuid(), '{organization_id}', '{user_id}', {dept_value}, 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM organization_members
  WHERE organization_id = '{organization_id}' AND profile_id = '{user_id}'
);

INSERT INTO user_roles (profile_id, role_id)
VALUES ('{user_id}', '{role_id}')
ON CONFLICT (profile_id, role_id) DO NOTHING;
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create or update a profiles row for a Nhost auth user UUID.",
    )
    parser.add_argument("--user-id", required=True, help="Nhost auth user UUID (profiles.id)")
    parser.add_argument("--email", required=True, help="User email from Nhost")
    parser.add_argument("--display-name", required=True, help="Display name for the profile")
    parser.add_argument("--organization-id", default=DEFAULT_ORG_ID, help="Target organization UUID")
    parser.add_argument(
        "--department-id",
        default=DEFAULT_DEPT_ID,
        help="Department UUID (use empty string to skip)",
    )
    parser.add_argument("--role-id", default=DEFAULT_ROLE_ID, help="Role UUID to assign")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    env = load_dev_vars()
    graphql_url = env.get("HASURA_GRAPHQL_URL", "")
    admin_secret = env.get("HASURA_ADMIN_SECRET", "")
    if not graphql_url or not admin_secret:
        raise RuntimeError("HASURA_GRAPHQL_URL and HASURA_ADMIN_SECRET must be set in .dev.vars")
    if "your-" in graphql_url or "replace" in admin_secret.lower():
        raise RuntimeError("Hasura credentials in .dev.vars are still placeholders")

    department_id = args.department_id.strip() or None
    sql = build_sync_sql(
        user_id=args.user_id.strip(),
        email=args.email.strip(),
        display_name=args.display_name.strip(),
        organization_id=args.organization_id.strip(),
        department_id=department_id,
        role_id=args.role_id.strip(),
    )

    endpoint = hasura_endpoint(graphql_url)
    try:
        run_sql(endpoint, admin_secret, sql)
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Profile sync failed: {body}") from error

    print(f"PASS: Profile linked for user {args.user_id} in org {args.organization_id}.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"FAIL: {error}", file=sys.stderr)
        raise SystemExit(1) from error
