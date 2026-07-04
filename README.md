# Canto

An offline iPhone app for looking up Cantonese. Say or type an English word and
Canto shows you the Cantonese ways to say it — traditional characters, jyutping,
and the English meaning — then reads them aloud in a Cantonese voice. No account,
no network; the whole dictionary ships inside the app.

## Features

- **Type or speak** — tap the mic and say a word, or type it. Speech is recognised
  on-device, so it works with no signal.
- **Ranked results** — the most useful senses first, tuned so common words win
  (you get 食 for "eat", not the less common 吃).
- **Hear it** — tap any result to hear it spoken in Cantonese (zh-HK).
- **Action Button** — map the Action Button (iPhone 15 Pro and newer) to launch
  straight into listening. Also works from Siri or Shortcuts: "Start listening".
- **History** — every lookup is logged, with misses flagged, so you can see what
  you've searched.

## Requirements

- iOS 17 or later
- Xcode 26 and [XcodeGen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`)
- A Cantonese voice for text-to-speech: Settings → Accessibility → Spoken Content →
  Voices → Chinese (Hong Kong). Without it, lookups still work but won't be read aloud.

## Build and run

```bash
xcodegen generate      # generates Canto.xcodeproj from project.yml
open Canto.xcodeproj
```

In Xcode, set your signing team under the Canto target → Signing & Capabilities,
then build to your iPhone (⌘R). The mic, speech, and Action Button need a real
device — the simulator can't test them.

Run the tests headlessly:

```bash
xcodebuild -scheme Canto -destination 'platform=iOS Simulator,name=iPhone 17' test
```

## The dictionary

The bundled dictionary (`Canto/Resources/dict.sqlite`) is built from
[CC-Canto](https://cantonese.org) and CC-CEDICT source text in `data/`. To rebuild
it after changing the source or the build rules:

```bash
python3 scripts/build_dict.py
```

The script only replaces the shipped dictionary if every quality check passes, so a
bad build can't overwrite a good one.

## Licence

Dictionary data from CC-Canto (Pleco Software) and CC-CEDICT, licensed under
[CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). See the About
screen in the app for attribution.
