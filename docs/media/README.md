# Public-candidate media

These are automated screenshots of this public candidate built on `ef6e5efaf71f0b50338cc52dfdec7226e96867df`. The manifest records the runtime content hash and file hashes. No historical build imagery is presented as verification of this revision.

Dossier, conversation and source views are included at 1440×900, 430×932 and 390×844, each in light and dark appearance. The 16.2-second GIF follows a keyboard-operated conversation through a respectful close to the source tab. It uses actual browser frames. It does not depict a participant playtest.

The capture harness exercised 54 screen states, checked 44-pixel visible controls and horizontal overflow, verified source-link focus, saved accessible source-tab snapshots and saw no automatic remote request. It requested reduced motion. The flow is silent and every conversational cue appears as text. The full geometry and accessibility evidence is summarized in `docs/VERIFICATION.md`.

To regenerate, start a production preview, which prints its local address, and run:

```sh
SHOWCASE_EVIDENCE=<evidence directory> SHOWCASE_URL=<preview address> node scripts/capture-proof.mjs
python scripts/assemble-showcase-gif.py <evidence directory>/frames docs/media/conversation-and-source.gif
```

The capture browser is visible by default. `SHOWCASE_HEADLESS=1` is available for CI. GIF assembly requires Pillow in an isolated environment. Source links are never automatically activated during captures.
