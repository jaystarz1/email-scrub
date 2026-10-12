# v0.6 acceptance and human review checklist

Local review build only. No public release, remote push or email. French remains pending Jay's review.

## Automated acceptance mapping

| Requirement | Evidence |
|---|---|
| P: None unchanged; short/formal assembly order; edited copy; preset reset; choose after Accept | v06-core.test.js; v06-browser.test.mjs; v06-extended-browser.test.mjs |
| P: all thirteen presets, localized modifiers and visibility, last preset, no prompt-edit storage | v06-core.test.js; v06-extended-browser.test.mjs |
| S: bilingual title/unit/phone with blanks, retained name/sign-off, no block before header, long prose, delimiter/abbreviations | v06-signatures.test.js |
| S: signatures-off byte-equal output to baseline engine on synthetic fixtures/sample | v06-fixtures.test.js (baseline read with git show HEAD, no baseline source modified) |
| F: five synthetic EML fixtures, unfolded/encoded headers, QP/base64, HTML entities, ignored contents/decoded filenames, nested MIME/byte charset | v06-fixtures.test.js; v06-entities.test.js; v06-core.test.js |
| F: file picker, synthetic drop, multiple/unsupported/malformed safety, demo exit and result/history clearing | v06-browser.test.mjs; v06-extended-browser.test.mjs; v06-firefox.test.mjs |
| F: approximate words/tokens include prompt, long-warning threshold, no quadratic scan on long input | v06-core.test.js; v06-browser.test.mjs; v06-performance.test.js; v06-scrub-performance.test.js |
| L: browser French default, remembered override, live help/popover switch, localized prompts/status, mobile | v06-browser.test.mjs; v06-extended-browser.test.mjs; v06-firefox.test.mjs |
| U: Replace/Always remove/Keep Undo; restored exclusions and nondecrementing IDs; output Ctrl+Z; history clear | v06-browser.test.mjs; v06-extended-browser.test.mjs; v06-firefox.test.mjs |
| N: v3 to v4 preserves people/kill/exclusions/counters, write before delete; Forget retains lang/signatures and resets preset | v06-browser.test.mjs; v06-extended-browser.test.mjs; existing migration/storage regressions |
| Privacy: original CSP byte-identical; no runtime libraries; no saved input/result/history/prompt edits; Node engine | v06-fixtures.test.js, legacy privacy tests, three-browser network observation |

## Regression adapter — intentional changes only

Original tests stay intact. tests/v06-regressions.mjs runs them with temporary generated copies deleted in finally:

- Expected version 0.5.0 becomes 0.6.0; preference v3 becomes v4.
- Seven legacy inline scripts become ten (pure helper, static entity table, UI table); no external script.
- Source assertions for literal aria-label strings become centralized-table lookup assertions.
- Old demo/output snapshots explicitly turn signature removal off. Default-on is asserted in new acceptance.
- Forget confirmation is accepted; empty retained v4 preferences replace the old null-store assertion. Firefox's test-only confirm stub is limited to its ephemeral test page.

Four legacy Node suites and four Playwright legacy browser suites pass on Chrome and Edge. Both legacy Firefox suites pass on installed Firefox via geckodriver. No unexplained regression is waived. Run commands are in tests/run-v06.py. Logs accompany the staged delivery.

## Browser automation (not human manual testing)

- Installed Chrome and Edge: file:// full new/extended suites; real clipboard read-back matches prompt assembly; synthetic drag/drop and FileReader; focus/key events; open popover/dialog language switch; zero observed app nonlocal requests/page errors.
- Installed Firefox 157.0.1: file:// new v06 and legacy WebDriver suites; synthetic EML drop/filename review, size/signatures/Undo, live French help/popover, zero observed app requests/errors through BiDi. Clipboard success/fallback feedback checked; OS clipboard contents NOT independently read back in Firefox.
- No browser profile/account/authentication changes. Standard ephemeral test contexts only. geckodriver uses local ports; remote browsers/services are not used.

## Human manual checklist — NOT PERFORMED

Automation above is supplementary, not a claim of manual completion. Before release, on each installed Chrome/Firefox/Edge:

- [ ] Open local HTML; drag one real TXT and EML from Finder; confirm dashed outline, language-specific cue and demo exit. Drop two files and unsupported PDF/MSG; original input must remain untouched.
- [ ] Select a preset after accepting; edit it; copy into a plain editor and check full assembly/order and exact placeholders. Repeat None; read clipboard contents in Firefox.
- [ ] Keyboard-only focus through review, Replace/Always remove/Keep/Undo; Ctrl/Cmd+Z in output reverses review, in input uses ordinary textarea undo only. Check mobile tap targets.
- [ ] Switch EN/FR while each popover and full help are open. Read the whole French inventory and approve/correct terminology.
- [ ] Compare two legitimate original real threads with signatures on/off locally; no real text may be saved in fixtures, logs or review documents.
- [ ] Confirm Network tab has no app requests during drop, prompt, switch and copy (do not click external baseline footer links for this check).

## Limitations

The two original real threads are unavailable to this executor; none were fetched from inboxes or put into tests. Human checklist and French approval remain pending, not implementation failures disguised as passes. Signature stripping is heuristic: short prose without sentence-ending punctuation may look like a signature; toggle it off when needed. EML implements the requested common formats, not every MIME variant (depth capped at 30, no MSG/PDF/OCR, attachment contents ignored). Malformed encodings may show safe read-error feedback. Counts are approximations, not model-tokenizer counts. AI placeholder compliance and perfect anonymity are never guaranteed.
