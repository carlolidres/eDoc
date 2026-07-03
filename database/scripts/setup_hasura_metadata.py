"""Track eDoc tables in Hasura and apply baseline org-scoped permissions."""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEV_VARS = ROOT / ".dev.vars"

TABLES = [
    "organizations",
    "profiles",
    "business_units",
    "departments",
    "organization_members",
    "roles",
    "permissions",
    "role_permissions",
    "user_roles",
    "user_delegations",
    "user_notification_preferences",
    "user_signature_profiles",
    "user_sessions",
    "document_categories",
    "document_types",
    "document_tags",
    "documents",
    "document_versions",
    "document_files",
    "document_attachments",
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
]


def load_dev_vars() -> dict[str, str]:
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


def metadata_request(endpoint: str, admin_secret: str, body: dict) -> dict:
    payload = json.dumps(body).encode("utf-8")
    request = urllib.request.Request(
        f"{endpoint}/v1/metadata",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-hasura-admin-secret": admin_secret,
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def track_tables(endpoint: str, admin_secret: str) -> None:
    tracked = 0
    for name in TABLES:
        try:
            metadata_request(
                endpoint,
                admin_secret,
                {
                    "type": "pg_track_table",
                    "args": {"source": "default", "table": {"schema": "public", "name": name}},
                },
            )
            tracked += 1
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            if "already tracked" in body.lower() or "already exists" in body.lower():
                continue
            raise RuntimeError(f"Track table {name} failed: {body}") from error
    print(f"Tracked tables ({tracked} new, {len(TABLES)} total).")


def create_relationships(endpoint: str, admin_secret: str) -> None:
    relationships = [
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "documents"},
                "name": "owner",
                "using": {"foreign_key_constraint_on": "owner_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "documents"},
                "name": "department",
                "using": {"foreign_key_constraint_on": "department_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "documents"},
                "name": "organization",
                "using": {"foreign_key_constraint_on": "organization_id"},
            },
        },
        {
            "type": "pg_create_array_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "documents"},
                "name": "document_routes",
                "using": {"foreign_key_constraint_on": {"table": {"schema": "public", "name": "document_routes"}, "column": "document_id"}},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "route_step_assignees"},
                "name": "step",
                "using": {"foreign_key_constraint_on": "step_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "route_step_assignees"},
                "name": "assignee",
                "using": {"foreign_key_constraint_on": "assignee_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "route_steps"},
                "name": "route",
                "using": {"foreign_key_constraint_on": "route_id"},
            },
        },
        {
            "type": "pg_create_array_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "route_steps"},
                "name": "route_step_assignees",
                "using": {"foreign_key_constraint_on": {"table": {"schema": "public", "name": "route_step_assignees"}, "column": "step_id"}},
            },
        },
        {
            "type": "pg_create_array_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "route_steps"},
                "name": "route_step_actions",
                "using": {
                    "foreign_key_constraint_on": {
                        "table": {"schema": "public", "name": "route_step_actions"},
                        "column": "step_id",
                    }
                },
            },
        },
        {
            "type": "pg_create_array_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "documents"},
                "name": "document_access_grants",
                "using": {
                    "foreign_key_constraint_on": {
                        "table": {"schema": "public", "name": "document_access_grants"},
                        "column": "document_id",
                    }
                },
            },
        },
        {
            "type": "pg_create_array_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "document_routes"},
                "name": "route_steps",
                "using": {
                    "foreign_key_constraint_on": {
                        "table": {"schema": "public", "name": "route_steps"},
                        "column": "route_id",
                    }
                },
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "document_routes"},
                "name": "document",
                "using": {"foreign_key_constraint_on": "document_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "document_versions"},
                "name": "document",
                "using": {"foreign_key_constraint_on": "document_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "document_routes"},
                "name": "version",
                "using": {"foreign_key_constraint_on": "version_id"},
            },
        },
        {
            "type": "pg_create_array_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "document_versions"},
                "name": "document_files",
                "using": {
                    "foreign_key_constraint_on": {
                        "table": {"schema": "public", "name": "document_files"},
                        "column": "version_id",
                    }
                },
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "document_files"},
                "name": "document",
                "using": {"foreign_key_constraint_on": "document_id"},
            },
        },
        {
            "type": "pg_create_array_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "route_step_assignees"},
                "name": "signature_fields",
                "using": {
                    "foreign_key_constraint_on": {
                        "table": {"schema": "public", "name": "signature_fields"},
                        "column": "assignee_id",
                    }
                },
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "signature_fields"},
                "name": "assignee_row",
                "using": {"foreign_key_constraint_on": "assignee_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "documents"},
                "name": "organization",
                "using": {"foreign_key_constraint_on": "organization_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "document_versions"},
                "name": "organization",
                "using": {"foreign_key_constraint_on": "organization_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "signature_events"},
                "name": "organization",
                "using": {"foreign_key_constraint_on": "organization_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "completion_certificates"},
                "name": "organization",
                "using": {"foreign_key_constraint_on": "organization_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "security_settings"},
                "name": "organization",
                "using": {"foreign_key_constraint_on": "organization_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "profiles"},
                "name": "organization",
                "using": {"foreign_key_constraint_on": "organization_id"},
            },
        },
        {
            "type": "pg_create_array_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "profiles"},
                "name": "user_roles",
                "using": {
                    "foreign_key_constraint_on": {
                        "table": {"schema": "public", "name": "user_roles"},
                        "column": "profile_id",
                    }
                },
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "user_roles"},
                "name": "role",
                "using": {"foreign_key_constraint_on": "role_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "audit_events"},
                "name": "organization",
                "using": {"foreign_key_constraint_on": "organization_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "audit_events"},
                "name": "user",
                "using": {"foreign_key_constraint_on": "user_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "audit_events"},
                "name": "document",
                "using": {"foreign_key_constraint_on": "document_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "signature_events"},
                "name": "signer",
                "using": {"foreign_key_constraint_on": "signer_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "signature_events"},
                "name": "document",
                "using": {"foreign_key_constraint_on": "document_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "completion_certificates"},
                "name": "document",
                "using": {"foreign_key_constraint_on": "document_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "route_step_actions"},
                "name": "assignee",
                "using": {"foreign_key_constraint_on": "assignee_id"},
            },
        },
        {
            "type": "pg_create_array_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "organizations"},
                "name": "profiles",
                "using": {
                    "foreign_key_constraint_on": {
                        "table": {"schema": "public", "name": "profiles"},
                        "column": "organization_id",
                    }
                },
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "user_roles"},
                "name": "profile",
                "using": {"foreign_key_constraint_on": "profile_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "roles"},
                "name": "organization",
                "using": {"foreign_key_constraint_on": "organization_id"},
            },
        },
        {
            "type": "pg_create_array_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "roles"},
                "name": "user_roles",
                "using": {
                    "foreign_key_constraint_on": {
                        "table": {"schema": "public", "name": "user_roles"},
                        "column": "role_id",
                    }
                },
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "departments"},
                "name": "organization",
                "using": {"foreign_key_constraint_on": "organization_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "document_types"},
                "name": "organization",
                "using": {"foreign_key_constraint_on": "organization_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "document_types"},
                "name": "category",
                "using": {"foreign_key_constraint_on": "category_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "document_categories"},
                "name": "organization",
                "using": {"foreign_key_constraint_on": "organization_id"},
            },
        },
        {
            "type": "pg_create_object_relationship",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "system_settings"},
                "name": "organization",
                "using": {"foreign_key_constraint_on": "organization_id"},
            },
        },
    ]
    for rel in relationships:
        try:
            metadata_request(endpoint, admin_secret, rel)
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            if "already exists" in body.lower():
                continue
            raise RuntimeError(f"Relationship failed: {body}") from error
    print("Relationships configured.")


OWNER_DOCUMENT_FILTER = {"document": {"owner_id": {"_eq": "X-Hasura-User-Id"}}}
OWNER_ROUTE_FILTER = {"route": OWNER_DOCUMENT_FILTER}
OWNER_STEP_FILTER = {"step": OWNER_ROUTE_FILTER}
ASSIGNEE_FILTER = {"assignee_id": {"_eq": "X-Hasura-User-Id"}}
ASSIGNEE_DOCUMENT_FILTER = {
    "_or": [
        {"owner_id": {"_eq": "X-Hasura-User-Id"}},
        {"document_access_grants": {"grantee_id": {"_eq": "X-Hasura-User-Id"}}},
        {
            "document_routes": {
                "route_steps": {
                    "route_step_assignees": {
                        "assignee_id": {"_eq": "X-Hasura-User-Id"},
                        "status": {"_in": ["pending", "active", "completed"]},
                    }
                }
            }
        },
    ]
}
ORG_PEER_FILTER = {"organization": {"profiles": {"id": {"_eq": "X-Hasura-User-Id"}}}}
ORG_MEMBERSHIP_FILTER = {
    "organization": {
        "profiles": {
            "id": {"_eq": "X-Hasura-User-Id"},
        }
    }
}
ORGANIZATION_SELF_FILTER = {
    "profiles": {
        "id": {"_eq": "X-Hasura-User-Id"},
    }
}
AUDITOR_ORG_FILTER = {
    "organization": {
        "profiles": {
            "_and": [
                {"id": {"_eq": "X-Hasura-User-Id"}},
                {"user_roles": {"role": {"name": {"_eq": "Auditor"}}}},
            ]
        }
    }
}
ADMIN_ROLE_NAMES = ["Organization Administrator", "Super Administrator"]
# Phase 9: administration reads. Same "user" Hasura role as everyone else; the row filter
# below (not a separate Hasura role) restricts these org-configuration tables to profiles
# that hold an admin role in `user_roles`, so non-admin members simply see zero rows.
ADMIN_ORG_FILTER = {
    "organization": {
        "profiles": {
            "_and": [
                {"id": {"_eq": "X-Hasura-User-Id"}},
                {"user_roles": {"role": {"name": {"_in": ADMIN_ROLE_NAMES}}}},
            ]
        }
    }
}
ADMIN_ORG_FILTER_VIA_PROFILE = {"profile": ADMIN_ORG_FILTER}
# Everyone may read their own role assignment (needed to know their own permissions);
# admins may additionally read every assignment in their organization.
USER_ROLES_FILTER = {
    "_or": [
        ADMIN_ORG_FILTER_VIA_PROFILE,
        {"profile_id": {"_eq": "X-Hasura-User-Id"}},
    ]
}
ROLES_FILTER = {
    "_or": [
        ADMIN_ORG_FILTER,
        {"user_roles": {"profile_id": {"_eq": "X-Hasura-User-Id"}}},
    ]
}
AUDIT_EVENTS_USER_FILTER = {
    "_or": [
        {"document": ASSIGNEE_DOCUMENT_FILTER},
        AUDITOR_ORG_FILTER,
    ]
}
DOCUMENT_USER_FILTER = {
    "_or": [
        ASSIGNEE_DOCUMENT_FILTER,
        AUDITOR_ORG_FILTER,
    ]
}


def drop_user_permission(endpoint: str, admin_secret: str, table_name: str, permission_type: str) -> None:
    try:
        metadata_request(
            endpoint,
            admin_secret,
            {
                "type": permission_type,
                "args": {"source": "default", "table": {"schema": "public", "name": table_name}, "role": "user"},
            },
        )
    except urllib.error.HTTPError:
        pass


def apply_permissions(endpoint: str, admin_secret: str) -> None:
    """Apply user-role permissions for Phase 5 reads and wizard routing inserts."""
    for table_name in (
        "route_step_assignees", "route_steps", "document_routes", "profiles", "documents",
        "document_versions", "document_files", "signature_fields", "audit_events",
        "signature_events", "completion_certificates", "security_settings",
        "roles", "user_roles", "departments", "document_types", "document_categories",
        "system_settings", "organizations",
    ):
        drop_user_permission(endpoint, admin_secret, table_name, "pg_drop_select_permission")
    for table_name in ("documents", "document_routes", "route_steps", "route_step_assignees", "signature_fields"):
        drop_user_permission(endpoint, admin_secret, table_name, "pg_drop_update_permission")
        drop_user_permission(endpoint, admin_secret, table_name, "pg_drop_insert_permission")

    user_permissions = [
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "documents"},
                "role": "user",
                "permission": {
                    "columns": [
                        "id",
                        "organization_id",
                        "owner_id",
                        "department_id",
                        "title",
                        "reference_number",
                        "status",
                        "priority",
                        "due_at",
                        "created_at",
                        "updated_at",
                    ],
                    "filter": {
                        "_or": [
                            {"owner_id": {"_eq": "X-Hasura-User-Id"}},
                            {
                                "document_access_grants": {
                                    "grantee_id": {"_eq": "X-Hasura-User-Id"},
                                }
                            },
                            {
                                "document_routes": {
                                    "route_steps": {
                                        "route_step_assignees": {
                                            "assignee_id": {"_eq": "X-Hasura-User-Id"},
                                        }
                                    }
                                }
                            },
                        ]
                    },
                    "allow_aggregations": True,
                },
            },
        },
        {
            "type": "pg_create_insert_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "documents"},
                "role": "user",
                "permission": {
                    "check": {"owner_id": {"_eq": "X-Hasura-User-Id"}},
                    "set": {"owner_id": "X-Hasura-User-Id"},
                    "columns": [
                        "organization_id",
                        "department_id",
                        "document_type_id",
                        "title",
                        "reference_number",
                        "status",
                        "priority",
                        "confidentiality",
                        "description",
                        "due_at",
                    ],
                },
            },
        },
        {
            "type": "pg_create_update_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "documents"},
                "role": "user",
                "permission": {
                    "columns": ["title", "description", "status", "priority", "due_at", "department_id"],
                    "filter": {
                        "owner_id": {"_eq": "X-Hasura-User-Id"},
                        "status": {"_in": ["draft", "preparing", "returned"]},
                    },
                    "check": {"owner_id": {"_eq": "X-Hasura-User-Id"}},
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "document_versions"},
                "role": "user",
                "permission": {
                    "columns": [
                        "id",
                        "organization_id",
                        "document_id",
                        "version_number",
                        "status",
                        "original_sha256",
                        "created_at",
                    ],
                    "filter": {
                        "_or": [
                            {"document": {"owner_id": {"_eq": "X-Hasura-User-Id"}}},
                            {
                                "document": {
                                    "document_routes": {
                                        "route_steps": {
                                            "route_step_assignees": {
                                                "assignee_id": {"_eq": "X-Hasura-User-Id"},
                                            }
                                        }
                                    }
                                }
                            },
                        ]
                    },
                },
            },
        },
        {
            "type": "pg_create_insert_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "document_versions"},
                "role": "user",
                "permission": {
                    "check": {
                        "document": {
                            "owner_id": {"_eq": "X-Hasura-User-Id"},
                        }
                    },
                    "set": {"created_by": "X-Hasura-User-Id"},
                    "columns": [
                        "organization_id",
                        "document_id",
                        "version_number",
                        "status",
                    ],
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "document_files"},
                "role": "user",
                "permission": {
                    "columns": ["id", "document_id", "version_id", "file_role", "file_name", "mime_type", "size_bytes", "sha256"],
                    "filter": {"document": ASSIGNEE_DOCUMENT_FILTER},
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "signature_fields"},
                "role": "user",
                "permission": {
                    "columns": [
                        "id",
                        "assignee_id",
                        "field_type",
                        "page_number",
                        "x",
                        "y",
                        "width",
                        "height",
                        "required",
                    ],
                    "filter": {
                        "_or": [
                            {"assignee_row": {"assignee_id": {"_eq": "X-Hasura-User-Id"}}},
                            {"assignee_row": OWNER_STEP_FILTER},
                        ]
                    },
                },
            },
        },
        {
            "type": "pg_create_insert_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "signature_fields"},
                "role": "user",
                "permission": {
                    "check": {"assignee_row": OWNER_STEP_FILTER},
                    "columns": [
                        "organization_id",
                        "document_id",
                        "version_id",
                        "assignee_id",
                        "field_type",
                        "page_number",
                        "x",
                        "y",
                        "width",
                        "height",
                        "required",
                    ],
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "profiles"},
                "role": "user",
                "permission": {
                    "columns": ["id", "organization_id", "display_name", "email", "status"],
                    "filter": {
                        "_or": [
                            {"id": {"_eq": "X-Hasura-User-Id"}},
                            ORG_PEER_FILTER,
                        ]
                    },
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "route_step_assignees"},
                "role": "user",
                "permission": {
                    "columns": ["id", "organization_id", "step_id", "assignee_id", "status", "completed_at"],
                    "filter": {
                        "_or": [
                            {
                                **ASSIGNEE_FILTER,
                                "status": {"_in": ["pending", "active"]},
                            },
                            OWNER_STEP_FILTER,
                        ]
                    },
                    "allow_aggregations": True,
                },
            },
        },
        {
            "type": "pg_create_insert_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "route_step_assignees"},
                "role": "user",
                "permission": {
                    "check": OWNER_STEP_FILTER,
                    "columns": ["organization_id", "step_id", "assignee_id", "status"],
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "route_steps"},
                "role": "user",
                "permission": {
                    "columns": ["id", "route_id", "sequence", "action", "status", "due_at", "completion_rule"],
                    "filter": {
                        "_or": [
                            {"route_step_assignees": ASSIGNEE_FILTER},
                            OWNER_ROUTE_FILTER,
                        ]
                    },
                },
            },
        },
        {
            "type": "pg_create_insert_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "route_steps"},
                "role": "user",
                "permission": {
                    "check": OWNER_ROUTE_FILTER,
                    "columns": [
                        "organization_id",
                        "route_id",
                        "sequence",
                        "action",
                        "completion_rule",
                        "minimum_count",
                        "status",
                        "due_at",
                    ],
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "document_routes"},
                "role": "user",
                "permission": {
                    "columns": ["id", "document_id", "version_id", "mode", "status", "started_at", "organization_id"],
                    "filter": {
                        "_or": [
                            {"route_steps": {"route_step_assignees": ASSIGNEE_FILTER}},
                            OWNER_DOCUMENT_FILTER,
                        ]
                    },
                },
            },
        },
        {
            "type": "pg_create_insert_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "document_routes"},
                "role": "user",
                "permission": {
                    "check": OWNER_DOCUMENT_FILTER,
                    "columns": [
                        "organization_id",
                        "document_id",
                        "version_id",
                        "template_id",
                        "mode",
                        "status",
                    ],
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "document_access_grants"},
                "role": "user",
                "permission": {
                    "columns": ["id", "document_id", "grantee_id", "permission_level"],
                    "filter": {"grantee_id": {"_eq": "X-Hasura-User-Id"}},
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "audit_events"},
                "role": "user",
                "permission": {
                    "columns": [
                        "id",
                        "event_type",
                        "entity_type",
                        "entity_id",
                        "document_id",
                        "version_id",
                        "user_id",
                        "previous_value",
                        "new_value",
                        "reason",
                        "source",
                        "request_id",
                        "integrity_hash",
                        "created_at",
                    ],
                    "filter": AUDIT_EVENTS_USER_FILTER,
                    "allow_aggregations": True,
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "signature_events"},
                "role": "user",
                "permission": {
                    "columns": [
                        "id",
                        "document_id",
                        "version_id",
                        "assignee_id",
                        "signer_id",
                        "signature_meaning",
                        "auth_method",
                        "document_hash",
                        "final_pdf_hash",
                        "created_at",
                    ],
                    "filter": {"document": DOCUMENT_USER_FILTER},
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "completion_certificates"},
                "role": "user",
                "permission": {
                    "columns": [
                        "id",
                        "document_id",
                        "version_id",
                        "route_id",
                        "certificate_key",
                        "verification_code",
                        "issued_at",
                    ],
                    "filter": {"document": DOCUMENT_USER_FILTER},
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "route_step_actions"},
                "role": "user",
                "permission": {
                    "columns": ["id", "step_id", "assignee_id", "action", "status", "comment", "created_at"],
                    "filter": {
                        "assignee": {
                            "_or": [
                                {"assignee_id": {"_eq": "X-Hasura-User-Id"}},
                                {"step": OWNER_ROUTE_FILTER},
                            ]
                        }
                    },
                },
            },
        },
    ]

    for permission in user_permissions:
        try:
            metadata_request(endpoint, admin_secret, permission)
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            if "already exists" in body.lower() or "already defined" in body.lower():
                continue
            raise RuntimeError(f"Permission failed: {body}") from error
    print("User-role permissions applied.")
    apply_admin_permissions(endpoint, admin_secret)
    apply_auditor_permissions(endpoint, admin_secret)


