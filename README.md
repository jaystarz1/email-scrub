# Email Thread Scrubber

Paste an email thread, name the people who matter, and copy out a version with the personal details
taken out, ready to paste into ChatGPT, Claude or any other AI tool. It is one HTML file. It runs in
your browser, has no network access, installs nothing and saves nothing.

Working name; not final.

## Use it

1. Download [`email-scrub.html`](email-scrub.html) and double-click it.
2. Paste a thread (or open a `.txt` file).
3. Optional: under **Who's who**, enter the people and organisations that matter to you. Their names
   become the role everywhere: `<CLIENT>`, `<BOSS>`, `<VENDOR>`, `<MY-COMPANY>`, or labels you type.
4. Optional: under **Always remove**, list anything else that identifies people or the business.
5. Press **Scrub**, read it over, press **Copy**.

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
- No Word or PDF files, no scanned pages, no saved lists, no restoring names. Paste, scrub, copy.

## Check it yourself

The page declares a Content Security Policy with `default-src 'none'`, so the browser itself blocks
every network request. Open your browser's developer tools, Network tab, and use the page: nothing is
sent. The whole program is the readable code inside `email-scrub.html`, and it has no dependencies.

## Develop

```
python3 build.py          # src/app.html + src/lists.js + src/engine.js -> email-scrub.html
node tests/engine.test.js # synthetic Outlook (EN/FR) and Gmail threads, guards, leak check
node tests/browser.test.mjs   # real browser: copy, nothing stored, no network (needs Playwright)
```

Rules go in `src/engine.js`; word lists go in `src/lists.js`. Test threads are invented; never add a
real email to the tests.

## Licence

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
