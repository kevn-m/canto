#!/usr/bin/env python3
"""Slice 1: build the on-disk Canto dictionary from cccanto-webdist.txt.

Grows scripts/spike.py's in-memory build into a real SQLite file at
Canto/Resources/dict.sqlite, merges scripts/supplement.txt (curated,
human-verified additions), then runs quality assertions against the
built db. The db is built to a temp file and only swapped into place
once every assertion passes, so a failed build never replaces the last
good dictionary.
"""

import os
import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "cccanto-webdist.txt"
SUPPLEMENT = ROOT / "scripts" / "supplement.txt"
DB_PATH = ROOT / "Canto" / "Resources" / "dict.sqlite"
# Built here, then os.replace'd into DB_PATH only after assert_quality passes.
# Named *.sqlite so the existing .gitignore rule covers it too.
BUILD_PATH = DB_PATH.parent / "dict.tmp.sqlite"

MAX_DB_SIZE_MB = 50
MIN_MAIN_ENTRIES = 30000  # last good build ~34.3k; a floor catches a truncated/drifted source
MAX_SKIP_RATIO = 0.01     # a spike in unparsed lines is the earliest sign of format drift

LINE_RE = re.compile(
    r"^(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+\{([^}]*)\}\s+/(.+)/\s*(?:#\s*(.*))?$"
)

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
        DATA, lambda comment: 1 if comment and "cc-cedict" in comment else 0)
    supplement_entries, supp_parsed, supp_skipped = parse_file(
        SUPPLEMENT, lambda _c: 0)

    insert_all(db, main_entries)
    insert_all(db, supplement_entries)
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
    print(f"main entries parsed: {parsed} ({skipped} lines skipped)")
    print(f"supplement entries merged: {supp_parsed} ({supp_skipped} lines skipped)")
    print(f"total senses: {total_senses}")
    print(f"total index rows: {total_index}\n")
    return db, {"parsed": parsed, "skipped": skipped, "supp_skipped": supp_skipped,
                "supp_entries": supplement_entries}


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

    # 4. Supplement mechanism: any live supplement entry must land at source=0 and
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

    # 5. Size sanity — the db is a bundled iOS asset, keep it well under app limits.
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
