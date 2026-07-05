#!/usr/bin/env python3
"""Slice 7: draft supplement.txt lines from Deck corrections.

A Deck card is a word Kevin taught the app by hand. If build_dict.py's
senses_for() still can't rank that card in its word's top-5, the dictionary
is wrong for a word a human already fixed once — so append a CC-Canto line
to scripts/supplement.txt and let `python3 scripts/build_dict.py` fold it in.
The git diff of supplement.txt is the human review step (same LOUD WARNING
in that file applies: the jyutping here is copied from what Kevin already
verified in the app, never invented).

Usage:
    python3 scripts/supplement_from_deck.py path/to/deck-export.json
    python3 scripts/supplement_from_deck.py --selftest
"""

import json
import os
import sqlite3
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))
from build_dict import LINE_RE, senses_for  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "Canto" / "Resources" / "dict.sqlite"
SUPPLEMENT = ROOT / "scripts" / "supplement.txt"


def parse_supplement(path):
    """Return the set of (traditional, jyutping, english-gloss) already present."""
    seen = set()
    if not Path(path).exists():
        return seen
    for raw in Path(path).read_text(encoding="utf-8").splitlines():
        if not raw or raw.startswith("#"):
            continue
        m = LINE_RE.match(raw)
        if not m:
            continue
        trad, _simp, _pinyin, jyutping, gloss, _comment = m.groups()
        for gl in gloss.split("/"):
            if gl:
                seen.add((trad, jyutping, gl))
    return seen


def supplement_line(trad, jyutping, english):
    return f"{trad} {trad} [] {{{jyutping}}} /{english}/\n"


def safe_fields(card):
    """Return (trad, jyutping, english) stripped, or None if any is empty or
    holds a character that would stop the emitted line round-tripping through
    LINE_RE. A line that can't re-parse breaks idempotency (re-appended every
    run) and mis-teaches build_dict.py - so an unsafe card is skipped, not
    written. Whitespace inside jyutping/english is fine; the traditional column
    is LINE_RE's `\\S+`, so it can't hold any."""
    if not isinstance(card, dict):
        return None
    trad, jyutping, english = card.get("traditional"), card.get("jyutping"), card.get("english")
    # Must be real strings: a JSON null/number would coerce to "None"/"0" and
    # write a fabricated-looking jyutping, exactly what the LOUD WARNING forbids.
    if not all(isinstance(v, str) for v in (trad, jyutping, english)):
        return None
    trad, jyutping, english = trad.strip(), jyutping.strip(), english.strip()
    if not (trad and jyutping and english):
        return None
    # A leading # would be read back as a comment, so the line never lands in
    # `seen` and gets re-appended every run.
    if trad.startswith("#") or any(ch in trad for ch in " \t\n\r/{}[]"):
        return None
    if any(ch in jyutping for ch in "\t\n\r/{}[]"):
        return None
    if any(ch in english for ch in "\t\n\r/"):
        return None
    return trad, jyutping, english


