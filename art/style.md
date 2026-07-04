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

## Line and shading

- 1px outline around the whole subject in navy #1D2B53, not pure black
- Flat three-quarter view
- Single soft light from top-left: base colour + one shadow tone + at
  most one highlight tone per surface
- No dithering, no gradients, no anti-aliasing — hard pixel edges only

## Mood

- Bright, rounded, friendly. Big simple shapes that read at thumbnail
  size. When in doubt, remove detail.
- Subjects with faces get dot eyes and a simple smile. Everything in
  this game is pleased to see you.
- The player is a child under 6.

## Hard rules (repeat in every Brief)

- NO text, letters, numbers or writing anywhere in the art
- Nothing scary, violent or sad
- One subject only, no background clutter
