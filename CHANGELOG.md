# Changelog

## 0.5.0 (2026-10-07)

- I1: Checksum-validated IBAN and VIN replacements, Canadian bank account groups, IPv4/IPv6, MAC, GPS coordinates and social handles. Replaced values enter originals/secrets for leak checking. IPv4 version/partial/out-of-range values are guarded.
- I2: Six typed yellow review flags with final-output offsets: name, id, file, age, url and zip. Tokens, dates, times, full phones and currency amounts are guarded; overlapping flags resolve by specific pattern before generic ID/name. ZIP replacement remains in address context; ambiguous state/ZIP references are flagged.
- V1-V5: Inline yellow items beside blue tokens and red confirmed leaks. Real accessible buttons offer thread-only Replace, persisted Always remove (also Shift-click Replace), and thread-only Keep. All occurrences replace together; Keep survives reruns; Clear erases both temporary lists. Counter/Next focuses Replace and wraps; controls and hidden labels are excluded from both normal and selected-text copying.
- A1-A3: Single Accept-then-Copy button with yellow count or red leak count; acceptance keeps outstanding yellow text and acknowledges leaks. Copy always uses result.text. Copy briefly reads Copied; stale text invalidates the result; changed output or new flags/leaks resets acceptance. Review panel is closed on each new result and lists flags/leaks with focus navigation; legacy advisories remain visible there.
- H1-H2: Updated section-4 help, two new native popovers, and help sections covering automatic identifiers, yellow types, limits, review/acceptance and temporary versus saved preferences. Old copy-anyway/per-name controls removed.
- T1: Generated PERSON tokens renumber after all replacements in final first-appearance order; explicit labels/ME remain unchanged and reserved labels remain protected. Fully excluded people are removed from the replacement map.
- T2: Symbolic/group mailbox display names before angle-bracket email addresses become ORG tokens when no person is parsed; decorated people retain existing behaviour.
- Testing fix: Remove highlighted text preserves the page scroll and output-pane scroll instead of jumping to the replacement map.
- Demo: Clearly fictional values cover all new automatic identifier categories and yellow types, with no confirmed leaks.
- Product footer: Adjacent local landing-page inspection preview, draft terms and draft privacy links. No deployment or public product release. Single-file scrubber runtime and original CSP remain unchanged.

Node acceptance/regression tests and installed browser automation are recorded in tests/V05-CHECKLIST.md. Exact real threads were not provided and remain unverified. The separate manual checklist distinguishes automated checks from human checks.

## 0.4.0 (2026-10-07)

- P1: One first-appearance sequence for numbered and labelled people, with collision-safe tokens.
- P2: Dedicated remembered Me name forms, always applied as `<ME>` before other people sources.
- P3: Empty thread-only people list; names and optional label; Save moves a row to Saved people; Clear empties thread rows. Free-version dropdown/default role rows removed.
- P4: Closed-by-default Saved people panel with accent/case-insensitive search, Edit/Remove, automatic application, date-only last use on actual replacement, and thread-form precedence.
- P5: v3 preferences hold `me`, `saved`, `kill`, `excluded`, `nextExcluded`; v2/v1 migration retains Me and named people with labels, then removes old keys. Forget/help/storage disclosures updated.
- R1: Forget is disabled during demo, with the specified tooltip, and reenabled on leaving it.
- R2: Possible-name pairs skip all-capital words and colon labels; Andre and Fictional Widgets still warn.
- R3: City/province or state becomes `<ADDRESS>` after an address line or directly before `<POSTAL>`; ordinary prose is preserved.
- R4: Help closes with a plain button calling `dialog.close()`, independent of `form-action`.
- R5: Migrated v1 string exclusions get a one-time whole-word reminder and link to exclusions. Only its pending/dismissed status is stored separately.

Updated sample uses Me, one labelled and one unlabelled thread person; demo runs do not write preferences. Existing offline single-file/CSP/no-library/Node/bilingual constraints remain. Paid-tier profile, presets, vertical rules, encryption/export/import and richer file formats remain deferred. Test coverage and unavailable real-thread rerun are documented in `tests/V04-CHECKLIST.md`.

## 0.3.0 (2026-10-07)

- E1: Highlighted exclusions now respect Unicode letter/digit boundaries. All-letter selections of three characters or fewer match case-sensitively; punctuation fragments and multiline passages remain supported.
- E2: Generic header decorations (`@`, parentheses, brackets and pipes) become stable `<ORG-n>` tokens, shared by exact decoration. Middle initials in `Last, First` names belong to the same person. Decorations participate in the leak check.
- E3: Possible prose names produce advisory warnings with per-name Remove buttons. Month names followed by a year are suppressed as date contexts, as approved by Jay. Warnings do not block Copy or automatically remove names.
- E4: Highlighted exclusions retain monotonic IDs when added or forgotten. Always remove tokens follow non-empty input-line order. Preferences migrate from v1 strings to v2 `{text,n}` objects, with v1 deleted only after the migrated preferences are stored.
- F1: Inline fictional bilingual three-message sample, demo heading and isolated temporary preferences. Editing the thread or Clear restores the saved configuration.
- F2: Five native popovers and an in-page keyboard-accessible help dialog explain limits, leak checks, roles, storage, forgetting and verifying local processing.

The single-file runtime, unchanged CSP, CommonJS engine/list exports, no runtime dependencies/network access, escaped dynamic output and no persistence of threads/results/maps are retained. Full reply chains are retained. Deferred launcher, commercial and unapproved additional features are not implemented.

Jay retains the two real October trial runs; synthetic English/French/Gmail fixtures are used for development. Browser verification details are in `tests/V03-CHECKLIST.md`.

## 0.2.0

Highlight removal, remembered browser-local people/exclusions, expandable role/title rows, separate Clear and Forget controls.
