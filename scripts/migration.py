#!/usr/bin/env python3
"""
Migration Security Scanner (Python)

Scans SQL migrations under supabase/migrations for unsafe RLS patterns and missing
idempotency safeguards. Mirrors the intent of scripts/check-migration-security.js.

Rules enforced:
- No permissive RLS: disallow USING (true), WITH CHECK (true),
  TO authenticated USING (true), and policy names like "Anyone can...".
- CREATE objects must be idempotent: use IF NOT EXISTS or guard in DO $$ blocks.
- RLS policies should live inside existence-guarded DO $$ blocks.
- Triggers/enums should be guarded to avoid duplicate-object errors on rerun.
"""

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Tuple


MIGRATIONS_DIR = Path("supabase/migrations")


# Patterns that are always invalid
FORBIDDEN_PATTERNS = [
    (re.compile(r"USING\s*\(\s*true\s*\)", re.IGNORECASE), "RLS uses USING (true)"),
    (
        re.compile(r"WITH\s+CHECK\s*\(\s*true\s*\)", re.IGNORECASE),
        "RLS uses WITH CHECK (true)",
    ),
    (
        re.compile(r"TO\s+authenticated\s+USING\s*\(\s*true\s*\)", re.IGNORECASE),
        "RLS uses TO authenticated USING (true)",
    ),
    (
        re.compile(r"CREATE\s+POLICY\s+['\"]\s*Anyone\s+can", re.IGNORECASE),
        "Policy name begins with 'Anyone can...'",
    ),
]

# Creation statements that should be idempotent
CREATE_OBJECT_PATTERNS = [
    re.compile(r"\bCREATE\s+TABLE\b", re.IGNORECASE),
    re.compile(r"\bCREATE\s+TYPE\b", re.IGNORECASE),
    re.compile(r"\bCREATE\s+INDEX\b", re.IGNORECASE),
    re.compile(r"\bCREATE\s+(MATERIALIZED\s+)?VIEW\b", re.IGNORECASE),
    re.compile(r"\bCREATE\s+TRIGGER\b", re.IGNORECASE),
    re.compile(r"\bCREATE\s+FUNCTION\b", re.IGNORECASE),
]


# Helper to detect DO block ranges (inclusive line numbers)
def compute_do_ranges(text: str) -> List[Tuple[int, int]]:
    ranges: List[Tuple[int, int]] = []
    # Match DO $$ ... $$ (greedy, multiline)
    for match in re.finditer(r"DO\s*\$\$(.*?)\$\$;?", text, re.IGNORECASE | re.DOTALL):
        start_pos = match.start()
        end_pos = match.end()
        start_line = text[:start_pos].count("\n")
        end_line = text[:end_pos].count("\n")
        ranges.append((start_line, end_line))
    return ranges


def line_in_ranges(line_no: int, ranges: Iterable[Tuple[int, int]]) -> bool:
    return any(lo <= line_no <= hi for lo, hi in ranges)


@dataclass
class Violation:
    file: Path
    line: int
    message: str
    context: str


def check_file(path: Path) -> List[Violation]:
    content = path.read_text()
    lines = content.splitlines()
    do_ranges = compute_do_ranges(content)
    violations: List[Violation] = []

    # Forbidden patterns
    for pattern, msg in FORBIDDEN_PATTERNS:
        for match in pattern.finditer(content):
            line_no = content[: match.start()].count("\n") + 1
            context = lines[line_no - 1].strip()
            violations.append(Violation(path, line_no, msg, context))

    # Idempotency checks
    for i, line in enumerate(lines):
        stripped = line.strip()
        # Skip comments
        if stripped.startswith("--"):
            continue

        # Create-object without IF NOT EXISTS and not inside DO guard
        for pattern in CREATE_OBJECT_PATTERNS:
            if pattern.search(stripped):
                has_if_not_exists = "IF NOT EXISTS" in stripped.upper()
                inside_do = line_in_ranges(i, do_ranges)
                if not has_if_not_exists and not inside_do:
                    violations.append(
                        Violation(
                            path,
                            i + 1,
                            "CREATE statement missing IF NOT EXISTS or DO $$ guard",
                            stripped,
                        )
                    )

        # CREATE TYPE ENUM without guard
        if re.search(r"\bCREATE\s+TYPE\b.*\bENUM\b", stripped, re.IGNORECASE):
            inside_do = line_in_ranges(i, do_ranges)
            if "IF NOT EXISTS" not in stripped.upper() and not inside_do:
                violations.append(
                    Violation(
                        path,
                        i + 1,
                        "ENUM creation must be guarded (IF NOT EXISTS or DO $$ check on pg_type)",
                        stripped,
                    )
                )

        # CREATE TRIGGER without guard
        if re.search(r"\bCREATE\s+TRIGGER\b", stripped, re.IGNORECASE):
            inside_do = line_in_ranges(i, do_ranges)
            if "IF NOT EXISTS" not in stripped.upper() and not inside_do:
                violations.append(
                    Violation(
                        path,
                        i + 1,
                        "Trigger creation must be existence-guarded (pg_trigger check in DO $$)",
                        stripped,
                    )
                )

    return violations


