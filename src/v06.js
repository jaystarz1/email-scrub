/* Free v0.6 extensions. Pure functions; no IO, storage, or runtime dependencies. */
(function(root){
'use strict';
var presets={en:{
summary:'Summarise this email thread: what it is about, where it stands now, and what, if anything, is being asked of <ME>.',
'reply-short':'Write a short reply from <ME> to the most recent message: two to four sentences.',
'reply-medium':'Write a reply from <ME> to the most recent message that addresses each point raised, in one to three short paragraphs.',
'reply-long':'Write a full reply from <ME> to the most recent message, addressing every point raised in detail.',
'action-items':'List every task, request or commitment in this thread, with who owns it and any deadline. Mark items that are still open.',
timeline:'Set out the thread in date order: who said what, and what changed at each step.',
'whos-who':'Describe the role of each placeholder in this thread and how they relate to each other and to <ME>, based only on what the thread shows.',
'open-questions':'List the questions asked in this thread that have not been answered, and who asked each one.',
'point-by-point':'List each point the most recent sender raised, and draft a response from <ME> to each one.',
decline:'Write a reply from <ME> that politely declines or pushes back on what the most recent message asks, while keeping the relationship good.',
'follow-up':'Write a brief follow-up from <ME> asking for a response to the last open request in this thread.',
brief:"Write a short briefing for <ME>'s manager: bottom line first, then key facts, then any decision or action needed.",
translate:'Translate this thread into the response language.'},fr:{
summary:'Résume ce fil de courriels : son sujet, la situation actuelle et ce qui est demandé à <ME>, le cas échéant.',
'reply-short':'Rédige une courte réponse de <ME> au message le plus récent : de deux à quatre phrases.',
'reply-medium':'Rédige une réponse de <ME> au message le plus récent qui traite chaque point soulevé, en un à trois courts paragraphes.',
'reply-long':'Rédige une réponse complète de <ME> au message le plus récent, en traitant chaque point soulevé en détail.',
'action-items':'Énumère chaque tâche, demande ou engagement de ce fil, avec la personne responsable et toute échéance. Indique les éléments encore ouverts.',
timeline:'Présente le fil dans l’ordre chronologique : qui a dit quoi et ce qui a changé à chaque étape.',
'whos-who':'Décris le rôle de chaque espace réservé dans ce fil et ses liens avec les autres et avec <ME>, uniquement d’après ce que montre le fil.',
'open-questions':'Énumère les questions de ce fil restées sans réponse et la personne qui a posé chacune.',
'point-by-point':'Énumère chaque point soulevé par l’expéditeur le plus récent et rédige une réponse de <ME> à chacun.',
decline:'Rédige une réponse de <ME> qui refuse poliment la demande du message le plus récent ou exprime des réserves, tout en préservant la relation.',
'follow-up':'Rédige un bref suivi de <ME> demandant une réponse à la dernière demande encore ouverte de ce fil.',
brief:'Rédige une courte note pour le gestionnaire de <ME> : la conclusion d’abord, puis les faits essentiels et toute décision ou action nécessaire.',
translate:'Traduis ce fil dans la langue de réponse.'}};
var labels={en:['None','Summary','Short reply','Medium reply','Full reply','Action items','Timeline',"Who’s who",'Open questions','Point by point','Decline / push back','Follow-up','Manager brief','Translate'],fr:['Aucune','Résumé','Réponse courte','Réponse moyenne','Réponse complète','Actions à réaliser','Chronologie','Rôles et liens','Questions ouvertes','Point par point','Refus / réserves','Suivi','Note au gestionnaire','Traduction']};
var UI={en:{toneFormal:'Use a formal tone.',toneNeutral:'Use a neutral tone.',toneWarm:'Use a warm tone.',responseEn:'Respond in English.',responseFr:'Respond in French.',lengthBrief:'Keep the response brief.',lengthStandard:'Use a standard response length.',lengthDetailed:'Give a detailed response.',closing:'Keep every placeholder, such as <PERSON-1> or <ME>, exactly as written.',note:'Note: placeholders such as <PERSON-1> or <DATE-2> stand for removed details. Keep them exactly as written in any reply.',prompt:'Optional prompt',promptEdit:'Edit this copy only',tone:'Tone',formal:'Formal',neutral:'Neutral',warm:'Warm',language:'Response language',english:'English',french:'French',length:'Length',brief:'Brief',standard:'Standard',detailed:'Detailed',signatures:'Remove signature blocks',undo:'Undo',drop:'Drop to load',file:'or open a .txt or .eml file',unsupported:"This file type can't be opened here. Paste the text instead.",multiple:'Open one file at a time. No files were loaded.',fileError:'The file could not be read. Paste the text instead.',size:'{words} words · approximately {tokens} tokens',long:'Long thread. Some AI tools may cut off the end.',signatureCount:'{n} signatures removed',helpPrompt:'Choose a prompt beside Copy. Edit it for this copy only; changing the preset resets your edits. Presets contain no personal data and do not change acceptance.',helpSignatures:'Signature blocks become <SIGNATURE>; the sign-off and name remain. Turn this off if a short message was mistaken for a signature.',helpUndo:'Undo reverses Replace, Always remove or Keep in this thread. Input edits, file loads, samples and Clear discard history; history is never saved.',helpNew:'Prompts are optional and editable for this copy only. Signature removal is on by default and can be switched off. TXT and EML files are read locally, never uploaded; attachment contents are ignored but filenames are reviewed. Token counts are approximate and include the selected prompt. A long-thread warning means an AI may truncate the result. Undo reverses review actions; input edits, file loads, samples and Clear erase history.',forget:'Erase saved people and exclusions? Language and signature choices are kept; the prompt resets to None.',erased:'Saved people and exclusions erased. Language and signature choices kept; prompt reset to None.'},fr:{toneFormal:'Utilise un ton formel.',toneNeutral:'Utilise un ton neutre.',toneWarm:'Utilise un ton chaleureux.',responseEn:'Réponds en anglais.',responseFr:'Réponds en français.',lengthBrief:'Rédige une réponse brève.',lengthStandard:'Utilise une longueur de réponse standard.',lengthDetailed:'Rédige une réponse détaillée.',closing:'Conserve chaque espace réservé, comme <PERSON-1> ou <ME>, exactement tel qu’il est écrit.',note:'Note : les espaces réservés comme <PERSON-1> ou <DATE-2> représentent des renseignements retirés. Conserve-les exactement tels qu’ils sont écrits dans toute réponse.',prompt:'Consigne facultative',promptEdit:'Modifier cette copie seulement',tone:'Ton',formal:'Formel',neutral:'Neutre',warm:'Chaleureux',language:'Langue de réponse',english:'Anglais',french:'Français',length:'Longueur',brief:'Brève',standard:'Standard',detailed:'Détaillée',signatures:'Retirer les blocs de signature',undo:'Annuler',drop:'Déposer pour charger',file:'ou ouvrir un fichier .txt ou .eml',unsupported:'Ce type de fichier ne peut pas être ouvert ici. Collez plutôt le texte.',multiple:'Ouvrez un seul fichier à la fois. Aucun fichier n’a été chargé.',fileError:'Le fichier n’a pas pu être lu. Collez plutôt le texte.',size:'{words} mots · environ {tokens} jetons',long:'Fil long. Certains outils d’IA pourraient couper la fin.',signatureCount:'{n} signatures retirées',helpPrompt:'Choisissez une consigne près de Copier. Modifiez-la pour cette copie seulement; changer de modèle réinitialise les modifications. Les modèles ne contiennent aucune donnée personnelle et ne changent pas l’acceptation.',helpSignatures:'Les blocs de signature deviennent <SIGNATURE>; la formule de politesse et le nom restent. Désactivez cette option si un court message a été pris pour une signature.',helpUndo:'Annuler inverse Remplacer, Toujours retirer ou Conserver dans ce fil. Modifier le texte, charger un fichier, essayer l’exemple ou Effacer supprime l’historique; il n’est jamais enregistré.',helpNew:'Les consignes sont facultatives et modifiables pour cette copie seulement. Le retrait des signatures est activé par défaut et peut être désactivé. Les fichiers TXT et EML sont lus localement, jamais téléversés; le contenu des pièces jointes est ignoré, mais leur nom est vérifié. Le nombre de jetons est approximatif et comprend la consigne sélectionnée. Un avertissement de fil long signifie qu’une IA pourrait tronquer le résultat. Annuler inverse les actions de vérification; modifier le texte, charger un fichier, essayer l’exemple ou Effacer supprime l’historique.',forget:'Effacer les personnes et exclusions enregistrées? La langue et le choix des signatures sont conservés; la consigne revient à Aucune.',erased:'Personnes et exclusions enregistrées effacées. Langue et choix des signatures conservés; consigne remise à Aucune.'}};
Object.assign(UI.en,{copy:'Copy',acceptLeak:'Accept with {n} leak',acceptLeaks:'Accept with {n} leaks',acceptReview:'Accept ({n} to review)',demoTitle:'Leave the demo to manage saved preferences.',warningNames:'Possible names still in the text: {names}.',warningDuplicate:'More than one person is called {name}; a first name on its own was left as written.',warningOrgs:'These organisation names match the email addresses and are still in the text: {names}. Add them to Always remove if they identify anyone.',warningEmail:'An "@" address fragment is still in the text.',warningPhone:'A number that looks like part of a phone number is still in the text.',kindName:'name',kindId:'ID',kindFile:'file',kindAge:'age',kindUrl:'url',kindZip:'zip',sourceHeader:'header',sourceReply:'reply line',sourceGreeting:'greeting',sourceSignoff:'sign-off',sourceSignature:'signature',sourceTitle:'title',sourceEmail:'email address',sourceText:'text'});
Object.assign(UI.fr,{copy:'Copier',acceptLeak:'Accepter avec {n} fuite',acceptLeaks:'Accepter avec {n} fuites',acceptReview:'Accepter ({n} à vérifier)',demoTitle:'Quittez l’exemple pour gérer les préférences enregistrées.',warningNames:'Noms possibles encore dans le texte : {names}.',warningDuplicate:'Plusieurs personnes portent le prénom {name}; un prénom seul a été conservé tel quel.',warningOrgs:'Ces noms d’organisations correspondent aux adresses de courriel et restent dans le texte : {names}. Ajoutez-les à Toujours retirer s’ils identifient quelqu’un.',warningEmail:'Un fragment d’adresse « @ » reste dans le texte.',warningPhone:'Un numéro ressemblant à une partie de numéro de téléphone reste dans le texte.',kindName:'nom',kindId:'identifiant',kindFile:'fichier',kindAge:'âge',kindUrl:'lien',kindZip:'code ZIP',sourceHeader:'en-tête',sourceReply:'ligne de réponse',sourceGreeting:'salutation',sourceSignoff:'formule de politesse',sourceSignature:'signature',sourceTitle:'titre',sourceEmail:'adresse de courriel',sourceText:'texte'});
Object.keys(UI).forEach(function(lang){UI[lang].presets=presets[lang];UI[lang].presetLabels=labels[lang];});
function source(value,lang){var key={'header':'Header','reply line':'Reply','greeting':'Greeting','sign-off':'Signoff','signature':'Signature','title':'Title','email address':'Email','text':'Text'}[value];return key?sentence('source'+key,lang):value;}
function kind(value,lang){return sentence('kind'+value.charAt(0).toUpperCase()+value.slice(1),lang)||value;}
function warning(value,lang){var m;
 if((m=/^Possible names still in the text: (.*)\.$/.exec(value)))return sentence('warningNames',lang).replace('{names}',m[1]);
 if((m=/^More than one person is called (.*); a first name on its own was left as written\.$/.exec(value)))return sentence('warningDuplicate',lang).replace('{name}',m[1]);
 if((m=/^These organisation names match the email addresses and are still in the text: (.*)\. Add them to Always remove if they identify anyone\.$/.exec(value)))return sentence('warningOrgs',lang).replace('{names}',m[1]);
 if(value==='An "@" address fragment is still in the text.')return sentence('warningEmail',lang);
 if(value==='A number that looks like part of a phone number is still in the text.')return sentence('warningPhone',lang);
 return value;
}
function sentence(key,lang){return UI[lang==='fr'?'fr':'en'][key];}
function toneAllowed(preset){return /^(reply-(short|medium|long)|decline|follow-up|brief)$/.test(preset);}
function lengthAllowed(preset){return !/^reply-(short|medium|long)$/.test(preset);}
function assemble(thread,preset,edited,mods,lang){
 if(!preset||preset==='none')return thread;
 mods=mods||{};lang=lang==='fr'?'fr':'en';var lines=[edited];
 if(toneAllowed(preset))lines.push(sentence('tone'+({formal:'Formal',warm:'Warm'}[mods.tone]||'Neutral'),lang));
 lines.push(sentence(mods.language==='fr'?'responseFr':'responseEn',lang));
 if(lengthAllowed(preset))lines.push(sentence('length'+({brief:'Brief',detailed:'Detailed'}[mods.length]||'Standard'),lang));
 return lines.join('\n')+'\n\n--- EMAIL THREAD START ---\n'+thread+'\n--- EMAIL THREAD END ---\n'+sentence('closing',lang);
}
function size(text){return {words:(text.trim().match(/\S+/g)||[]).length,tokens:Math.round(text.length/400)*100,long:text.length/4>25000};}
function preferences(p,browserLanguage){var out=Object.assign({},p);out.lang=p.lang==='fr'||p.lang==='en'?p.lang:/^fr/i.test(browserLanguage||'')?'fr':'en';out.signatures=typeof p.signatures==='boolean'?p.signatures:true;out.lastPreset=p.lastPreset==='none'||Object.hasOwn(presets.en,p.lastPreset)?p.lastPreset:'none';return out;}
function bytes(text,encoding){if(encoding==='base64'){var raw=typeof atob==='function'?atob(text.replace(/\s/g,'')):Buffer.from(text,'base64').toString('binary');return Uint8Array.from(raw,function(c){return c.charCodeAt(0);});}return Uint8Array.from(text.replace(/=\r?\n/g,'').replace(/=([0-9a-f]{2})/gi,function(_,h){return String.fromCharCode(parseInt(h,16));}),function(c){return c.charCodeAt(0)&255;});}
function decodeBytes(value,charset){
 if(/^(windows-1252|cp1252|iso-8859-1|latin-?1)$/i.test(charset||'')){
  var win=[0x20ac,0x81,0x201a,0x192,0x201e,0x2026,0x2020,0x2021,0x2c6,0x2030,0x160,0x2039,0x152,0x8d,0x17d,0x8f,0x90,0x2018,0x2019,0x201c,0x201d,0x2022,0x2013,0x2014,0x2dc,0x2122,0x161,0x203a,0x153,0x9d,0x17e,0x178];
  return Array.from(value,function(b){return String.fromCodePoint(b>=128&&b<160?win[b-128]:b);}).join('');
 }
 try{return new TextDecoder(charset||'utf-8').decode(value);}catch(e){return new TextDecoder('utf-8').decode(value);}
}
function decode(text,charset,encoding){if(!/^(base64|quoted-printable)$/.test(encoding||''))return text;return decodeBytes(bytes(text,encoding==='base64'?'base64':'qp'),charset);}
function encodedWords(text){return text.replace(/(\?=)\s+(=\?)/g,'$1$2').replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi,function(_,cs,enc,value){return decode(enc.toUpperCase()==='Q'?value.replace(/_/g,' '):value,cs,enc.toUpperCase()==='B'?'base64':'quoted-printable');});}
function entities(text){var named=typeof module!=='undefined'&&module.exports?require('./entities.json'):root.EmailScrubEntities;return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi,function(all,key){if(key[0]==='#'){var n=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):parseInt(key.slice(1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):all;}return named[key]===undefined?all:named[key];});}
function htmlText(text){return entities(text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<\/?(?:br|p|div)\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,'')).replace(/[ \t]+\n/g,'\n').replace(/\n{2,}/g,'\n').trim();}
function parseEML(raw){
 var rawBytes=raw instanceof Uint8Array;if(rawBytes)raw=Array.from(raw,function(b){return String.fromCharCode(b);}).join('');
 var plain=[],html=[],attachments=[];
 function part(source,depth,attached){
  if(depth>30)return {};
  source=source.replace(/\r\n?/g,'\n');var split=source.indexOf('\n\n'),head=split<0?source:source.slice(0,split),body=split<0?'':source.slice(split+2),h={};
  head.replace(/\n[ \t]+/g,' ').split('\n').forEach(function(line){var m=/^([^:]+):\s*(.*)$/.exec(line);if(m&&!Object.hasOwn(h,m[1].toLowerCase()))h[m[1].toLowerCase()]=m[2];});
  var type=h['content-type']||'text/plain',disp=h['content-disposition']||'';
  function param(value,key){var m=new RegExp('(?:^|;)\\s*'+key+'\\s*=\\s*(?:"([^"]*)"|([^;\\s]+))','i').exec(value);return m?(m[1]||m[2]||''):'';}
  var filename=param(disp,'filename')||param(type,'name'),star=param(disp,'filename\\*')||param(type,'name\\*');
  if(star){try{var fields=star.split("'"),binary=fields.slice(2).join("'").replace(/%([a-f0-9]{2})/gi,function(_,h){return String.fromCharCode(parseInt(h,16));});filename=new TextDecoder(fields[0]||'utf-8').decode(Uint8Array.from(binary,function(c){return c.charCodeAt(0);}));}catch(e){filename=star;}}
  attached=attached||/^attachment\b/i.test(disp)||!!filename;
  if(filename)attachments.push(encodedWords(filename).replace(/[\r\n]/g,' '));
  if(attached)return h;
  if(/^multipart\//i.test(type)){
   var boundary=param(type,'boundary');if(boundary){var chunks=[],current=null;
    body.split('\n').forEach(function(line){if(line==='--'+boundary||line==='--'+boundary+'--'){if(current!==null)chunks.push(current.join('\n'));current=line.endsWith('--')?null:[];}else if(current!==null)current.push(line);});
    if(current!==null)chunks.push(current.join('\n'));chunks.forEach(function(chunk){part(chunk,depth+1,false);});}
  }else if(/^text\/(plain|html)\b/i.test(type)){
   var encoding=(h['content-transfer-encoding']||'').trim().toLowerCase(),charset=param(type,'charset');
   var decoded=rawBytes&&!/^(base64|quoted-printable)$/.test(encoding)?decodeBytes(Uint8Array.from(body,function(c){return c.charCodeAt(0);}),charset):decode(body,charset,encoding);
   if(/^text\/plain/i.test(type))plain.push(decoded);else html.push(htmlText(decoded));
  }
  return h;
 }
 var h=part(raw,0,false),header=[];[['from','From'],['date','Sent'],['to','To'],['cc','Cc'],['subject','Subject']].forEach(function(pair){if(h[pair[0]]){var value=h[pair[0]];if(rawBytes)value=decodeBytes(Uint8Array.from(value,function(c){return c.charCodeAt(0);}),'utf-8');header.push(pair[1]+': '+encodedWords(value));}});
 var body=plain.length?plain[0]:html.length?html[0]:'';if(attachments.length)body+='\n\n'+attachments.map(function(name){return 'Attachment: '+name;}).join('\n');
 return (header.length?header.join('\n')+'\n\n':'')+body.trim();
}
var api={UI:UI,presets:presets,labels:labels,assemble:assemble,size:size,preferences:preferences,toneAllowed:toneAllowed,lengthAllowed:lengthAllowed,parseEML:parseEML,encodedWords:encodedWords,htmlText:htmlText,source:source,kind:kind,warning:warning};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EmailScrubV06=api;
})(typeof globalThis!=='undefined'?globalThis:this);
