#!/usr/bin/env python3
"""Foremention Semgrep boundary-policy check (non-required CI experiment).

1. Fixtures: every rule must flag its bad fixtures and must not flag the ok fixtures.
2. Main tree: app/ lib/ worker/ components/ must produce zero findings.
Usage: python3 policy/semgrep/check.py   (requires `semgrep` OSS on PATH)
"""
import json
import subprocess
import sys

CONFIG = "policy/semgrep/foremention-boundaries.yml"
PREFIX = "policy.semgrep."
EXPECTED_FIXTURE_FINDINGS = {
    ("foremention-auth-mutation-requires-trusted-origin", "policy/semgrep/fixtures/auth-mutation-missing-origin.ts"),
    ("foremention-auth-mutation-requires-trusted-origin", "policy/semgrep/fixtures/auth-mutation-late-origin.ts"),
    ("foremention-no-fetch-of-request-supplied-url", "policy/semgrep/fixtures/ssrf-direct-fetch.ts"),
    ("foremention-no-service-role-in-client-component", "policy/semgrep/fixtures/client-service-role.tsx"),
}


def scan(*targets):
    proc = subprocess.run(
        ["semgrep", "--metrics=off", "--disable-version-check", "--config", CONFIG, "--json", *targets],
        capture_output=True, text=True, check=False,
    )
    if proc.returncode not in (0, 1):
        sys.stderr.write(proc.stderr)
        raise SystemExit(f"semgrep failed with exit code {proc.returncode}")
    return json.loads(proc.stdout)


def rule_id(result):
    return result["check_id"].split(".")[-1]


failures = []
fixtures = scan("policy/semgrep/fixtures")
found = {(rule_id(r), r["path"]) for r in fixtures["results"]}
for missing in sorted(EXPECTED_FIXTURE_FINDINGS - found):
    failures.append(f"rule did not catch fixture: {missing}")
for extra in sorted(found - EXPECTED_FIXTURE_FINDINGS):
    failures.append(f"false positive on compliant fixture: {extra}")

main = scan("app", "lib", "worker", "components")
for r in main["results"]:
    failures.append(f"main finding: {rule_id(r)} {r['path']}:{r['start']['line']}")

print(f"fixture findings: {len(fixtures['results'])} (expected files: {len(EXPECTED_FIXTURE_FINDINGS)})")
print(f"main files scanned: {len(main['paths']['scanned'])}; findings: {len(main['results'])}; parse errors: {len(main['errors'])}")
for err in main["errors"]:
    print(f"  parse note (not a finding): {err.get('path')}: {err.get('message', '')[:120]}")
if failures:
    print("\n".join(failures))
    raise SystemExit(1)
print("semgrep boundary policy: PASS")
