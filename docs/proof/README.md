# Offline proof reports

The current report is [a03cd77cd9300322/report.json](a03cd77cd9300322/report.json). Its [review sheet](a03cd77cd9300322/review-sheet.json), [tree surface inventory](a03cd77cd9300322/surface-inventory.json), [complete errors](a03cd77cd9300322/errors.json) and [fixed-rule gallery](a03cd77cd9300322/GALLERY.md) are separate files.

The report separates untouched-content support review, heuristic detection and false alarms, exhaustive ranking, metadata invariance and pending pilot evidence. No merged quality score is used. Support review is 15 approved of 24 decided by Kevin, with 9 pending his review. No participant observation is recorded. Counts for computed draft labels do not turn them into reviewed labels.

The current report follows Kevin's 2026-11-01 review. Support is 15 approved of 24, with 9 pending his review of a rewrite, new claim or reworded line. Two claims and four dialogue branches were removed or replaced at his request, so there are 37,452 paths instead of 37,646. The final benchmark swapped one source family for pneumococcal lines. Gate counts did not change. These are regression checks, not a fresh blind test.

Six earlier exports (bfdde48f84112c7a, cbeb332f03225afc, 27d2248da594e825, 8a3558c495fef058, d0d355fe5afa2251 and efacfbfde97eb7e2) were taken out of the tree on 2026-11-14, when this branch was brought up to date with main. They predate Kevin's review and still carried the claims, passages and dialogue he ruled out of the game. They remain in git history at commit 5f2ddb8 and are not altered there. One disclosure from them still applies: the first export, bfdde48f84112c7a, selected a bootstrap family per row rather than per cluster, so its intervals must not be used. The current export corrects cluster resampling and adds explicit frozen gate/runtime hashes and metadata invariance. The heuristic itself was unchanged. These reporting corrections are regression checks, not a fresh blind final test.

Run `node scripts/evaluate-proof.mjs` offline to reproduce. Each content-addressed directory remains immutable. A different input produces another directory. The exporter refuses to replace a differing report or gallery under an existing revision. Tests generate temporary report copies and remove them afterward.

The gallery orders pending support findings, pressure-ranking violations, missing sources, inaccessible choices and then other errors. Ties use stable IDs. It shows the first eight findings and links the full list. Pending support findings are review work, not established factual errors.
