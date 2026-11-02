# Claim support review

Kevin Madden, PharmD reviewed all 24 claims on the [claim support sheet](CLAIM-SUPPORT-SHEET.md) on 2026-11-01. This page explains how his decisions are recorded and what is still waiting for him.

## Where decisions live

- [support-reviews.json](support-reviews.json) holds Kevin's own decisions, keyed by claim ID: `decision`, `reviewedBy`, `reviewedOn`, his `notes`, the sheet he reviewed and a `binding`. The binding is a hash of the claim, its exact CDC passage and every dialogue line that uses it, as they stood on that sheet.
- [pending-drafts.json](pending-drafts.json) holds claims written or reworded after his review. Each entry says what he asked for, what changed and who drafted it, and is bound to the exact draft. A draft is never an approval.
- [passages.json](passages.json) and [sources](sources) hold the exact CDC passages and the page snapshots they came from. Rewrites quote pages fetched on 2026-11-01 by `node scripts/capture-cdc.mjs`.

## Decisions on 2026-11-01

| Decision | Claims |
| --- | --- |
| Approved as is | flu-cannot-cause-flu, flu-side-effects, sit-after, flu-peak, ve-good-match, milder-illness, flu-protects-others, flu-healthy-people, baby-two-weeks, tdap-around-baby, flu-timing, most-same-visit, rsv-75-plus, flu-65-burden, shingles-50-plus, shingles-one-in-three |
| Approved with an edit | other-viruses |
| Flagged for rewrite | flu-two-weeks, tdap-ten-years, recommendation-predicts, flu-65-preferred, shingles-same-visit |
| Removed | same-visit, covid-personal-call, with every line, branch, source and test that used them |

## What is pending his second look

The sheet's pending section lists nine claims. Six are the rewrites he asked for. Two are new: `same-arm-ok`, split out of shingles-same-visit because each claim quotes one CDC page, and `pneumo-50-plus`, which replaces a removed branch in Walt's conversation. The ninth is `flu-peak`. Kevin approved it, but its only line also states the flu-two-weeks fact he flagged, so that line was reworded and his approval no longer covers it.

## Statuses

| Status | Meaning |
| --- | --- |
| approved | Kevin approved this exact claim, passage and set of lines. |
| rewrite pending pharmacist review | Rewritten as Kevin asked, waiting for him. |
| new claim, pending pharmacist review | Added after his review, waiting for him. |
| rechecked, pending pharmacist review | Claim text unchanged and checked against the current CDC page, waiting for him. |
| approved claim, reworded line pending pharmacist review | Claim approved, but a line that uses it changed. |
| changed | Something bound changed after a decision or a draft. The build fails. |

The build fails closed. A claim ships only if Kevin approved its exact content, its September author stamp still matches unchanged content, or it is a bound draft. The debrief shows each source as "Pharmacist approved" with the date, or "Pharmacist review pending".

## Recording the second look

1. Open the pending section of the sheet and tick Approve or Flag for each claim.
2. In `support-reviews.json`, set that claim's `decision` to `approved`, `flagged` or `rejected`, with `reviewedBy`, `reviewedOn`, `notes` and the `binding` printed for it in the current proof report's review sheet. Only Kevin supplies his own identity and date.
3. For an approved rewrite or new claim, add his `reviewedBy` and `reviewedOn` stamp in `src/counter/claims.js` and delete its entry from `pending-drafts.json`.
4. Run `node scripts/claim-sheet.mjs` and `npm run build`.

CDC excerpts are available free from the source website. CDC does not endorse this game. Rights decisions for each excerpt remain pending human review. Reports in `docs/proof` from before 2026-11-01 are kept unchanged as history and still contain the removed claims.
