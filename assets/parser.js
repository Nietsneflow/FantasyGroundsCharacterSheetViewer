/* parser.js — Fantasy Grounds character XML → plain character object.
 *
 * Nothing in here touches the page. Every string that leaves this file is
 * already HTML-escaped (getText) or sanitized rich text (ftToHtml), so the
 * renderer can interpolate values straight into innerHTML.
 *
 * See docs/FG_XML_Structure.md for the export format.
 */
'use strict';

// ===== UTILITIES =====
const esc = (s) => String(s).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
const unesc = (s) => String(s).replace(/&(amp|lt|gt|quot|#39);/g, (_, e) => ({ amp:'&', lt:'<', gt:'>', quot:'"', '#39':"'" }[e]));

// Scoped direct-child queries — FG XML nests full stat blocks (cohorts, item
// spells, power actions) whose tag names shadow the parent's, so never search
// descendants.
const q = (el, path) => el ? el.querySelector(`:scope > ${path}`) : null;
const qa = (el, path) => el ? Array.from(el.querySelectorAll(`:scope > ${path}`)) : [];

const rawText = (node) => node ? node.textContent.trim() : '';
const getText = (node) => esc(rawText(node));
const getNum = (node) => node ? (parseInt(node.textContent.trim(), 10) || 0) : 0;
const getNumOr = (node, fallback) => node ? getNum(node) : fallback;
const fmt = (n) => n >= 0 ? `+${n}` : `${n}`;
// FG writes "-" in fields that do not apply to an item
const dashless = (s) => s === '-' ? '' : s;
// A windowreference's <recordname> ends in "@Module Name": the rulebook module a record came from
const moduleOf = (linkNode) => esc((rawText(q(linkNode, 'recordname')).split('@')[1] || '').trim());
const textToHtml = (s) => esc(s).replace(/\r\n|\r|\n/g, '<br>');

const ABILITY_NAMES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const ABILITY_ABBR = { strength:'STR', dexterity:'DEX', constitution:'CON', intelligence:'INT', wisdom:'WIS', charisma:'CHA' };

// FG "formattedtext" (p/b/i/h/list/link/table) → safe HTML
function ftToHtml(node) {
  if (!node) return '';
  function conv(n) {
    if (n.nodeType === 3) return esc(n.textContent);
    if (n.nodeType !== 1) return '';
    const tag = n.tagName.toLowerCase();
    const inner = Array.from(n.childNodes).map(conv).join('');
    switch (tag) {
      case 'p': return inner.trim() ? `<p>${inner}</p>` : '';
      case 'b': return `<b>${inner}</b>`;
      case 'i': return `<em>${inner}</em>`;
      case 'u': return `<u>${inner}</u>`;
      case 'h': return `<div class="ft-h">${inner}</div>`;
      case 'frame': return `<div class="ft-frame">${inner}</div>`;
      case 'list': return `<ul>${inner}</ul>`;
      case 'li': return `<li>${inner}</li>`;
      case 'table': return `<table class="ft-table">${inner}</table>`;
      case 'tr': return `<tr>${inner}</tr>`;
      case 'td': return `<td>${inner}</td>`;
      case 'linklist': {
        const links = Array.from(n.querySelectorAll('link')).map(l =>
          `<span class="link-ref">${Array.from(l.childNodes).map(conv).join('')}</span>`
        ).join(' · ');
        return `<div class="linklist">${links}</div>`;
      }
      case 'link': return `<span class="link-ref">${inner}</span>`;
      default: return inner;
    }
  }
  return Array.from(node.childNodes).map(conv).join('');
}

// A node that may be either a plain string or formattedtext
const anyTextToHtml = (node) => !node ? '' : (node.children.length ? ftToHtml(node) : textToHtml(rawText(node)));

// ===== DICE =====
// FG writes dice as "d6", "2d6", or a list like "d6,d6". Count them per die size.
function parseDice(str) {
  const counts = {};
  (str || '').split(/[,+\s]+/).forEach(tok => {
    const m = tok.match(/^(\d*)d(\d+)$/i);
    if (m) counts[m[2]] = (counts[m[2]] || 0) + (parseInt(m[1], 10) || 1);
  });
  return counts;
}

function formatRoll(counts, mod) {
  const dice = Object.keys(counts).sort((a, b) => b - a).map(d => `${counts[d]}d${d}`).join('+');
  if (!dice) return `${mod}`;
  return dice + (mod ? fmt(mod) : '');
}

// Combine clauses that share a damage type, the way FG rolls them:
// [{dice:'d4',mod:4,type:'bludgeoning'},{dice:'d6',mod:1,type:'bludgeoning'}] → 1d6+1d4+5 bludgeoning
function mergeRolls(clauses) {
  const byType = new Map();
  clauses.forEach(cl => {
    if (!byType.has(cl.type)) byType.set(cl.type, { counts: {}, mod: 0 });
    const acc = byType.get(cl.type);
    Object.entries(parseDice(cl.dice)).forEach(([d, n]) => { acc.counts[d] = (acc.counts[d] || 0) + n; });
    acc.mod += cl.mod;
  });
  return Array.from(byType, ([type, acc]) => ({
    roll: formatRoll(acc.counts, acc.mod),
    type: esc(type.split(',').map(s => s.trim()).filter(Boolean).join(', ')),
  })).filter(r => r.roll !== '0');
}

// ===== XML PARSER =====
function parseCharacter(xmlDoc) {
  const c = xmlDoc.querySelector('character');
  if (!c) return null;
  const str = (tag) => getText(q(c, tag));
  const num = (tag) => getNum(q(c, tag));

  const name = str('name');
  const race = str('race');
  const level = num('level');
  const background = str('background');
  const destiny = str('destiny');
  const size = str('size');
  const senses = str('senses');
  const inspiration = num('inspiration');
  const hero = num('hero');
  const exp = num('exp');
  const expNeeded = num('expneeded');
  const profBonus = num('profbonus');
  const perception = num('perception');

  // Optional biography fields — only some players fill these in
  const details = [
    ['alignment', 'Alignment'], ['gender', 'Gender'], ['age', 'Age'], ['height', 'Height'],
    ['weight', 'Weight'], ['deity', 'Deity'], ['faction', 'Faction'],
  ].map(([tag, label]) => ({ label, value: str(tag) })).filter(d => d.value);

  const narrative = [
    ['appearance', 'Appearance'], ['personalitytraits', 'Personality Traits'], ['ideals', 'Ideals'],
    ['bonds', 'Bonds'], ['flaws', 'Flaws'], ['notes', 'Notes'],
  ].map(([tag, label]) => ({ label, html: anyTextToHtml(q(c, tag)) })).filter(d => d.html);

  // Journal entries (adventurelist)
  const notes = qa(c, 'adventurelist > *').map(n => ({
    name: getText(q(n, 'name')),
    html: ftToHtml(q(n, 'text')),
  })).filter(n => n.name || n.html);

  // Classes
  const classes = qa(c, 'classes > *').map(cls => ({
    name: getText(q(cls, 'name')),
    level: getNum(q(cls, 'level')),
    specialization: getText(q(cls, 'specialization')),
    hddie: getText(q(cls, 'hddie')),
    hdUsed: getNum(q(cls, 'hdused')),
    casterpactmagic: getNum(q(cls, 'casterpactmagic')),
    module: moduleOf(q(cls, 'shortcut')),
  })).filter(cl => cl.name);

  // Where each building block was taken from. An empty module means the name was
  // typed in by hand rather than added from a rulebook, so nothing came with it.
  const sources = [
    { label: 'Heritage', name: race, module: moduleOf(q(c, 'racelink')) },
    { label: 'Heritage variant', name: '', module: moduleOf(q(c, 'subracelink')) },
    { label: 'Background', name: background, module: moduleOf(q(c, 'backgroundlink')) },
    { label: 'Destiny', name: destiny, module: moduleOf(q(c, 'destinylink')) },
    ...classes.map(cl => ({ label: 'Class', name: cl.name, module: cl.module })),
  ].filter(s => s.name || s.module).map(s => ({
    ...s,
    // A GM's own module is usually named after a person; the site is public, so say
    // "homebrew" rather than print the name.
    homebrew: !!s.module && !/level up|a5e|^dd\b|^d&amp;d|guide|codex|gazette|menagerie|handbook|manual|compendium/i.test(s.module),
  }));

  // Abilities
  const abilities = {};
  [...ABILITY_NAMES, 'luck'].forEach(ab => {
    const node = q(c, `abilities > ${ab}`);
    if (node) {
      abilities[ab] = {
        score: getNum(q(node, 'score')),
        bonus: getNum(q(node, 'bonus')),
        save: getNum(q(node, 'save')),
        saveProf: getNum(q(node, 'saveprof')),
        saveMod: getNum(q(node, 'savemodifier')),   // flat bonus already included in `save`
        current: ab === 'luck' ? getNum(q(node, 'current')) : null,
      };
    }
  });
  const abilityBonus = (stat) => abilities[stat]?.bonus ?? 0;

  // HP
  const hpNode = q(c, 'hp');
  const hp = {
    total: getNum(q(hpNode, 'total')),
    wounds: getNum(q(hpNode, 'wounds')),
    temporary: getNum(q(hpNode, 'temporary')),
    deathFail: getNum(q(hpNode, 'deathsavefail')),
    deathSuccess: getNum(q(hpNode, 'deathsavesuccess')),
  };
  hp.current = Math.max(0, hp.total - hp.wounds);

  // AC — total = 10 + armor + shield + dex (unless the armor forbids it) + misc + temporary
  const acNode = q(c, 'defenses > ac');
  const ac = {
    total: getNum(q(acNode, 'total')),
    armor: getNum(q(acNode, 'armor')),
    shield: getNum(q(acNode, 'shield')),
    misc: getNum(q(acNode, 'misc')),
    temporary: getNum(q(acNode, 'temporary')),
    stealthDis: getNum(q(acNode, 'disstealth')),
  };
  ac.other = ac.total - 10 - ac.armor - ac.shield - ac.misc - ac.temporary;
  ac.otherIsDex = ac.other !== 0 && ac.other === abilityBonus('dexterity');

  // Initiative, speed
  const initiative = getNum(q(c, 'initiative > total'));
  const speed = getNum(q(c, 'speed > total'));
  const speedSpecial = getText(q(c, 'speed > special'));

  // Encumbrance
  const enc = {
    load: getNum(q(c, 'encumbrance > load')),
    max: getNum(q(c, 'encumbrance > max')),
    encumbered: getNum(q(c, 'encumbrance > encumbered')),
    heavy: getNum(q(c, 'encumbrance > encumberedheavy')),
    liftPushDrag: getNum(q(c, 'encumbrance > liftpushdrag')),
    bulky: getNum(q(c, 'encumbrance > bulkyitems')),
    supply: getNum(q(c, 'encumbrance > supply')),
  };

  // Skills
  const skills = qa(c, 'skilllist > *').map(sk => ({
    name: getText(q(sk, 'name')),
    stat: getText(q(sk, 'stat')),
    total: getNum(q(sk, 'total')),
    prof: getNum(q(sk, 'prof')),
    misc: getNum(q(sk, 'misc')),
  })).filter(s => s.name).sort((a, b) => a.name.localeCompare(b.name));

  // Coins
  const coins = qa(c, 'coins > *').map(cn => ({
    name: getText(q(cn, 'name')),
    amount: getNum(q(cn, 'amount')),
  })).filter(co => co.name);

  const languages = qa(c, 'languagelist > *').map(l => getText(q(l, 'name'))).filter(Boolean);
  const proficiencies = qa(c, 'proficiencylist > *').map(p => getText(q(p, 'name'))).filter(Boolean);

  // ----- Power groups: each carries the stat/proficiency used by its powers -----
  const groups = {};
  qa(c, 'powergroup > *').forEach(pg => {
    const groupName = rawText(q(pg, 'name'));
    if (!groupName) return;
    groups[groupName] = {
      stat: rawText(q(pg, 'stat')),
      atkProf: getNumOr(q(pg, 'atkprof'), 1),
      atkMod: getNum(q(pg, 'atkmod')),
      saveProf: getNumOr(q(pg, 'saveprof'), 1),
      saveMod: getNum(q(pg, 'savemod')),
    };
  });

  // Spellcasting ability: the "Spells" group's stat. Some exports omit it (the
  // warlock here), so fall back to the class, then to the best mental stat.
  const classStat = (() => {
    const names = classes.map(cl => cl.name.toLowerCase()).join(' ');
    if (/wizard|artificer/.test(names)) return 'intelligence';
    if (/cleric|druid|ranger/.test(names)) return 'wisdom';
    if (/warlock|sorcerer|bard|paladin|herald/.test(names)) return 'charisma';
    if (classes.some(cl => cl.casterpactmagic === 1)) return 'charisma';
    return ['intelligence', 'wisdom', 'charisma'].reduce((best, s) => abilityBonus(s) > abilityBonus(best) ? s : best);
  })();
  const spellStatName = ABILITY_ABBR[groups.Spells?.stat] ? groups.Spells.stat : classStat;
  if (groups.Spells) groups.Spells.stat = spellStatName;

  const groupCalc = (groupName) => {
    const g = groups[groupName] || { stat: '', atkProf: 1, atkMod: 0, saveProf: 1, saveMod: 0 };
    const statBonus = abilityBonus(g.stat);
    return {
      stat: g.stat,
      statBonus,
      atk: statBonus + (g.atkProf ? profBonus : 0) + g.atkMod,
      dc: 8 + statBonus + (g.saveProf ? profBonus : 0) + g.saveMod,
    };
  };
  // A character with no "Spells" group still gets sensible numbers from the fallback stat
  const spellCalc = groups.Spells ? groupCalc('Spells') : {
    stat: spellStatName, statBonus: abilityBonus(spellStatName),
    atk: abilityBonus(spellStatName) + profBonus, dc: 8 + abilityBonus(spellStatName) + profBonus,
  };

  // ----- Spell slots -----
  const spellSlots = [];
  for (let i = 1; i <= 9; i++) {
    const node = q(c, `powermeta > spellslots${i}`);
    const max = getNum(q(node, 'max'));
    if (max > 0) {
      const used = Math.min(max, getNum(q(node, 'used')));
      spellSlots.push({ level: i, max, used, remaining: max - used });
    }
  }
  // Pact magic. A5E warlocks spend spell points (pactmagicpoints) rather than
  // slots; core 5E warlocks have pactmagicslotsN instead.
  let spellPoints = null;
  const pactLevel = getNum(q(c, 'powermeta > pactmagiclevel'));
  const ptsMax = getNum(q(c, 'powermeta > pactmagicpoints > max'));
  if (ptsMax > 0) {
    const used = Math.min(ptsMax, getNum(q(c, 'powermeta > pactmagicpoints > used')));
    spellPoints = { max: ptsMax, used, remaining: ptsMax - used, maxSpellLevel: pactLevel };
  } else {
    for (let i = 1; i <= 9; i++) {
      const node = q(c, `powermeta > pactmagicslots${i}`);
      const max = getNum(q(node, 'max'));
      if (max > 0) {
        const used = Math.min(max, getNum(q(node, 'used')));
        spellSlots.push({ level: i, max, used, remaining: max - used, pact: true });
      }
    }
  }

  // ----- Power actions: FG's attack / save / damage / heal / effect automation -----
  function parseActions(pw, groupName) {
    const grp = groupCalc(groupName);
    // An ungrouped power, or a "Spells" power, resolves "base" against the spellcasting stat
    const base = groups[groupName] ? grp : spellCalc;
    const statFor = (s) => s === 'base' ? base.statBonus : abilityBonus(s);
    const out = [];

    const rollClauses = (listNode) => qa(listNode, '*').map(d => {
      const stat = rawText(q(d, 'stat'));
      const mult = getNumOr(q(d, 'statmult'), 1);
      return {
        dice: rawText(q(d, 'dice')),
        mod: getNum(q(d, 'bonus')) + (stat ? statFor(stat) * mult : 0),
        type: rawText(q(d, 'type')),
      };
    });

    qa(pw, 'actions > *')
      .sort((a, b) => getNum(q(a, 'order')) - getNum(q(b, 'order')))
      .forEach(a => {
        const type = rawText(q(a, 'type'));
        if (type === 'cast') {
          const atkType = rawText(q(a, 'atktype'));
          if (atkType) {
            const mode = rawText(q(a, 'atkbase'));
            const mod = getNum(q(a, 'atkmod'));
            const atk = mode === 'fixed' ? mod
              : mode === 'ability' ? abilityBonus(rawText(q(a, 'atkstat'))) + (getNumOr(q(a, 'atkprof'), 1) ? profBonus : 0) + mod
              : base.atk + mod;
            out.push({ kind: 'attack', text: `${esc(atkType)} attack ${fmt(atk)}` });
          }
          const saveType = rawText(q(a, 'savetype'));
          if (saveType) {
            const mode = rawText(q(a, 'savedcbase'));
            const mod = getNum(q(a, 'savedcmod'));
            const dc = mode === 'fixed' ? mod
              : mode === 'ability' ? 8 + abilityBonus(rawText(q(a, 'savedcstat'))) + (getNumOr(q(a, 'savedcprof'), 1) ? profBonus : 0) + mod
              : base.dc + mod;
            const half = rawText(q(a, 'onmissdamage')) === 'half' ? ' · half on save' : '';
            out.push({ kind: 'save', text: `${ABILITY_ABBR[saveType] || esc(saveType)} save DC ${dc}${half}` });
          }
        } else if (type === 'damage') {
          mergeRolls(rollClauses(q(a, 'damagelist'))).forEach(r =>
            out.push({ kind: 'damage', text: `${r.roll}${r.type ? ' ' + r.type : ''}` }));
        } else if (type === 'heal') {
          const temp = rawText(q(a, 'healtype')) === 'temp';
          const self = rawText(q(a, 'healtargeting')) === 'self';
          mergeRolls(rollClauses(q(a, 'heallist')).map(cl => ({ ...cl, type: '' }))).forEach(r =>
            out.push({ kind: 'heal', text: `${temp ? 'Temp HP' : 'Heal'} ${r.roll}${self ? ' (self)' : ''}` }));
        } else if (type === 'effect') {
          const label = rawText(q(a, 'label'));
          if (!label) return;
          const n = getNum(q(a, 'durmod'));
          const unit = rawText(q(a, 'durunit')) || 'round';
          const dur = n > 0 ? ` · ${n} ${esc(unit)}${n !== 1 ? 's' : ''}` : '';
          const self = rawText(q(a, 'targeting')) === 'self' ? ' · self' : '';
          out.push({ kind: 'effect', text: `${esc(label)}${dur}${self}` });
        }
      });
    return out;
  }

  // ----- Powers (spells + class/species actions) -----
  const seenPowers = new Set();
  const powers = qa(c, 'powers > *').map(pw => {
    const nm = getText(q(pw, 'name'));
    const lvl = getNum(q(pw, 'level'));
    const key = `${nm}|${lvl}`;
    if (!nm || seenPowers.has(key)) return null;   // FG occasionally duplicates entries
    seenPowers.add(key);
    const groupName = rawText(q(pw, 'group'));
    const duration = getText(q(pw, 'duration'));
    const school = getText(q(pw, 'school'));
    return {
      name: nm,
      level: lvl,
      group: esc(groupName),
      // Ungrouped powers are usually item or feature abilities (a poisoned
      // dagger, Eldritch Whip); only call one a spell if it has a school.
      isSpell: groupName === 'Spells' || (!groupName && !!school),
      school,
      prepared: getNum(q(pw, 'prepared')),
      cast: getNum(q(pw, 'cast')),
      castingTime: getText(q(pw, 'castingtime')),
      range: getText(q(pw, 'range')),
      duration,
      concentration: /concentration/i.test(duration),
      components: getText(q(pw, 'components')),
      ritual: getNum(q(pw, 'ritual')),
      rare: getNum(q(pw, 'rare')),
      usesPeriod: getText(q(pw, 'usesperiod')),
      source: getText(q(pw, 'source')),
      summary: getText(q(pw, 'shortdescription')),
      description: ftToHtml(q(pw, 'description')),
      actions: parseActions(pw, groupName),
    };
  }).filter(Boolean);

  const spells = powers.filter(p => p.isSpell);
  // Prepared-caster vs known-caster: if nothing above cantrip level is flagged
  // prepared (warlocks), the flag carries no information and is not shown.
  const usesPreparation = spells.some(sp => sp.level > 0 && sp.prepared);
  const hasSpellcasting = spells.length > 0 || spellSlots.length > 0 || !!spellPoints;

  // ----- Inventory -----
  const inventory = qa(c, 'inventorylist > *').map(item => {
    const trueName = getText(q(item, 'name'));
    if (!trueName) return null;   // FG leaves empty placeholder rows behind
    // Unidentified items must not leak their real name or description to players
    const identified = getNumOr(q(item, 'isidentified'), 1) !== 0;
    const base = {
      identified,
      type: getText(q(item, 'type')),
      subtype: getText(q(item, 'subtype')),
      count: getNum(q(item, 'count')),
      weight: parseFloat(q(item, 'weight')?.textContent || '0') || 0,
      carried: getNum(q(item, 'carried')),   // 0 = not carried, 1 = carried, 2 = equipped
      attune: getNum(q(item, 'attune')),
    };
    if (!identified) {
      return {
        ...base,
        name: getText(q(item, 'nonid_name')) || 'Unidentified item',
        damage: '', ac: 0, rarity: '', properties: '', cost: '',
        stealth: '', strength: '', aura: '', prerequisites: '', spells: [],
        desc: textToHtml(rawText(q(item, 'nonidentified'))),
      };
    }
    return {
      ...base,
      name: trueName,
      damage: getText(q(item, 'damage')),
      ac: getNum(q(item, 'ac')),
      rarity: getText(q(item, 'rarity')),
      properties: getText(q(item, 'properties')),
      cost: getText(q(item, 'cost')),
      stealth: dashless(getText(q(item, 'stealth'))),       // armor: "Disadvantage"
      strength: dashless(getText(q(item, 'strength'))),     // armor: Strength needed to wear it
      aura: getText(q(item, 'aura')),
      prerequisites: getText(q(item, 'prerequisites')),
      // <spells> mostly holds the templates FG forged the item from (a spoiler for
      // reskinned items); only entries linked to a spell record are spells the item holds.
      spells: qa(item, 'spells > *')
        .filter(s => rawText(q(s, 'link > class')) === 'reference_spell')
        .map(s => ({ name: getText(q(s, 'name')), module: moduleOf(q(s, 'link')) }))
        .filter(s => s.name),
      desc: ftToHtml(q(item, 'description')),
    };
  }).filter(Boolean);

  // FG's sheet-level stealth flag is often left unset; the worn armor says so itself
  const noisyArmor = inventory.find(i => i.identified && i.carried === 2 && /disadvantage/i.test(i.stealth));
  if (noisyArmor) ac.stealthDis = 1;
  ac.stealthFrom = noisyArmor ? noisyArmor.name : '';

  // ----- Weapons -----
  const critRange = {
    melee: getNumOr(q(c, 'weapon > critrange > melee'), 20),
    ranged: getNumOr(q(c, 'weapon > critrange > ranged'), 20),
  };
  const WEAPON_KINDS = ['Melee', 'Ranged', 'Thrown'];
  const weapons = qa(c, 'weaponlist > *').map(w => {
    const wName = getText(q(w, 'name'));
    if (!wName) return null;
    const properties = getText(q(w, 'properties'));
    const typeNum = getNum(q(w, 'type'));   // 0 = melee, 1 = ranged, 2 = thrown
    // FG usually omits <attackstat>; resolve it the way FG does:
    // ranged → DEX, finesse → best of STR/DEX, otherwise STR.
    const explicit = rawText(q(w, 'attackstat'));
    const stat = (explicit && explicit !== 'base') ? explicit
      : typeNum === 1 ? 'dexterity'
      : /finesse/i.test(properties) ? (abilityBonus('dexterity') >= abilityBonus('strength') ? 'dexterity' : 'strength')
      : 'strength';
    const prof = getNum(q(w, 'prof'));
    const damage = mergeRolls(qa(w, 'damagelist > *').map(d => {
      const dStat = rawText(q(d, 'stat'));
      const mult = getNumOr(q(d, 'statmult'), 1);
      const dBonus = dStat === 'base' ? abilityBonus(stat) : dStat ? abilityBonus(dStat) : 0;
      return { dice: rawText(q(d, 'dice')), mod: getNum(q(d, 'bonus')) + dBonus * mult, type: rawText(q(d, 'type')) };
    }));
    // A weapon is magic if its own properties say so, or its inventory entry is a magic item
    const invItem = inventory.find(i => i.name === wName);
    const magic = /magic/i.test(properties) || /magic/i.test(invItem?.properties || '')
      || /\b(uncommon|rare|legendary|artifact)\b/i.test(invItem?.rarity || '');
    const maxAmmo = getNum(q(w, 'maxammo'));
    return {
      name: wName,
      kind: WEAPON_KINDS[typeNum] || 'Melee',
      stat,
      prof,
      atk: abilityBonus(stat) + (prof ? profBonus : 0) + getNum(q(w, 'attackbonus')),
      damage,
      properties,
      carried: getNum(q(w, 'carried')),
      magic,
      ammo: maxAmmo > 0 ? { max: maxAmmo, used: getNum(q(w, 'ammo')) } : null,
    };
  }).filter(Boolean);

  // ----- Features, traits, feats -----
  const features = qa(c, 'featurelist > *').map(f => ({
    name: getText(q(f, 'name')),
    level: getNum(q(f, 'level')),
    specialization: getText(q(f, 'specialization')),
    desc: ftToHtml(q(f, 'text')),
  })).filter(f => f.name);

  // Traits: FG types heritage ones "racial"/"subracial"; culture traits and the
  // GM's "Campaign Trait: …" one-liners arrive untyped.
  const traits = qa(c, 'traitlist > *').map(t => {
    const tName = getText(q(t, 'name'));
    const type = rawText(q(t, 'type')).toLowerCase();
    const group = /^campaign trait/i.test(tName) ? 'campaign'
      : /rac(e|ial)|heritage/.test(type) ? 'heritage'
      : !type || type === 'culture' ? 'culture'
      : 'other';
    return { name: tName, type: esc(type), group, desc: ftToHtml(q(t, 'text')), level: 0, specialization: '' };
  }).filter(t => t.name);

  const feats = qa(c, 'featlist > *').map(f => ({
    name: getText(q(f, 'name')),
    type: getText(q(f, 'type')),
    desc: ftToHtml(q(f, 'text')),
    level: 0,
    specialization: '',
  })).filter(f => f.name);

  // ----- Cohorts: companions and familiars, each a full NPC stat block -----
  const cohortList = (node, path) => qa(node, `${path} > *`).map(e => ({
    name: getText(q(e, 'name')),
    desc: textToHtml(rawText(q(e, 'desc'))),
  })).filter(e => e.name || e.desc);

  const cohorts = qa(c, 'cohorts > *').map(co => {
    const hpTotal = getNum(q(co, 'hptotal')) || getNum(q(co, 'hp'));
    const wounds = getNum(q(co, 'wounds'));
    const coAbilities = {};
    ABILITY_NAMES.forEach(ab => {
      const node = q(co, `abilities > ${ab}`);
      if (node) coAbilities[ab] = { score: getNum(q(node, 'score')), bonus: getNum(q(node, 'bonus')) };
    });
    return {
      name: getText(q(co, 'name')),
      size: getText(q(co, 'size')),
      type: getText(q(co, 'type')),
      alignment: getText(q(co, 'alignment')),
      ac: getText(q(co, 'ac')),
      acText: getText(q(co, 'actext')),
      hp: { total: hpTotal, wounds, current: Math.max(0, hpTotal - wounds), temporary: getNum(q(co, 'hptemp')) },
      hd: getText(q(co, 'hd')),
      speed: getText(q(co, 'speed')),
      abilities: coAbilities,
      stats: [
        ['Saving Throws', 'savingthrows'], ['Skills', 'skills'],
        ['Damage Vulnerabilities', 'damagevulnerabilities'], ['Damage Resistances', 'damageresistances'],
        ['Damage Immunities', 'damageimmunities'], ['Condition Immunities', 'conditionimmunities'],
        ['Senses', 'senses'], ['Languages', 'languages'],
      ].map(([label, tag]) => ({ label, value: getText(q(co, tag)) })).filter(s => s.value && s.value !== '-'),
      cr: getText(q(co, 'cr')),
      xp: getNum(q(co, 'xp')),
      proficiency: getNum(q(co, 'proficiency')),
      maneuverDC: getNum(q(co, 'maneuver')),
      sections: [
        ['Traits', 'traits'], ['Actions', 'actions'], ['Bonus Actions', 'bonusactions'],
        ['Reactions', 'reactions'], ['Legendary Actions', 'legendaryactions'], ['Lair Actions', 'lairactions'],
        ['Innate Spells', 'innatespells'], ['Spells', 'spells'],
      ].map(([label, tag]) => ({ label, entries: cohortList(co, tag) })).filter(s => s.entries.length),
      lore: ftToHtml(q(co, 'text')),
    };
  }).filter(co => co.name);

  return {
    name, race, level, background, destiny, size, senses,
    inspiration, hero, exp, expNeeded, profBonus, perception,
    details, narrative, notes, sources,
    classes, abilities, hp, ac, initiative, speed, speedSpecial, enc,
    skills, coins, languages, proficiencies,
    spellSlots, spellPoints, powers, spells, usesPreparation, hasSpellcasting,
    weapons, critRange, inventory,
    features, traits, feats, cohorts,
    spellDC: spellCalc.dc, spellAtk: spellCalc.atk, spellStatName,
    spellAbilAbbr: ABILITY_ABBR[spellStatName], spellBonus: spellCalc.statBonus,
  };
}
