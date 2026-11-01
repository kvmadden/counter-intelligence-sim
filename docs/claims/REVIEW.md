# Claim support review sheet

All 24 rows are draft, pending clinical review by Kevin Madden, PharmD. For the side-by-side claim, quote, link and approve or flag boxes, use the [claim support sheet](CLAIM-SUPPORT-SHEET.md). Exact retrieved passages, source dates, retrieval dates, rights notes, full content hashes and every linked dialogue use are in each immutable report directory under `docs/proof`. The historical author checks are preserved separately. No new approval has been supplied.

| Claim | Historical check | New support decision | Current source |
| --- | --- | --- | --- |
| flu-cannot-cause-flu | 2026-09-15 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/flu/prevention/misconceptions.html) |
| flu-side-effects | 2026-09-15 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/flu/vaccines/keyfacts.html) |
| sit-after | 2026-09-15 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/vaccines/hcp/imz-best-practices/preventing-managing-adverse-reactions.html) |
| flu-two-weeks | 2026-09-15 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/flu/vaccines/keyfacts.html) |
| flu-peak | 2026-09-15 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/flu/about/season.html) |
| same-visit | 2026-09-15 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/flu/vaccines/coadministration.html) |
| covid-personal-call | 2026-09-15 | unverified passage | [CDC](https://www.cdc.gov/covid/hcp/vaccine-considerations/index.html) |
| tdap-ten-years | 2026-09-15 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/vaccines/hcp/by-disease/dtap-tdap-td.html) |
| recommendation-predicts | 2026-09-15 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/vaccines-adults/hcp/imz-standards/index.html) |
| ve-good-match | 2026-09-15 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/flu-vaccines-work/benefits/index.html) |
| milder-illness | 2026-09-15 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/flu-vaccines-work/benefits/index.html) |
| other-viruses | 2026-09-15 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/flu/prevention/misconceptions.html) |
| flu-protects-others | 2026-09-16 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/flu-vaccines-work/benefits/index.html) |
| flu-healthy-people | 2026-09-16 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/flu/about/index.html) |
| baby-two-weeks | 2026-09-16 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/vaccines-pregnancy/about/vaccines-family-caregivers.html) |
| tdap-around-baby | 2026-09-16 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/vaccines-pregnancy/about/vaccines-family-caregivers.html) |
| flu-timing | 2026-09-16 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/flu/vaccines/vaccinations.html) |
| most-same-visit | 2026-09-16 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/flu/vaccines/coadministration.html) |
| rsv-75-plus | 2026-09-16 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/rsv/adults/index.html) |
| flu-65-preferred | 2026-09-16 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/flu/vaccine-types/adjuvant.html) |
| flu-65-burden | 2026-09-16 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/flu/vaccine-types/adjuvant.html) |
| shingles-50-plus | 2026-09-16 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/shingles/vaccines/index.html) |
| shingles-one-in-three | 2026-09-16 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/shingles/about/index.html) |
| shingles-same-visit | 2026-09-16 | draft, pending pharmacist review | [CDC](https://www.cdc.gov/shingles/hcp/vaccine-considerations/index.html) |

The original COVID link redirects to changed guidance. Kevin must decide whether its authored wording needs correction. Matching a CDC host or finding a passage is not an entailment decision. A valid approval must bind the full claim, exact passage, source metadata and all dialogue uses. Any change invalidates that binding.

CDC excerpts are available free from the source website. CDC does not endorse this game. Rights decisions for each excerpt remain pending human review. Historical research summaries are preserved as historical summaries, never promoted to exact source captures.

Kevin can record actual decisions in `support-reviews.json`, keyed by claim ID, using `decision`, `reviewedBy`, `reviewedOn` and the full `binding` from the current sheet. Valid decisions are `approved` or `rejected`. Only Kevin supplies his own review identity and date. Regenerate after a decision. A mismatched binding becomes `changed`, and no longer contributes an approved or reviewed count. UI review status remains pending in this candidate because no new decisions have been supplied.
