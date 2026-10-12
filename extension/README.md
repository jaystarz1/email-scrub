# Email Thread Scrubber: browser extension

The same scrubber as `email-scrub.html`, packaged as a browser extension, plus a
right-click entry: select a thread on any page (Outlook on the web, Gmail), right-click,
**Scrub selected text**, and the scrubber opens in a new tab with that text already scrubbed.
The toolbar button opens an empty scrubber.

| Package | Browsers |
| --- | --- |
| `dist/email-scrub-chromium-<ver>.zip` | Chrome, Edge, Brave, Opera, Vivaldi (116+) |
| `dist/email-scrub-firefox-<ver>.zip` | Firefox 140+ (ESR 140 and current) |
| Safari | Not built here (needs full Xcode, see below) |

## Build and test

```bash
python3 build.py                          # if src/ changed
python3 extension/build_extension.py      # writes extension/dist/
node extension/tests/chromium.test.mjs    # Playwright Chromium; BROWSER_CHANNEL=msedge for Edge
node extension/tests/firefox.test.mjs     # headless Firefox via geckodriver
```

The build splits each inline `<script>` into its own file (extension pages may not run
inline script) and narrows the page CSP to `script-src 'self'`; everything else in the CSP
(no network, no forms, no base) is unchanged. The scrubber code itself is not modified.

## Install without a store (testing)

- **Chrome / Edge / Brave / Opera**: open `chrome://extensions` (`edge://extensions`),
  turn on Developer mode, **Load unpacked**, pick `extension/dist/chromium`.
- **Firefox**: `about:debugging#/runtime/this-firefox` > **Load Temporary Add-on**, pick
  `extension/dist/firefox/manifest.json`. Temporary add-ons are removed when Firefox closes;
  a permanent install needs a Mozilla-signed file (upload the zip to addons.mozilla.org,
  listed or unlisted).

## Publish

- Chrome Web Store: upload the chromium zip (one-time US$5 developer fee).
- Microsoft Edge Add-ons: upload the same chromium zip (free Partner Center account).
- Firefox: upload the firefox zip to addons.mozilla.org.
- Safari: on a Mac with Xcode, `xcrun safari-web-extension-converter extension/dist/chromium`,
  build the generated app, sign it with an Apple Developer account (US$99/yr) for
  distribution.

## Permissions and privacy

`contextMenus` (the right-click entry), `activeTab` + `scripting` (read the selection,
with line breaks, from the tab you right-clicked, only at that moment), `storage` (hand
the selection to the scrubber tab through in-memory session storage; the entry is deleted
as soon as the scrubber reads it). No host permissions, no network access, no content
scripts on pages you visit. Saved people and exclusions live in the extension's own
browser storage, separate from the HTML file's.

When the selected text is inside a frame the extension can't read, the browser's own
copy of the selection is used, and Chromium flattens its line breaks. Paste the thread
into the box instead in that case.
