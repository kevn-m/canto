#!/usr/bin/env python3
"""Slice 1: build the on-disk Canto dictionary from cccanto-webdist.txt.

Grows scripts/spike.py's in-memory build into a real SQLite file at
Canto/Resources/dict.sqlite, merges scripts/supplement.txt (curated,
human-verified additions), then runs quality assertions against the
built db. The db is built to a temp file and only swapped into place
once every assertion passes, so a failed build never replaces the last
good dictionary.
"""

import csv
import json
import os
import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "cccanto-webdist.txt"
SUPPLEMENT = ROOT / "scripts" / "supplement.txt"
CEDICT = ROOT / "data" / "cedict_ts.u8"
READINGS = ROOT / "data" / "cccedict-canto-readings.txt"
WORDSHK = ROOT / "data" / "englishindex.csv"
DB_PATH = ROOT / "Canto" / "Resources" / "dict.sqlite"
# Built here, then os.replace'd into DB_PATH only after assert_quality passes.
# dict.tmp.sqlite is gitignored so a transient build file never gets committed.
BUILD_PATH = DB_PATH.parent / "dict.tmp.sqlite"

MAX_DB_SIZE_MB = 80  # bumped from 50 for the CEDICT join (Slice 1): coverage over size, never filter entries
MIN_MAIN_ENTRIES = 30000  # last good build ~34.3k; a floor catches a truncated/drifted source
MAX_SKIP_RATIO = 0.01     # a spike in unparsed lines is the earliest sign of format drift

LINE_RE = re.compile(
    r"^(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+\{([^}]*)\}\s+/(.+)/\s*(?:#\s*(.*))?$"
)
CEDICT_RE = re.compile(r"^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+/(.+)/\s*$")
READINGS_RE = re.compile(r"^(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+\{([^}]*)\}\s*$")

MIN_CEDICT_PARSED = 100000
MIN_READINGS_PARSED = 100000  # observed 105,862; a truncated readings file must fail loud
MIN_CEDICT_JOINED = 80000  # parse and rate floors can both scrape by while joined output still shrinks; pin the output too
MIN_JOIN_RATE = 0.75
MIN_WORDSHK_SENSES = 15000  # observed 42,391; a generous floor still catches a gutted export

# senses.source: rank tiebreak after match weight, most-Cantonese first (ADR 0003).
SOURCE_CCCANTO = 0
SOURCE_WORDSHK = 1
SOURCE_ADAPTED_CEDICT = 2  # "adapted from cc-cedict" lines inside cccanto-webdist.txt
SOURCE_CEDICT = 3

STOPWORDS = {
    "the", "a", "an", "to", "of", "in", "on", "for", "with", "and", "or",
    "at", "by", "be", "is", "are", "one's", "sth", "sb", "something",
    "somebody", "someone", "etc", "as", "up", "out", "off",
}

LEADING_STRIP = re.compile(r"^(to|a|an|the)\s+")
PAREN = re.compile(r"\([^)]*\)")

_RANK_SQL = """
    SELECT s.traditional, s.jyutping, s.gloss, s.source, MIN(e.weight) AS w
    FROM english_index e JOIN senses s ON s.id = e.sense_id
    WHERE e.token = ?
    GROUP BY s.id
    ORDER BY w ASC, s.source ASC, s.popularity DESC, LENGTH(s.gloss) ASC
"""


def clean(text):
    text = re.sub(r"\bM:.*$", " ", text)  # CEDICT measure-word suffix: "dog M: 只zhī [只]"
    return re.sub(r"\s+", " ", PAREN.sub(" ", text.lower())).strip(" .,;:!?")


def index_rows(gloss, sid):
    rows = []
    for sub in gloss.split("/"):
        sub_clean = clean(sub)
        if not sub_clean:
            continue
        bare = LEADING_STRIP.sub("", sub_clean)
        rows.append((sub_clean, sid, 0))
        if bare != sub_clean:
            rows.append((bare, sid, 0))
        words = [w for w in re.split(r"[^a-z']+", bare) if w]
        if words and words[0] not in STOPWORDS:
            rows.append((words[0], sid, 1))
        for w in words[1:]:
            if w not in STOPWORDS and len(w) > 1:
                rows.append((w, sid, 2))
    return rows