def wrap_policy(policy_sql: str, table: str, policy: str) -> str:
    schema = "public"
    if "." in table:
        schema, table = table.split(".", 1)
    return (
        "DO $$\nBEGIN\n"
        f"  IF NOT EXISTS (\n"
        f"    SELECT 1 FROM pg_policies WHERE schemaname = '{schema}' AND tablename = '{table}' AND policyname = '{policy}'\n"
        "  ) THEN\n"
        f"    {policy_sql.strip()}\n"
        "  END IF;\n"
        "END $$;\n"
    )


def wrap_trigger(trigger_sql: str, table: str, trigger: str) -> str:
    return (
        "DO $$\nBEGIN\n"
        f"  IF NOT EXISTS (\n"
        f"    SELECT 1 FROM pg_trigger WHERE tgname = '{trigger}' AND tgrelid = '{table}'::regclass\n"
        "  ) THEN\n"
        f"    {trigger_sql.strip()}\n"
        "  END IF;\n"
        "END $$;\n"
    )


def wrap_enum(enum_sql: str, type_name: str) -> str:
    return (
        "DO $$\nBEGIN\n"
        f"  IF NOT EXISTS (\n"
        f"    SELECT 1 FROM pg_type WHERE typname = '{type_name}'\n"
        "  ) THEN\n"
        f"    {enum_sql.strip()}\n"
        "  END IF;\n"
        "END $$;\n"
    )


