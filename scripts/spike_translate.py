#!/usr/bin/env python3
"""Slice 0 spike: does the Google Translate API match the Translate UI?

The feature bets that the Cloud Translation *API* answers the burned words
(scared -> 驚) as well as the Translate *app* does. The API can run an older
model than the consumer UI, so prove the bet before writing any app code.

Reads scripts/spike_words.txt (english<TAB>expected_traditional), asks the v2
REST endpoint for each word (en -> yue), prints word/expected/got/verdict, and
exits non-zero on any DIFF or HTTP error. A clean PASS is the green light for
Slice 3; a DIFF on a word the UI gets right is the KILL criterion.

Key source: TRANSLATE_API_KEY env var, else Canto/Resources/secrets.json's
"translateApiKey" field. No key = clear message, exit 2 (nothing built yet).

Get a key: see the runbook in the plan, or in short —
  console.cloud.google.com -> new project -> enable billing (card required,
  500k chars/month free) -> enable "Cloud Translation API" -> APIs & Services
  -> Credentials -> Create credentials -> API key. Then:
     export TRANSLATE_API_KEY=AIza...
     python3 scripts/spike_translate.py
"""

import html
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORDS = ROOT / "scripts" / "spike_words.txt"
SECRETS = ROOT / "Canto" / "Resources" / "secrets.json"
V2_URL = "https://translation.googleapis.com/language/translate/v2"
TIMEOUT = 8


def load_key():
    import os
    env = os.environ.get("TRANSLATE_API_KEY", "").strip()
    if env:
        return env
    if SECRETS.exists():
        try:
            key = json.loads(SECRETS.read_text()).get("translateApiKey", "").strip()
            if key:
                return key
        except (json.JSONDecodeError, OSError) as e:
            sys.exit(f"secrets.json unreadable: {e}")
    sys.exit(
        "No API key. Set TRANSLATE_API_KEY, or put "
        '{"translateApiKey": "AIza..."} in Canto/Resources/secrets.json.\n'
        "See this script's header for how to mint a key."
    )


def load_words():
    rows = []
    for raw in WORDS.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("\t")
        english = parts[0].strip()
        expected = parts[1].strip() if len(parts) > 1 else ""
        rows.append((english, expected))
    return rows


def translate(word, key):
    """Return the traditional-Cantonese string, or raise on any failure."""
    body = urllib.parse.urlencode(
        {"q": word, "source": "en", "target": "yue", "format": "text", "key": key}
    ).encode()
    req = urllib.request.Request(V2_URL, data=body, method="POST")
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        payload = json.loads(resp.read())
    return html.unescape(payload["data"]["translations"][0]["translatedText"])


def main():
    key = load_key()
    words = load_words()
    if not words:
        sys.exit("scripts/spike_words.txt has no words. Add some and re-run.")

    print(f"{'WORD':<18} {'EXPECTED':<10} {'GOT':<10} VERDICT")
    print("-" * 52)
    failures = 0
    for english, expected in words:
        try:
            got = translate(english, key)
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors="replace")[:200]
            if e.code == 400 and "invalid" in detail.lower() and "target" in detail.lower():
                sys.exit(
                    f"\nKILL: v2 rejected target=yue ({e.code}). The API key path "
                    "does not serve Cantonese on v2.\nRECORD in spike-report.md: "
                    "Slice 3 needs v3 + a service account, not a v2 API key.\n"
                    f"Server said: {detail}"
                )
            print(f"{english:<18} {expected:<10} {'HTTP ' + str(e.code):<10} ERROR")
            print(f"   server: {detail}")
            failures += 1
            continue
        except (urllib.error.URLError, KeyError, json.JSONDecodeError) as e:
            print(f"{english:<18} {expected:<10} {'--':<10} ERROR ({e})")
            failures += 1
            continue

        if not expected:
            verdict = "got-only"
        elif got == expected:
            verdict = "MATCH"
        else:
            verdict = "DIFF"
            failures += 1
        print(f"{english:<18} {expected:<10} {got:<10} {verdict}")

    print("-" * 52)
    scored = sum(1 for _, e in words if e)
    if failures:
        print(f"\n{failures} problem(s) across {len(words)} words ({scored} scored).")
        print("KILL unless Kevin judges every DIFF harmless. Re-open ADR 0012 if not.")
        return 1
    print(f"\nAll {scored} scored words MATCH ({len(words)} sent). PASS.")
    print("Paste this output into spike-report.md with a one-line PASS verdict.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