def parse_file(path, source_for_comment):
    parsed = skipped = 0
    entries = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        if not raw or raw.startswith("#"):
            continue
        m = LINE_RE.match(raw)
        if not m:
            skipped += 1
            continue
        trad, simp, pinyin, jyutping, gloss, comment = m.groups()
        source = source_for_comment(comment)
        entries.append((trad, simp, jyutping, pinyin, gloss, source))
        parsed += 1
    return entries, parsed, skipped


def parse_cedict(cedict_path, readings_path):
    """CEDICT has glosses but no jyutping; the readings file has jyutping but
    no glosses. Join on (traditional, despaced pinyin) - the readings file
    lists both spaced and unspaced pinyin variants for the same entry."""
    readings = {}
    r_parsed = r_skipped = collisions = 0
    for raw in readings_path.read_text(encoding="utf-8").splitlines():
        if not raw or raw.startswith("#"):
            continue
        m = READINGS_RE.match(raw)
        if not m:
            r_skipped += 1
            continue
        r_parsed += 1
        trad, _simp, pinyin, jyutping = m.groups()
        key = (trad, pinyin.lower().replace(" ", ""))
        if readings.setdefault(key, jyutping) != jyutping:
            collisions += 1

    entries, parsed, skipped, unjoined = [], 0, 0, 0
    for raw in cedict_path.read_text(encoding="utf-8").splitlines():
        if not raw or raw.startswith("#"):
            continue
        m = CEDICT_RE.match(raw)
        if not m:
            skipped += 1
            continue
        parsed += 1
        trad, simp, pinyin, gloss = m.groups()
        jyutping = readings.get((trad, pinyin.lower().replace(" ", "")))
        if not jyutping:  # unmatched key, or an empty {} reading — never join it
            unjoined += 1
            continue
        entries.append((trad, simp, jyutping, pinyin, gloss, SOURCE_CEDICT))
    return entries, {"parsed": parsed, "skipped": skipped, "unjoined": unjoined,
                     "readings_parsed": r_parsed, "readings_skipped": r_skipped,
                     "collisions": collisions}


def parse_wordshk(path):
    """words.hk english index: token, then JSON cells ['word:jyutping', score].
    Cells repeat within a row (usually as two identical halves) - dedup them.
    Stemmed tokens ('!abil') are skipped: the query side has no stemmer.
    A second colon-joined variant reading, if present, is dropped.
    Each word becomes one sense whose gloss is its tokens, best score first."""
    words = {}
    cells = bad_cells = parts = bad_parts = 0
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader, None)  # Source,https://... header
        for row in reader:
            if not row:
                continue
            token = row[0]
            if token.startswith("!"):
                continue
            for cell in dict.fromkeys(row[1:]):
                cells += 1
                try:
                    text, score = json.loads(cell)
                    score = int(score)
                except (ValueError, TypeError):
                    bad_cells += 1
                    continue
                for part in text.split(","):
                    parts += 1
                    bits = part.split(":")
                    if len(bits) < 2 or not bits[0] or not bits[1]:
                        bad_parts += 1
                        continue
                    words.setdefault((bits[0], bits[1]), []).append((score, token))
    entries = []
    for (word, jyutping), scored in sorted(words.items()):
        scored.sort(key=lambda t: (-t[0], t[1]))
        gloss = "/".join(list(dict.fromkeys(tok for _s, tok in scored))[:6])
        entries.append((word, None, jyutping, None, gloss, SOURCE_WORDSHK))
    return entries, {"cells": cells, "bad_cells": bad_cells,
                     "parts": parts, "bad_parts": bad_parts}


def insert_all(db, entries):
    for trad, simp, jyutping, pinyin, gloss, source in entries:
        cur = db.execute(
            "INSERT INTO senses (traditional, simplified, jyutping, pinyin, gloss, source)"
            " VALUES (?,?,?,?,?,?)",
            (trad, simp, jyutping, pinyin, gloss, source))
        db.executemany(
            "INSERT INTO english_index VALUES (?,?,?)", index_rows(gloss, cur.lastrowid))