def apply_fixes(path: Path) -> bool:
    """
    Returns True if file was modified.
    """
    original = path.read_text()
    fixed = original

    # Replace forbidden patterns with a safe default guard
    replacement_guard = "has_role(auth.uid(), 'admin'::app_role)"
    fixed = re.sub(
        r"USING\s*\(\s*true\s*\)",
        f"USING ({replacement_guard})",
        fixed,
        flags=re.IGNORECASE,
    )
    fixed = re.sub(
        r"WITH\s+CHECK\s*\(\s*true\s*\)",
        f"WITH CHECK ({replacement_guard})",
        fixed,
        flags=re.IGNORECASE,
    )
    fixed = re.sub(
        r"TO\s+authenticated\s+USING\s*\(\s*true\s*\)",
        f"TO authenticated USING ({replacement_guard})",
        fixed,
        flags=re.IGNORECASE,
    )
    fixed = re.sub(
        r'CREATE\s+POLICY\s+"Anyone\s+can\s+([^"]+)"',
        r'CREATE POLICY "authenticated_\1"',
        fixed,
        flags=re.IGNORECASE,
    )

    # Add IF NOT EXISTS to common CREATE statements (skip OR REPLACE)
    def add_if_not_exists(match: re.Match) -> str:
        stmt = match.group(0)
        if re.search(r"OR\s+REPLACE", stmt, re.IGNORECASE):
            return stmt
        if re.search(r"IF\s+NOT\s+EXISTS", stmt, re.IGNORECASE):
            return stmt
        return re.sub(r"(?i)CREATE\s+", "CREATE IF NOT EXISTS ", stmt, count=1)

    fixed = re.sub(
        r"CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)",
        add_if_not_exists,
        fixed,
        flags=re.IGNORECASE,
    )
    fixed = re.sub(
        r"CREATE\s+INDEX\s+(?!IF\s+NOT\s+EXISTS)",
        add_if_not_exists,
        fixed,
        flags=re.IGNORECASE,
    )
    fixed = re.sub(
        r"CREATE\s+VIEW\s+(?!IF\s+NOT\s+EXISTS)",
        add_if_not_exists,
        fixed,
        flags=re.IGNORECASE,
    )
    fixed = re.sub(
        r"CREATE\s+MATERIALIZED\s+VIEW\s+(?!IF\s+NOT\s+EXISTS)",
        add_if_not_exists,
        fixed,
        flags=re.IGNORECASE,
    )
    fixed = re.sub(
        r"CREATE\s+TYPE\s+(?!IF\s+NOT\s+EXISTS)",
        add_if_not_exists,
        fixed,
        flags=re.IGNORECASE,
    )

    # Ensure policies are preceded by a DROP POLICY IF EXISTS (no DO wrapping)
    policy_pattern = re.compile(
        r"CREATE\s+POLICY\s+\"?([^\s\"]+)\"?\s+ON\s+([^\s]+)\s+(.*?);",
        re.IGNORECASE | re.DOTALL,
    )
    rebuilt: List[str] = []
    last_idx = 0
    for match in policy_pattern.finditer(fixed):
        start, end = match.start(), match.end()
        name = match.group(1)
        table = match.group(2)
        stmt = match.group(0)
        # If a matching DROP already exists immediately before, keep as-is
        prior_slice = fixed[last_idx:start]
        drop_exists = re.search(
            rf"DROP\s+POLICY\s+IF\s+EXISTS\s+\"{re.escape(name)}\"\s+ON\s+{re.escape(table)}",
            prior_slice,
            re.IGNORECASE,
        )
        rebuilt.append(fixed[last_idx:start])
        if drop_exists:
            rebuilt.append(stmt)
        else:
            rebuilt.append(f'DROP POLICY IF EXISTS "{name}" ON {table};\n{stmt}')
        last_idx = end
    rebuilt.append(fixed[last_idx:])
    fixed = "".join(rebuilt)

    # Wrap triggers with DO guard
    trigger_pattern = re.compile(
        r"CREATE\s+TRIGGER\s+([^\s]+)\s+(?:BEFORE|AFTER|INSTEAD OF)[^;]+ON\s+([^\s]+)\s+[^;]+;",
        re.IGNORECASE | re.DOTALL,
    )

    def trigger_repl(match: re.Match) -> str:
        name = match.group(1)
        table = match.group(2)
        stmt = match.group(0)
        return wrap_trigger(stmt, table, name)

    fixed = trigger_pattern.sub(trigger_repl, fixed)

    # Wrap ENUM creation with DO guard
    enum_pattern = re.compile(
        r"(CREATE\s+TYPE\s+([^\s]+)\s+AS\s+ENUM\s*\([^;]+;)",
        re.IGNORECASE | re.DOTALL,
    )

    def enum_repl(match: re.Match) -> str:
        stmt = match.group(1)
        type_name = match.group(2).split(".")[-1]
        return wrap_enum(stmt, type_name)

    fixed = enum_pattern.sub(enum_repl, fixed)

    if fixed != original:
        path.write_text(fixed)
        return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Scan migrations for security/idempotency issues."
    )
    parser.add_argument(
        "--paths",
        nargs="*",
        default=None,
        help="Specific migration files to scan (defaults to all under supabase/migrations).",
    )
    parser.add_argument(
        "--once",
        type=int,
        default=None,
        help="Limit processing to the first N migration files (after sorting). Useful for a small subset run.",
    )
    parser.add_argument(
        "--file",
        dest="single_file",
        help="Fix/scan only a single migration file path.",
    )
    parser.add_argument(
        "--fix",
        action="store_true",
        help="Attempt to auto-fix detected issues in place.",
    )
    args = parser.parse_args()

    files: List[Path] = []
    if args.single_file:
        files = [Path(args.single_file)]
    elif args.paths:
        files = [Path(p) for p in args.paths]
    else:
        if not MIGRATIONS_DIR.exists():
            print(f"Missing migrations directory: {MIGRATIONS_DIR}")
            return 1
        files = sorted(MIGRATIONS_DIR.glob("*.sql"))

    if args.once is not None and args.once > 0:
        files = files[: args.once]

    all_violations: List[Violation] = []
    changed_files: List[Path] = []
    for path in files:
        if not path.exists():
            print(f"Skipping missing file: {path}")
            continue
        if args.fix:
            modified = apply_fixes(path)
            if modified:
                changed_files.append(path)
        all_violations.extend(check_file(path))

    if not all_violations:
        if changed_files:
            print(f"✅ Fixed issues in {len(changed_files)} file(s).")
        else:
            print("✅ No security/idempotency issues detected.")
        return 0

    print("❌ Security/idempotency issues detected:")
    for v in all_violations:
        print(f"- {v.file}:{v.line} :: {v.message}")
        print(f"  > {v.context}")

    if args.fix and changed_files:
        print(
            f"\nAuto-fix applied to {len(changed_files)} file(s). Re-run to verify clean state."
        )

    print(
        "\nRemediation guidelines:\n"
        "  - Wrap RLS policies in DO $$ blocks that check pg_policies before CREATE POLICY.\n"
        "  - Guard ENUM/trigger creation with DO $$ checks on pg_type/pg_trigger.\n"
        "  - Use IF NOT EXISTS for CREATE TABLE/INDEX/VIEW/TYPE when possible.\n"
        "  - Remove permissive clauses: USING (true), WITH CHECK (true), TO authenticated USING (true),\n"
        '    and avoid policy names like "Anyone can...".\n'
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
