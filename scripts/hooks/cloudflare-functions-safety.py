#!/usr/bin/env python3
"""PreToolUse guard for NEXURADATA Cloudflare Function safety rules."""

import json
import re
import sys


EDIT_TOOL_NAMES = {
    "apply_patch",
    "create_file",
    "edit_file",
    "edit_notebook_file",
    "multi_replace_string_in_file",
    "replace_string_in_file",
}

COMMONJS_PATTERN = re.compile(r"\b(require\s*\(|module\.exports\b|exports\.)")
SECRET_ENV_LOG_PATTERN = re.compile(
    r"\bconsole\.(?:debug|error|info|log|warn)\s*\([^;\n]*(?:context\.env|env)\s*[.\[]\s*['\"]?"
    r"[A-Z0-9_]*(?:_KEY|_SECRET|_TOKEN|_DSN|_PASSWORD|API_KEY|AUTH_TOKEN|WEBHOOK_SECRET|DATABASE_URL)",
    re.IGNORECASE,
)
ENV_DUMP_PATTERN = re.compile(
    r"\bconsole\.(?:debug|error|info|log|warn)\s*\([^;\n]*(?:JSON\.stringify\s*\(\s*)?"
    r"(?:context\.env|env)\s*(?:[,)]|$)",
    re.IGNORECASE,
)
OPS_AUTH_CALL_PATTERN = re.compile(r"\bauthorizeOrReject\s*\(")
OPS_BYPASS_PATTERN = re.compile(
    r"\b(?:auth|access|ops)\b.{0,50}\b(?:bypass|disable|fake|mock|noauth|public|skip|unauthenticated)\b"
    r"|\b(?:bypass|disable|fake|mock|noauth|public|skip|unauthenticated)\b.{0,50}\b(?:auth|access|ops)\b",
    re.IGNORECASE,
)


def load_hook_input():
    try:
        return json.load(sys.stdin)
    except Exception:
        return {}


def base_tool_name(tool_name):
    return str(tool_name or "").split(".")[-1]


def normalize_path(raw_path):
    path = str(raw_path or "").replace("\\", "/").strip()
    if not path:
        return ""
    marker = "/nexuradata-site/"
    if marker in path:
        path = path.split(marker, 1)[1]
    path = re.sub(r"^[ab]/", "", path)
    path = re.sub(r"^\./", "", path)
    return path


def is_under(path, prefix):
    normalized_path = normalize_path(path)
    normalized_prefix = normalize_path(prefix).rstrip("/")
    return normalized_path == normalized_prefix or normalized_path.startswith(f"{normalized_prefix}/")


def collect_patch_changes(patch_text):
    changes = {}
    current_path = ""

    for line in str(patch_text or "").splitlines():
        file_match = re.match(r"\*\*\* (?:Add|Update|Delete) File: (.+?)(?:\s+->.*)?$", line)
        if file_match:
            current_path = normalize_path(file_match.group(1))
            changes.setdefault(current_path, {"added": [], "removed": []})
            continue

        if not current_path:
            continue

        if line.startswith("+") and not line.startswith("+++"):
            changes[current_path]["added"].append(line[1:])
        elif line.startswith("-") and not line.startswith("---"):
            changes[current_path]["removed"].append(line[1:])

    return changes


def append_change(changes, raw_path, added_text="", removed_text=""):
    path = normalize_path(raw_path)
    if not path:
        return
    entry = changes.setdefault(path, {"added": [], "removed": []})
    if added_text:
        entry["added"].extend(str(added_text).splitlines())
    if removed_text:
        entry["removed"].extend(str(removed_text).splitlines())


def collect_direct_edit_changes(tool_input):
    changes = {}
    paths = [tool_input.get("filePath"), tool_input.get("file_path"), tool_input.get("path")]
    added_fields = ["content", "new_str", "newString", "newCode"]
    removed_fields = ["old_str", "oldString"]

    for raw_path in paths:
        for field_name in added_fields:
            value = tool_input.get(field_name)
            if isinstance(value, list):
                value = "\n".join(str(item) for item in value)
            append_change(changes, raw_path, added_text=value or "")
        for field_name in removed_fields:
            append_change(changes, raw_path, removed_text=tool_input.get(field_name) or "")

    for replacement in tool_input.get("replacements", []) or []:
        if not isinstance(replacement, dict):
            continue
        raw_path = replacement.get("filePath") or replacement.get("file_path") or replacement.get("path")
        append_change(
            changes,
            raw_path,
            added_text=replacement.get("new_str") or replacement.get("newString") or "",
            removed_text=replacement.get("old_str") or replacement.get("oldString") or "",
        )

    return changes


def collect_changes(tool_name, tool_input):
    if base_tool_name(tool_name) == "apply_patch":
        return collect_patch_changes(tool_input.get("input", ""))
    return collect_direct_edit_changes(tool_input)


def emit_permission(decision, reason, exit_code=0):
    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": decision,
                    "permissionDecisionReason": reason,
                }
            },
            separators=(",", ":"),
        )
    )
    sys.exit(exit_code)


def inspect_changes(changes):
    for path, line_groups in changes.items():
        added_text = "\n".join(line_groups["added"])
        removed_text = "\n".join(line_groups["removed"])

        if is_under(path, "functions") and COMMONJS_PATTERN.search(added_text):
            emit_permission(
                "deny",
                f"BLOCKED: {path} is a Cloudflare Pages Function file. Use ESM imports/exports, not CommonJS.",
                2,
            )

        if is_under(path, "functions") and (SECRET_ENV_LOG_PATTERN.search(added_text) or ENV_DUMP_PATTERN.search(added_text)):
            emit_permission(
                "deny",
                f"BLOCKED: {path} would log Function env bindings. Do not print secrets or env objects.",
                2,
            )

        touches_ops_surface = (
            is_under(path, "functions/api/ops")
            or is_under(path, "operations")
            or path in {"_headers", "_redirects", "wrangler.jsonc"}
        )
        if touches_ops_surface and OPS_BYPASS_PATTERN.search(added_text):
            emit_permission(
                "ask",
                f"OPS AUTH CHECK: {path} appears to change access/auth behavior. Confirm this does not bypass Cloudflare Access or ops authorization.",
            )

        if is_under(path, "functions/api/ops") and OPS_AUTH_CALL_PATTERN.search(removed_text) and not OPS_AUTH_CALL_PATTERN.search(added_text):
            emit_permission(
                "deny",
                f"BLOCKED: {path} removes an ops authorization guard without replacing it in the same edit.",
                2,
            )


def main():
    hook_input = load_hook_input()
    tool_name = hook_input.get("tool_name", "")
    if base_tool_name(tool_name) not in EDIT_TOOL_NAMES:
        return

    tool_input = hook_input.get("tool_input", {})
    if not isinstance(tool_input, dict):
        return

    inspect_changes(collect_changes(tool_name, tool_input))


if __name__ == "__main__":
    main()
