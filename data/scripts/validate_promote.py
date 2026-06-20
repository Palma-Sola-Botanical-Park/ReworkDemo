#!/usr/bin/env python3
"""
validate_promote.py  —  STAGE 2 of the sheet -> JSON pipeline.

Reads data/staging/<tab>.json, runs it through the tab's schema, and decides —
per the gate — what reaches the browser:

  * file-level error (missing required column, etc.)  -> BLOCK the whole tab:
        do NOT overwrite data/published/<tab>.json, so the site keeps serving
        last-known-good. The board goes red.
  * row-level error (bad/missing date, backwards span) -> QUARANTINE the row:
        drop it from published, keep the rest. The board goes amber.
  * warning (bad vocab, orphan series ref, odd URL)    -> publish + log it.

It also diffs new staging against the previous (the .prev snapshot fetch_sheets
left) to produce the dashboard's edit counts, and writes:
    data/published/<tab>.json   the clean array the browser fetches
    data/published/_health.json current state of every feed
    data/published/_runlog.json rolling history (~30 runs)

No third-party deps; stdlib only.
"""

import datetime as dt
import hashlib
import importlib.util
import json
import os
import re

STAGING = "data/staging"
PUBLISHED = "data/published"
SCHEMAS = "data/schemas"

# Tabs this run validates + publishes. PILOT = events only. Others are staged
# for reference (series, for the FK check) but not yet published. Grow this list
# as tabs are templated.
PUBLISH_TABS = ["events", "classes", "volunteer", "news", "newsletters"]
RUNLOG_CAP = 30

ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


# ── small helpers ─────────────────────────────────────────────────────────────

