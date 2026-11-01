# Verification

Public base: `ef6e5efaf71f0b50338cc52dfdec7226e96867df`. Work began from a clean isolated worktree attached to the public repository clone. The supplied other clone and both origins were preserved. Both repositories' open PRs were checked before implementation. Existing showcase work was compared and relevant token-based appearance and build-regression implementation reused without importing other repository history or its validation result.

The toolchain is Node v24.14.1 and npm 11.11.0. All resolved package records match origin/main. The candidate only declares the already locked Babel parser as a direct development dependency. No package version changed. Dependencies were installed from the lockfile. Fixtures contain fictional authored game content only and clean up their temporary copies.

## RED before GREEN

- `npx vitest run tests/unit/counter-proof.test.js` exited 1 before implementation. A debrief source URL was undefined and the support-review contract was absent. See [red.txt](evidence/proof/red.txt).
- The added network and extreme-control assertions exited 1 before their implementation. See [red-controls.txt](evidence/proof/red-controls.txt).
- `npx vitest run tests/unit/counter-proof.test.js -t 'rejects a historical stamp'` exited 1 because changed claims still passed the old stamp gate. See [historical-invalidation-red.txt](evidence/proof/historical-invalidation-red.txt).
- `npx vitest run tests/unit/counter-proof.test.js -t 'supporting passage is missing'` exited 1 before passage presence became a build-ledger requirement. See [missing-passage-red.txt](evidence/proof/missing-passage-red.txt).
- The final focused command `npx vitest run tests/unit/counter-proof.test.js tests/unit/counter-claims.test.js tests/unit/counter-claim-build.test.js` exited 0 with 23 tests. See [build-bindings-green.txt](evidence/proof/build-bindings-green.txt).

The support tests reject absent passages, unrelated CDC destinations even with a recomputed review binding, changed claims, changed passages and changed dialogue uses. They keep unreviewed content draft. Separate tests prove source-family separation, final-key isolation across all source files, metadata and order invariance, opposite extreme gate failures, ranking-control failures and immutable offline report and gallery regeneration. Every one of the 24 debrief anchors is rendered against its exact manifest destination, with focus and new-tab attributes checked.

## Full gate comparison

An untouched origin/main control was cloned outside the estate at `/tmp/ci-proof-control`, checked out at the base SHA and installed with `npm ci`. `CI_PORT=4197 npm run gate` exited 0. It passed 231 unit tests and 178 browser checks, retaining 14 existing skips. The [complete control log](evidence/proof/control-gate.txt) records all configured stages. The scratch clone was removed after preserving the evidence.

The final candidate command `CI_PORT=4198 npm run gate` exited 0. It passed 243 unit tests and 184 browser checks, retaining the same 14 existing skips. All six browser configurations passed. See the [complete final candidate log](evidence/proof/candidate-gate-final.txt) and [toolchain and parity receipt](evidence/proof/parity.json). Final candidate-only failures: none. Earlier red full-gate attempts remain visible below.

Earlier candidate attempts are retained. Attempt 1 failed stale contract assertions and an overbroad new navigation regex that matched Three shader text, plus timing failures under concurrent load. Attempt 2 failed unit timing budgets while the control gate ran. A further run caught the intentionally RED historical-binding assertion before its implementation. The final candidate runs after the control. No timeout, hook or assertion was weakened. The intermediate missing-source fixture exception was corrected and its failed log retained. A later full attempt passed unit and source/layout checks but failed an unchanged sleeve-animation assertion on the 430-pixel browser project. Its exact focused rerun passed in 4.2 seconds. Both logs are retained. A subsequent full gate passed the 430-pixel project but exposed 95 pixels of source-page overflow at 390×844. Compact metadata passed that viewport, then the 375×667 case exposed 47 pixels and then 4 pixels of overflow. Source-only spacing resolved the smallest case with all five trees checked. Full titles, 44-pixel link targets and the 13-pixel text floor are preserved. Failed logs are retained, with the [390-pixel overflow capture](evidence/proof/browser/source-overflow-red-390.png) and [375-pixel overflow capture](evidence/proof/browser/source-overflow-red-375.png). The final full gate passed after the correction.

