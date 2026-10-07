# v0.4 verification, 2026-10-07

## Acceptance coverage

- `v04.test.js`: 17 node acceptance groups covering P1 numbering/order/collisions, P2 Me precedence, P3 empty defaults/labels/Save/Clear, P4 automatic saved application/search/overrides/date-only actual-use updates, P5 migration/Forget, and R1-R5. Existing `engine.test.js` (83 checks plus exclusion/repeated-label regressions) and 10 v0.3 acceptance groups pass. The prior assertion keeping Ottawa beside a postal code was removed only as required by R3. The version assertion now expects 0.4.0.
- Installed Chrome and Edge: `browser.test.mjs`, `v03-browser.test.mjs`, `v04-browser.test.mjs` pass from `file://`. Includes persisted Me and Saved people, no persisted thread rows/input/output, closed saved panel, search/Edit/Remove, last-used updates only after replacement, override without mutating saved entries, Save/Clear/reload, v2-to-v3 key removal, v1 one-time notice/dismiss/reload/link, disabled demo Forget and exact tooltip, zero demo preference writes, restored configuration on Clear/input edit, help close button and Escape.
- Installed Firefox 157.0.1: `firefox.test.mjs` passes from `file://`, including migrated preferences/reload, Me, Save/Clear, search, usage/override, disabled demo Forget, v1 reminder dismissal/reload/link, plain help Close and Escape, scrub/highlight/copy feedback, five popovers and demo isolation.
- Zero external page network requests during scrub, demo, help and saved search: Playwright request capture in Chrome/Edge; WebDriver BiDi network capture in Firefox. Browser automation/test-driver traffic is outside the page.
- Existing desktop/narrow-screen, escaped-output, blocked-storage, clipboard equality (Chrome/Edge), highlight/multiline/token rejection and monotonic exclusions regressions pass.
- API and rendered footer read 0.4.0. Unchanged CSP; single assembled HTML; no runtime library/network calls or persisted threads/results/maps. `git diff --check` passes.

## Manual checklist and method

The requested browser checklist was exercised with automated interactions in installed Chrome, Firefox and Edge, rather than a person watching DevTools. Touch is simulated. For independent manual verification:

- Open `email-scrub.html` from `file://`, set Me, Save a person, reload. Me/Saved people return; thread rows/input/output do not.
- Open Help. Close with its button; reopen and press Escape.
- Watch DevTools Network during Scrub, Try a sample, Help and Saved people search. No page requests should appear.
- During demo, Forget is disabled with the specified tooltip. Clear or edit input; Forget reenables and saved preferences return.
- If migrating v1 string exclusions, Check the list opens exclusions. Dismiss and reload; the notice stays dismissed.

Firefox initially collided with an existing port 9222 listener. Restarting the test driver with `--websocket-port 9237` fixed the harness without changing that listener. All final checks pass.

## Limits and decisions

The real test thread and its preferences were not supplied or located in the existing fixtures. Its specific rerun cannot be claimed. Synthetic migrated-preference fixtures check the stated Me, whole-word exclusion and city/address expectations without placing private messages in the repository.

R5 recognizes v1 string-format exclusions during migration. It cannot infer their original selection or repair fragments. The separate `email-scrub.exclusions-notice.v1` key stores only pending/dismissed notice status; v3 preferences contain exactly the five requested top-level fields. The legacy roles API remains for regressions; the free UI contains no role dropdown/default rows. Paid-tier features were not built.

## Re-run

```sh
BROWSER_CHANNEL=chrome bash tests/run.sh
BROWSER_CHANNEL=msedge node tests/browser.test.mjs
BROWSER_CHANNEL=msedge node tests/v03-browser.test.mjs
BROWSER_CHANNEL=msedge node tests/v04-browser.test.mjs
# Separate terminal:
geckodriver --port 4445 --websocket-port 9237
node tests/firefox.test.mjs
```
