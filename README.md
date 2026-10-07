# Email Thread Scrubber

Paste an email thread, name the people who matter, and copy out a version with the personal details
taken out, ready to paste into ChatGPT, Claude or any other AI tool. It is one HTML file. It runs in
your browser, has no network access, installs nothing and never stores pasted threads or output. People and exclusions are remembered locally in your browser.

Working name; not final.

## Use it

1. Download [`email-scrub.html`](email-scrub.html) and double-click it.
2. Paste a thread (or open a `.txt` file), or click **Try a sample** for a fictional demonstration that leaves your saved preferences unchanged.
3. Optional: under **Who's who**, set **Me** once (comma-separated name forms). It always becomes `<ME>`.
   Add a person under **This thread**, with an optional label such as `GRIEVOR`; without a label they become
   `<PERSON-n>` in first-appearance order alongside discovered people. **Save** moves that row into **Saved people**.
   Saved people apply to every scrub, can be searched without case/accent distinctions, and show only the date last used.
   Me is matched first; a this-thread name form wins over the same saved form. Generated PERSON tokens are renumbered after replacements so visible numbers have no gaps.
   Explicit labels and Me are unchanged; reserved labels remain collision-safe.
4. Optional: under **Always remove**, list anything else that identifies people or the business.
5. Press **Scrub**, read it over, then highlight remaining private text in **Check and copy** and click **Remove highlighted text**. All matching occurrences become `<EXCLUDED-1>` etc.; selections ending in letters/digits respect word boundaries; punctuation fragments and multiline passages work too. All-letter selections of three characters or fewer are case-sensitive. Numbers stay stable when other exclusions are added or forgotten.
6. Resolve yellow items with **Replace** (thread only), **Always remove** (remembered), or **Keep** (thread only). **Next** focuses the next yellow item and wraps.
7. If anything remains to review, press **Accept**, then **Copy**. Red acceptance names confirmed leaks. Acceptance resets when the copy text changes or new flags/leaks appear; Keep alone does not reset it. The clipboard contains the engine’s text, without buttons or labels.

The AI's reply comes back with the same placeholders. Put the real names back as you paste it into
your email. The page shows which placeholder stands for whom; that list never leaves the page.

## What it removes

| Found | Becomes |
| --- | --- |
| People in From/To/Cc lines, "On ... wrote:" lines, greetings, sign-offs, signatures, titles (Mr, Ms, Dr, Me, Mme) and full names in the text | `<PERSON-1>`, `<PERSON-2>`... one number per person, every form of their name |
| Generic header display-name decorations | `<ORG-1>`, `<ORG-2>`... shared for the same decoration |
| Names you enter under Who's who | `<ME>`, your label, or `<PERSON-n>` |
| Your Always remove terms | `<TERM-1>`... |
| Email addresses, web links | `<EMAIL>`, `<URL>` |
| Phone numbers (North American and international, with extensions) | `<PHONE>` |
| Street addresses (English and French), PO boxes, Canadian postal codes, US ZIP codes in address context | `<ADDRESS>`, `<POSTAL>` |
| Dates (English and French) | `<DATE-1>`... the same day always gets the same number |
| SIN (checked), SSN, card numbers (checked), labelled account, policy, claim, file and case numbers | `<SIN>`, `<SSN>`, `<CARD>`, `<ID>` |
| Valid IBANs (mod-97), Canadian transit/institution/account groups | `<IBAN>`, `<BANK>` |
| IPv4/IPv6 and MAC addresses | `<IP>`, `<MAC>` |
| VINs with a valid check digit, decimal coordinate pairs, social handles | `<VIN>`, `<GPS>`, `<HANDLE>` |
| Confidentiality notices | `[Confidentiality notice removed]` |
| "Sent from my iPhone" lines and inline image references | removed |

It keeps what the reply needs: times, amounts, clause and section numbers, invoice numbers, job
titles and ordinary words. A note at the top (optional) asks the AI to keep the placeholders as they are.

Yellow inline review marks possible names, ambiguous ID-like values, file names, ages, bare profile paths and ZIP codes directly after a US state. Organisation-specific numbers are generic ID flags rather than automatic replacements. Every occurrence is reviewed in context, with stable final-output offsets available as `result.flags`: `{id,kind,text,start,end}`. Confirmed leaks have separate red highlights.

