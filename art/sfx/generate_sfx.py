#!/usr/bin/env python3
"""Generate the game's chiptune sound effects as small mono WAVs.

Run `python3 art/sfx/generate_sfx.py`, then copy the WAVs into
Canto/Resources/SFX/ and run `xcodegen generate`. SFXPlayer loads them
by name; SFXTests fails if a bundled effect goes missing.

Pure stdlib: square/triangle waves with pitch + amplitude envelopes,
22050 Hz 16-bit, in the same spirit as the PICO-8 sprite art.
"""
import math
import random
import struct
import wave
from pathlib import Path

RATE = 22050
OUT = Path(__file__).parent


def write_wav(name, samples):
    clipped = [max(-1.0, min(1.0, s)) for s in samples]
    path = OUT / f"{name}.wav"
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(s * 32000)) for s in clipped))
    print(f"{path.name}: {len(samples) / RATE:.2f}s")


def square(phase):
    return 1.0 if (phase % 1.0) < 0.5 else -1.0


def triangle(phase):
    p = phase % 1.0
    return 4 * p - 1 if p < 0.5 else 3 - 4 * p


def sweep(wave_fn, f0, f1, dur, vol=0.5, decay=4.0):
    n = int(RATE * dur)
    out, phase = [], 0.0
    for i in range(n):
        t = i / n
        freq = f0 * (f1 / f0) ** t
        phase += freq / RATE
        out.append(wave_fn(phase) * vol * math.exp(-decay * t))
    return out

def tone(wave_fn, freq, dur, vol=0.5, decay=3.0):
    return sweep(wave_fn, freq, freq, dur, vol, decay)


def noise(dur, vol=0.3, decay=8.0):
    rng = random.Random(7)
    n = int(RATE * dur)
    return [rng.uniform(-1, 1) * vol * math.exp(-decay * i / n) for i in range(n)]


def mix(*layers):
    n = max(len(l) for l in layers)
    return [sum(l[i] for l in layers if i < len(l)) for i in range(n)]


def seq(*parts):
    out = []
    for p in parts:
        out.extend(p)
    return out


# hit: a sharp zap down with a noise crack - the sword landing
write_wav("hit", mix(sweep(square, 700, 120, 0.16, vol=0.45, decay=6), noise(0.08, vol=0.35, decay=12)))

# whiff: two sad falling notes - the swing that missed
write_wav("whiff", seq(tone(square, 294, 0.12, vol=0.35, decay=2), sweep(square, 262, 175, 0.28, vol=0.35, decay=3)))

# flip: a quick rising whip for the card turning over
write_wav("flip", mix(sweep(square, 220, 880, 0.12, vol=0.25, decay=2), noise(0.1, vol=0.12, decay=6)))

# victory: ascending major arpeggio, last note held
write_wav("victory", seq(
    tone(square, 523, 0.09, vol=0.4, decay=1),
    tone(square, 659, 0.09, vol=0.4, decay=1),
    tone(square, 784, 0.09, vol=0.4, decay=1),
    tone(square, 1047, 0.35, vol=0.4, decay=3),
))

# defeat: slow falling minor line
write_wav("defeat", seq(
    tone(triangle, 330, 0.18, vol=0.5, decay=1.5),
    tone(triangle, 262, 0.18, vol=0.5, decay=1.5),
    tone(triangle, 220, 0.18, vol=0.5, decay=1.5),
    tone(triangle, 175, 0.4, vol=0.5, decay=3),
))

# enemy-down: a falling squish + low bump - one enemy defeated, not the run won
write_wav("enemy-down", seq(sweep(square, 880, 220, 0.28, vol=0.4, decay=3), tone(triangle, 165, 0.18, vol=0.35, decay=4)))

# coin: the classic two-note bling for CantoBux
write_wav("coin", seq(tone(square, 988, 0.07, vol=0.35, decay=0.5), tone(square, 1319, 0.25, vol=0.35, decay=4)))

# badge: a bright three-note fanfare - a one-shot achievement, not a payout
write_wav("badge", seq(
    tone(square, 784, 0.08, vol=0.4, decay=0.8),
    tone(square, 988, 0.08, vol=0.4, decay=0.8),
    tone(square, 1319, 0.3, vol=0.4, decay=3),
))

# mastered: a bright four-note triangle run climbing past badge's top note -
# entering the Mastered box, not an award payout
write_wav("mastered", seq(
    tone(triangle, 659, 0.13, vol=0.4, decay=1.5),
    tone(triangle, 880, 0.13, vol=0.4, decay=1.5),
    tone(triangle, 1109, 0.13, vol=0.4, decay=1.5),
    tone(triangle, 1480, 0.3, vol=0.45, decay=3),
))
