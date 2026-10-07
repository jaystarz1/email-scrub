# Email Thread Scrubber

Paste an email thread, name the people who matter, and copy out a version with the personal details
taken out, ready to paste into ChatGPT, Claude or any other AI tool. It is one HTML file. It runs in
your browser, has no network access, installs nothing and never stores pasted threads or output. People and exclusions are remembered locally in your browser.

Working name; not final.

## Use it

1. Download [`email-scrub.html`](email-scrub.html) and double-click it.
2. Paste a thread (or open a `.txt` file).
3. Optional: under **Who's who**, enter the people and organisations that matter to you. Their names
   become the role everywhere: `<CLIENT>`, `<BOSS>`, `<VENDOR>` or any custom title. Every row has a dropdown and editable title; add/remove as many people as needed. Two people with the same role get different placeholders, such as `<BOSS>` and `<BOSS-2>`.
4. Optional: under **Always remove**, list anything else that identifies people or the business.
5. Press **Scrub**, read it over, then highlight remaining private text in **Check and copy** and click **Remove highlighted text**. All matching occurrences become `<EXCLUDED-1>` etc.; fragments and multiline passages work too.
6. Press **Copy**. The clipboard contains the actual scrubbed text, not a visual overlay.

The AI's reply comes back with the same placeholders. Put the real names back as you paste it into
your email. The page shows which placeholder stands for whom; that list never leaves the page.

## What it removes

| Found | Becomes |
| --- | --- |
| People in From/To/Cc lines, "On ... wrote:" lines, greetings, sign-offs, signatures, titles (Mr, Ms, Dr, Me, Mme) and full names in the text | `<PERSON-1>`, `<PERSON-2>`... one number per person, every form of their name |
| Names you enter under Who's who | `<CLIENT>`, `<BOSS>`, your label |
| Your Always remove terms | `<TERM-1>`... |
| Email addresses, web links | `<EMAIL>`, `<URL>` |
| Phone numbers (North American and international, with extensions) | `<PHONE>` |
| Street addresses (English and French), PO boxes, Canadian postal codes, US ZIP codes after a state | `<ADDRESS>`, `<POSTAL>` |
| Dates (English and French) | `<DATE-1>`... the same day always gets the same number |
| SIN (checked), SSN, card numbers (checked), labelled account, policy, claim, file and case numbers | `<SIN>`, `<SSN>`, `<CARD>`, `<ID>` |
| Confidentiality notices | `[Confidentiality notice removed]` |
| "Sent from my iPhone" lines and inline image references | removed |

It keeps what the reply needs: times, amounts, clause and section numbers, invoice numbers, job
titles and ordinary words. A note at the top (optional) asks the AI to keep the placeholders as they are.

Before **Copy** unlocks, a leak check confirms that nothing it removed is still in the text. It also
warns when an organisation named in the email addresses is still mentioned, or when something that
looks like part of a phone number or address is left.

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

The ten relative roles are Client, Boss, Vendor, Me, Colleague, Employee, Partner, Customer, Adviser,
and My company. A custom title overrides the dropdown. Names, titles, Always remove terms and
highlighted exclusions accumulate in this browser only. They are **not encrypted**; anyone with
access to the browser profile may be able to read them. Pasted threads and scrubbed results stay
in memory and are never written to localStorage or sessionStorage.

**Clear current thread** keeps your configuration. **Forget saved people and exclusions** erases
this app's saved configuration without touching other browser data. Individual highlighted terms
can be forgotten in the remembered-exclusions list; people can be removed or edited.

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
node tests/engine.test.js # synthetic Outlook (EN/FR) and Gmail threads, guards, leak check
node tests/browser.test.mjs   # real browser: highlighting, persistence, no stored threads, copy, blocked storage, no network (needs Playwright)
```

Rules go in `src/engine.js`; word lists go in `src/lists.js`. Test threads are invented; never add a
real email to the tests.

## Licence

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
