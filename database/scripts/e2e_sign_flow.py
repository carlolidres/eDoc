"""E2E smoke: upload PDF → sign-step route → preview URL → Worker sign → certificate verify."""
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


def fetch_preview_bytes(preview_url: str, token: str) -> bytes:
    target = preview_url if preview_url.startswith("http") else f"{WORKER_URL}{preview_url}"
    req = urllib.request.Request(
        target,
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": HTTP_USER_AGENT,
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Preview fetch failed with HTTP {error.code}: {detail}") from error


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="E2E sign-flow smoke against production services.")
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

    print("1/12 Sign in to Nhost...")
    token = nhost_sign_in(subdomain, region, args.email, password)

    print("2/12 Load current profile...")
    profile_data = graphql_request(
        hasura_url,
        token,
        """
        query CurrentProfile {
          profiles(limit: 1) {
            id
            organization_id
            display_name
            email
          }
        }
        """,
    )
    profile = profile_data["profiles"][0] if profile_data.get("profiles") else None
    if not profile:
        raise RuntimeError("No profile row visible for signed-in user.")
    if profile["id"] != args.user_id:
        raise RuntimeError(f"Profile id mismatch: expected {args.user_id}, got {profile['id']}")
    org_id = profile["organization_id"]
    if not org_id:
        raise RuntimeError("Profile has no organization_id.")

    print("3/12 Create document + version...")
    title = f"E2E Sign Test {uuid.uuid4().hex[:8]}"
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
                "description": "Automated E2E sign-flow smoke test",
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

    print("4/12 Request upload URL...")
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
        raise RuntimeError(f"Worker did not return upload URL: {upload_meta}")

    object_key = upload_meta["objectKey"]
    print("5/12 Upload PDF to Worker/R2...")
    upload_pdf(upload_meta["uploadUrl"], token, object_key, pdf_bytes)

    print("6/12 Complete upload...")
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
    version_sha256 = complete.get("sha256")
    if not version_sha256:
        raise RuntimeError(f"Upload completion did not return sha256: {complete}")

    print("7/12 Create draft route with sign step...")
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
                            "action": "sign",
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
    assignee_row = route["route_steps"][0]["route_step_assignees"][0]
    assignee_row_id = assignee_row["id"]

    print("8/12 Mark document ready for routing...")
    graphql_request(
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

    print("9/12 Start route via Worker...")
    started = worker_request(f"/api/routes/{route['id']}/start", token, method="POST")
    if started.get("status") != "active":
        raise RuntimeError(f"Route was not activated: {started}")

    print("10/12 Verify preview URL...")
    preview_meta = worker_request(f"/api/files/{file_id}/preview-url", token, method="GET")
    preview_url = preview_meta.get("previewUrl")
    if not preview_url:
        raise RuntimeError(f"Preview URL was not returned: {preview_meta}")
    preview_bytes = fetch_preview_bytes(preview_url, token)
    if not preview_bytes.startswith(b"%PDF"):
        raise RuntimeError("Preview content is not a PDF.")

    print("11/12 Sign document via Worker...")
    signed = worker_request(
        f"/api/documents/{document['id']}/sign",
        token,
        method="POST",
        body={
            "routeId": route["id"],
            "assigneeRowId": assignee_row_id,
            "versionSha256": version_sha256,
            "password": password,
            "consent": True,
            "signatureMeaning": "I approve the contents of this document.",
            "typedSignature": profile.get("display_name") or profile["email"],
        },
        idempotency_key=str(uuid.uuid4()),
    )
    if signed.get("assigneeStatus") != "completed":
        raise RuntimeError(f"Assignee was not completed after sign: {signed}")
    if signed.get("routeCompleted") is not True:
        raise RuntimeError(f"Sign-step route did not complete: {signed}")
    if not signed.get("signatureEventId"):
        raise RuntimeError(f"Signature event was not returned: {signed}")

    print("12/12 Verify signed file visible to assignee...")
    evidence = graphql_request(
        hasura_url,
        token,
        """
        query SignEvidence($versionId: uuid!) {
          document_files(
            where: { version_id: { _eq: $versionId }, file_role: { _eq: "signed" } }
          ) {
            id
            file_role
            sha256
          }
        }
        """,
        {"versionId": version["id"]},
    )
    signed_files = evidence.get("document_files") or []
    if not signed_files:
        raise RuntimeError("No signed document_files row visible after sign.")

    print("13/15 Verify completion certificate issued...")
    certificate = signed.get("certificate")
    if not certificate:
        raise RuntimeError(f"Sign response did not include certificate: {signed}")
    certificate_id = certificate.get("certificateId")
    verification_code = certificate.get("verificationCode")
    if not certificate_id or not verification_code:
        raise RuntimeError(f"Certificate payload incomplete: {certificate}")

    cert_rows = graphql_request(
        hasura_url,
        token,
        """
        query CompletionCertificate($documentId: uuid!) {
          completion_certificates(where: { document_id: { _eq: $documentId } }, limit: 1) {
            id
            verification_code
            issued_at
            certificate_key
          }
          audit_events(
            where: {
              document_id: { _eq: $documentId }
              event_type: { _eq: "certificate.issued" }
            }
            order_by: { created_at: desc }
            limit: 1
          ) {
            id
            event_type
          }
        }
        """,
        {"documentId": document["id"]},
    )
    visible_cert = (cert_rows.get("completion_certificates") or [None])[0]
    if not visible_cert or visible_cert["id"] != certificate_id:
        raise RuntimeError(f"Certificate not visible via GraphQL: {cert_rows}")
    audit_event = (cert_rows.get("audit_events") or [None])[0]
    if not audit_event:
        raise RuntimeError("certificate.issued audit event not visible to assignee.")

    print("14/15 Verify public verification endpoint...")
    verification = request_json(
        f"{WORKER_URL}/api/verification/{certificate_id}?code={verification_code}",
    )
    if verification.get("valid") is not True:
        raise RuntimeError(f"Verification endpoint did not validate certificate: {verification}")
    if verification.get("documentTitle") != title:
        raise RuntimeError(f"Verification title mismatch: {verification}")

    print("15/15 Verify invalid code rejected...")
    bad_verification = request_json(
        f"{WORKER_URL}/api/verification/{certificate_id}?code=ZZZZZZZZ",
    )
    if bad_verification.get("valid") is not False:
        raise RuntimeError(f"Invalid verification code was accepted: {bad_verification}")

    print(
        "PASS: E2E sign + certificate flow completed.\n"
        f"  document_id={document['id']}\n"
        f"  version_id={version['id']}\n"
        f"  route_id={route['id']}\n"
        f"  assignee_row_id={assignee_row_id}\n"
        f"  file_id={file_id}\n"
        f"  preview_url={preview_url}\n"
        f"  preview_bytes={len(preview_bytes)}\n"
        f"  signature_event_id={signed.get('signatureEventId')}\n"
        f"  signed_file_id={signed.get('signedFileId')}\n"
        f"  final_pdf_hash={signed.get('finalPdfHash')}\n"
        f"  route_status={signed.get('routeStatus')}\n"
        f"  document_status={signed.get('documentStatus')}\n"
        f"  signed_files_visible={len(signed_files)}\n"
        f"  certificate_id={certificate_id}\n"
        f"  verification_code={verification_code}\n"
        f"  certificate_key={visible_cert.get('certificate_key')}\n"
        f"  audit_event_id={audit_event.get('id')}\n"
        f"  verify_document_title={verification.get('documentTitle')}"
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"FAIL: {error}", file=sys.stderr)
        raise SystemExit(1) from error
