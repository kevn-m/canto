#!/usr/bin/env python3
"""Slice 0 spike: does CC-Canto reverse lookup (English -> Cantonese) clear the bar?

Parses data/cccanto-webdist.txt into in-memory SQLite, runs every word in
scripts/wordlist.txt, prints the top 5 Senses each. Kevin scores the output;
kill criteria is ~70% trusted colloquial answers.

Note: cccedict-canto-readings.txt has no English glosses so it is useless for
reverse lookup. cccanto-webdist.txt embeds CEDICT-adapted entries marked
"# adapted from cc-cedict" — that marker is the source rank (0 = genuine
CC-Canto, 1 = adapted).
"""

import re
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "cccanto-webdist.txt"
WORDLIST = ROOT / "scripts" / "wordlist.txt"

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


def clean(text):
    text = re.sub(r"\bM:.*$", " ", text)  # CEDICT measure-word suffix: "dog M: 只zhī [只]"
    return re.sub(r"\s+", " ", PAREN.sub(" ", text.lower())).strip(" .,;:!?")


def build_db():
    db = sqlite3.connect(":memory:")
    db.executescript("""
        CREATE TABLE senses (
            id INTEGER PRIMARY KEY, traditional TEXT, simplified TEXT,
            jyutping TEXT, pinyin TEXT, gloss TEXT, source INTEGER);
        CREATE TABLE english_index (
            token TEXT, sense_id INTEGER, weight INTEGER);
    """)
    parsed = skipped = 0
    for raw in DATA.read_text(encoding="utf-8").splitlines():
        if not raw or raw.startswith("#"):
            continue
        m = LINE_RE.match(raw)
        if not m:
            skipped += 1
            continue
        trad, simp, pinyin, jyutping, gloss, comment = m.groups()
        source = 1 if comment and "cc-cedict" in comment else 0
        cur = db.execute(
            "INSERT INTO senses (traditional, simplified, jyutping, pinyin, gloss, source)"
            " VALUES (?,?,?,?,?,?)",
            (trad, simp, jyutping, pinyin, gloss, source))
        sid = cur.lastrowid
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
        db.executemany("INSERT INTO english_index VALUES (?,?,?)", rows)
        parsed += 1
    db.execute("CREATE INDEX idx_token ON english_index(token)")

    # Popularity tiebreak: literary junk chars (啜, 觱) live in few compounds,
    # everyday chars (食, 狗, 飲) in many. Multi-char entries get a mid constant.
    char_freq = {}
    for (trad,) in db.execute("SELECT traditional FROM senses"):
        for ch in set(trad):
            char_freq[ch] = char_freq.get(ch, 0) + 1
    db.execute("ALTER TABLE senses ADD COLUMN popularity INTEGER DEFAULT 0")
    db.executemany(
        "UPDATE senses SET popularity = ? WHERE id = ?",
        [(char_freq[trad] if len(trad) == 1 else 30, sid)
         for sid, trad in db.execute("SELECT id, traditional FROM senses")])
    print(f"parsed {parsed} entries ({skipped} lines skipped)\n")
    return db


def senses_for(db, query):
    sql = """
        SELECT s.traditional, s.jyutping, s.gloss, s.source, MIN(e.weight) AS w
        FROM english_index e JOIN senses s ON s.id = e.sense_id
        WHERE e.token = ?
        GROUP BY s.id
        ORDER BY w ASC, s.source ASC, s.popularity DESC, LENGTH(s.gloss) ASC
        LIMIT 40
    """
    def top5(token):
        seen, out = set(), []
        for r in db.execute(sql, (token,)):
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


def main():
    db = build_db()
    words = [w.strip() for w in WORDLIST.read_text().splitlines()
             if w.strip() and not w.startswith("#")]
    misses = 0
    for word in words:
        rows, split = senses_for(db, word)
        tag = " (per-word fallback)" if split else ""
        print(f"── {word}{tag}")
        if not rows:
            misses += 1
            print("   MISS")
        for trad, jyut, gloss, source, w in rows:
            src = "canto " if source == 0 else "cedict"
            print(f"   [{src} w{w}] {trad}  {jyut}  /{gloss[:70]}")
        print()
    hit = len(words) - misses
    print(f"{hit}/{len(words)} words returned candidates "
          f"({100 * hit // len(words)}%). Hits still need human scoring for trust.")


if __name__ == "__main__":
    sys.exit(main())