def apply_admin_permissions(endpoint: str, admin_secret: str) -> None:
    """Phase 9: org-configuration reads for the `user` role, scoped to admin members via ADMIN_ORG_FILTER."""
    admin_permissions = [
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "organizations"},
                "role": "user",
                "permission": {
                    "columns": ["id", "name", "slug", "created_at"],
                    "filter": ORGANIZATION_SELF_FILTER,
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "roles"},
                "role": "user",
                "permission": {
                    "columns": ["id", "organization_id", "name", "is_system"],
                    "filter": ROLES_FILTER,
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "user_roles"},
                "role": "user",
                "permission": {
                    "columns": ["profile_id", "role_id"],
                    "filter": USER_ROLES_FILTER,
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "departments"},
                "role": "user",
                "permission": {
                    "columns": ["id", "organization_id", "business_unit_id", "name"],
                    "filter": ADMIN_ORG_FILTER,
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "document_types"},
                "role": "user",
                "permission": {
                    "columns": ["id", "organization_id", "name", "category_id"],
                    "filter": ADMIN_ORG_FILTER,
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "document_categories"},
                "role": "user",
                "permission": {
                    "columns": ["id", "organization_id", "name", "parent_id"],
                    "filter": ADMIN_ORG_FILTER,
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "system_settings"},
                "role": "user",
                "permission": {
                    "columns": ["id", "organization_id", "setting_key", "setting_value_json", "updated_at"],
                    "filter": ADMIN_ORG_FILTER,
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "security_settings"},
                "role": "user",
                "permission": {
                    "columns": ["id", "organization_id", "session_timeout_minutes", "mfa_required", "updated_at"],
                    "filter": ADMIN_ORG_FILTER,
                },
            },
        },
    ]
    for permission in admin_permissions:
        try:
            metadata_request(endpoint, admin_secret, permission)
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            if "already exists" in body.lower() or "already defined" in body.lower():
                continue
            raise RuntimeError(f"Admin permission failed: {body}") from error
    print("Admin-scoped org-configuration permissions applied.")


