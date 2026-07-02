"""Validate eDoc application SQLite schema, constraints, and representative workflow inserts."""
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = ROOT / "database" / "sqlite" / "schema.sql"
SEED = ROOT / "database" / "sqlite" / "seed.sql"

REQUIRED_TABLES = {
    "organizations",
    "profiles",
    "departments",
    "business_units",
    "organization_members",
    "roles",
    "permissions",
    "role_permissions",
    "user_roles",
    "user_delegations",
    "user_notification_preferences",
    "user_signature_profiles",
    "user_sessions",
    "documents",
    "document_versions",
    "document_files",
    "document_attachments",
    "document_categories",
    "document_types",
    "document_tags",
    "document_tag_assignments",
    "document_access_grants",
    "document_retention_rules",
    "routing_templates",
    "routing_template_steps",
    "document_routes",
    "route_steps",
    "route_step_assignees",
    "route_step_actions",
    "route_step_delegations",
    "route_reminders",
    "route_escalations",
    "signature_fields",
    "signature_events",
    "signature_authentication_events",
    "completion_certificates",
    "document_comments",
    "comment_replies",
    "comment_mentions",
    "notifications",
    "notification_deliveries",
    "email_templates",
    "audit_events",
    "system_settings",
    "security_settings",
    "system_logs",
    "file_access_logs",
    "data_export_logs",
}


def main() -> None:
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA.read_text(encoding="utf-8"))
    conn.executescript(SEED.read_text(encoding="utf-8"))

    tables = {
        row["name"]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
        )
    }
    missing = REQUIRED_TABLES - tables
    if missing:
        raise AssertionError(f"Missing tables: {sorted(missing)}")

    org_id = "00000000-0000-4000-8000-000000000001"
    owner_id = "00000000-0000-4000-8000-000000000010"
    reviewer_id = "00000000-0000-4000-8000-000000000011"
    doc_id = "00000000-0000-4000-8000-000000000100"
    version_id = "00000000-0000-4000-8000-000000000101"

    route_id = "00000000-0000-4000-8000-000000000200"
    step_id = "00000000-0000-4000-8000-000000000201"
    assignee_id = "00000000-0000-4000-8000-000000000202"

    conn.execute(
        """
        INSERT INTO document_routes (id, organization_id, document_id, version_id, mode, status, started_at)
        VALUES (?, ?, ?, ?, 'sequential', 'active', '2026-07-01T01:00:00Z')
        """,
        (route_id, org_id, doc_id, version_id),
    )
    conn.execute(
        """
        INSERT INTO route_steps (id, organization_id, route_id, sequence, action, status)
        VALUES (?, ?, ?, 1, 'review', 'active')
        """,
        (step_id, org_id, route_id),
    )
    conn.execute(
        """
        INSERT INTO route_step_assignees (id, organization_id, step_id, assignee_id, status)
        VALUES (?, ?, ?, ?, 'active')
        """,
        (assignee_id, org_id, step_id, reviewer_id),
    )

    audit_id = "00000000-0000-4000-8000-000000000300"
    conn.execute(
        """
        INSERT INTO audit_events (
          id, organization_id, user_id, event_type, entity_type, entity_id,
          document_id, version_id, new_value, source, created_at
        ) VALUES (?, ?, ?, 'route.started', 'document_route', ?, ?, ?, ?, 'app', '2026-07-01T01:00:00Z')
        """,
        (
            audit_id,
            org_id,
            owner_id,
            route_id,
            doc_id,
            version_id,
            json.dumps({"status": "active"}),
        ),
    )

    try:
        conn.execute("UPDATE audit_events SET event_type = 'tampered' WHERE id = ?", (audit_id,))
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError("audit_events update trigger did not fire")

    try:
        conn.execute("DELETE FROM audit_events WHERE id = ?", (audit_id,))
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError("audit_events delete trigger did not fire")

    try:
        conn.execute(
            """
            INSERT INTO route_step_assignees (id, organization_id, step_id, assignee_id, status)
            VALUES ('bad-assignee', ?, 'missing-step', ?, 'pending')
            """,
            (org_id, reviewer_id),
        )
    except sqlite3.IntegrityError:
        pass
    else:
        raise AssertionError("route_step_assignees foreign key did not enforce")

    fk_errors = conn.execute("PRAGMA foreign_key_check").fetchall()
    if fk_errors:
        raise AssertionError(f"Foreign key errors: {fk_errors}")

    print(f"PASS: eDoc SQLite schema validates ({len(REQUIRED_TABLES)} tables).")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"FAIL: {error}", file=sys.stderr)
        raise SystemExit(1) from error
