# Counter Intelligence

**Does every factual dialogue claim have supporting public evidence, and does every branch reward respectful conversation rather than pressure?**

The authored ranking rules hold across all 37,646 finished paths. Factual support is not yet proven: all 24 new claim-to-passage reviews remain draft, pending Kevin's pharmacist review. A small draft gate benchmark exposes substantial misses. No human pilot has been performed.

Counter Intelligence is a fictional pharmacy conversation game with five authored patients. Choose Ask, Offer, Sit with it or Close. The debrief explains what happened, how pressure affected the tier and which CDC sources belong to the facts actually used. It has no free-text entry or generated dialogue.

| Question | Evidence | Result and limit |
| --- | --- | --- |
| Does the actual source passage support the claim? | [24-row review sheet](docs/claims/REVIEW.md), exact retrieved passages, source hashes and dialogue bindings | 0 of 24 newly reviewed. Supported / reviewed is N/A. September author stamps are historical, with no second independent reviewer |
| Does the citation heuristic notice uncited facts without flagging ordinary talk? | 12 development and 20 final lines, split by source family | Final draft: 2 of 10 factual lines detected, 8 missed, 3 false alarms among 10 ordinary lines. AI-proposed labels await Kevin review |
| Do authored paths reward respect over pressure? | Exhaustive path walk, separate from the gate benchmark | 37,646 paths with no actual ranking violations. Outcome-only and always-bottom controls fail |
| Can people understand the ranking and find a source? | [Three-player paired-branch pilot protocol](docs/PILOT.md) | Pending. No participant observations, effectiveness claim or usability success rate |

The final set is public and fixed, not blind. Neither its exact lines nor its labels enter the runtime. The heuristic was left unchanged. Source-family bootstrap intervals, all controls and complete errors appear in the [offline reports](docs/proof/README.md), with each result kept separately. Small counts do not establish general medical-claim detection.

## Try the game

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. `npm run build` creates `dist/counter-intelligence.html`, a single-file edition with fonts and art included. It remains playable without connectivity. No keys or paid services are needed.

The source tab contains explicit CDC anchors. Selecting one opens the original in a new tab. Source links do not imply CDC endorsement. CDC material is available free on its website. The UI shows the historical author-check date and the public-domain rights category, with the new passage review visibly pending. Excerpt-level rights and third-party notices still require human confirmation. See [CDC's use policy](https://www.cdc.gov/other/agencymaterials.html).

No background requests, beacons, remote images, remote fonts, analytics or storage are allowed. A content security policy and bundle scanner enforce those restrictions. The source-link contract permits exact manifest destinations as inert link data. It does not permit automatic network calls or remote embedded resources. No external source is fetched to calculate a score or finish a run.

## What the proof establishes

The build gate requires a trusted source URL, access date, historical author stamp and captured passage. Changed claim or cited dialogue content invalidates the historical binding and requires a new bound pharmacist decision. It checks references and a bounded fact-shaped heuristic. It does not decide whether an unrelated but valid CDC citation supports a sentence. The new support review binds the claim, passage, source metadata and every cited dialogue use to a hash. A changed claim or passage cannot keep its approval. Missing or unreviewed passages are never called reviewed.

The [inclusive source-surface inventory](docs/claims/all-source-surfaces.json) covers string literals, template fragments and JSX text throughout the counter application. It includes code strings so that an imperfect detector cannot hide a factual UI or patient line from review. Tree data has a separate location-based inventory in each report. Human classification of these surfaces remains pending. The COVID source's current destination and wording need particular review. Four claims are marked volatile. Their current clinical freshness has not been approved.

The ranking is an authored rule. Every pressured outcome ranks below every respectful not-today, and pressure after a no gets the bottom tier. The outcome-only control violates respect ordering. The always-bottom control fails differentiation. Evaluation labels, IDs, provenance display fields and ordering cannot change actual tier outputs. This is evidence about this script, not about behavior outside it.

## Verification and regeneration

```sh
npm test
npm run build
npm run gate
node scripts/evaluate-proof.mjs
node scripts/inventory-surfaces.mjs
```

The exporter runs offline on committed inputs and writes a new content-addressed directory when inputs change. It refuses to replace a differing historical report or gallery. The [failure gallery](docs/proof/README.md) uses a fixed rule and links every error. Earlier reports stay available, including reports superseded by corrections to the reporting calculation.

Browser tests cover keyboard choices and debrief tabs, source-anchor mapping, focus, screen fit, 44-pixel controls, reduced motion and the standalone file's lack of automatic requests. The main flow is silent, with dialogue and outcome cues presented as text. Automated captures are [in docs/media](docs/media/README.md). They do not count as human usability evidence. Exact command logs, failures and baseline comparison are in [VERIFICATION.md](docs/VERIFICATION.md).

## Limits and authorship

This is a fictional prototype for exploring conversations. It is not medical advice and has no demonstrated training, counseling, vaccination or patient-outcome effectiveness. Historical review is the author's own pharmacist review. The new passage mappings, factual-surface classification, rights decisions and evaluation labels are pending. No second independent clinical review or human pilot has been completed.

Kevin designed the game and reviewed the historical content. AI coding tools assisted the implementation and proposed the new proof materials. See [HOW-BUILT](docs/HOW-BUILT.md). The code is MIT licensed. CDC excerpts retain their own source and rights notes. No employer content, real patient information or patient-data entry is included.