def build_db():
    if not DATA.exists():
        sys.exit(
            f"source data not found: {DATA}\n"
            f"Download cccanto-webdist.txt from cantonese.org/download.html into {DATA.parent}/")
    if not SUPPLEMENT.exists():
        sys.exit(f"supplement file not found: {SUPPLEMENT}")
    if not CEDICT.exists():
        sys.exit(
            f"source data not found: {CEDICT}\n"
            "Download with: curl -sL https://www.mdbg.net/chinese/export/cedict/"
            f"cedict_1_0_ts_utf-8_mdbg.txt.gz | gunzip > {CEDICT}")
    if not READINGS.exists():
        sys.exit(f"source data not found: {READINGS}")
    if not WORDSHK.exists():
        sys.exit(
            f"source data not found: {WORDSHK}\n"
            "Download with: curl -sfL https://words.hk/faiman/analysis/englishindex.csv "
            f"-o {WORDSHK}")
    if BUILD_PATH.exists():
        BUILD_PATH.unlink()
    BUILD_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(str(BUILD_PATH))
    db.executescript("""
        CREATE TABLE senses (
            id INTEGER PRIMARY KEY, traditional TEXT NOT NULL, simplified TEXT,
            jyutping TEXT NOT NULL, pinyin TEXT, gloss TEXT NOT NULL,
            source INTEGER NOT NULL, popularity INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE english_index (
            token TEXT, sense_id INTEGER, weight INTEGER);
    """)

    main_entries, parsed, skipped = parse_file(
        DATA, lambda comment: SOURCE_ADAPTED_CEDICT if comment and "cc-cedict" in comment
        else SOURCE_CCCANTO)
    supplement_entries, supp_parsed, supp_skipped = parse_file(
        SUPPLEMENT, lambda _c: SOURCE_CCCANTO)
    cedict_entries, cedict_stats = parse_cedict(CEDICT, READINGS)
    wordshk_entries, wordshk_stats = parse_wordshk(WORDSHK)

    insert_all(db, main_entries)
    insert_all(db, supplement_entries)
    insert_all(db, cedict_entries)
    insert_all(db, wordshk_entries)
    db.execute("CREATE INDEX idx_english_token ON english_index(token)")

    # Popularity tiebreak: literary junk chars (啜, 觱) live in few compounds,
    # everyday chars (食, 狗, 飲) in many. Multi-char entries get a mid constant.
    char_freq = {}
    for (trad,) in db.execute("SELECT traditional FROM senses"):
        for ch in set(trad):
            char_freq[ch] = char_freq.get(ch, 0) + 1
    db.executemany(
        "UPDATE senses SET popularity = ? WHERE id = ?",
        [(char_freq[trad] if len(trad) == 1 else 30, sid)
         for sid, trad in db.execute("SELECT id, traditional FROM senses")])
    db.commit()

    total_senses = db.execute("SELECT COUNT(*) FROM senses").fetchone()[0]
    total_index = db.execute("SELECT COUNT(*) FROM english_index").fetchone()[0]
    cedict_joined = len(cedict_entries)
    join_rate = cedict_joined / cedict_stats["parsed"] if cedict_stats["parsed"] else 0
    print(f"main entries parsed: {parsed} ({skipped} lines skipped)")
    print(f"supplement entries merged: {supp_parsed} ({supp_skipped} lines skipped)")
    print(f"readings parsed: {cedict_stats['readings_parsed']} "
          f"({cedict_stats['readings_skipped']} lines skipped, "
          f"{cedict_stats['collisions']} key collisions)")
    print(f"cedict parsed: {cedict_stats['parsed']} ({cedict_stats['skipped']} lines skipped), "
          f"joined: {cedict_joined} ({join_rate:.0%}), unjoined: {cedict_stats['unjoined']}")
    print(f"words.hk senses: {len(wordshk_entries)} "
          f"({wordshk_stats['bad_cells']} of {wordshk_stats['cells']} cells unparsable, "
          f"{wordshk_stats['bad_parts']} of {wordshk_stats['parts']} parts malformed)")
    print(f"total senses: {total_senses}")
    print(f"total index rows: {total_index}\n")
    return db, {"parsed": parsed, "skipped": skipped, "supp_skipped": supp_skipped,
                "supp_entries": supplement_entries,
                "cedict_parsed": cedict_stats["parsed"],
                "cedict_skipped": cedict_stats["skipped"],
                "cedict_joined": cedict_joined,
                "readings_parsed": cedict_stats["readings_parsed"],
                "readings_collisions": cedict_stats["collisions"],
                "wordshk_senses": len(wordshk_entries),
                "wordshk_cells": wordshk_stats["cells"],
                "wordshk_bad_cells": wordshk_stats["bad_cells"],
                "wordshk_parts": wordshk_stats["parts"],
                "wordshk_bad_parts": wordshk_stats["bad_parts"]}


