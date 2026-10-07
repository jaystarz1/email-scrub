// Synthetic threads only. Each fixture lists what must disappear and what must survive.
const assert = require('node:assert/strict');
const { scrub, leakCheck } = require('../src/engine.js');

const OUTLOOK_EN = `From: Whitfield, Jordan <jordan.whitfield@harbourline.ca>
Sent: Tuesday, March 12, 2024 9:14 AM
To: Okafor, Adaeze <aokafor@brightpath-consulting.com>; Lindqvist, Mark <mark.lindqvist@harbourline.ca>
Cc: Perrault, Simone <simone.perrault@harbourline.ca>
Subject: RE: Invoice 4471 and the March 28 deadline

Hi Adaeze,

Thanks for the update. Mark and I reviewed clause 12.1.3 and section 7(2) of the agreement. Simone will confirm the
revised total of $14,250.00 by March 28, 2024. Please send the signed copy to 1450 Riverside Drive, Suite 300,
Ottawa, ON K1G 4T3 or call me at (613) 555-0142 ext. 221.

Regards,

Jordan Whitfield
Director, Client Services
Harbourline Logistics
T: 613-555-0142 | M: +1 613 555 0199
www.harbourline.ca

CONFIDENTIALITY NOTICE: This email is confidential and may be privileged. If you are not the intended recipient,
please notify the sender and delete this message.

From: Okafor, Adaeze <aokafor@brightpath-consulting.com>
Sent: Monday, March 11, 2024 4:02 PM
To: Whitfield, Jordan <jordan.whitfield@harbourline.ca>
Subject: Invoice 4471 and the March 28 deadline

Good afternoon Jordan,

Following up on our call on 2024-03-11. Our account number is Account #: 88120457. Ms. Okafor's mobile is 416-555-0188.
Can you confirm by March 28, 2024?

Best,
Adaeze

Sent from my iPhone`;

const GMAIL = `On Wed, Apr 3, 2024 at 10:22 AM Priya Raman <priya.raman@gmail.com> wrote:
> Hey Tom,
> I spoke with Karen Walsh yesterday. She said the May 2024 board meeting is moved.
> Will you be there?
> Cheers,
> Priya

Tom Becker
tom.becker@northfield.org`;

const OUTLOOK_FR = `De : Tremblay, Marie-Ève <marie-eve.tremblay@exemple.qc.ca>
Envoyé : 4 avril 2024 08:30
À : Gagnon, Luc <luc.gagnon@exemple.qc.ca>
Objet : Dossier 2024-118

Bonjour Luc,

Comme convenu, Me Bouchard a reçu le contrat le 4 avril 2024. L'adresse est 220, rue Saint-Joseph Est, Québec
(Québec) G1K 3A9. Mon numéro : 418 555-0177.

Cordialement,

Marie-Ève Tremblay
Conseillère juridique

Le mer. 3 avr. 2024, à 16 h 05, Luc Gagnon <luc.gagnon@exemple.qc.ca> a écrit :
> Merci Marie-Ève.`;

let checks = 0;
function expect(fixture, opts, gone, stay) {
  const r = scrub(fixture, opts);
  for (const g of gone) { assert(!r.text.toLowerCase().includes(g.toLowerCase()), `LEAK "${g}"\n---\n${r.text}`); checks++; }
  for (const s of stay) { assert(r.text.includes(s), `LOST "${s}"\n---\n${r.text}`); checks++; }
  assert.deepEqual(r.leaks, [], 'leak check flagged: ' + r.leaks); checks++;
  return r;
}

// 1. Outlook, English: headers, greeting, signature, contact block, address, disclaimer, IDs
let r = expect(OUTLOOK_EN, {},
  ['Whitfield', 'Jordan', 'Okafor', 'Adaeze', 'Lindqvist', 'Perrault', 'Simone', 'harbourline.ca', 'brightpath', '555-0142', '555-0199', '555-0188',
   '1450 Riverside', 'K1G', '88120457', 'intended recipient', 'iPhone', 'March 12, 2024', '2024-03-11'],
  ['clause 12.1.3', 'section 7(2)', '$14,250.00', 'Invoice 4471', 'Director, Client Services', 'Harbourline Logistics', 'Ottawa', '9:14 AM', 'Subject: RE: Invoice 4471 and the <DATE-2> deadline', '[Confidentiality notice removed]']);
assert(/Mark and I/.test(OUTLOOK_EN) && !/\bMark\b/.test(r.text), 'first name of a header person replaced'); checks++;
const t = scrub(OUTLOOK_EN, { note: false }).text;
assert.equal((t.match(/<DATE-2>/g) || []).length, 4, 'same date, same token (March 28 x4, two with year, two without): ' + t); checks++;
assert(/<PERSON-1>/.test(t) && /<PERSON-2>/.test(t), 'numbered people'); checks++;
assert(r.people.find(p => p.names === 'Jordan Whitfield').token === '<PERSON-1>', 'first sender is PERSON-1'); checks++;
assert(r.text.includes('From: <PERSON-1> <EMAIL>') && !r.text.includes('<<EMAIL>>'), 'one clean email token'); checks++;
assert(r.warnings.some(w => /Harbourline Logistics/.test(w)), 'company named in the signature is flagged: ' + r.warnings); checks++;