AUDITOR_AUDIT_COLUMNS = [
    "id",
    "organization_id",
    "event_type",
    "entity_type",
    "entity_id",
    "document_id",
    "version_id",
    "user_id",
    "previous_value",
    "new_value",
    "reason",
    "source",
    "request_id",
    "integrity_hash",
    "created_at",
]


def drop_role_permission(endpoint: str, admin_secret: str, table_name: str, permission_type: str, role: str) -> None:
    try:
        metadata_request(
            endpoint,
            admin_secret,
            {
                "type": permission_type,
                "args": {"source": "default", "table": {"schema": "public", "name": table_name}, "role": role},
            },
        )
    except urllib.error.HTTPError:
        pass


def apply_auditor_permissions(endpoint: str, admin_secret: str) -> None:
    """Apply read-only auditor role permissions scoped to the user's organization."""
    auditor_tables = (
        "audit_events",
        "documents",
        "document_versions",
        "signature_events",
        "completion_certificates",
        "security_settings",
        "profiles",
        "organizations",
    )
    for table_name in auditor_tables:
        drop_role_permission(endpoint, admin_secret, table_name, "pg_drop_select_permission", "auditor")

    auditor_permissions = [
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "audit_events"},
                "role": "auditor",
                "permission": {
                    "columns": AUDITOR_AUDIT_COLUMNS,
                    "filter": ORG_MEMBERSHIP_FILTER,
                    "allow_aggregations": True,
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "documents"},
                "role": "auditor",
                "permission": {
                    "columns": [
                        "id",
                        "organization_id",
                        "owner_id",
                        "title",
                        "reference_number",
                        "status",
                        "priority",
                        "due_at",
                        "created_at",
                        "updated_at",
                    ],
                    "filter": ORG_MEMBERSHIP_FILTER,
                    "allow_aggregations": True,
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "document_versions"},
                "role": "auditor",
                "permission": {
                    "columns": [
                        "id",
                        "organization_id",
                        "document_id",
                        "version_number",
                        "status",
                        "original_sha256",
                        "created_at",
                    ],
                    "filter": ORG_MEMBERSHIP_FILTER,
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "signature_events"},
                "role": "auditor",
                "permission": {
                    "columns": [
                        "id",
                        "document_id",
                        "version_id",
                        "assignee_id",
                        "signer_id",
                        "signature_meaning",
                        "auth_method",
                        "document_hash",
                        "final_pdf_hash",
                        "created_at",
                    ],
                    "filter": ORG_MEMBERSHIP_FILTER,
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "completion_certificates"},
                "role": "auditor",
                "permission": {
                    "columns": [
                        "id",
                        "document_id",
                        "version_id",
                        "route_id",
                        "certificate_key",
                        "verification_code",
                        "issued_at",
                    ],
                    "filter": ORG_MEMBERSHIP_FILTER,
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "security_settings"},
                "role": "auditor",
                "permission": {
                    "columns": [
                        "id",
                        "organization_id",
                        "session_timeout_minutes",
                        "mfa_required",
                        "updated_at",
                    ],
                    "filter": ORG_MEMBERSHIP_FILTER,
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "profiles"},
                "role": "auditor",
                "permission": {
                    "columns": ["id", "organization_id", "display_name", "email", "status"],
                    "filter": ORG_MEMBERSHIP_FILTER,
                },
            },
        },
        {
            "type": "pg_create_select_permission",
            "args": {
                "source": "default",
                "table": {"schema": "public", "name": "organizations"},
                "role": "auditor",
                "permission": {
                    "columns": ["id", "name", "slug", "created_at"],
                    "filter": ORGANIZATION_SELF_FILTER,
                },
            },
        },
    ]

    for permission in auditor_permissions:
        try:
            metadata_request(endpoint, admin_secret, permission)
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            if "already exists" in body.lower() or "already defined" in body.lower():
                continue
            raise RuntimeError(f"Auditor permission failed: {body}") from error
    print("Auditor-role permissions applied.")


def main() -> None:
    env = load_dev_vars()
    graphql_url = env["HASURA_GRAPHQL_URL"]
    admin_secret = env["HASURA_ADMIN_SECRET"]
    endpoint = hasura_endpoint(graphql_url)

    track_tables(endpoint, admin_secret)
    create_relationships(endpoint, admin_secret)
    apply_permissions(endpoint, admin_secret)
    print("PASS: Hasura metadata configured.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"FAIL: {error}", file=sys.stderr)
        raise SystemExit(1) from error