The closed **Review items** panel lists yellow items and confirmed leaks, with navigation to each. Legacy organisation/fragment advisories remain in the panel. Copy is a two-step Accept-then-Copy when unresolved flags or leaks exist, and one step for a clean result. Passing a leak check does not prove anonymity. The seven **?** buttons and **Help** dialog explain the controls and limits. Native popovers require a recent browser.

## What it does not do

- It does not make a thread anonymous. Facts can still point to a person ("the only accountant in the
  Halifax office"). Read the output before you share it.
- It finds people from the structure of an email and a list of common English and French first names.
  A surname mentioned on its own, with no greeting, header or signature to tie it to, can be missed:
  add it under Always remove.
- Company names are kept unless you list them (they are often needed). Email domains are checked and
  flagged.
- No Word or PDF files, no scanned pages, no restoring names. Paste, scrub, copy.

## Saved people and exclusions

Only **Me**, **Saved people**, Always remove terms and highlighted exclusions are remembered in this browser.
They are **not encrypted**. This-thread rows, Replace exclusions, Keep choices, pasted threads, results and replacement maps stay in memory.
The saved-person structure is `{id, names, label, lastUsed}`; `lastUsed` holds a local date only and changes when
that person's name is actually replaced. Preferences use `email-scrub.preferences.v3` with `me`, `saved`, `kill`,
`excluded` and `nextExcluded`. Older role rows migrate into Me/Saved people, with custom titles retained as labels.
Old keys are removed only after the migrated store is written. A separate notice-state key holds only
`pending`/`dismissed` for the older whole-word exclusion reminder, never any thread information.

**Clear current thread** empties its rows, input, result, Replace exclusions and Keep choices, keeping Me and Saved people. **Forget saved people
and exclusions** erases remembered preferences and exclusions. It is disabled during the fictional demo;
Clear or editing the input exits the demo and restores real preferences. Individual saved people can be edited or removed;
individual highlighted terms can be forgotten. After migrating string exclusions from v1, a one-time reminder links to
that list: fragments now match whole words only and cannot be automatically repaired without the original text.

Keep the HTML file at the same location when updating it. Browser storage for a directly opened
`file:` URL varies by browser and policy; moving the file, changing browsers, private mode or
clearing site data can lose the saved list. If storage is blocked or corrupt, a visible message
explains it and the scrubber still works for the current session. This is convenience storage,
not a backup. See [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).

## Check it yourself

The page declares a Content Security Policy with `default-src 'none'`, so the browser itself blocks
every network request. Open your browser's developer tools, Network tab, and use the page: nothing is
sent. The whole program is the readable code inside `email-scrub.html`, and it has no dependencies.

## Develop

```
python3 build.py          # src/app.html + src/lists.js + src/engine.js -> email-scrub.html
node tests/v03.test.js    # v0.3 regressions (version expectation updated)
node tests/v04.test.js    # v0.4 regressions, numbering/version expectations updated
node tests/v05.test.js    # identifiers, flags, state helpers, numbering, headers, help/privacy
node tests/v05-browser.test.mjs # inline review/state/storage/scroll/focus/clipboard/offline checks
node tests/engine.test.js # synthetic Outlook (EN/FR) and Gmail threads, guards, leak check
node tests/browser.test.mjs   # real browser: highlighting, persistence, no stored threads, copy, blocked storage, no network (needs Playwright)
```

Rules go in `src/engine.js`; word lists go in `src/lists.js`. Test threads are invented; never add a
real email to the tests.

Browser acceptance and network capture: `BROWSER_CHANNEL=chrome` or `msedge` with
`tests/browser.test.mjs`, `tests/v03-browser.test.mjs` , `tests/v04-browser.test.mjs` and `tests/v05-browser.test.mjs`.
Installed Firefox uses `tests/firefox.test.mjs` with `geckodriver --port 4445 --websocket-port 9237`.
These are developer test tools only; recipients need no runtime libraries or build step.
Also run `GECKODRIVER_URL=http://127.0.0.1:4445 node tests/v05-firefox.test.mjs`.
See [v0.5 checklist](tests/V05-CHECKLIST.md) for the manual items and verification limits.

## Product page preview

The v0.5 testing build’s footer points to an adjacent `email-scrub-landing.html` preview with draft terms/privacy. Save the two delivered HTML files together to inspect it. The scrubber still runs alone; it does not load the preview or contact any website automatically. No landing page has been deployed and the draft legal wording is not a published agreement. Integration with the live website and final publisher details require a separate inspection decision.

## Licence

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
