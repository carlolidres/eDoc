"""Generate sqlite-out schema map from database/sqlite/schema.sql."""
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = ROOT / "database" / "sqlite" / "schema.sql"
OUT_DIR = ROOT / "sqlite-out"


def collect_schema(conn: sqlite3.Connection) -> dict:
    tables = {}
    for table_row in conn.execute(
        """
        SELECT name, sql FROM sqlite_master
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
        """
    ):
        name = table_row["name"]
        columns = []
        for col in conn.execute(f"PRAGMA table_info({name})"):
            columns.append(
                {
                    "name": col["name"],
                    "type": col["type"],
                    "notNull": bool(col["notnull"]),
                    "default": col["dflt_value"],
                    "primaryKey": bool(col["pk"]),
                }
            )
        foreign_keys = []
        for fk in conn.execute(f"PRAGMA foreign_key_list({name})"):
            foreign_keys.append(
                {
                    "from": fk["from"],
                    "toTable": fk["table"],
                    "toColumn": fk["to"],
                    "onUpdate": fk["on_update"],
                    "onDelete": fk["on_delete"],
                }
            )
        indexes = []
        for idx in conn.execute(f"PRAGMA index_list({name})"):
            if idx["origin"] == "pk":
                continue
            idx_cols = [
                row["name"]
                for row in conn.execute(f"PRAGMA index_info({idx['name']})")
            ]
            indexes.append({"name": idx["name"], "unique": bool(idx["unique"]), "columns": idx_cols})
        tables[name] = {
            "sql": table_row["sql"],
            "columns": columns,
            "foreignKeys": foreign_keys,
            "indexes": indexes,
        }
    return {"generatedAt": datetime.now(timezone.utc).isoformat(), "tables": tables}


def render_report(schema: dict) -> str:
    lines = [
        "# SQLite Schema Report",
        "",
        f"Generated: `{schema['generatedAt']}`",
        "",
        "Source: `database/sqlite/schema.sql`",
        "",
        f"Tables: **{len(schema['tables'])}**",
        "",
    ]
    for table_name in sorted(schema["tables"]):
        table = schema["tables"][table_name]
        lines.append(f"## `{table_name}`")
        lines.append("")
        lines.append("| Column | Type | PK | Not null | Default |")
        lines.append("|---|---|:---:|:---:|---|")
        for col in table["columns"]:
            pk = "yes" if col["primaryKey"] else ""
            nn = "yes" if col["notNull"] else ""
            default = col["default"] if col["default"] is not None else ""
            lines.append(f"| `{col['name']}` | {col['type']} | {pk} | {nn} | {default} |")
        if table["foreignKeys"]:
            lines.append("")
            lines.append("**Foreign keys:**")
            for fk in table["foreignKeys"]:
                lines.append(f"- `{fk['from']}` → `{fk['toTable']}.{fk['toColumn']}`")
        if table["indexes"]:
            lines.append("")
            lines.append("**Indexes:**")
            for idx in table["indexes"]:
                unique = "unique " if idx["unique"] else ""
                cols = ", ".join(f"`{c}`" for c in idx["columns"])
                lines.append(f"- {unique}`{idx['name']}` ({cols})")
        lines.append("")
    return "\n".join(lines)


def render_html(schema: dict) -> str:
    rows = []
    for table_name in sorted(schema["tables"]):
        table = schema["tables"][table_name]
        fk_summary = ", ".join(
            f"{fk['from']}→{fk['toTable']}.{fk['toColumn']}" for fk in table["foreignKeys"]
        )
        rows.append(
            f"<tr><td><code>{table_name}</code></td>"
            f"<td>{len(table['columns'])}</td>"
            f"<td>{len(table['foreignKeys'])}</td>"
            f"<td>{fk_summary}</td></tr>"
        )
    body_rows = "\n".join(rows)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>eDoc SQLite Schema Map</title>
  <style>
    body {{ font-family: system-ui, sans-serif; margin: 2rem; }}
    table {{ border-collapse: collapse; width: 100%; }}
    th, td {{ border: 1px solid #ccc; padding: 0.5rem; text-align: left; vertical-align: top; }}
    th {{ background: #f5f5f5; }}
  </style>
</head>
<body>
  <h1>eDoc SQLite Schema Map</h1>
  <p>Generated: {schema['generatedAt']}</p>
  <table>
    <thead><tr><th>Table</th><th>Columns</th><th>FKs</th><th>Relationships</th></tr></thead>
    <tbody>
{body_rows}
    </tbody>
  </table>
</body>
</html>
"""


def main() -> None:
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA.read_text(encoding="utf-8"))
    schema = collect_schema(conn)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "schema.json").write_text(json.dumps(schema, indent=2), encoding="utf-8")
    (OUT_DIR / "SCHEMA_REPORT.md").write_text(render_report(schema), encoding="utf-8")
    (OUT_DIR / "schema-map.html").write_text(render_html(schema), encoding="utf-8")
    print(f"PASS: generated sqlite-out ({len(schema['tables'])} tables).")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"FAIL: {error}", file=sys.stderr)
        raise SystemExit(1) from error
