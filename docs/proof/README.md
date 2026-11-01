# Offline proof reports

The current report is [a03cd77cd9300322/report.json](a03cd77cd9300322/report.json). Its [review sheet](a03cd77cd9300322/review-sheet.json), [tree surface inventory](a03cd77cd9300322/surface-inventory.json), [complete errors](a03cd77cd9300322/errors.json) and [fixed-rule gallery](a03cd77cd9300322/GALLERY.md) are separate files.

The report separates untouched-content support review, heuristic detection and false alarms, exhaustive ranking, metadata invariance and pending pilot evidence. No merged quality score is used. Support review is 15 approved of 24 decided by Kevin, with 9 pending his review. No participant observation is recorded. Counts for computed draft labels do not turn them into reviewed labels.

The current report follows Kevin's 2026-11-01 review. Support is 15 approved of 24, with 9 pending his review of a rewrite, new claim or reworded line. Two claims and four dialogue branches were removed or replaced at his request, so there are 37,452 paths instead of 37,646. The final benchmark swapped one source family for pneumococcal lines. Gate counts did not change. These are regression checks, not a fresh blind test. Reports from before this review, including [efacfbfde97eb7e2](efacfbfde97eb7e2/report.json), are kept unchanged as history and still contain the removed content.

The first export [bfdde48f84112c7a](bfdde48f84112c7a/report.json) is preserved as history. Its bootstrap implementation selected a family per row rather than per cluster. Do not use its intervals. The current export corrects cluster resampling and adds explicit frozen gate/runtime hashes and metadata invariance. The heuristic itself was unchanged. These reporting corrections are regression checks, not a fresh blind final test.

Run `node scripts/evaluate-proof.mjs` offline to reproduce. Each content-addressed directory remains immutable. A different input produces another directory. The exporter refuses to replace a differing report or gallery under an existing revision. Tests generate temporary report copies and remove them afterward.

The gallery orders pending support findings, pressure-ranking violations, missing sources, inaccessible choices and then other errors. Ties use stable IDs. It shows the first eight findings and links the full list. Pending support findings are review work, not established factual errors.

The intermediate `cbeb332f03225afc` report is also preserved. The current report adds separate claim, passage and dialogue-use hashes without changing the computed results.

The `27d2248da594e825` report is preserved before the exporter added evaluation-tool hashes and explicit surface-classification denominators. The current metrics are unchanged.

The `8a3558c495fef058` report predates build-gate integration of passage presence and historical-content invalidation. It remains available. The frozen gate and evaluation hashes distinguish that regression from this report. The heuristic and computed benchmark results did not change.

The `d0d355fe5afa2251` export predates the source-page layout correction. It remains historical. The current runtime hash and inclusive UI inventory reflect the consolidated source metadata and compact source-only spacing. Metrics are unchanged.
