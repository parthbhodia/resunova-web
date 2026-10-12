"""Append API, scoring, and UI-crash rows to the ops log.

The log is public. Rows carry a kind, a state, a time, and a short detail.
Callers strip query strings before they get here.
"""
from __future__ import annotations

import json
import os
import sys
from typing import Any

MAX_EVENTS = 200


def _last(events: list[dict], kind: str) -> dict | None:
    for event in events:
        if event.get("kind") == kind:
            return event
    return None


def _crash_detail(crash: dict) -> str:
    path = (crash.get("path") or "/").split("?", 1)[0].strip() or "/"
    line = (crash.get("detail") or "").splitlines()
    text = (line[0] if line else "").strip()[:160]
    return f"{path} {text}".strip()[:200]


def _record_up_down(events: list[dict], added: list[dict], now: str, kind: str, up: bool, detail: str) -> None:
    state = "up" if up else "down"
    previous = _last(events, kind)
    if previous is None or previous.get("state") != state:
        added.append({
            "at": now,
            "kind": kind,
            "state": state,
            "detail": "" if state == "up" else (detail or "")[:80],
        })


def apply_ops_checks(history: dict, incoming: dict) -> dict:
    """Return a new history. `changed` is false when nothing new happened."""
    events = list(history.get("events") or [])
    added: list[dict] = []
    now = incoming["now"]

    _record_up_down(events, added, now, "api", bool(incoming.get("api_up")), incoming.get("api_detail") or "")
    for kind in ("tailor", "interview"):
        if f"{kind}_up" not in incoming:
            continue
        _record_up_down(
            events, added, now, kind,
            bool(incoming.get(f"{kind}_up")),
            incoming.get(f"{kind}_detail") or "",
        )

    scoring = incoming.get("scoring") or "unknown"
    if scoring in ("ok", "paused"):
        previous = _last(events, "scoring")
        detail = (incoming.get("scoring_detail") or "") if scoring == "paused" else ""
        changed = (
            previous is None
            or previous.get("state") != scoring
            or (scoring == "paused" and previous.get("detail") != detail)
        )
        if changed:
            added.append({
                "at": now,
                "kind": "scoring",
                "state": scoring,
                "detail": detail[:40],
            })

    for crash in incoming.get("crashes") or []:
        at = crash.get("at") or ""
        if not at:
            continue
        detail = _crash_detail(crash)
        if any(event.get("kind") == "ui" and event.get("at") == at and event.get("detail") == detail for event in events):
            continue
        if any(event.get("kind") == "ui" and event.get("at") == at and event.get("detail") == detail for event in added):
            continue
        added.append({"at": at, "kind": "ui", "state": "crash", "detail": detail})

    if not added:
        return {"updated": history.get("updated"), "events": events, "changed": False}

    merged = sorted(added + events, key=lambda event: event.get("at") or "", reverse=True)
    return {"updated": now, "events": merged[:MAX_EVENTS], "changed": True}


def main() -> int:
    path = os.environ.get("HISTORY_PATH")
    if not path:
        print("HISTORY_PATH is not set", file=sys.stderr)
        return 1
    try:
        with open(path, encoding="utf-8") as handle:
            history: dict[str, Any] = json.load(handle)
    except FileNotFoundError:
        history = {"updated": None, "events": []}

    crashes: list[dict] = []
    raw_crashes = os.environ.get("CRASHES_JSON") or ""
    if raw_crashes:
        try:
            parsed = json.loads(raw_crashes)
            crashes = parsed.get("crashes") or []
        except json.JSONDecodeError:
            crashes = []

    incoming = {
        "now": os.environ.get("NOW") or "",
        "api_up": os.environ.get("API_UP") == "true",
        "api_detail": os.environ.get("API_DETAIL") or "",
        "scoring": os.environ.get("SCORING_STATE") or "unknown",
        "scoring_detail": os.environ.get("SCORING_DETAIL") or "",
        "crashes": crashes,
    }
    for kind, flag, detail in (
        ("tailor", "TAILOR_UP", "TAILOR_DETAIL"),
        ("interview", "INTERVIEW_UP", "INTERVIEW_DETAIL"),
    ):
        if os.environ.get(flag):
            incoming[f"{kind}_up"] = os.environ.get(flag) == "true"
            incoming[f"{kind}_detail"] = os.environ.get(detail) or ""
    nxt = apply_ops_checks(history, incoming)
    if not nxt["changed"]:
        print("ops log unchanged")
        return 0
    payload = {"updated": nxt["updated"], "events": nxt["events"]}
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")
    print(f"ops log wrote {len(nxt['events'])} events")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
