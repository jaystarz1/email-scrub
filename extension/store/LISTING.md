# Chrome Web Store listing: Email Thread Scrubber 0.6.0

Copy-paste source for the developer dashboard. Upload `../dist/email-scrub-chromium-0.6.0.zip`
(rebuild first with `python3 extension/build_extension.py` if anything changed).

## Store listing tab

- **Name:** comes from the manifest (`Email Thread Scrubber`; French locale included)
- **Summary (127/132 chars):** from the manifest: Strip names, contact details, addresses, dates and IDs from an email thread before you paste it into an AI tool. Works offline.
- **Category:** Productivity > Tools
- **Language:** English (French locale ships in the package)
- **Store icon:** 128x128, already in the package (`icons/icon-128.png`)
- **Screenshots (1280x800):** `screenshot-1-before-after.png`, `screenshot-2-review.png`, `screenshot-3-start.png`
- **Small promo tile (440x280):** `promo-tile-440x280.png`
- **Homepage URL:** https://thechatbotgenius.com/email-scrubber/
- **Support URL:** https://github.com/jaystarz1/email-scrub/issues

### Description

Paste an email thread into an AI tool and you hand over every name, address and phone number in it. Email Thread Scrubber takes them out first.

Select a thread in Outlook on the web or Gmail, right-click, and choose "Scrub selected text". The scrubber opens in a new tab with the thread already cleaned. Or click the toolbar button and paste.

What it replaces:
- People, including the ones hiding in headers, signatures and "On Tuesday, Jordan wrote:" lines
- Email addresses, phone numbers and street addresses
- Dates, account numbers, ID numbers, IBANs, card numbers, IP addresses and links
- Any term you add to your own always-remove list

Each person gets a stable placeholder such as <CLIENT> or <PERSON-1>, so the AI can still follow who said what. A review step flags anything it is unsure about before you copy.

Private by design:
- Runs entirely in your browser. No network access, no account, no analytics.
- Reads a page only when you right-click and ask it to.
- Threads and results are never stored.

English and French interface. Open source under Apache-2.0.

It is a careful helper, not a guarantee. Always read the output before you paste it anywhere.

## Privacy practices tab

- **Single purpose:** Remove personal details (names, contact details, addresses, dates and identifiers) from email thread text the user selects or pastes, entirely on the device, so the text can be shared with AI tools.
- **contextMenus:** Adds a "Scrub selected text" entry to the right-click menu so the user can send a selected email thread to the scrubber.
- **activeTab:** After the user chooses "Scrub selected text", reads the selected text from the tab they right-clicked. No access to any page otherwise.
- **scripting:** Runs a one-line function in the right-clicked tab to read the selection with its line breaks (the context menu's own selection text loses them, which breaks email header detection). Runs only on the user's click.
- **storage:** Hands the selected text to the scrubber tab through in-memory session storage (deleted as soon as it is read) and keeps the user's own preferences (their name, saved people, always-remove terms) on the device.
- **Remote code:** No, I am not using remote code. All scripts are packaged in the extension.
- **Data usage:** tick nothing. The extension collects no user data; all processing is local and nothing is transmitted.
- **Certifications:** tick all three (no selling or transfer to third parties, no use unrelated to the single purpose, no use for creditworthiness or lending).
- **Privacy policy URL:** https://thechatbotgenius.com/email-scrubber/privacy.html

## Distribution tab

- **Visibility:** Public (or Unlisted for a soft launch: installable by link, not searchable)
- **Regions:** All regions
- **Pricing:** Free (the store has no payments; paid tiers would run through Stripe with a licence key)