## Browser and media evidence

`SHOWCASE_EVIDENCE=/Volumes/HubData/evidence/counter-intelligence-sim-showcase-standard SHOWCASE_URL=http://127.0.0.1:4199 node scripts/capture-proof.mjs` exited 0. The visible capture browser exercised 54 states in light and dark at 1440×900, 430×932 and 390×844, using keyboard activation and reduced motion. It recorded no horizontal overflow, no visible enabled control below 44 pixels and zero automatic remote requests. [Geometry](evidence/proof/browser/geometry.json) and accessible source-tab snapshots accompany the [public-candidate media](media/README.md). The runtime content hash matches the current proof report. Every published image and GIF hash matches the media manifest.

The 9-frame GIF is 16.2 seconds and was assembled from actual browser captures with Pillow in an isolated environment. That environment was removed. Dossier, conversation and source captures were visually inspected across the required viewports and both themes. Source links have visible focus. The main flow is silent with all dialogue and outcome information in text. Existing browser checks cover reduced motion and keyboard debrief navigation.

## Proof results and remaining human work

The [current report](proof/README.md) preserves earlier exports and discloses the corrected initial bootstrap. Current draft final gate counts are TP 2, FN 8, FP 3 and TN 7. The deterministic source-family bootstrap intervals are 0 to 0.4 for detection and 0.1 to 0.5 for false alarms. These describe five source families and draft labels, not clinical accuracy. The unchanged authored ranking has zero violations across 37,646 paths. Outcome-only has 6,190 rule errors. Always-bottom has 4,710 rule errors including five differentiation failures. Metadata invariance has zero errors across all 37,646 paths.

All 24 claims retain their exact public-main wording, sources and historical stamps. Dialogue is unchanged. The new passage-support and excerpt-rights decisions, full factual-surface classification and human-authored benchmark lines remain pending Kevin. The current line drafts are explicitly AI proposed. The COVID destination and guidance change needs his attention. No second independent reviewer or actual player observation is recorded. The three-player pilot is prepared and remains pending. No counseling, clinical, vaccination or training effectiveness is claimed.

Registry evidence home: `/Volumes/HubData/evidence/counter-intelligence-sim-showcase-standard`. The PR includes portable copies of relevant logs and evidence. Portable text logs remove trailing whitespace and blank final lines for a clean diff. Exact raw bytes are retained in [raw-text-logs.tar.gz](evidence/proof/raw-text-logs.tar.gz) and the registry evidence home, with hashes in [log-normalization.json](evidence/proof/log-normalization.json). The final staged diff check passed before push. No merge is performed.

## Pharmacist review update, 2026-11-01

Kevin Madden, PharmD reviewed all 24 claims on the support sheet. His decisions, notes and content bindings are in [support-reviews.json](claims/support-reviews.json). The sections above describe the earlier candidate and are kept as history.

- 16 claims were approved as is. 15 still read approved. The 16th, flu-peak, shares its only line with the flagged flu-two-weeks fact, so that line was reworded and returns to Kevin.
- other-viruses was approved with an edit, and five claims were flagged. All six were rewritten from CDC pages fetched on 2026-11-01 by `scripts/capture-cdc.mjs`, which hashes each page and quotes whole text blocks.
- Two claims were added: same-arm-ok and pneumo-50-plus. Every rewrite and new claim carries no review stamp and is bound in [pending-drafts.json](claims/pending-drafts.json). The debrief shows it as pending.
- Two claims and their dialogue were removed at Kevin's request. Jordan lost one branch and one ending. Marcus, Sam and Walt kept their branches with a Tdap or pneumococcal offer in place of the removed one. A test checks that no dialogue, claim, quote, source snapshot, benchmark line or runtime file mentions the removed topic.
- The final benchmark's fifth source family is now pneumococcal. Gate counts are unchanged at TP 2, FN 8, FP 3 and TN 7. This is a regression check.
- Exhaustive ranking now covers 37,452 paths with zero violations. Outcome-only still has 6,190 rule errors and always-bottom 4,710. Metadata invariance has zero errors.
- The media in `docs/media` were captured before this update. Their flow does not touch the changed lines, but the sources screenshots show the old review note.
