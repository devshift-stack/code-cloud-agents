#!/usr/bin/env python3
import sys, re
from pathlib import Path

try:
    import yaml
except ImportError:
    print("PyYAML not installed. Install with: pip install pyyaml", file=sys.stderr)
    sys.exit(2)

def slug_tag(tag: str) -> str:
    tag = tag.strip().lower()
    tag = re.sub(r"[^a-z0-9]+", "_", tag)
    tag = re.sub(r"_+", "_", tag).strip("_")
    return tag or "untagged"

def slug_path(path: str) -> str:
    p = path.strip().lstrip("/")
    p = re.sub(r"{([^}]+)}", r"\1", p)  # {id} -> id
    p = re.sub(r"[^a-zA-Z0-9/]+", "_", p)
    p = p.replace("/", "_").lower()
    p = re.sub(r"_+", "_", p).strip("_")
    return p or "root"

def ensure_operation_ids(spec: dict) -> int:
    changed = 0
    paths = spec.get("paths", {}) or {}
    for path, methods in paths.items():
        if not isinstance(methods, dict):
            continue
        for method, op in methods.items():
            if method.lower() not in {"get","post","put","patch","delete","options","head"}:
                continue
            if not isinstance(op, dict):
                continue
            if op.get("operationId"):
                continue
            tags = op.get("tags") or []
            tag0 = tags[0] if tags else "untagged"
            op_id = f"{slug_tag(tag0)}_{method.lower()}_{slug_path(path)}"
            op["operationId"] = op_id
            changed += 1
    return changed

def main():
    if len(sys.argv) < 2:
        print("Usage: otop-add-operationid.py <openapi.yaml|json>", file=sys.stderr)
        sys.exit(2)
    f = Path(sys.argv[1])
    if not f.exists():
        print(f"File not found: {f}", file=sys.stderr)
        sys.exit(2)

    text = f.read_text(encoding="utf-8")
    if f.suffix.lower() == ".json":
        import json
        spec = json.loads(text)
        changed = ensure_operation_ids(spec)
        if changed:
            f.write_text(json.dumps(spec, indent=2), encoding="utf-8")
        print(f"operationId added: {changed}")
        return

    # yaml
    spec = yaml.safe_load(text)
    changed = ensure_operation_ids(spec)
    if changed:
        f.write_text(yaml.safe_dump(spec, sort_keys=False, allow_unicode=True), encoding="utf-8")
    print(f"operationId added: {changed}")

if __name__ == "__main__":
    main()
