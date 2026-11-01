# Public-candidate media

These are automated screenshots of this public candidate built on `ef6e5efaf71f0b50338cc52dfdec7226e96867df`. The manifest records the runtime content hash and file hashes. No historical build imagery is presented as verification of this revision.

Dossier, conversation and source views are included at 1440×900, 430×932 and 390×844, each in light and dark appearance. The 16.2-second GIF follows a keyboard-operated conversation through a respectful close to the source tab. It uses actual browser frames. It does not depict a participant playtest.

The capture harness exercised 54 screen states, checked 44-pixel visible controls and horizontal overflow, verified source-link focus, saved accessible source-tab snapshots and saw no automatic remote request. It requested reduced motion. The flow is silent and every conversational cue appears as text. The full geometry and accessibility evidence is summarized in `docs/VERIFICATION.md`.

To regenerate against a production preview:

```sh
SHOWCASE_EVIDENCE=/path/to/resolved/evidence SHOWCASE_URL=http://127.0.0.1:4199 node scripts/capture-proof.mjs
python scripts/assemble-showcase-gif.py /path/to/resolved/evidence/frames docs/media/conversation-and-source.gif
```

The capture browser is visible by default. `SHOWCASE_HEADLESS=1` is available for CI. GIF assembly requires Pillow in an isolated environment. Source links are never automatically activated during captures.
