#!/usr/bin/env python3
"""Rank drawable dictionary words for the sprite art queue.

Joins dict.sqlite's english_index to the vendored Brysbaert concreteness
norms, gates to concrete nouns/verbs/adjectives with real usage frequency,
resolves each surviving English word to a suggested Cantonese character,
scores by frequency + concreteness, and writes art/sprite-todo.tsv — a
ranked, 50-per-slice checklist Kevin draws through batch by batch.

The suggested_char is a hint, not the sprite key: English -> Cantonese
character is ambiguous (book -> 定 not 書), so every sprite is drawn against
the character a human confirms, not blindly against this column.

Usage:
    python3 scripts/art/rank_corpus.py          # regenerate art/sprite-todo.tsv
    python3 scripts/art/rank_corpus.py --check  # verify only, write nothing
"""

import csv
import math
import os
import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
DICT = ROOT / "Canto" / "Resources" / "dict.sqlite"
CONC = ROOT / "data" / "concreteness.txt"
OUT = ROOT / "art" / "sprite-todo.tsv"

# Share clean()/LEADING_STRIP with the dictionary builder so the two never drift
# (same import pattern as supplement_from_deck.py:24-25). Importing build_dict is
# side-effect-free — it only builds under `if __name__ == "__main__"`.
sys.path.insert(0, str(ROOT / "scripts"))
from build_dict import clean, LEADING_STRIP  # noqa: E402

SLICE = 50
GATE_CONC = 3.5
CONC_MAX = 5.0  # Brysbaert concreteness scale ceiling; self_check asserts the range
POS_OK = {"Noun", "Verb", "Adjective"}
# Already-drawn subjects (art/reference-sheet/), excluded by English label so
# a re-run doesn't re-list finished work.
DONE = {"dolphin", "elephant", "lion", "tiger", "crocodile", "bear",
        "giraffe", "monkey", "coffee", "eat", "eating"}
W_FREQ, W_CONC = 0.65, 0.35

# Resolver A: the suggested_char. Highest-popularity sense with an exact (or
# de-articled) weight-0 match, full tiebreak so the pick is deterministic.
RESOLVER_A_SQL = """
    SELECT s.traditional, s.jyutping, s.gloss, s.popularity
    FROM english_index e JOIN senses s ON s.id = e.sense_id
    WHERE e.token = ? AND e.weight = 0
    ORDER BY s.popularity DESC, s.source ASC, LENGTH(s.gloss) ASC, s.id ASC
    LIMIT 1
"""

# Resolver B: the confidence check. Same candidate rows, but ordered by
# popularity alone (no source/gloss-length/id tiebreak) and re-verified
# against the raw gloss in Python rather than trusting the weight=0 tag.
# When one sense dominates on popularity, A and B agree regardless of the
# missing tiebreak (agreement = "ok"). When several senses tie on
# popularity, dropping the tiebreak lets B land on a different tied sense
# than A's deterministic pick, surfacing the tie as "?" (book/night/drink
# still resolve "ok" and are still wrong - see module docstring).
RESOLVER_B_SQL = """
    SELECT s.traditional, s.jyutping, s.gloss, s.popularity
    FROM english_index e JOIN senses s ON s.id = e.sense_id
    WHERE e.token = ? AND e.weight = 0
    ORDER BY s.popularity DESC
"""


