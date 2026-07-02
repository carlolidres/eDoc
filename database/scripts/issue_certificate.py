"""Issue certificate for an existing completed route (debug/recovery)."""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEV_VARS = ROOT / ".dev.vars"
ENV_FILE = ROOT / ".env"
WORKER_URL = "https://edoc-worker.carlolidres.workers.dev"
HTTP_USER_AGENT = "Mozilla/5.0 (compatible; eDoc-e2e/1.0)"


def load_key_values(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def request_json(url: str, *, method: str = "GET", headers: dict[str, str] | None = None, body: dict | None = None) -> dict:
    payload = None
    req_headers = {"Content-Type": "application/json", "User-Agent": HTTP_USER_AGENT, **(headers or {})}
    if body is not None:
        payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code} for {url}: {detail}") from error


def nhost_sign_in(subdomain: str, region: str, email: str, password: str) -> str:
    url = f"https://{subdomain}.auth.{region}.nhost.run/v1/signin/email-password"
    result = request_json(url, method="POST", body={"email": email, "password": password})
    session = result.get("session") or {}
    token = session.get("accessToken") or session.get("access_token")
    if not token:
        raise RuntimeError(f"Sign-in failed: {result}")
    return token


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--email", required=True)
    parser.add_argument("--document-id", required=True)
    parser.add_argument("--route-id", required=True)
    args = parser.parse_args()
    env = {**load_key_values(ENV_FILE), **load_key_values(DEV_VARS)}
    password = env.get("E2E_PASSWORD", "")
    if not password:
        raise RuntimeError("E2E_PASSWORD missing in .dev.vars")
    token = nhost_sign_in(env["VITE_NHOST_SUBDOMAIN"], env["VITE_NHOST_REGION"], args.email, password)
    result = request_json(
        f"{WORKER_URL}/api/documents/{args.document_id}/certificate",
        method="POST",
        headers={"Authorization": f"Bearer {token}"},
        body={"routeId": args.route_id},
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"FAIL: {error}", file=sys.stderr)
        raise SystemExit(1) from error
