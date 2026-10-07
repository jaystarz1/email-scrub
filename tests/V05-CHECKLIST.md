# v0.5 acceptance and verification

## Automated Node tests

- `engine.test.js`: 83 existing checks plus exclusions/labels.
- `v03.test.js`: all 10 regression groups. Only release version, seven help popovers and expanded demo length expectations change.
- `v04.test.js`: all 17 regression groups. Explicit labels no longer create gaps in generated PERSON numbers; release version updated.
- `v05.test.js`: I1 validated and invalid identifiers, originals, version/partial IP guards and handle/email ordering; I2 six flag types, final offsets/overlap and currency/date/time/phone/token guards; V1/V2 pure Keep/exclusion semantics and red/yellow separation; A1/A2 state labels and signatures; T1 numbering/maps/labels/ME; T2 symbolic/header fixtures; H1/H2 markup/help/order/control/privacy/demo constraints.
- `v05-browser.test.mjs` (also Node-run): V2/V3 saved versus transient removal and Keep/reload/Clear, all occurrences, A1-A3 states/reset/panel, focus/list navigation, keyboard Replace, actual clean clipboard, selected-text clipboard, page/output scroll regression, new popover mouse/touch/keyboard, demo no-red, mobile layout, no session storage, zero page network requests/errors.
- Existing browser regression scripts rerun in installed Chrome and Edge, with renamed review selectors and Always remove retaining the old persisted-removal intent. Exact output assertions strip hidden accessibility labels and controls.
- Installed Firefox uses geckodriver + BiDi request capture. Existing Firefox regression suite plus new v05 review/state/persistence/navigation/help suite.

These are automated browser checks from file://, not a claim that a person manually inspected all three browsers.

## Human manual checklist (not claimed complete)

In Chrome, Firefox and Edge, open the standalone HTML from file://:

- [ ] Watch Network during scrub, review, demo and help. Expect no network requests.
- [ ] Next focuses Replace, walks all yellow items and wraps.
- [ ] Tab/Shift+Tab, Enter and Space operate Replace, Keep, Always remove and Next.
- [ ] All seven popovers open/dismiss with mouse, touch, keyboard and Escape.
- [ ] Copy after acceptance pastes exactly the engine text, with no ✓, ✗, action labels or hidden labels.
- [ ] Manual selection Ctrl+C also excludes review controls.
- [ ] In particular, independently check actual Firefox system clipboard contents; automation verifies copy feedback/state, not OS clipboard readback there.
- [ ] Remove highlighted text deep in a long output keeps both output and document scroll positions.
- [ ] Check light/dark highlight readability and screen-reader labels.

## Exact real threads

Neither of Jay’s two real test threads nor their preferences was included in this request. No production or personal thread was fetched or committed to the test suite. Synthetic fixtures verify the partial service-number flag, post-exclusion numbering and symbolic group Cc. Exact real-thread reruns remain unverified.

## Scope notes

- ZIP values in an existing address context still replace as POSTAL, preserving v0.4 address behaviour. A bare state/ZIP reference is yellow; a standalone five-digit run is a generic ID flag.
- A Replace that leaves no new flags or leaks correctly shows Copy immediately, per A1. Resetting acceptance does not invent a review item.
- Footer links point to the adjacent local preview until the page is approved/deployed. Save both emailed HTML files together. The scrubber works independently.
- Terms and privacy are draft inspection material. No claim is made that a disclaimer transfers all statutory liability. Publisher identity, jurisdiction and hosting disclosures need confirmation before legal publication.