def load_concreteness(path):
    conc = {}
    with open(path, encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        missing = {"Word", "Conc.M", "SUBTLEX", "Dom_Pos"} - set(reader.fieldnames or [])
        if missing:
            sys.exit(f"{path}: missing columns {sorted(missing)} — re-vendor it (tech plan's Input contract)")
        for row in reader:
            try:
                word = row["Word"].strip().lower()
                cm, freq = float(row["Conc.M"]), float(row["SUBTLEX"])
            except (KeyError, ValueError, TypeError, AttributeError):
                continue  # short/blank row: DictReader fills missing fields with None
            if word and math.isfinite(cm) and math.isfinite(freq):  # reject blank words + NaN/Inf so they can't poison the score
                conc[word] = (cm, freq, row["Dom_Pos"])
    return conc


def candidate_tokens(db, conc):
    # Broader net than the resolvers (which need weight=0): a weight-1-only token
    # has no exact-gloss character, so build_rows drops it when resolve_a returns None.
    return [
        t for (t,) in db.execute("SELECT DISTINCT token FROM english_index WHERE weight <= 1")
        if t and re.fullmatch(r"[a-z']+", t) and t in conc
    ]


def resolve_a(db, token):
    row = db.execute(RESOLVER_A_SQL, (token,)).fetchone()
    return (row[0], row[1]) if row else None


def resolve_b(db, token):
    for trad, jyut, gloss, _pop in db.execute(RESOLVER_B_SQL, (token,)):
        for seg in gloss.split("/"):
            c = clean(seg)
            if c == token or LEADING_STRIP.sub("", c) == token:
                return trad, jyut
    return None


def build_rows(db, conc):
    rows = []
    for word in candidate_tokens(db, conc):
        cm, freq, pos = conc[word]
        if cm < GATE_CONC or freq <= 0 or pos not in POS_OK or word in DONE:
            continue
        a = resolve_a(db, word)
        if not a:
            continue
        b = resolve_b(db, word)
        confident = "ok" if b and a == b else "?"
        rows.append({
            "english": word, "conc": cm, "freq": freq,
            "trad": a[0], "jyut": a[1], "confident": confident,
        })
    return rows


def dedup(rows):
    best = {}
    for r in rows:
        key = (r["trad"], r["jyut"])
        if key not in best or r["freq"] > best[key]["freq"]:
            best[key] = r
    return list(best.values())


def score_and_sort(rows):
    log_freqs = [math.log10(r["freq"]) for r in rows]
    lo, hi = min(log_freqs), max(log_freqs)
    clo, chi = min(r["conc"] for r in rows), max(r["conc"] for r in rows)
    for r, lf in zip(rows, log_freqs):
        nf = (lf - lo) / (hi - lo) if hi > lo else 1.0
        nc = (r["conc"] - clo) / (chi - clo) if chi > clo else 1.0
        r["score"] = W_FREQ * nf + W_CONC * nc
    rows.sort(key=lambda r: -r["score"])
    return rows


def carry_done_forward(rows):
    """Preserve tick-off state across re-runs: the `done` column is the only
    human-edited field, keyed by english word since ranks/slices shift."""
    done_by_english = {}
    if OUT.exists():
        with open(OUT, encoding="utf-8") as f:
            reader = csv.DictReader(f, delimiter="\t")
            if reader.fieldnames and "english" in reader.fieldnames and "done" in reader.fieldnames:
                for row in reader:
                    done_by_english[row["english"]] = row["done"]
    for i, r in enumerate(rows, start=1):
        r["rank"] = i
        r["slice"] = math.ceil(i / SLICE)
        r["done"] = done_by_english.get(r["english"], "[ ]")
    return rows


COLUMNS = ["done", "slice", "rank", "english", "suggested_char", "jyutping", "confident", "conc", "freq"]


def write_tsv(rows):
    OUT.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUT.with_suffix(OUT.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        f.write("\t".join(COLUMNS) + "\n")
        for r in rows:
            f.write("\t".join([
                r["done"], str(r["slice"]), str(r["rank"]), r["english"],
                r["trad"], r["jyut"], r["confident"], f"{r['conc']:.1f}", str(int(r["freq"])),
            ]) + "\n")
    os.replace(tmp, OUT)  # atomic swap so a killed write never truncates the done-carry file


def run():
    if not DICT.exists():
        sys.exit(f"dictionary not found: {DICT} (build it first with scripts/build_dict.py)")
    if not CONC.exists():
        sys.exit(f"concreteness data not found: {CONC} (see tech plan's Input contract for the curl)")
    db = sqlite3.connect(f"file:{DICT}?mode=ro", uri=True)  # read-only: dict.sqlite is a bundled, read-only resource
    conc = load_concreteness(CONC)
    rows = dedup(build_rows(db, conc))
    db.close()
    if not rows:
        sys.exit("no rows survived the concreteness gate — check data/concreteness.txt and Canto/Resources/dict.sqlite")
    return carry_done_forward(score_and_sort(rows))


def self_check(rows):
    failures = []

    def check(label, condition, detail=""):
        status = "PASS" if condition else "FAIL"
        print(f"[{status}] {label}" + (f" — {detail}" if detail else ""))
        if not condition:
            failures.append(label)

    check(f"gate survived at least one row ({len(rows)} rows)", len(rows) > 0)
    if not rows:
        return failures

    check("every row has non-empty suggested_char, jyutping, english",
          all(r["trad"] and r["jyut"] and r["english"] for r in rows))

    ranks = [r["rank"] for r in rows]
    check("rank is contiguous 1..N with no gaps or dupes",
          ranks == list(range(1, len(rows) + 1)))

    check("slice matches ceil(rank/50) for every row",
          all(r["slice"] == math.ceil(r["rank"] / SLICE) for r in rows))

    keys = [(r["trad"], r["jyut"]) for r in rows]
    check("keys (suggested_char, jyutping) are unique", len(keys) == len(set(keys)))

    check("confident in {'ok', '?'}", all(r["confident"] in ("ok", "?") for r in rows))
    check(f"conc in [{GATE_CONC}, {CONC_MAX}]", all(GATE_CONC <= r["conc"] <= CONC_MAX for r in rows))
    check("freq > 0 for every row", all(r["freq"] > 0 for r in rows))

    n_slices = max(r["slice"] for r in rows)
    n_ok = sum(1 for r in rows if r["confident"] == "ok")
    print(f"\ntotal rows: {len(rows)}, slices: {n_slices}, "
          f"ok: {n_ok} ({100 * n_ok // len(rows)}%), ?: {len(rows) - n_ok}")
    return failures


def main():
    check_only = "--check" in sys.argv
    rows = run()
    failures = self_check(rows)
    if failures:
        print(f"\n{len(failures)} check(s) FAILED: {failures}")
        return 1
    if check_only:
        print("\nAll checks PASS. (--check: nothing written)")
        return 0
    write_tsv(rows)
    print(f"\nAll checks PASS. wrote {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
