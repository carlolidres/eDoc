"""Run Playwright live walkthrough on GitHub Pages using .dev.vars credentials."""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEV_VARS = ROOT / ".dev.vars"


def load_key_values(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--email", default="carlolidres@gmail.com")
    parser.add_argument("--assignee-id", required=True)
    parser.add_argument("--certificate-id", required=True)
    parser.add_argument("--verification-code", required=True)
    args = parser.parse_args()

    env = os.environ.copy()
    env.update(load_key_values(DEV_VARS))
    env["E2E_EMAIL"] = args.email
    env["E2E_PASSWORD"] = env.get("E2E_PASSWORD", "")
    env["E2E_ASSIGNEE_ID"] = args.assignee_id
    env["E2E_CERTIFICATE_ID"] = args.certificate_id
    env["E2E_VERIFICATION_CODE"] = args.verification_code
    if not env["E2E_PASSWORD"]:
        raise RuntimeError("E2E_PASSWORD missing in .dev.vars")

    result = subprocess.run(
        "npx playwright test --config playwright.live.config.ts",
        cwd=ROOT,
        env=env,
        check=False,
        shell=True,
    )
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"FAIL: {error}", file=sys.stderr)
        raise SystemExit(1) from error
