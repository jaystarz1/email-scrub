/* email-scrub engine: removes personal details from a pasted email thread, locally.
 * Rules live here; word lists live in lists.js. Runs in the browser and in node (tests).
 * scrub(text, { roles: [{ label, names: [] }], kill: [], note: true }) -> { text, people, counts, leaks, warnings }
 */
(function (root) {
  'use strict';
  var L = (typeof module !== 'undefined' && module.exports) ? require('./lists.js') : root.EmailScrubLists;

  // ---------- helpers ----------
  function fold(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  var COMMON = new Set(L.commonEN.concat(L.commonFR, L.months, L.notNames).map(fold));
  var FIRST = new Set(L.firstNames.map(fold));
  var MONTH_WORDS = new Set(L.months.map(fold));
  var WORDLIKE_FIRST = new Set(L.wordlikeFirstNames.map(fold));
  var CAP = '\\p{Lu}[\\p{L}\'’-]*';                       // Capitalized word (also McKay, O'Neil, Jean-Luc)
  var NB = '(?<![\\p{L}\\p{N}])', NA = '(?![\\p{L}\\p{N}])';
  // Literal, case- and accent-tolerant, whole-word pattern for a term the user typed.
  function termPattern(t) {
    var map = { a: 'aàâä', c: 'cç', e: 'eéèêë', i: 'iîï', o: 'oôö', u: 'uùûü', y: 'yÿ' };
    var body = fold(t.trim()).split('').map(function (ch) {
      if (map[ch]) return '[' + map[ch] + ']';
      if (/\s/.test(ch)) return '\\s+';
      if (ch === "'" || ch === '’') return "['’]";
      return esc(ch);
    }).join('');
    return NB + body + NA;
  }
  var TOKEN_RE = /<[A-Z][A-Z0-9-]*>|\[Confidentiality notice removed\]/g;
  // Apply a replacement only outside tokens already placed, so later rules never rewrite a token.
  function outside(text, re, fn) {
    var out = '', last = 0, m; TOKEN_RE.lastIndex = 0;
    var parts = [];
    while ((m = TOKEN_RE.exec(text))) { parts.push([last, m.index, false]); parts.push([m.index, m.index + m[0].length, true]); last = m.index + m[0].length; }
    parts.push([last, text.length, false]);
    parts.forEach(function (p) { var s = text.slice(p[0], p[1]); out += p[2] ? s : s.replace(re, fn); });
    return out;
  }
  function titleCase(w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }
  function isNameWord(w) { return /^\p{Lu}[\p{L}'’-]*$/u.test(w) && w.replace(/[^\p{L}]/gu, '').length >= 2; }

  // ---------- patterns ----------
  var EMAIL = /[\p{L}\p{N}._%+'’-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/gu;
  var URL = /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi;
  var PHONE = /(?<![\p{L}\p{N}.])(?:\+?1[ .-]?)?(?:\(\d{3}\)\s?|\d{3}[ .-])\d{3}[ .-]\d{4}(?:\s*(?:x|ext\.?|extension|poste|#)\s*\d{1,6})?(?![\p{N}])|(?<![\p{L}\p{N}])\+(?:[2-9]\d{0,2})(?:[ .-]?\(?\d{1,4}\)?){2,5}(?![\p{N}])/giu;
  var POSTAL_CA = /(?<![\p{L}\p{N}])[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d(?![\p{L}\p{N}])/giu;
  var ZIP_US = /(?<=\b(?:A[LKZR]|C[AOT]|DE|DC|FL|GA|HI|I[ADLN]|K[SY]|LA|M[EDAINSOT]|N[EVHJMYCD]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[TA]|W[AVIY])\s{1,2})\d{5}(?:-\d{4})?\b/g;
  var STREET_TYPES = 'Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Crt|Crescent|Cres|Way|Place|Pl|Terrace|Terr|Parkway|Pkwy|Circle|Cir|Highway|Hwy|Trail|Square|Sq';
  var ADDRESS = new RegExp('(?<![\\p{L}\\p{N}])(?:(?:Suite|Unit|Apt\\.?|Apartment|#)\\s*\\w+[,\\s]+)?\\d{1,6}[A-Za-z]?(?:-\\d{1,5})?\\s+(?:' + CAP + '\\s+){1,4}(?:' + STREET_TYPES + ')\\.?(?:\\s+(?:N|S|E|W|NE|NW|SE|SW|North|South|East|West|Est|Ouest|Nord|Sud))?(?:,?\\s*(?:Suite|Unit|Apt\\.?|#)\\s*\\w+)?(?![\\p{L}\\p{N}])'
    + '|(?<![\\p{L}\\p{N}])\\d{1,6}[A-Za-z]?,?\\s+(?:rue|chemin|ch\\.|boulevard|boul\\.|av\\.|avenue|route|rang|place|montée|côte)\\s+(?:(?:de|du|des|de la|d[\'’]|la|le|l[\'’]|St-|Ste-|Saint-|Sainte-)\\s*)*' + CAP + '(?:[\\s-]+' + CAP + '){0,3}', 'gu');
  var PO_BOX = /\b(?:P\.?\s?O\.?\s?Box|C\.?\s?P\.?|Case postale)\s*\d+\b/gi;
  var SIN = /(?<![\p{N}])\d{3}[ -]\d{3}[ -]\d{3}(?![\p{N}])/gu;           // checked with Luhn
  var SSN = /(?<![\p{N}-])\d{3}-\d{2}-\d{4}(?![\p{N}-])/g;
  var CARD = /(?<![\p{N}])(?:\d[ -]?){12,18}\d(?![\p{N}])/gu;            // checked with Luhn
  var LABELLED_ID = /\b((?:Account|Acct|Policy|Claim|Member|Employee|Customer|Client|Case|File|Matter|Patient|Student|Licen[cs]e|Passport|Health card|Dossier|Compte|Police|Réclamation|Matricule)\s*(?:no\.?|number|#|n[o°]\.?|numéro)?\s*[:#]?\s*)([A-Z0-9][A-Z0-9-]{3,})\b/giu;
  function luhn(d) { var s = 0; for (var i = 0; i < d.length; i++) { var x = +d[d.length - 1 - i]; if (i % 2) { x *= 2; if (x > 9) x -= 9; } s += x; } return s % 10 === 0; }

  // Dates. Same calendar day -> same token, numbered in order of first appearance.
  var MON = { jan: 1, feb: 2, fev: 2, mar: 3, apr: 4, avr: 4, may: 5, mai: 5, jun: 6, jui: 6, jul: 7, aug: 8, aou: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  var MONTHS_RE = '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|janv(?:ier)?|f[ée]v(?:r(?:ier)?)?|mars|avr(?:il)?|mai|juin|juil(?:let)?|ao[uû]t|sept(?:embre)?|oct(?:obre)?|nov(?:embre)?|d[ée]c(?:embre)?)\\.?';
  var WDAY = '(?:(?:Mon|Tue|Tues|Wed|Thu|Thur|Thurs|Fri|Sat|Sun)(?:day|nesday|sday|urday)?|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche),?\\s+';
  var DATE = new RegExp(
    '(?:' + WDAY + ')?(?:' +
      '\\d{4}-\\d{1,2}-\\d{1,2}' +                                         // 2024-03-12
      '|\\d{1,2}[/.]\\d{1,2}[/.](?:\\d{4}|\\d{2})' +                      // 12/03/2024
      '|' + MONTHS_RE + '\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}' +       // March 12, 2024
      '|\\d{1,2}(?:er|st|nd|rd|th)?\\s+' + MONTHS_RE + ',?\\s+\\d{4}' + // 12 March 2024 / 12 mars 2024
    ')', 'giu');
  var PARTIAL_DATE = new RegExp('(?<![\\p{L}\\p{N}])(?:(' + MONTHS_RE.replace('\\.?', '') + ')\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?![\\p{N}:])(?!,?\\s*\\d{4})|(\\d{1,2})(?:er|st|nd|rd|th)?\\s+(' + MONTHS_RE.replace('\\.?', '') + ')\\.?(?!\\s*,?\\s*\\d{4}))(?![\\p{L}])', 'giu');
  function dateKey(s) {
    var t = fold(s).replace(/^(?:[a-z]+,?\s+)?(?=\d|[a-z]{3})/, function (m) { return /^(mon|tue|wed|thu|fri|sat|sun|lun|mar|mer|jeu|ven|sam|dim)/.test(m) && !/^mar(s|ch)/.test(m) ? '' : m; });
    var m;
    if ((m = /(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t))) return +m[1] + '-' + +m[2] + '-' + +m[3];
    if ((m = /([a-z]{3})[a-z.]*\s+(\d{1,2})\D+(\d{4})/.exec(t)) && MON[m[1]]) return +m[3] + '-' + MON[m[1]] + '-' + +m[2];
    if ((m = /(\d{1,2})(?:er|st|nd|rd|th)?\s+([a-z]{3})[a-z.]*,?\s+(\d{4})/.exec(t)) && MON[m[2]]) return +m[3] + '-' + MON[m[2]] + '-' + +m[1];
    return t.trim();
  }

  // ---------- discovery: who is in this thread ----------
  var HEADER = /^[ \t>]*(From|To|Cc|CC|Bcc|De|À|A|Cci|Sender|Reply-To|Répondre à)\s?:[ \t]*(.*)$/gmi;
  var WROTE = /^[ \t>]*(?:On\s+.+?,\s*|Le\s+.+?,?\s*)(.+?)\s*(?:<[^>]*>|\[mailto:[^\]]*\])?\s*(?:wrote|a écrit)\s*:\s*$/gmi;
  var GREETING = /^[ \t>]*(?:Hi|Hello|Hey|Dear|Good (?:morning|afternoon|evening)|Morning|Bonjour|Bonsoir|Salut|Allo|Allô|Cher|Chère|Chers)\b[ \t,]+(.+?)[ \t]*[,!:.]?[ \t]*$/gmi;
  var SIGNOFF = /^[ \t>]*(?:Thanks|Thank you|Thanks again|Many thanks|Thx|Regards|Best regards|Kind regards|Warm regards|Warmly|Best|All the best|Cheers|Sincerely|Yours truly|Yours sincerely|Respectfully|Talk soon|Merci|Merci beaucoup|Merci encore|Cordialement|Bien cordialement|Salutations|Sinc[eè]res salutations|Bien à vous|Amitiés|À bientôt|Bonne journée)[ \t]*[,.!]?[ \t]*(.*)$/gmi;
  var TITLE = new RegExp(NB + '(?:Mr|Mrs|Ms|Mx|Miss|Dr|Prof|Me|M|Mme|Mlle|Madame|Monsieur)\\.?[ \\t]+(' + CAP + '(?:[ \\t]+' + CAP + '){0,2})', 'gu');
  var PROSE_NAME = new RegExp(NB + '(' + CAP + ')[ \\t]+(' + CAP + ')' + NA, 'gu');

  function splitPeople(s) {
    // "Smith, John; Doe, Jane" | "John Smith, Jane Doe" | "John and Mary"
    s = s.replace(/<[^>]*>|\[mailto:[^\]]*\]|\([^)]*@[^)]*\)|"|'/g, ' ').replace(EMAIL, ' ');
    var parts = /;/.test(s) ? s.split(';') : s.split(/,|\band\b|\bet\b|&/i);
    if (!/;/.test(s) && /^\s*\p{Lu}[\p{L}'’-]+\s*,\s*\p{Lu}[\p{L}'’-]+\s*$/u.test(s)) parts = [s];       // one "Last, First"
    return parts.map(function (p) { return p.trim(); }).filter(Boolean);
  }
  function parseName(raw) {
    var s = raw.replace(/\s+/g, ' ').replace(/^(?:Mr|Mrs|Ms|Mx|Miss|Dr|Prof|Me|M|Mme|Mlle|Madame|Monsieur)\.?\s+/u, '').replace(/[.,;:!]+$/, '').replace(/['’]s$/, '').trim();
    var m = /^(\p{Lu}[\p{L}'’-]+)\s*,\s*(\p{Lu}[\p{L}'’-]+(?:\s+\p{Lu}\.?)?)$/u.exec(s);  // Last, First
    if (m) return { first: m[2].split(' ')[0], last: m[1] };
    var words = s.split(' ').filter(function (w) { return !/^\p{Lu}\.$/u.test(w); });
    if (!words.length || words.length > 4 || !words.every(isNameWord)) return null;
    if (words.every(function (w) { return COMMON.has(fold(w)); })) return null;
    if (words.length === 1) return { single: words[0] };
    return { first: words[0], last: words[words.length - 1], middle: words.slice(1, -1) };
  }

  function scrub(input, opts) {
    opts = opts || {};
    var text = String(input || '').replace(/\r\n?/g, '\n').replace(/ /g, ' ');
    var counts = { emails: 0, phones: 0, dates: 0, addresses: 0, postal: 0, urls: 0, ids: 0, names: 0, terms: 0, roles: 0, disclaimers: 0 };
    var warnings = [], originals = [], decorations = new Map();
    // Header decorations are generic display metadata, never separate people.
    HEADER.lastIndex = 0;
    text = text.replace(HEADER, function (whole, label, value) {
      var cleaned = value.replace(/([^;<>\n]+)(?=\s*<[^>]*@[^>]*>|$)/g, function (display) {
        var d = /(@[^<>]+|\([^)]*\)(?:.*)|\[[^\]]*\](?:.*)|\|.*)$/.exec(display);
        if (!d) return display;
        var name = display.slice(0, d.index).trim().replace(/^"|"$/g, '');
        if (!parseName(name)) return display;
        var decoration = d[0].trim().replace(/"$/, '');
        if (!decorations.has(decoration)) decorations.set(decoration, '<ORG-' + (decorations.size + 1) + '>');
        originals.push(decoration);
        name = name.replace(/^(\p{Lu}[\p{L}'’-]+,\s*\p{Lu}[\p{L}'’-]+)\s+\p{Lu}\.?$/u, '$1');
        return (display.match(/^\s*/) || [''])[0] + name + ' ' + decorations.get(decoration) + ' ';
      });
      // A bare middle initial belongs to Last, First even without decoration.
      cleaned = cleaned.replace(/(\p{Lu}[\p{L}'’-]+,\s*\p{Lu}[\p{L}'’-]+)\s+\p{Lu}\.?(?=\s*(?:<|;|$))/gu, '$1');
      return whole.slice(0, whole.length - value.length) + cleaned;
    });

    // 0. noise: inline image references and phone sign-offs
    text = text.replace(/\[cid:[^\]]*\]/gi, '').replace(/^[ \t>]*(?:Sent from my \w+|Get Outlook for \w+|Envoyé de mon \w+|Envoyé à partir de \w+.*)[ \t]*$/gmi, '');

    // 1. find people
    var people = [];   // { first, last, emails:Set, sources:Set, token }
    function addPerson(p, source, email) {
      if (!p) return;
      if (p.single) {
        // One word: an existing person's first or last name, else a first name when greeted or signed, else a surname.
        var w = fold(p.single);
        var byFirst = people.filter(function (q) { return q.first && fold(q.first) === w; });
        var byLast = people.filter(function (q) { return q.last && fold(q.last) === w; });
        if (byFirst.length === 1) p = { first: byFirst[0].first, last: byFirst[0].last };
        else if (byLast.length === 1) p = { first: byLast[0].first, last: byLast[0].last };
        else if (FIRST.has(w) || /greeting|sign-off|signature/.test(source)) p = { first: p.single };
        else p = { last: p.single };
      }
      var fl = p.last && fold(p.last), ff = p.first && fold(p.first);
      if (fl && COMMON.has(fl) && !ff) return;
      var hit = people.find(function (q) {
        if (email && q.emails.has(email)) return true;
        if (fl && q.last && fold(q.last) === fl) return !ff || !q.first || fold(q.first) === ff;
        if (!fl && ff && q.first && fold(q.first) === ff) return true;
        if (fl && !q.last && q.first && ff && fold(q.first) === ff) return true;
        return false;
      });
      if (!hit) { hit = { first: p.first || null, last: p.last || null, emails: new Set(), sources: new Set(), order: people.length }; people.push(hit); }
      if (!hit.first && p.first) hit.first = p.first;
      if (!hit.last && p.last) hit.last = p.last;
      if (email) hit.emails.add(email);
      hit.sources.add(source);
    }
    function fromEmail(e) {
      var local = e.split('@')[0].replace(/\d+$/, '');
      var bits = local.split(/[._-]+/).filter(function (b) { return /^\p{L}{2,}$/u.test(b); });
      if (bits.length >= 2 && !bits.some(function (b) { return /^(?:info|admin|office|support|contact|noreply|no|reply|sales|hr|team|mail|service|help)$/i.test(b); }))
        return { first: titleCase(bits[0]), last: titleCase(bits[bits.length - 1]) };
      return null;
    }
    var m;
    HEADER.lastIndex = 0;
    while ((m = HEADER.exec(text))) {
      if (m[1] === 'A' && !/@/.test(m[2])) continue;
      var line = m[2].replace(/<ORG-\d+>/g, '');
      var pair = /(?:"?([^"<>;\n]+?)"?\s*)?(?:<|\[mailto:)([^<>\s\]]+@[^<>\s\]]+)(?:>|\])/g, pm, seen = false;
      while ((pm = pair.exec(line))) {
        seen = true; var em = pm[2].toLowerCase(), disp = (pm[1] || '').replace(/^[,;\s]+/, '');
        var parsed = disp ? parseName(disp) : null;
        addPerson(parsed || fromEmail(em), 'header', em);
      }
      if (!seen) splitPeople(line).forEach(function (s) { if (EMAIL.test(s)) { EMAIL.lastIndex = 0; return; } addPerson(parseName(s), 'header'); });
      (line.match(EMAIL) || []).forEach(function (em) { if (!people.some(function (q) { return q.emails.has(em.toLowerCase()); })) addPerson(fromEmail(em), 'header', em.toLowerCase()); });
    }
    WROTE.lastIndex = 0;
    while ((m = WROTE.exec(text))) addPerson(parseName(m[1].replace(/.*\d{1,2}:\d{2}\s*(?:[AP]M)?,?\s*/i, '')), 'reply line');
    GREETING.lastIndex = 0;
    while ((m = GREETING.exec(text))) splitPeople(m[1]).forEach(function (s) { if (!/^(?:all|team|everyone|tous|toutes|à tous|everybody|folks|guys|there|sir|madam)$/i.test(s)) addPerson(parseName(s), 'greeting'); });
    SIGNOFF.lastIndex = 0;
    while ((m = SIGNOFF.exec(text))) {
      if (m[1].trim()) { addPerson(parseName(m[1]), 'sign-off'); continue; }
      var after = text.slice(m.index + m[0].length).split('\n').map(function (l) { return l.replace(/^[ \t>]+/, '').trim(); }).filter(Boolean)[0] || '';
      if (after && !/[@\d]/.test(after) && after.split(/\s+/).length <= 4) addPerson(parseName(after), 'signature');
    }
    TITLE.lastIndex = 0;
    while ((m = TITLE.exec(text))) addPerson(parseName(m[1]), 'title');
    (text.match(EMAIL) || []).forEach(function (em) { var p = fromEmail(em); if (p) addPerson(p, 'email address', em.toLowerCase()); });
    PROSE_NAME.lastIndex = 0;
    while ((m = PROSE_NAME.exec(text))) {
      var f = fold(m[1]), l = fold(m[2]);
      if (FIRST.has(f) && !COMMON.has(l) && !FIRST.has(l) || (FIRST.has(f) && people.some(function (q) { return q.last && fold(q.last) === l; })))
        addPerson({ first: m[1], last: m[2] }, 'text');
    }

    // All configured sources use the same person shape. Legacy roles remain an API compatibility path.
    var modern = opts.me !== undefined || opts.thread !== undefined || opts.saved !== undefined;
    var usedLabels = new Set(['ME']), usedSaved = new Set();
    var configured = modern ? effectivePeople(opts) : (opts.roles || []).map(function (r) { return Object.assign({ source: 'legacy' }, r); });
    var roles = configured.filter(function (r) { return r && (r.names || []).some(function (n) { return n.trim(); }); }).map(function (r) {
      var label = sanitizeLabel(r.label), token = null;
      if (r.source === 'me') token = '<ME>';
      else if (label) {
        var base = label, suffix = 1;
        while (usedLabels.has(label)) label = base + '-' + (++suffix);
        usedLabels.add(label); token = '<' + label + '>';
      }
      return { token: token, names: r.names.map(function (n) { return n.trim(); }).filter(Boolean), source: r.source, id: r.id };
    });
    function firstAt(names) {
      return Math.min.apply(null, names.map(function (name) { var hit = new RegExp(termPattern(name), 'iu').exec(text); return hit ? hit.index : Infinity; }));
    }
    var roleParts = [];
    roles.forEach(function (r) {
      r.at = firstAt(r.names);
      r.names.forEach(function (name) {
        roleParts.push([fold(name), r]);
        var parsed = parseName(name);
        if (parsed && parsed.last) roleParts.push([fold(parsed.last), r]);
        if (parsed && parsed.first && parsed.last) roleParts.push([fold(parsed.first), r]);
      });
    });
    function roleFor(name) { var f = fold(name); var hit = roleParts.find(function (x) { return x[0] === f; }); return hit ? hit[1] : null; }
    people.forEach(function (p) {
      // Full forms before inferred surname aliases prevent a short surname stealing a configured full name.
      p.owner = (p.first && p.last && roleFor(p.first + ' ' + p.last)) || (p.last && roleFor(p.last)) || (!p.last && p.first && roleFor(p.first)) || null;
      p.at = firstAt([p.first && p.last ? p.first + ' ' + p.last : '', p.first && p.last ? p.last + ', ' + p.first : '', p.last, p.first].filter(Boolean));
      if (p.owner) p.owner.at = Math.min(p.owner.at, p.at);
    });
    var n = 0;
    function numbered() { var label; do { label = 'PERSON-' + (++n); } while (usedLabels.has(label)); usedLabels.add(label); return '<' + label + '>'; }
    if (modern) {
      var identities = roles.concat(people.filter(function (p) { return !p.owner; }));
      identities.sort(function (a, b) { return a.at - b.at; }).forEach(function (p) {
        if (p.source === 'me') return;
        if (!p.token) p.token = numbered();
        else if (p.at !== Infinity) n++; // Labelled people occupy the same appearance sequence.
      });
    }
    people.sort(function (a, b) { return modern ? a.at - b.at : a.order - b.order; }).forEach(function (p) {
      p.token = p.owner ? p.owner.token : (p.token || numbered());
    });
    function markUsed(token) { roles.forEach(function (r) { if (r.token === token && r.source === 'saved') usedSaved.add(r.id); }); }

    // 3. disclaimers (whole paragraph)
    text = text.split(/\n\s*\n/).map(function (para) {
      var f = fold(para);
      if ((/confidential|privileged/.test(f) && /intended recipient|notify the sender|received this (?:e-?mail|message) in error|delete (?:this|it)/.test(f)) ||
          (/confidentiel|privilegi/.test(f) && /destinataire|par erreur|aviser l.expediteur|detruire/.test(f))) { counts.disclaimers++; return '[Confidentiality notice removed]'; }
      return para;
    }).join('\n\n');

    // 4. addresses and links go whole first, so a name inside one never splits it
    var domains = new Set();
    (text.match(EMAIL) || []).forEach(function (e) { domains.add(e.split('@')[1].toLowerCase()); });
    text = text.replace(/\[mailto:[^\]]*\]/gi, '').replace(/<\s*([^<>\s]+@[^<>\s]+)\s*>/g, ' $1');   // <a@b.c> -> a@b.c, so it becomes one <EMAIL>
    text = outside(text, EMAIL, function (e) { counts.emails++; originals.push(e); return '<EMAIL>'; });
    text = text.replace(/ {2,}<EMAIL>/g, ' <EMAIL>');
    text = outside(text, URL, function (u) { counts.urls++; return '<URL>'; });

    // 5. the kill list, then role names the user typed (longest first)
    var killTokens = [], exclusionPatterns = new Map();
    // Stable IDs are independent of matching order. Short letter selections retain case.
    (opts.excluded || []).map(function (t, i) { return typeof t === 'string' ? { text: t.trim(), n: i + 1 } : { text: String(t.text || '').trim(), n: t.n }; }).filter(function (t) { return t.text; }).sort(function (a, b) { return b.text.length - a.text.length; }).forEach(function (item) {
      var term = item.text, tok = '<EXCLUDED-' + item.n + '>'; killTokens.push([term, tok]);
      var short = /^\p{L}{1,3}$/u.test(term);
      var literal = short ? esc(term) : termPattern(term).slice(NB.length, -NA.length);
      if (/^[\p{L}\p{N}]/u.test(term)) literal = NB + literal;
      if (/[\p{L}\p{N}]$/u.test(term)) literal += NA;
      var pattern = new RegExp(literal, short ? 'gu' : 'giu');
      exclusionPatterns.set(fold(term), new RegExp(literal, short ? 'u' : 'iu'));
      // Only matched originals feed the leak gate; an unmatched case-sensitive term is not a leak.
      text = outside(text, pattern, function (match) { originals.push(match); counts.terms++; return tok; });
    });
    (opts.kill || []).map(function (k) { return String(k).trim(); }).filter(Boolean).map(function (k, i) { return { text: k, n: i + 1 }; }).sort(function (a, b) { return b.text.length - a.text.length; }).forEach(function (item) {
      var k = item.text, tok = '<TERM-' + item.n + '>'; killTokens.push([k, tok]); originals.push(k);
      text = outside(text, new RegExp(termPattern(k), 'giu'), function () { counts.terms++; return tok; });
    });
    var roleStrings = [];
    roles.forEach(function (r) { r.names.forEach(function (nm) { roleStrings.push([nm, r.token]); }); });
    people.forEach(function (p) { if (/^<PERSON-/.test(p.token)) return; if (p.first && p.last) roleStrings.push([p.first + ' ' + p.last, p.token], [p.last + ', ' + p.first, p.token]); });
    roleStrings.sort(function (a, b) {
      if (modern) { var ar = roles.findIndex(function (r) { return r.token === a[1]; }), br = roles.findIndex(function (r) { return r.token === b[1]; });
        var ap = roles[ar].source === 'me' ? 0 : roles[ar].source === 'thread' ? 1 : 2, bp = roles[br].source === 'me' ? 0 : roles[br].source === 'thread' ? 1 : 2; if (ap !== bp) return ap - bp; }
      return b[0].length - a[0].length;
    }).forEach(function (x) {
      originals.push(x[0]);
      text = outside(text, new RegExp(termPattern(x[0]) + "(['’]s)?", 'giu'), function (mm, poss) { counts.roles++; markUsed(x[1]); return x[1] + (poss || ''); });
    });

    // 6. structured identifiers
    text = outside(text, LABELLED_ID, function (mm, label, id) { if (!/\d/.test(id)) return mm; counts.ids++; originals.push(id); return label + '<ID>'; });
    text = outside(text, SSN, function (s) { counts.ids++; originals.push(s); return '<SSN>'; });
    text = outside(text, SIN, function (s) { var d = s.replace(/\D/g, ''); if (!luhn(d)) return s; counts.ids++; originals.push(s); return '<SIN>'; });
    text = outside(text, CARD, function (s) { var d = s.replace(/\D/g, ''); if (d.length < 13 || !luhn(d)) return s; counts.ids++; originals.push(s); return '<CARD>'; });
    text = outside(text, PHONE, function (p) { if (p.replace(/\D/g, '').length < 10) return p; counts.phones++; originals.push(p); return '<PHONE>'; });
    text = outside(text, PO_BOX, function () { counts.addresses++; return '<ADDRESS>'; });
    text = outside(text, ADDRESS, function (a) { counts.addresses++; originals.push(a); return '<ADDRESS>'; });
    text = outside(text, POSTAL_CA, function (p) { counts.postal++; originals.push(p); return '<POSTAL>'; });
    text = outside(text, ZIP_US, function (p) { counts.postal++; originals.push(p); return '<POSTAL>'; });
    // City/province lines are private only in an address context, including quoted lines.
    var region = '(?:AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT|AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)';
    var city = new RegExp(NB + '(' + CAP + '(?:[ \t]+' + CAP + ')?),[ \t]*' + region + NA, 'gu');
    var addressLines = text.split('\n');
    text = addressLines.map(function (line, i) {
      return line.replace(city, function (match, name, off) {
        var after = line.slice(off + match.length), before = line.slice(0, off);
        var previousAddress = i > 0 && /<ADDRESS>/.test(addressLines[i - 1]) && /^[ \t>]*$/.test(before);
        if (!previousAddress && !/^[ \t]+<POSTAL>/.test(after)) return match;
        counts.addresses++; originals.push(match); return '<ADDRESS>';
      });
    }).join('\n');
    var dates = new Map();
    text = outside(text, DATE, function (d) { var k = dateKey(d); if (!dates.has(k)) dates.set(k, '<DATE-' + (dates.size + 1) + '>'); counts.dates++; return dates.get(k); });
    // A day and month without a year ("the March 28 deadline") shares the token of the one full date it matches.
    text = outside(text, PARTIAL_DATE, function (d, mon1, day1, day2, mon2) {
      var mo = MON[fold(mon1 || mon2).slice(0, 3)], day = +(day1 || day2);
      if (!mo || day < 1 || day > 31) return d;
      var same = Array.from(dates.keys()).filter(function (k) { return new RegExp('^\\d{4}-' + mo + '-' + day + '$').test(k); });
      var k = same.length === 1 ? same[0] : mo + '-' + day;
      if (!dates.has(k)) dates.set(k, '<DATE-' + (dates.size + 1) + '>');
      counts.dates++; return dates.get(k);
    });

    // 7. people: full names, "Last, First", surnames, then first names that belong to exactly one person
    var forms = [];
    people.forEach(function (p) {
      if (p.first && p.last) { forms.push([p.first + ' ' + (p.middle ? p.middle.join(' ') + ' ' : '') + p.last, p.token], [p.first + ' ' + p.last, p.token], [p.last + ', ' + p.first, p.token]); }
      if (p.last) forms.push([p.last, p.token]);
    });
    people.forEach(function (p) {
      if (!p.first) return;
      var f = fold(p.first);
      var owners = people.filter(function (q) { return q.first && fold(q.first) === f; });
      if (owners.length !== 1) { if (owners[0] === p) warnings.push('More than one person is called ' + p.first + '; a first name on its own was left as written.'); return; }
      forms.push([p.first, p.token, WORDLIKE_FIRST.has(f) || COMMON.has(f)]);
    });
    forms.sort(function (a, b) { return b[0].length - a[0].length; }).forEach(function (x) {
      originals.push(x[0]);
      var re = new RegExp(termPattern(x[0]) + "(['’]s)?", 'giu');   // word-like first names: capitalized only (below)
      text = outside(text, re, function (mm, poss, off, whole) {
        if (x[2] && !/^\p{Lu}/u.test(mm)) return mm;
        counts.names++; markUsed(x[1]); return x[1] + (poss || '');
      });
    });

    // Nonblocking review candidates, outside placeholders and before the AI note.
    var possibleNames = [], candidateSeen = new Set();
    function candidate(name) { if (!candidateSeen.has(fold(name))) { candidateSeen.add(fold(name)); possibleNames.push(name); } }
    var review = text.replace(TOKEN_RE, function (token) { return ' '.repeat(token.length); });
    var words = /[\p{L}'’-]+/gu, wm;
    while ((wm = words.exec(review))) {
      var word = wm[0], key = fold(word), before = review.slice(0, wm.index);
      var initial = /(?:^|[.!?\n])\s*[>]*\s*$/.test(before);
      var dateContext = MONTH_WORDS.has(key) && /^\s+\d{4}\b/.test(review.slice(wm.index + word.length));
      if (!dateContext && (FIRST.has(key) || WORDLIKE_FIRST.has(key) && /^\p{Lu}/u.test(word) && !initial)) candidate(word);
    }
    PROSE_NAME.lastIndex = 0;
    while ((m = PROSE_NAME.exec(review))) if (!/^[\p{Lu}]+$/u.test(m[1]) && !/^[\p{Lu}]+$/u.test(m[2]) && !/^[ \t]*:/.test(review.slice(m.index + m[0].length)) && !COMMON.has(fold(m[1])) && !COMMON.has(fold(m[2]))) candidate(m[0]);
    if (possibleNames.length) warnings.push('Possible names still in the text: ' + possibleNames.join(', ') + '.');

    // 8. tidy and the preservation note
    text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (opts.note !== false) text = 'Note: placeholders such as <PERSON-1> or <DATE-2> stand for removed details. Keep them exactly as written in any reply.\n\n' + text;

    // 9. leak check: nothing that was removed may still be in the output
    var secrets = [], seen = new Set();
    originals.concat(roles.flatMap(function (r) { return r.names; })).forEach(function (o) {
      o = String(o).trim(); if (o.length < 2 || seen.has(fold(o))) return; seen.add(fold(o)); secrets.push(o);
    });
    var leaks = leakCheck(text, secrets).filter(function (secret) {
      var exact = exclusionPatterns.get(fold(secret));
      return !exact || exact.test(text.replace(TOKEN_RE, ' '));
    });
    decorations.forEach(function (tok, decoration) {
      var literal = termPattern(decoration).slice(NB.length, -NA.length);
      if (new RegExp(literal, 'iu').test(text.replace(TOKEN_RE, ' ')) && leaks.indexOf(decoration) < 0) leaks.push(decoration);
    });
    var bare = text.replace(TOKEN_RE, ' ');
    // Organisations behind the email domains that still appear by name (the user decides; they may not be sensitive).
    var orgs = [];
    domains.forEach(function (d) {
      var label = d.split('.').slice(-2)[0];
      if (/^(?:gmail|googlemail|outlook|hotmail|live|msn|yahoo|icloud|me|mac|aol|proton|protonmail|gmx|videotron|bell|sympatico|rogers|shaw|telus|cogeco|example)$/.test(label)) return;
      var word = label.split(/[-_]/)[0];
      if (word.length < 3) return;
      var m = new RegExp(NB + esc(word) + '[\\p{L}]*(?:[ \\t]+' + CAP + ')?', 'iu').exec(bare);
      if (m && orgs.indexOf(m[0]) < 0) orgs.push(m[0]);
    });
    if (orgs.length) warnings.push('These organisation names match the email addresses and are still in the text: ' + orgs.join(', ') + '. Add them to Always remove if they identify anyone.');
    if (/@[\p{L}\p{N}-]+\.[\p{L}]{2,}/u.test(bare)) warnings.push('An "@" address fragment is still in the text.');
    if (/(?<!\d)\d{3}[ .-]\d{4}(?!\d)/.test(bare)) warnings.push('A number that looks like part of a phone number is still in the text.');

    return {
      text: text,
      people: people.map(function (p) { return { token: p.token, names: [p.first, p.last].filter(Boolean).join(' '), emails: Array.from(p.emails), sources: Array.from(p.sources) }; }),
      roles: roles.map(function (r) { return { token: r.token, names: r.names }; }),
      organisations: Array.from(decorations.entries()).map(function (x) { return { text: x[0], token: x[1] }; }),
      terms: killTokens.map(function (k) { return { token: k[1], text: k[0] }; }),
      usedSaved: Array.from(usedSaved), counts: counts, leaks: leaks, warnings: warnings, possibleNames: possibleNames, secrets: secrets
    };
  }

  // Re-run after the user edits the output: which removed values are back in the text?
  function leakCheck(text, secrets) {
    var bare = String(text).replace(TOKEN_RE, ' ');
    return (secrets || []).filter(function (o) { return new RegExp(termPattern(o), 'iu').test(bare); });
  }

  function nameForms(names) { return Array.isArray(names) ? names : String(names || '').split(',').map(function (n) { return n.trim(); }).filter(Boolean); }
  function sanitizeLabel(label) { return String(label || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function effectivePeople(opts) {
    var me = nameForms(opts.me), thread = (opts.thread || []).map(function (r) { return Object.assign({}, r, { names: nameForms(r.names), source: 'thread' }); });
    var taken = new Set(me.concat(thread.flatMap(function (r) { return r.names; })).map(fold));
    return [{ names: me, source: 'me', label: 'ME' }].concat(thread, (opts.saved || []).map(function (r, i) {
      return Object.assign({}, r, { id: r.id || 'saved-' + i, source: 'saved', names: nameForms(r.names).filter(function (n) { return !taken.has(fold(n)); }) });
    }));
  }
  function emptyPreferences() { return { me: '', saved: [], kill: '', excluded: [], nextExcluded: 1 }; }
  function migratePreferences(saved) {
    if (!saved || typeof saved.kill !== 'string' || !Array.isArray(saved.excluded)) throw new Error('Invalid preferences');
    var me = '', people = [];
    if (Array.isArray(saved.people)) {
      saved.people.forEach(function (r, i) {
        if (!r || typeof r.role !== 'string' || typeof r.title !== 'string' || typeof r.names !== 'string') throw new Error('Invalid person');
        if (r.role === 'Me') me = [me, r.names].filter(Boolean).join(', ');
        else if (r.names.trim()) people.push({ id: 'migrated-' + i, names: r.names, label: sanitizeLabel(r.title || r.role), lastUsed: '' });
      });
    } else {
      if (typeof saved.me !== 'string' || !Array.isArray(saved.saved)) throw new Error('Invalid preferences');
      me = saved.me;
      var ids = new Set();
      people = saved.saved.map(function (r) {
        if (!r || typeof r.id !== 'string' || !r.id || ids.has(r.id) || typeof r.names !== 'string' || typeof r.label !== 'string' || typeof r.lastUsed !== 'string' || r.lastUsed && !/^\d{4}-\d{2}-\d{2}$/.test(r.lastUsed)) throw new Error('Invalid saved person');
        ids.add(r.id); return { id: r.id, names: r.names, label: sanitizeLabel(r.label), lastUsed: r.lastUsed };
      });
    }
    var seen = new Set();
    var items = saved.excluded.map(function (t, i) { return typeof t === 'string' ? { text: t, n: i + 1 } : { text: t && t.text, n: t && t.n }; });
    items.forEach(function (t) { if (typeof t.text !== 'string' || !Number.isSafeInteger(t.n) || t.n < 1 || seen.has(t.n)) throw new Error('Invalid exclusion'); seen.add(t.n); });
    var floor = Math.max.apply(null, [0].concat(items.map(function (t) { return t.n; }))) + 1;
    return { me: me, saved: people, kill: saved.kill, excluded: items, nextExcluded: Number.isSafeInteger(saved.nextExcluded) ? Math.max(floor, saved.nextExcluded) : floor };
  }
  // Pure state helpers are shared by the UI and node acceptance tests. No thread/result persistence.
  function savePerson(prefs, thread, index) {
    var person = thread[index]; if (!person || !person.names.trim()) return false;
    var id = 'saved-1', n = 1; while (prefs.saved.some(function (r) { return r.id === id; })) id = 'saved-' + (++n);
    prefs.saved.push({ id: id, names: person.names, label: sanitizeLabel(person.label), lastUsed: '' }); thread.splice(index, 1); return true;
  }
  function updateLastUsed(prefs, used, date) { prefs.saved.forEach(function (r) { if (used.indexOf(r.id) >= 0) r.lastUsed = date; }); }
  function searchSaved(people, query) { return people.filter(function (r) { return fold(r.names).includes(fold(query)); }); }
  function migrationNotice(legacy) { return !!(legacy && legacy.excluded && legacy.excluded.some(function (e) { return typeof e === 'string'; })); }
  function clearThread(thread) { thread.splice(0); }
  function forgetPreferences() { return emptyPreferences(); }
  function demoControls(demo) { return { disabled: demo, title: demo ? 'Leave the demo to manage saved preferences.' : '' }; }
  var SAMPLE = `From: Quill, Mira T@Paper Lantern@Sampleville <mira@example.com>
To: Vale, Nolan (Sample Office) <nolan@example.com>
Cc: Lyra Finch | Fictional Widgets <lyra@example.com>
Sent: March 27, 2026 09:00
Subject: Project Lantern and the March 28 deadline

Hi Nolan,

Please tell Andre that the draft is ready.
We can keep the whole reply chain for review.
The March 28 deadline remains unchanged.
Project Lantern is a fictional project.
The internal note is sample-private.
Account number: DEMO12345
Demo SIN: 046 454 286
Demo SSN: 123-45-6789
Demo payment test card: 4111 1111 1111 1111
See https://example.com/sample for the fictional agenda.

Regards,
Mira Quill
Coordinator / Coordonnatrice
Fictional Widgets / Atelier fictif
613-555-0100 ext. 222
123 Imaginary Street
Sampleville, ON K1A 0B1

CONFIDENTIALITY NOTICE: This message is confidential. If you are not the intended recipient, notify the sender and delete this message.

---------- Forwarded message ----------
> From: Vale, Nolan (Sample Office) <nolan@example.com>
> To: Quill, Mira T@Paper Lantern@Sampleville <mira@example.com>
> Sent: 26 mars 2026 14:00
> Subject: Projet fictif
>
> Bonjour Mira,
>
> Le rendez-vous du 28 mars convient.
> Appelez au 613-555-0101 poste 123.
> Nous gardons toutes les réponses dans ce fil.
>
> Cordialement,
> Nolan Vale
> Conseiller / Adviser
>
>> From: Lyra Finch | Fictional Widgets <lyra@example.com>
>> To: Nolan Vale <nolan@example.com>
>> Sent: March 25, 2026 10:00
>> Subject: First fictional draft
>>
>> Hello Nolan,
>> The fictional draft is attached as plain text.
>> There are no real people or organisations here.
>> Cheers,
>> Lyra Finch`;

  var api = { sample: SAMPLE, migratePreferences: migratePreferences, emptyPreferences: emptyPreferences, sanitizeLabel: sanitizeLabel, savePerson: savePerson, updateLastUsed: updateLastUsed, searchSaved: searchSaved, migrationNotice: migrationNotice, clearThread: clearThread, forgetPreferences: forgetPreferences, demoControls: demoControls, scrub: scrub, leakCheck: leakCheck, fold: fold, version: '0.4.0' };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.EmailScrub = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
