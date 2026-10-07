# v0.3 verification, 2026-10-07

## Completed

- Existing engine suite: 84 checks plus manual-exclusion/repeated-role checks. Updated only prior fragment assertions where E1 intentionally changes behaviour.
- v0.3 node suite: 10 acceptance groups covering E1–E4, fictional sample content/tokens, bilingual examples, unchanged CSP and self-contained runtime.
- Installed desktop Chrome and Edge: existing browser regression suite, clipboard content equality, persistence, blocked storage, escaped output and narrow viewport passed from `file://`.
- Installed desktop Chrome and Edge: new v0.3 suite passed actual DOM interactions for v1 migration/removal, non-reused IDs after forgetting/reload, candidate Remove, demo preference isolation (including edits and Forget), input/Clear exit, all five native popovers by click, simulated touch, keyboard, outside dismissal and Escape, and keyboard-accessible dialog/Escape/Close.
- Installed stock Firefox 157.0.1: geckodriver suite passed `file://` scrub/demo/help, migration, preference isolation, candidate Remove, counter reload, all five popovers by mouse/simulated touch/keyboard/outside/Escape, dialog, and Copy success/fallback feedback. Chrome/Edge additionally verify actual clipboard bytes.
- No page network requests during scrub/demo/help: Playwright request capture for Chrome/Edge; WebDriver BiDi network events for Firefox. Readable help screenshots from all three browsers inspected.
- `git diff --check`: passed. Delivered HTML assembled from current inline sources; API/footer version 0.3.0. CSP matches prior version exactly.

## Test method and scope

Real browser checks are automated rather than a person watching the developer-tools Network tab. Touch is simulated, not a physical touchscreen test. Manual DevTools steps remain in the in-page help for independent verification.

Jay retains the two real October LLM-parsability trial runs per his fresh clarification. Synthetic Outlook English/French and Gmail fixtures were rerun; no real thread or identity was added to the repository.

The first Chrome v0.3 test expected an accented candidate already removed by the existing accent-tolerant exclusion; the test now adds a distinct name and passes. Firefox's initial BiDi startup collided with a pre-existing port 9222 listener; the test driver was restarted on dedicated port 19335, without changing that listener. The final Firefox check passes.

## Re-run

```sh
python3 build.py
node tests/engine.test.js
node tests/v03.test.js
BROWSER_CHANNEL=chrome node tests/browser.test.mjs
BROWSER_CHANNEL=msedge node tests/browser.test.mjs
BROWSER_CHANNEL=chrome node tests/v03-browser.test.mjs
BROWSER_CHANNEL=msedge node tests/v03-browser.test.mjs
# In another terminal: geckodriver --port 4445 --websocket-port 19335 --log error
node tests/firefox.test.mjs
```

Browser automation tools are development-only. The delivered HTML still has no libraries, build requirement, network calls or external assets.
