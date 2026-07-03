"""E2E smoke: Nhost sign-in → profile → document create → Worker PDF upload."""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEV_VARS = ROOT / ".dev.vars"
ENV_FILE = ROOT / ".env"
SAMPLE_PDF = ROOT / "test-fixtures" / "sample.pdf"
WORKER_URL = "https://edoc-worker.carlolidres.workers.dev"
HASURA_APP_ROLE = "user"
DEFAULT_ORG_ID = "00000000-0000-4000-8000-000000000001"
# ponytail: Cloudflare blocks default python-urllib User-Agent (error 1010) on workers.dev.
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


def request_json(
    url: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    body: dict | None = None,
) -> dict:
    payload = None
    req_headers = {
        "Content-Type": "application/json",
        "User-Agent": HTTP_USER_AGENT,
        **(headers or {}),
    }
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


def graphql_request(url: str, token: str, query: str, variables: dict | None = None) -> dict:
    result = request_json(
        url,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "x-hasura-role": HASURA_APP_ROLE,
        },
        body={"query": query, "variables": variables or {}},
    )
    if result.get("errors"):
        raise RuntimeError(f"GraphQL error: {result['errors']}")
    return result["data"]


def worker_request(
    path: str,
    token: str,
    *,
    method: str = "GET",
    body: dict | None = None,
    idempotency_key: str | None = None,
) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key
    return request_json(
        f"{WORKER_URL}{path}",
        method=method,
        headers=headers,
        body=body,
    )


