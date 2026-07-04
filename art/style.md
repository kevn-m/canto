# Canto sprite style guide

DRAFT — locked only after batch 1 is approved. Until then, every rule
here is up for adjustment; after that, nothing changes without
regenerating the Reference Sheet.

## Canvas

- 64x64 pixels, PNG, transparent background
- One subject, centred, filling roughly 70-80% of the canvas
- No background scene, no ground shadow beyond a simple 1-tone ellipse

## Palette

PICO-8 16-colour palette, nothing outside it (verify hexes against the
generated batch — adjust here if batch 1 wants more range):

```
#000000 black       #1D2B53 navy       #7E2553 plum       #008751 green
#AB5236 brown       #5F574F dark-grey  #C2C3C7 light-grey #FFF1E8 cream
#FF004D red         #FFA300 orange     #FFEC27 yellow     #00E436 lime
#29ADFF sky         #83769C lavender   #FF77A8 pink       #FFCCAA peach
```

## Proportions — chibi

- Chibi mascot proportions: the head is about half the sprite's total
  height. Small round body, short stubby limbs, no neck.
- The head carries the identity. Exaggerate the subject's two signature
  features until it's unmistakable — elephant: huge ears + trunk;
  lion: big round mane; dolphin: pointed snout + dorsal fin.
- Silhouette test: filled solid navy, a stranger should still name the
  subject. If not, the signature features aren't big enough.
- Simplify everything EXCEPT the signature features. Detail goes, wings
  and trunks and manes stay.

## Face

- Face points at the viewer even when the body angles three-quarter.
- Eyes: large oval navy eyes, each with a white sparkle pixel. Set low
  on the head and wide apart. Not 1px dots.
- Mouth: a small clearly upturned smile, or a tiny open happy mouth.
- Optional: one small pink blush mark on each cheek.

## Line and shading

- 1px outline around the whole subject in navy #1D2B53, not pure black
- Single soft light from top-left: base colour + one shadow tone + at
  most one highlight tone per surface
- No dithering, no gradients, no anti-aliasing — hard pixel edges only

## Mood

- Bright, rounded, friendly. Cute enough to hug.
- Everything in this game is pleased to see you.
- The player is a child under 6.

## Batch 1 subjects and their signature features

| Word | Signature features (exaggerate these two) |
|---|---|
| Dolphin | pointed snout, curved dorsal fin |
| Elephant | huge fan ears, trunk |
| Lion | big round mane, tail tuft |
| Tiger | bold black stripes, round ears |
| Crocodile | long toothy snout (friendly teeth), back ridges |
| Bear | round ears, big muzzle |
| Giraffe | long neck, brown patches + ossicones |
| Monkey | round face patch, long curled tail |
| Coffee | steaming mug — the mug gets the chibi face, two wavy steam wisps |
| Eating | one chibi animal happily biting a big food item (e.g. bear + sandwich); the open-mouth bite IS the smile |

## Hard rules (repeat in every Brief)

- NO text, letters, numbers or writing anywhere in the art
- Nothing scary, violent or sad
- The mouth turns UP. A frown, flat mouth, or worried face is an
  automatic reject
- The subject must be identifiable from its silhouette alone
- One subject only, no background clutter