// 2. Roles collapse every form of a name; the kill list removes the user's own terms
r = expect(OUTLOOK_EN, { roles: [{ label: 'Client', names: ['Adaeze Okafor'] }, { label: 'My company', names: ['Harbourline Logistics', 'Harbourline'] }], kill: ['Invoice 4471'] },
  ['Okafor', 'Adaeze', 'Harbourline', 'Invoice 4471'],
  ['<CLIENT>', '<MY-COMPANY>', '<TERM-1>', "<CLIENT>'s mobile"]);
assert(!/<PERSON-\d+>.*Okafor/.test(r.text) && r.people.find(p => /Okafor/.test(p.names)).token === '<CLIENT>', 'detected person joins the role'); checks++;

// 3. Gmail reply line, quoted text, a name in prose, word-like words left alone
r = expect(GMAIL, {}, ['Priya', 'Raman', 'Karen Walsh', 'Walsh', 'Tom Becker', 'Becker', 'northfield', 'Apr 3, 2024'],
  ['May 2024 board meeting', '> Will you be there?', '10:22 AM']);
assert(/Hey <PERSON-\d+>,/.test(r.text), 'greeting name: ' + r.text); checks++;

// 4. French Outlook: De/À/Objet, Bonjour, Cordialement, Me (lawyer title), rue address, a écrit
r = expect(OUTLOOK_FR, {}, ['Tremblay', 'Marie-Ève', 'Gagnon', 'Luc', 'Bouchard', 'exemple.qc.ca', '220, rue Saint-Joseph', 'G1K', '555-0177', '4 avril 2024'],
  ['Objet : Dossier <ID>', 'Conseillère juridique', 'Comme convenu', 'le contrat le <DATE-1>']);
assert(/Bonjour <PERSON-\d+>,/.test(r.text)); checks++;
assert(/Me <PERSON-\d+>/.test(r.text), 'Me + surname: ' + r.text); checks++;

// 5. Over-redaction guards: ordinary prose, times, money, clause numbers, a word-like first name used as a word
r = scrub('Please review section 4.2 and clause 12.1.3 before 3:30 PM. The total is $1,250.00 for 12 units.\nWill this work? Grant funding may change.', {});
assert(r.text.endsWith('Please review section 4.2 and clause 12.1.3 before 3:30 PM. The total is $1,250.00 for 12 units.\nWill this work? Grant funding may change.'), r.text); checks++;
assert.equal(r.people.length, 0); checks++;

// 6. Idempotent: scrubbing the output again changes nothing but the note
const once = scrub(OUTLOOK_EN, { note: false }).text, twice = scrub(once, { note: false }).text;
assert.equal(twice, once); checks++;

// 7. The preservation note is on by default and can be switched off
assert(scrub('Hi there', {}).text.startsWith('Note: placeholders')); checks++;
assert(!scrub('Hi there', { note: false }).text.startsWith('Note:')); checks++;

// 8. Leak check catches a name the replacement missed (a role name inside a longer word is not a leak)
r = scrub('From: Jane Doe <jane.doe@x.com>\nHi Jane, see you Monday.', { note: false });
assert(!/Jane|Doe/.test(r.text) && r.secrets.includes('Jane'), r.text); checks++;
assert.deepEqual(leakCheck(r.text + ' Jane said hi.', r.secrets), ['Jane']); checks++;   // a name typed back in by hand

// 9. SIN with a valid check digit is removed; an invalid one (a reference number) is kept
r = scrub('SIN 046 454 286 and ref 123 456 789', { note: false });
assert(r.text.includes('<SIN>') && r.text.includes('123 456 789'), r.text); checks++;

console.log(`PASS engine: ${checks} checks (Outlook EN/FR, Gmail, roles, kill list, dates, guards, idempotence, note, SIN)`);

// Manual selections remove exact fragments and multiline passages and preserve placeholders.
const manual = scrub('codeprivate codeprivate. Private passage\ncontinues here. <EMAIL>', { excluded: ['private', 'Private passage\ncontinues here.'], note: false });
assert(!manual.text.includes('private')); assert(!manual.text.includes('continues here'));
assert(manual.text.includes('<EMAIL>')); assert.equal(manual.counts.terms, 3);
const repeatedRoles = scrub('Zorvex Quill and Velqor Drenn', { roles: [{ label: 'Boss', names: ['Zorvex Quill'] }, { label: 'Boss', names: ['Velqor Drenn'] }], note: false });
assert(repeatedRoles.text.includes('<BOSS>')); assert(repeatedRoles.text.includes('<BOSS-2>'));
console.log('PASS manual exclusions and distinct repeated-role placeholders');