def upload_pdf(upload_url: str, token: str, object_key: str, pdf_bytes: bytes) -> None:
    target = upload_url if upload_url.startswith("http") else f"{WORKER_URL}{upload_url}"
    req = urllib.request.Request(
        target,
        data=pdf_bytes,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/pdf",
            "X-Object-Key": object_key,
            "User-Agent": HTTP_USER_AGENT,
        },
        method="PUT",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            if response.status >= 400:
                raise RuntimeError(f"Upload failed with status {response.status}")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Upload failed with HTTP {error.code}: {detail}") from error


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="E2E wizard upload smoke against production services.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", default="", help="Or set E2E_PASSWORD in .dev.vars")
    parser.add_argument("--user-id", default="a69fc4d4-52c4-4066-9b62-0f2587a4ff96")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    env = {**load_key_values(ENV_FILE), **load_key_values(DEV_VARS)}
    password = args.password or env.get("E2E_PASSWORD", "")
    if not password:
        raise RuntimeError("Set --password or E2E_PASSWORD in .dev.vars for sign-in.")

    subdomain = env.get("VITE_NHOST_SUBDOMAIN", "")
    region = env.get("VITE_NHOST_REGION", "")
    hasura_url = env.get("VITE_HASURA_GRAPHQL_URL", env.get("HASURA_GRAPHQL_URL", ""))
    if not subdomain or not region or not hasura_url:
        raise RuntimeError("Nhost subdomain, region, and Hasura URL must be configured.")

    if not SAMPLE_PDF.exists():
        raise FileNotFoundError(f"Missing test PDF at {SAMPLE_PDF}")

    print("1/6 Sign in to Nhost...")
    token = nhost_sign_in(subdomain, region, args.email, password)

    print("2/6 Load current profile...")
    profile_data = graphql_request(
        hasura_url,
        token,
        """
        query CurrentProfile($profileId: uuid!) {
          profiles(where: { id: { _eq: $profileId } }, limit: 1) {
            id
            organization_id
            display_name
            email
          }
        }
        """,
        {"profileId": args.user_id},
    )
    profile = profile_data["profiles"][0] if profile_data.get("profiles") else None
    if not profile:
        raise RuntimeError("No profile row visible for signed-in user.")
    if profile["id"] != args.user_id:
        raise RuntimeError(f"Profile id mismatch: expected {args.user_id}, got {profile['id']}")
    org_id = profile["organization_id"]
    if not org_id:
        raise RuntimeError("Profile has no organization_id.")

    print("3/6 Create document + version...")
    title = f"E2E Wizard Test {uuid.uuid4().hex[:8]}"
    doc_data = graphql_request(
        hasura_url,
        token,
        """
        mutation CreateDocument($object: documents_insert_input!) {
          insert_documents_one(object: $object) {
            id
            title
            status
          }
        }
        """,
        {
            "object": {
                "organization_id": org_id,
                "title": title,
                "description": "Automated E2E wizard smoke test",
                "status": "draft",
                "priority": "normal",
                "confidentiality": "internal",
            }
        },
    )
    document = doc_data["insert_documents_one"]
    if not document:
        raise RuntimeError("Document insert returned null.")

    version_data = graphql_request(
        hasura_url,
        token,
        """
        mutation CreateDocumentVersion($object: document_versions_insert_input!) {
          insert_document_versions_one(object: $object) {
            id
            version_number
            status
          }
        }
        """,
        {
            "object": {
                "organization_id": org_id,
                "document_id": document["id"],
                "version_number": 1,
                "status": "draft",
            }
        },
    )
    version = version_data["insert_document_versions_one"]
    if not version:
        raise RuntimeError("Document version insert returned null.")

    pdf_bytes = SAMPLE_PDF.read_bytes()
    file_name = "sample.pdf"
    file_id = str(uuid.uuid4())

    print("4/6 Request upload URL...")
    upload_meta = worker_request(
        "/api/files/upload-url",
        token,
        method="POST",
        body={
            "organizationId": org_id,
            "documentId": document["id"],
            "versionId": version["id"],
            "fileName": file_name,
            "contentType": "application/pdf",
            "size": len(pdf_bytes),
        },
    )
    if not upload_meta.get("uploadUrl"):
        note = upload_meta.get("note", "uploadUrl missing")
        raise RuntimeError(f"Worker did not return upload URL: {note}")

    object_key = upload_meta["objectKey"]
    print("5/6 Upload PDF to Worker/R2...")
    upload_pdf(upload_meta["uploadUrl"], token, object_key, pdf_bytes)

    print("6/8 Complete upload...")
    complete = worker_request(
        "/api/files/complete-upload",
        token,
        method="POST",
        body={
            "organizationId": org_id,
            "documentId": document["id"],
            "versionId": version["id"],
            "fileId": file_id,
            "objectKey": object_key,
            "fileName": file_name,
            "mimeType": "application/pdf",
            "sizeBytes": len(pdf_bytes),
        },
    )

    print("7/8 Create draft route with nested steps...")
    route_data = graphql_request(
        hasura_url,
        token,
        """
        mutation CreateDocumentRoute($object: document_routes_insert_input!) {
          insert_document_routes_one(object: $object) {
            id
            route_steps {
              id
              sequence
              action
              route_step_assignees {
                id
                assignee_id
              }
            }
          }
        }
        """,
        {
            "object": {
                "organization_id": org_id,
                "document_id": document["id"],
                "version_id": version["id"],
                "mode": "sequential",
                "status": "draft",
                "route_steps": {
                    "data": [
                        {
                            "organization_id": org_id,
                            "sequence": 1,
                            "action": "review",
                            "completion_rule": "all",
                            "status": "pending",
                            "route_step_assignees": {
                                "data": [
                                    {
                                        "organization_id": org_id,
                                        "assignee_id": profile["id"],
                                        "status": "pending",
                                    }
                                ]
                            },
                        }
                    ]
                },
            }
        },
    )
    route = route_data["insert_document_routes_one"]
    if not route:
        raise RuntimeError("Route insert returned null.")

    print("8/9 Mark document ready for routing...")
    status_data = graphql_request(
        hasura_url,
        token,
        """
        mutation UpdateDocumentStatus($id: uuid!, $status: String!) {
          update_documents_by_pk(pk_columns: { id: $id }, _set: { status: $status }) {
            id
            status
          }
        }
        """,
        {"id": document["id"], "status": "ready_for_routing"},
    )
    updated = status_data["update_documents_by_pk"]
    if not updated or updated["status"] != "ready_for_routing":
        raise RuntimeError("Document status was not updated to ready_for_routing.")

    print("9/10 Start route via Worker...")
    started = worker_request(f"/api/routes/{route['id']}/start", token, method="POST")
    if started.get("status") != "active":
        raise RuntimeError(f"Route was not activated: {started}")

    inbox = graphql_request(
        hasura_url,
        token,
        """
        query InboxAfterStart($routeId: uuid!) {
          route_step_assignees(
            where: {
              status: { _eq: "active" }
              step: { status: { _eq: "active" }, route_id: { _eq: $routeId } }
            }
          ) {
            id
            status
          }
        }
        """,
        {"routeId": route["id"]},
    )
    active_assignees = inbox.get("route_step_assignees") or []
    if not active_assignees:
        raise RuntimeError("No active inbox assignees after route start.")

    assignee_row_id = active_assignees[0]["id"]
    print("10/10 Advance route via Worker (review)...")
    advanced = worker_request(
        f"/api/routes/{route['id']}/advance",
        token,
        method="POST",
        body={
            "assigneeRowId": assignee_row_id,
            "action": "review",
            "comment": "E2E smoke review complete.",
        },
        idempotency_key=str(uuid.uuid4()),
    )
    if advanced.get("assigneeStatus") != "completed":
        raise RuntimeError(f"Assignee was not completed: {advanced}")
    if advanced.get("routeCompleted") is not True:
        raise RuntimeError(f"Single-step route did not complete: {advanced}")

    print(
        "PASS: E2E wizard upload + routing + activation + advance completed.\n"
        f"  document_id={document['id']}\n"
        f"  version_id={version['id']}\n"
        f"  route_id={route['id']}\n"
        f"  route_status={advanced.get('routeStatus')}\n"
        f"  document_status={advanced.get('documentStatus')}\n"
        f"  assignee_row_id={assignee_row_id}\n"
        f"  active_step_ids={started.get('activeStepIds')}\n"
        f"  inbox_assignees={len(active_assignees)}\n"
        f"  file_id={complete.get('fileId', file_id)}\n"
        f"  sha256={complete.get('sha256')}\n"
        f"  upload_status={complete.get('status')}\n"
        f"  document_status_before_advance={updated['status']}"
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"FAIL: {error}", file=sys.stderr)
        raise SystemExit(1) from error