def senses_for(db, query):
    def top5(token):
        seen, out = set(), []
        for r in db.execute(_RANK_SQL + " LIMIT 40", (token,)):
            key = (r[0], r[1])
            if key in seen:
                continue
            seen.add(key)
            out.append(r)
            if len(out) == 5:
                break
        return out

    q = clean(query)
    rows = top5(q)
    if not rows and " " in q:
        seen = {}
        for word in q.split():
            if word in STOPWORDS:
                continue
            for r in top5(word)[:2]:
                seen.setdefault((r[0], r[1]), r)
        return list(seen.values())[:5], True
    return rows, False


def ranked_all(db, query):
    return list(db.execute(_RANK_SQL, (clean(query),)))


def assert_quality(db, db_file, counts):
    failures = []

    def check(label, condition, detail=""):
        status = "PASS" if condition else "FAIL"
        print(f"[{status}] {label}" + (f" — {detail}" if detail else ""))
        if not condition:
            failures.append(label)

    # 0. Parse integrity: a truncated or format-drifted source must fail loud, not
    # silently ship a gutted dictionary that still happens to answer the canaries.
    parsed, skipped = counts["parsed"], counts["skipped"]
    check(f"main data above floor ({parsed} >= {MIN_MAIN_ENTRIES})",
          parsed >= MIN_MAIN_ENTRIES)
    skip_ratio = skipped / (parsed + skipped) if parsed + skipped else 0
    check(f"main data skip ratio under {MAX_SKIP_RATIO:.0%} ({skipped} skipped)",
          skip_ratio < MAX_SKIP_RATIO)
    # A curator's malformed supplement line must never vanish silently.
    check(f"supplement has no malformed lines ({counts['supp_skipped']} skipped)",
          counts["supp_skipped"] == 0)

    check(f"cedict parsed above floor ({counts['cedict_parsed']} >= {MIN_CEDICT_PARSED})",
          counts["cedict_parsed"] >= MIN_CEDICT_PARSED)
    c_total = counts["cedict_parsed"] + counts["cedict_skipped"]
    c_skip_ratio = counts["cedict_skipped"] / c_total if c_total else 0
    check(f"cedict skip ratio under {MAX_SKIP_RATIO:.0%} ({counts['cedict_skipped']} skipped)",
          c_skip_ratio < MAX_SKIP_RATIO)
    check(f"readings parsed above floor ({counts['readings_parsed']} >= {MIN_READINGS_PARSED})",
          counts["readings_parsed"] >= MIN_READINGS_PARSED)
    # Zero today (verified); a colliding key means the join could pick a wrong
    # jyutping silently, so any real drift upstream deserves a human look.
    collision_ratio = (counts["readings_collisions"] / counts["readings_parsed"]
                       if counts["readings_parsed"] else 0)
    check(f"readings key collisions under 1% ({counts['readings_collisions']})",
          collision_ratio < 0.01)
    join_rate = counts["cedict_joined"] / counts["cedict_parsed"] if counts["cedict_parsed"] else 0
    check(f"cedict join rate {join_rate:.0%} >= {MIN_JOIN_RATE:.0%}",
          join_rate >= MIN_JOIN_RATE)
    check(f"cedict joined above floor ({counts['cedict_joined']} >= {MIN_CEDICT_JOINED})",
          counts["cedict_joined"] >= MIN_CEDICT_JOINED)

    # 1. Data-quality canary: "eat" must surface genuine Cantonese 食 (sik) — and
    # if a Mandarin 吃/喫 confusable is present, 食 must beat it. Removing the
    # confusable from the source is an improvement, not a failure, so its presence
    # is not required. This is the failure mode the whole project exists to catch.
    rows = ranked_all(db, "eat")
    sik_rank = next((i for i, r in enumerate(rows) if r[1].startswith("sik")), None)
    mando_rank = next(
        (i for i, r in enumerate(rows)
         if r[0] in ("吃", "喫") and not r[1].startswith("sik")), None)
    check(
        "eat: Cantonese 食(sik) present and outranks any Mandarin 吃/喫",
        sik_rank is not None and (mando_rank is None or sik_rank < mando_rank),
        f"sik_rank={sik_rank}, mandarin_rank={mando_rank}")

    # 2. "dog" must return 狗 (gau2) — the everyday Cantonese word.
    dog_rows, _ = senses_for(db, "dog")
    check(
        "dog: 狗 (gau2) reachable in top results",
        any(r[0] == "狗" and r[1] == "gau2" for r in dog_rows))

    # 3. "sleep" must rank the colloquial 瞓覺/訓覺 (fan3 gaau3) first, not the
    # literary 覺 alone — colloquial usability check.
    sleep_rows, _ = senses_for(db, "sleep")
    check(
        "sleep: colloquial 瞓覺/訓覺 (fan3 gaau3) ranks first",
        bool(sleep_rows) and sleep_rows[0][1] == "fan3 gaau3")

    # 4. Coverage canary: the everyday word CC-Canto lacks entirely. Guards the
    # join end-to-end - if 海豚 stops resolving, the join silently broke.
    dolphin_rows, _ = senses_for(db, "dolphin")
    check("dolphin: 海豚 (hoi2 tyun4) ranks first",
          bool(dolphin_rows) and dolphin_rows[0][0] == "海豚"
          and dolphin_rows[0][1] == "hoi2 tyun4")

    # 4b. words.hk integrity: the source must arrive in bulk and parse cleanly
    # (same fail-loud contract as the other sources), and the 海豚 row proves an
    # english-index entry made it to source rank 1 with its token in the gloss.
    check(f"words.hk senses above floor ({counts['wordshk_senses']} >= {MIN_WORDSHK_SENSES})",
          counts["wordshk_senses"] >= MIN_WORDSHK_SENSES)
    w_bad_ratio = (counts["wordshk_bad_cells"] / counts["wordshk_cells"]
                   if counts["wordshk_cells"] else 0)
    check(f"words.hk bad-cell ratio under {MAX_SKIP_RATIO:.0%} "
          f"({counts['wordshk_bad_cells']} unparsable)",
          w_bad_ratio < MAX_SKIP_RATIO)
    w_part_ratio = (counts["wordshk_bad_parts"] / counts["wordshk_parts"]
                    if counts["wordshk_parts"] else 0)
    check(f"words.hk malformed-part ratio under {MAX_SKIP_RATIO:.0%} "
          f"({counts['wordshk_bad_parts']} dropped)",
          w_part_ratio < MAX_SKIP_RATIO)
    row = db.execute(
        "SELECT gloss FROM senses WHERE traditional='海豚' AND jyutping='hoi2 tyun4'"
        f" AND source={SOURCE_WORDSHK}").fetchone()
    check(f"words.hk: 海豚 stored at source={SOURCE_WORDSHK} with 'dolphin' in gloss",
          row is not None and "dolphin" in row[0])

    # 5. Supplement mechanism: any live supplement entry must land at source=0 and
    # be reachable via english_index. Matching on source=0 is required — a common
    # word "fix" (supplement.txt use case 3) deliberately shares traditional+jyutping
    # with a main-dict entry, so an unfiltered lookup would validate the wrong row.
    # With the honest empty starter this passes trivially (0 live entries).
    supp_live = counts["supp_entries"]  # the exact list build_db inserted, not a re-read
    if supp_live:
        ok = True
        for trad, _simp, jyutping, _pinyin, _gloss, _source in supp_live:
            row = db.execute(
                "SELECT id FROM senses WHERE traditional=? AND jyutping=? AND source=0",
                (trad, jyutping)).fetchone()
            if not row:
                ok = False
                break
            indexed = db.execute(
                "SELECT COUNT(*) FROM english_index WHERE sense_id=?", (row[0],)
            ).fetchone()[0]
            if indexed == 0:
                ok = False
                break
        check(
            f"supplement mechanism: {len(supp_live)} live entries stored at source=0 and indexed",
            ok, "case: non-empty supplement")
    else:
        check(
            "supplement mechanism: 0 live entries, merge path trivially clean",
            True, "case: empty supplement (honest starter state)")

    # 6. Size sanity — the db is a bundled iOS asset, keep it well under app limits.
    size_mb = db_file.stat().st_size / (1024 * 1024)
    check(f"dict size under {MAX_DB_SIZE_MB}MB (actual: {size_mb:.2f}MB)", size_mb < MAX_DB_SIZE_MB)

    if failures:
        print(f"\n{len(failures)} assertion(s) FAILED: {failures}")
        db.close()  # failed build never swaps into DB_PATH; drop the temp connection
        sys.exit(1)
    print("\nAll assertions PASS.")


def main():
    db, counts = build_db()
    assert_quality(db, BUILD_PATH, counts)
    db.close()
    os.replace(BUILD_PATH, DB_PATH)  # atomic swap — only reached once every assertion passed
    print(f"wrote {DB_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