def now_iso():
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def load_json(path, default=None):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def load_schema(tab):
    spec = importlib.util.spec_from_file_location(f"schema_{tab}", os.path.join(SCHEMAS, f"{tab}.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.SCHEMA


def parse_date(v):
    if not v or not ISO_DATE.match(v):
        return None
    try:
        return dt.date.fromisoformat(v)
    except ValueError:
        return None


def identity_key(row, fields):
    return tuple((row.get(f) or "").strip().lower() for f in fields)


# ── the check library (interpreted from the schema) ───────────────────────────
# Each returns None if the cell passes, or a short human reason if it fails.

def check_required(val, **_):
    return None if (val or "").strip() else "missing required value"

def check_iso_date(val, **_):
    return None if parse_date(val) else f"'{val}' is not a YYYY-MM-DD date"

def check_iso_date_or_blank(val, **_):
    if not (val or "").strip():
        return None
    return check_iso_date(val)

def check_ge_field(val, row, arg, **_):
    other = parse_date(row.get(arg, ""))
    this = parse_date(val)
    if not (val or "").strip():       # blank end date -> not a multi-day row
        return None
    if this is None or other is None:  # other rules report the bad date itself
        return None
    return None if this >= other else f"is before {arg} ({val} < {row.get(arg)})"

def check_in_vocab(val, arg, **_):
    return None if (val or "").strip().lower() in [a.lower() for a in arg] else f"'{val}' is not an allowed value"

def check_url_or_blank(val, **_):
    v = (val or "").strip()
    if not v:
        return None
    return None if v.startswith(("http://", "https://")) else f"'{v[:30]}' doesn't look like a URL"

def check_fk(val, arg, refs, **_):
    v = (val or "").strip()
    if not v:
        return None
    ref_tab, ref_field = arg
    return (None if v.lower() in refs.get(ref_tab, {}).get(ref_field, set())
            else "no matching row in the referenced tab")

CHECKS = {
    "required": check_required,
    "iso_date": check_iso_date,
    "iso_date_or_blank": check_iso_date_or_blank,
    "ge_field": check_ge_field,
    "in_vocab": check_in_vocab,
    "url_or_blank": check_url_or_blank,
    "fk": check_fk,
}


# ── diffing (for the dashboard's edit counts) ─────────────────────────────────

def diff_rows(prev_rows, new_rows, identity):
    """Return {added, changed, removed} by identity key."""
    pk = {identity_key(r, identity): r for r in prev_rows}
    nk = {identity_key(r, identity): r for r in new_rows}
    added = sum(1 for k in nk if k not in pk)
    removed = sum(1 for k in pk if k not in nk)
    changed = sum(1 for k in nk if k in pk and nk[k] != pk[k])
    return {"added": added, "changed": changed, "removed": removed}


def edits_total(ch):
    return ch["added"] + ch["changed"] + ch["removed"]


# ── the core: validate + promote one tab ──────────────────────────────────────

def process_tab(tab, refs, prev_health):
    schema = load_schema(tab)
    staging = load_json(os.path.join(STAGING, f"{tab}.json"), {"headers": [], "rows": []})
    headers = staging["headers"]
    raw_rows = staging["rows"]

    # autofix: trim every cell on a working copy (staging stays raw)
    rows = raw_rows
    if schema.get("autofix_trim"):
        rows = [{k: (v or "").strip() for k, v in r.items()} for r in raw_rows]

    pub_path = os.path.join(PUBLISHED, f"{tab}.json")
    prev_entry = next((f for f in prev_health.get("feeds", []) if f["tab"] == tab), {})
    prev_good = prev_entry.get("last_good_at")

    # edit counts: new staging vs the .prev snapshot
    prev_staging = load_json(os.path.join(STAGING, ".prev", f"{tab}.json"))
    prev_rows = prev_staging["rows"] if prev_staging else []
    changes = diff_rows(prev_rows, raw_rows, schema["identity"])
    first_run = prev_staging is None

    messages = []

    # ---- FILE-LEVEL: required headers present? --------------------------------
    missing = [h for h in schema["required_headers"] if h not in headers]
    if missing:
        # BLOCK. Leave published as last-known-good (don't touch pub_path).
        messages.append(f"missing column{'s' if len(missing) > 1 else ''}: "
                        + ", ".join(f"'{m}'" for m in missing))
        prior_count = len(load_json(pub_path, []))
        return {
            "tab": tab, "status": "red", "published": False,
            "rows": prior_count, "changes": changes,
            "last_good_at": prev_good or "unknown",
            "messages": [f"BLOCKED — {messages[0]} — serving last-known-good"],
        }

    # ---- ROW-LEVEL + FIELD-LEVEL ---------------------------------------------
    drop_vals = schema.get("drop_when_display", [])
    if isinstance(drop_vals, str):
        drop_vals = [drop_vals]
    drop_vals = set(drop_vals)

    published_rows = []
    quarantined = []        # (label, reason)
    warned_rows = 0
    warning_samples = []

    for row in rows:
        # visibility filter happens first — an off/blank row never reaches the
        # browser, and we don't bother validating it.
        if (row.get("display", "") or "").strip() in drop_vals:
            continue

        row_errors, row_warnings = [], []
        for rule in schema["rules"]:
            field = rule["field"]
            if field not in headers:
                continue  # column not in the sheet -> rule is dormant, not a fail
            reason = CHECKS[rule["check"]](
                row.get(field, ""), row=row, arg=rule.get("arg"), refs=refs)
            if reason is None:
                continue
            label = rule.get("msg") or f"{field}: {reason}"
            if rule["severity"] == "error" and rule["scope"] == "row":
                row_errors.append(label)
            else:
                row_warnings.append(label)

        row_label = (row.get("title") or row.get("date") or "row").strip()
        if row_errors:
            quarantined.append((row_label, row_errors[0]))
            continue  # dropped from published
        if row_warnings:
            warned_rows += 1
            if len(warning_samples) < 3:
                warning_samples.append(f"{row_label} — {row_warnings[0]}")
        published_rows.append(row)

    # ---- write published (clean array the browser fetches) -------------------
    write_json(pub_path, published_rows)

    # ---- status + messages ---------------------------------------------------
    for label, reason in quarantined:
        messages.append(f"quarantined: {label} ({reason})")
    if warned_rows:
        messages.append(f"{warned_rows} row(s) with warnings"
                        + (f": {warning_samples[0]}" if warning_samples else ""))

    status = "amber" if (quarantined or warned_rows) else "green"
    return {
        "tab": tab, "status": status, "published": True,
        "rows": len(published_rows), "changes": changes,
        "last_good_at": now_iso(),
        "first_run": first_run,
        "messages": messages,
    }


# ── reference data for cross-tab checks (e.g. events.series -> series.name) ────

def build_refs(needed_tabs):
    """{tab: {field: set(lowercased values)}} for cross-tab fk checks."""
    refs = {}
    for tab in needed_tabs:
        staging = load_json(os.path.join(STAGING, f"{tab}.json"))
        if not staging:
            continue
        idx = {}
        for row in staging["rows"]:
            for k, v in row.items():
                idx.setdefault(k, set()).add((v or "").strip().lower())
        refs[tab] = idx
    return refs


# ── run summary for the GitHub Actions run page ($GITHUB_STEP_SUMMARY) ─────────

def render_summary(health):
    dot = {"green": "🟢", "amber": "🟡", "red": "🔴"}
    lines = [f"## Sheet sync — {health['overall'].upper()}",
             f"_run {health['generated_at']}_", "",
             "| Feed | Status | Rows | Edits | Notes |",
             "|---|---|---:|---:|---|"]
    for f in health["feeds"]:
        ch = f["changes"]
        edits = "—" if f.get("first_run") else (edits_total(ch) or "no change")
        note = "; ".join(f["messages"]) or "ok"
        lines.append(f"| {f['tab']} | {dot[f['status']]} {f['status']} "
                     f"| {f['rows']} | {edits} | {note} |")
    return "\n".join(lines) + "\n"


def one_line_summary(health):
    parts = []
    for f in health["feeds"]:
        ch = f["changes"]
        if f["status"] == "red":
            parts.append(f"{f['tab']} BLOCKED")
        elif f.get("first_run"):
            parts.append(f"{f['tab']} initialized ({f['rows']})")
        elif edits_total(ch):
            bits = []
            if ch["added"]:   bits.append(f"+{ch['added']}")
            if ch["changed"]: bits.append(f"~{ch['changed']}")
            if ch["removed"]: bits.append(f"-{ch['removed']}")
            parts.append(f"{f['tab']} {''.join(b for b in bits)}")
    return ", ".join(parts) if parts else "no changes"


# ── main ──────────────────────────────────────────────────────────────────────

def main():
    prev_health = load_json(os.path.join(PUBLISHED, "_health.json"), {"feeds": []})

    # FK checks need other tabs' values (e.g. events.series -> series.name).
    refs = build_refs(["series"])

    feeds = []
    for tab in PUBLISH_TABS:
        feeds.append(process_tab(tab, refs, prev_health))

    overall = ("blocked" if any(f["status"] == "red" for f in feeds)
               else "warn" if any(f["status"] == "amber" for f in feeds)
               else "ok")
    health = {"generated_at": now_iso(), "overall": overall, "feeds": feeds}

    # No-op short-circuit: if nothing meaningful changed since last run — same
    # status + row count + messages per feed AND zero edits AND not a first run —
    # don't rewrite _health/_runlog. Identical files = no git diff = no commit,
    # so a commit always means a real change. (Liveness — "is the sync running?"
    # — comes from the Actions tab's run history, not a committed clock.)
    def sig(feeds_):
        return [(f["tab"], f["status"], f["rows"], tuple(f["messages"])) for f in feeds_]
    reportable = (
        sig(feeds) != sig(prev_health.get("feeds", []))
        or any(edits_total(f["changes"]) for f in feeds)
        or any(f.get("first_run") for f in feeds)
    )

    if reportable:
        write_json(os.path.join(PUBLISHED, "_health.json"), health)
        runlog = load_json(os.path.join(PUBLISHED, "_runlog.json"), {"runs": []})
        runlog["runs"].insert(0, {
            "at": health["generated_at"],
            "overall": overall,
            "summary": one_line_summary(health),
        })
        runlog["runs"] = runlog["runs"][:RUNLOG_CAP]
        write_json(os.path.join(PUBLISHED, "_runlog.json"), runlog)
        summary_md = render_summary(health)
    else:
        summary_md = "## Sheet sync — no changes\n_nothing to publish; last-known-good unchanged._\n"

    # GitHub Actions run-page summary (Surface B)
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as f:
            f.write(summary_md)
    else:
        print(summary_md)

    # exit non-zero on a block so the Action goes red and emails Randy (Surface C)
    return 1 if overall == "blocked" else 0


if __name__ == "__main__":
    raise SystemExit(main())