def append_from_deck(db, deck_path, supplement_path):
    """Run the append logic; return a summary dict. Mutates supplement_path."""
    try:
        payload = json.loads(Path(deck_path).read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as err:
        sys.exit(f"couldn't read deck export {deck_path}: {err}")
    if not isinstance(payload, dict) or not isinstance(payload.get("cards"), list):
        sys.exit(f"deck export {deck_path} has no 'cards' list")
    cards = payload["cards"]
    seen = parse_supplement(supplement_path)

    checked = appended = already_ranked = already_supplemented = unsafe = 0
    lines_to_add = []
    for card in cards:
        checked += 1
        fields = safe_fields(card)
        if fields is None:
            unsafe += 1
            continue
        trad, jyutping, english = fields
        rows, _ = senses_for(db, english)
        ranked_pairs = {(r[0], r[1]) for r in rows}
        if (trad, jyutping) in ranked_pairs:
            already_ranked += 1
            continue
        key = (trad, jyutping, english)
        if key in seen:
            already_supplemented += 1
            continue
        lines_to_add.append(supplement_line(trad, jyutping, english))
        seen.add(key)
        appended += 1

    if lines_to_add:
        # Don't merge onto the last hand-curated line if it lacks a newline.
        existing = Path(supplement_path).read_text(encoding="utf-8") if Path(supplement_path).exists() else ""
        with open(supplement_path, "a", encoding="utf-8") as f:
            if existing and not existing.endswith("\n"):
                f.write("\n")
            f.writelines(lines_to_add)

    return {
        "checked": checked,
        "appended": appended,
        "already_ranked": already_ranked,
        "already_supplemented": already_supplemented,
        "unsafe": unsafe,
    }


def self_check():
    failures = []

    def check(label, condition):
        status = "PASS" if condition else "FAIL"
        print(f"[{status}] {label}")
        if not condition:
            failures.append(label)

    if not DB_PATH.exists():
        sys.exit(f"real dict not found: {DB_PATH} (run scripts/build_dict.py first)")
    db = sqlite3.connect(str(DB_PATH))

    # Confirm "eat" -> 食/sik6 is actually in the top-5 before using it as the
    # already-ranked fixture.
    rows, _ = senses_for(db, "eat")
    ranked_pairs = {(r[0], r[1]) for r in rows}
    check("fixture: 食/sik6 is in 'eat''s top-5 (precondition)", ("食", "sik6") in ranked_pairs)

    with tempfile.TemporaryDirectory() as tmp:
        supplement_path = Path(tmp) / "supplement.txt"
        supplement_path.write_text("# temp supplement for selftest\n", encoding="utf-8")
        deck_path = Path(tmp) / "deck.json"

        # Case 1: an already-ranked card appends nothing.
        deck_path.write_text(json.dumps({
            "exportedOn": "2026-07-05", "balance": 0,
            "cards": [{"english": "eat", "traditional": "食", "jyutping": "sik6",
                       "benched": False, "dadBox": 1, "kidBox": 1}],
        }), encoding="utf-8")
        summary = append_from_deck(db, deck_path, supplement_path)
        check("already-ranked card appends 0 lines", summary["appended"] == 0)
        check("already-ranked card counted", summary["already_ranked"] == 1)

        # Case 2: an unranked card appends exactly one line, and a second run
        # of the same export appends nothing (idempotent).
        unranked_card = {"english": "zzz-not-a-real-word-xyz", "traditional": "測試詞",
                          "jyutping": "cak1 si3 ci4", "benched": True, "dadBox": 0, "kidBox": 0}
        deck_path.write_text(json.dumps({
            "exportedOn": "2026-07-05", "balance": 0, "cards": [unranked_card],
        }), encoding="utf-8")
        summary1 = append_from_deck(db, deck_path, supplement_path)
        check("unranked card appends exactly 1 line", summary1["appended"] == 1)

        summary2 = append_from_deck(db, deck_path, supplement_path)
        check("re-running same export appends 0 lines (idempotent)", summary2["appended"] == 0)
        check("re-run counts as already-supplemented", summary2["already_supplemented"] == 1)

        # Case 3: a field with a format-breaking char is skipped, never written
        # (a '/' in the English gloss would corrupt LINE_RE round-tripping).
        deck_path.write_text(json.dumps({
            "exportedOn": "2026-07-05", "balance": 0,
            "cards": [{"english": "on/off", "traditional": "開關", "jyutping": "hoi1 gwaan1",
                       "benched": False, "dadBox": 0, "kidBox": 0}],
        }), encoding="utf-8")
        summary3 = append_from_deck(db, deck_path, supplement_path)
        check("unsafe english (contains '/') is skipped, not appended",
              summary3["appended"] == 0 and summary3["unsafe"] == 1)

        # Case 4: a null jyutping must be rejected, never coerced to "None" and
        # written as a fabricated reading (upholds the LOUD WARNING).
        deck_path.write_text(json.dumps({
            "exportedOn": "2026-07-05", "balance": 0,
            "cards": [{"english": "whatever", "traditional": "隨便", "jyutping": None,
                       "benched": False, "dadBox": 0, "kidBox": 0}],
        }), encoding="utf-8")
        summary4 = append_from_deck(db, deck_path, supplement_path)
        check("null jyutping is skipped, not written as \"None\"",
              summary4["appended"] == 0 and summary4["unsafe"] == 1)

    db.close()

    if failures:
        print(f"\n{len(failures)} check(s) FAILED: {failures}")
        return 1
    print("\nAll checks PASS.")
    return 0


def main():
    if "--selftest" in sys.argv:
        return self_check()

    if len(sys.argv) < 2:
        sys.exit("usage: python3 scripts/supplement_from_deck.py path/to/deck-export.json")

    deck_path = sys.argv[1]
    if not DB_PATH.exists():
        sys.exit(f"dictionary not found: {DB_PATH} (build it first with scripts/build_dict.py)")

    db = sqlite3.connect(str(DB_PATH))
    summary = append_from_deck(db, deck_path, SUPPLEMENT)
    db.close()

    print(
        f"{summary['checked']} cards checked, {summary['appended']} lines appended, "
        f"{summary['already_ranked']} skipped (already ranked), "
        f"{summary['already_supplemented']} skipped (already in supplement), "
        f"{summary['unsafe']} skipped (unsafe field)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
