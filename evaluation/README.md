# Fixed public gate benchmark

These 12 development and 20 final lines are AI-proposed drafts, pending Kevin's review. They are not the requested final human-authored evidence yet. The final set is public and cannot be called blind. No label approval is implied by running the evaluator.

Each set is half factual lines and half ordinary conversation. Development uses six influenza source documents. Final uses five separate source families: shingles, RSV, caregivers, tetanus and pneumococcal guidance. On 2026-11-01 the fifth family was replaced at Kevin's request, so the final set is a regression check from that date. Ordinary lines carry the same family as their paired factual line, so resampling keeps both together. The proposed source families use separate source URLs across the split, which a test checks alongside the family IDs. Human review of conceptual and phrasing overlap remains pending. Ordinary contrast text is authored conversation rather than a CDC quotation.

The runtime receives only the string passed to the existing heuristic. IDs, family names, source URLs and labels never enter its decision. Tests mutate metadata and labels without changing outputs and check final exact text and IDs are absent from runtime. The evaluator does not tune the heuristic. Changes after this first public draft must be labeled regression checks.

Detection is a rejection of an uncited factual line. A false alarm is rejection of ordinary talk. Allow-all always permits a line and therefore misses every uncited fact. Reject-all rejects every line and therefore flags every ordinary line. The six historical planted gate defects remain a different structural test.

The deterministic 2,000-replicate bootstrap samples source families with replacement, keeping all lines from each selected family together. Its intervals describe this small draft set only. Human label review and source support review remain separate from these computed results.
