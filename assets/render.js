/* render.js — character object (from parser.js) → HTML.
 *
 * Values on the character object are already HTML-escaped by the parser, so
 * they are interpolated directly. Expand/collapse is handled by one delegated
 * listener in app.js: any element with class "expandable" toggles "expanded",
 * and its ".card-body" child is shown while expanded.
 */
'use strict';

const ordinal = (n) => n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const classLine = (ch) => ch.classes.map(c =>
  `${c.name} ${c.level}${c.specialization ? ` (${c.specialization})` : ''}`).join(' / ');
const hpColor = (pct) => pct > 50 ? '#4da86e' : pct > 25 ? '#d4a843' : '#c44040';
const hpPercent = (hp) => hp.total > 0 ? Math.round((hp.current / hp.total) * 100) : 0;

// Attack / save / damage / heal / effect chips for a power's FG automation
function actionChips(actions) {
  if (!actions || !actions.length) return '';
  const icons = { attack: '🎯', save: '🛡', damage: '💥', heal: '💚', effect: '✧' };
  return `<div class="act-chips">${actions.map(a =>
    `<span class="act-chip act-${a.kind}">${icons[a.kind] || ''} ${a.text}</span>`).join('')}</div>`;
}

function renderHeader(ch) {
  const hitDice = ch.classes.filter(c => c.hddie).map(c => {
    const die = c.hddie.replace(/^1(?=d)/, '');
    return `${c.level - c.hdUsed}/${c.level}${die}`;
  }).join(', ');
  const alignment = ch.details.find(d => d.label === 'Alignment')?.value;

  document.getElementById('cs-header').innerHTML = `
    <div class="portrait-frame"><span class="portrait-initial">${ch.name.charAt(0) || '?'}</span></div>
    <div class="header-info">
      <div class="char-name">${ch.name}</div>
      <div class="char-subtitle"><span>${ch.race}</span> · <span>${classLine(ch)}</span> · <span>Level ${ch.level}</span></div>
      <div class="char-meta">
        <div class="char-meta-item">
          <span class="char-meta-label">Background</span>
          <span class="char-meta-value">${ch.background || '—'}</span>
        </div>
        <div class="char-meta-item">
          <span class="char-meta-label">Destiny</span>
          <span class="char-meta-value">${ch.destiny || '—'}</span>
        </div>
        ${alignment ? `
        <div class="char-meta-item">
          <span class="char-meta-label">Alignment</span>
          <span class="char-meta-value">${alignment}</span>
        </div>` : ''}
        <div class="char-meta-item">
          <span class="char-meta-label">Size</span>
          <span class="char-meta-value">${ch.size || '—'}</span>
        </div>
        <div class="char-meta-item" title="Hit dice remaining / total">
          <span class="char-meta-label">Hit Dice</span>
          <span class="char-meta-value">${hitDice || '—'}</span>
        </div>
      </div>
    </div>
    <div class="header-badges">
      ${ch.inspiration ? `<div class="badge active"><div class="badge-dot"></div>Inspired</div>` : ''}
      <div class="badge${ch.hero > 0 ? ' active' : ''}">⭐ ${plural(ch.hero, 'Hero Point')}</div>
      <div class="badge">📖 ${ch.exp.toLocaleString()} / ${ch.expNeeded.toLocaleString()} XP</div>
    </div>
  `;
}

function renderStatsBar(ch) {
  const pct = hpPercent(ch.hp);
  const color = hpColor(pct);
  const acParts = [
    ch.ac.armor ? `armor ${fmt(ch.ac.armor)}` : '',
    ch.ac.shield ? `shield ${fmt(ch.ac.shield)}` : '',
    ch.ac.other ? `${ch.ac.otherIsDex ? 'dex' : 'other'} ${fmt(ch.ac.other)}` : '',
    ch.ac.misc ? `misc ${fmt(ch.ac.misc)}` : '',
    ch.ac.temporary ? `temp ${fmt(ch.ac.temporary)}` : '',
  ].filter(Boolean).join(' · ');
  const luck = ch.abilities.luck;

  document.getElementById('cs-stats-bar').innerHTML = `
    <div class="stat-block stat-hp">
      <div class="stat-label">Hit Points</div>
      <div class="stat-value hp-disp" style="color:${color}">${ch.hp.current} <span class="stat-of">/ ${ch.hp.total}</span></div>
      <div class="hp-bar-wrap"><div class="hp-bar-fill" style="width:${pct}%; background:${color}"></div></div>
      ${ch.hp.temporary > 0 ? `<div class="stat-sub">+${ch.hp.temporary} temp</div>` : ''}
    </div>
    <div class="stat-block stat-ac" title="10${acParts ? ' · ' + acParts : ''}${ch.ac.stealthDis ? ' · disadvantage on Stealth' : ''}">
      <div class="stat-label">Armor Class</div>
      <div class="stat-value blue">${ch.ac.total}</div>
      <div class="stat-sub">${acParts || 'AC'}</div>
    </div>
    <div class="stat-block">
      <div class="stat-label">Initiative</div>
      <div class="stat-value">${fmt(ch.initiative)}</div>
    </div>
    <div class="stat-block"${ch.speedSpecial ? ` title="${ch.speedSpecial}"` : ''}>
      <div class="stat-label">Speed</div>
      <div class="stat-value">${ch.speed}</div>
      <div class="stat-sub">${ch.speedSpecial ? 'ft +' : 'ft'}</div>
    </div>
    <div class="stat-block">
      <div class="stat-label">Proficiency</div>
      <div class="stat-value gold">${fmt(ch.profBonus)}</div>
    </div>
    <div class="stat-block">
      <div class="stat-label">Passive Perc.</div>
      <div class="stat-value">${ch.perception}</div>
    </div>
    ${ch.hasSpellcasting ? `
    <div class="stat-block">
      <div class="stat-label">Spell Save DC</div>
      <div class="stat-value gold">${ch.spellDC}</div>
      <div class="stat-sub">${ch.spellAbilAbbr}</div>
    </div>
    <div class="stat-block">
      <div class="stat-label">Spell Attack</div>
      <div class="stat-value gold">${fmt(ch.spellAtk)}</div>
    </div>` : ''}
    ${luck ? `
    <div class="stat-block">
      <div class="stat-label">Luck</div>
      <div class="stat-value">${luck.score}</div>
      <div class="stat-sub">${fmt(luck.bonus)}</div>
    </div>` : ''}
  `;
}

function renderAbilities(ch) {
  document.getElementById('sidebar-abilities').innerHTML = `
    <div class="section-title">Ability Scores</div>
    <div class="abilities-grid">
      ${ABILITY_NAMES.map(ab => {
        const a = ch.abilities[ab];
        if (!a) return '';
        return `
          <div class="ability-box" title="${ab} save ${fmt(a.save)}">
            <div class="ability-save-indicator ${a.saveProf ? 'proficient' : ''}" title="Saving throw: ${a.saveProf ? 'Proficient' : 'Not proficient'}"></div>
            <div class="ability-name">${ABILITY_ABBR[ab]}</div>
            <div class="ability-score">${a.score}</div>
            <div class="ability-mod">${fmt(a.bonus)}</div>
            <div class="ability-save-val">Save ${fmt(a.save)}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderSaves(ch) {
  document.getElementById('sidebar-saves').innerHTML = `
    <div class="section-title">Saving Throws</div>
    <div class="saves-list">
      ${ABILITY_NAMES.map(ab => {
        const a = ch.abilities[ab];
        if (!a) return '';
        return `
          <div class="save-row">
            <div class="prof-pip ${a.saveProf ? 'filled' : ''}"></div>
            <div class="save-name">${ab.charAt(0).toUpperCase() + ab.slice(1)}</div>
            <div class="save-bonus">${fmt(a.save)}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderSkills(ch) {
  document.getElementById('sidebar-skills').innerHTML = `
    <div class="section-title">Skills</div>
    <div class="skills-list">
      ${ch.skills.map(sk => `
        <div class="skill-row ${sk.prof ? 'proficient' : ''}">
          <div class="prof-pip ${sk.prof >= 2 ? 'filled expert' : sk.prof ? 'filled' : ''}" title="${sk.prof >= 2 ? 'Expertise' : sk.prof ? 'Proficient' : 'Not proficient'}"></div>
          <div class="skill-name">${sk.name}${sk.prof >= 2 ? ' ★' : ''}</div>
          <div class="skill-stat">${ABILITY_ABBR[sk.stat?.toLowerCase()] || ''}</div>
          <div class="skill-bonus">${fmt(sk.total)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderCombatTab(ch) {
  // Equipped first, then carried, then left at home
  const weapons = [...ch.weapons].sort((a, b) => b.carried - a.carried);
  const carriedLabel = { 2: 'Equipped', 1: 'Carried', 0: 'Not carried' };

  const weaponsHtml = weapons.length === 0
    ? '<div class="no-items" style="padding:16px">No weapons listed.</div>'
    : `<div class="table-scroll"><table>
        <thead><tr><th>Weapon</th><th>Atk</th><th>Damage</th><th>Properties</th></tr></thead>
        <tbody>
          ${weapons.map(w => `<tr class="${w.carried === 0 ? 'row-dim' : ''}">
              <td>
                <div class="weapon-name">${w.carried === 2 ? '🟢 ' : ''}${w.name}</div>
                <div class="weapon-type">${w.kind} · ${ABILITY_ABBR[w.stat] || ''} · ${carriedLabel[w.carried] || ''}${w.prof ? '' : ' · not proficient'}</div>
                ${w.magic ? `<div class="weapon-magic">✦ Magic Weapon</div>` : ''}
                ${w.ammo ? `<div class="weapon-type">Ammo ${w.ammo.max - w.ammo.used}/${w.ammo.max}</div>` : ''}
              </td>
              <td><span class="weapon-atk">${fmt(w.atk)}</span></td>
              <td><span class="weapon-dmg">${w.damage.map(d =>
                `${d.roll} <span class="dmg-type">${d.type}</span>`).join('<br>') || '—'}</span></td>
              <td><span class="weapon-props">${w.properties || '—'}</span></td>
            </tr>`).join('')}
        </tbody>
      </table></div>`;

  const critNote = (ch.critRange.melee < 20 || ch.critRange.ranged < 20)
    ? `<div class="table-note">Critical hit on ${ch.critRange.melee}–20 (melee) · ${ch.critRange.ranged}–20 (ranged)</div>` : '';

  // Special actions: every non-spell power group (e.g. "Cleric Actions/Effects",
  // "Race Actions/Effects"). For these FG reuses <prepared> as the number of
  // uses and <cast> as how many are spent.
  const periodLabels = { enc: 'per rest', once: 'once', daily: 'per day', day: 'per day' };
  const specialActions = ch.powers.filter(p => !p.isSpell);
  const actionsHtml = specialActions.map(a => {
    const uses = a.prepared > 0
      ? `${a.prepared - Math.min(a.cast, a.prepared)}/${a.prepared} ${periodLabels[a.usesPeriod] || 'per day'}` : '';
    return `
    <div class="action-card${a.description ? ' expandable' : ''}">
      <div class="action-header">
        <span class="action-icon">✦</span>
        <span class="action-name">${a.name}</span>
        ${a.group ? `<span class="action-group">${a.group.replace(/ Actions\/Effects$/, '')}</span>` : ''}
        ${uses ? `<span class="action-usage">${uses}</span>` : ''}
        ${a.castingTime ? `<span class="action-usage">${a.castingTime.replace(/^1 /, '')}</span>` : ''}
        ${a.description ? `<span class="action-chevron">▶</span>` : ''}
      </div>
      ${actionChips(a.actions)}
      ${a.description ? `<div class="action-desc card-body">${a.description}</div>` : ''}
    </div>`;
  }).join('');

  const pips = (kind, filled) => [0, 1, 2].map(i =>
    `<div class="ds-pip ${kind}${i < filled ? ' filled' : ''}"></div>`).join('');

  document.getElementById('tab-combat').innerHTML = `
    <div class="weapons-wrap">
      <div class="table-header"><div class="table-header-title">⚔️ Weapons & Attacks</div></div>
      ${weaponsHtml}
      ${critNote}
    </div>
    ${actionsHtml ? `
    <div class="tab-section">
      <div class="section-title">Special Actions</div>
      <div class="actions-grid">${actionsHtml}</div>
    </div>` : ''}
    <div class="tab-section">
      <div class="death-saves-wrap">
        <div class="section-title" style="border:none;padding:0;margin-bottom:10px">Death Saving Throws</div>
        <div class="death-saves-inner">
          <div><div class="ds-label">Successes</div><div class="ds-pips">${pips('success', ch.hp.deathSuccess)}</div></div>
          <div><div class="ds-label">Failures</div><div class="ds-pips">${pips('fail', ch.hp.deathFail)}</div></div>
        </div>
      </div>
    </div>
  `;
}

function renderSpellsTab(ch) {
  function toSlug(name) {
    const stopWords = new Set(['of', 'the', 'a', 'an', 'at', 'in', 'on', 'to', 'for', 'with', 'from', 'and', 'or', 'by']);
    return unesc(name)                    // names are stored HTML-escaped
      .replace(/\s*\(.*?\)/g, '')        // strip FG suffix tags like (30) or (C)
      .toLowerCase()
      .replace(/['’]/g, '')
      .split(/[^a-z0-9]+/)
      .filter(w => w && !stopWords.has(w))
      .join('-');
  }
  const SCHOOLS = ['abjuration', 'conjuration', 'divination', 'enchantment', 'evocation', 'illusion', 'necromancy', 'transmutation'];
  const schoolOf = (school) => SCHOOLS.find(sc => school.toLowerCase().includes(sc)) || '';

  const byLevel = {};
  ch.spells.forEach(sp => { (byLevel[sp.level] = byLevel[sp.level] || []).push(sp); });

  const pipRow = (max, remaining) => Array.from({ length: max }, (_, i) =>
    `<div class="slot-pip ${i < remaining ? 'available' : 'used'}" title="${i < remaining ? 'Available' : 'Used'}"></div>`).join('');

  const slotHtml = ch.spellSlots.map(sl => `
    <div class="slot-group">
      <div class="slot-level">${ordinal(sl.level)}${sl.pact ? ' (Pact)' : ''}</div>
      <div class="slot-pips">${pipRow(sl.max, sl.remaining)}</div>
      <div class="slot-count">${sl.remaining}/${sl.max}</div>
    </div>
  `).join('');

  const pointsHtml = ch.spellPoints ? `
    <div class="spell-slots-wrap">
      <div class="section-title" style="margin-bottom:0">Spell Points</div>
      <div class="slots-grid">
        <div class="slot-group">
          <div class="slot-pips slot-pips-wrap">${pipRow(ch.spellPoints.max, ch.spellPoints.remaining)}</div>
          <div class="slot-count">${ch.spellPoints.remaining} of ${ch.spellPoints.max} remaining${ch.spellPoints.maxSpellLevel ? ` · casts up to ${ordinal(ch.spellPoints.maxSpellLevel)} level` : ''}</div>
        </div>
      </div>
    </div>` : '';

  const levelNames = ['Cantrips', '1st Level', '2nd Level', '3rd Level', '4th Level', '5th Level', '6th Level', '7th Level', '8th Level', '9th Level'];

  function spellCard(sp) {
    const school = schoolOf(sp.school);
    const cantrip = sp.level === 0;
    const ready = cantrip || sp.prepared;
    const dot = !ch.usesPreparation ? ''
      : `<div class="spell-prepared-dot ${cantrip ? 'cantrip' : sp.prepared ? 'prepared' : ''}" title="${cantrip ? 'Cantrip — always available' : sp.prepared ? 'Prepared' : 'Not prepared'}"></div>`;
    const meta = [['Cast Time', sp.castingTime], ['Range', sp.range], ['Duration', sp.duration], ['Components', sp.components]]
      .filter(([, v]) => v)
      .map(([lbl, v]) => `<div class="spell-meta"><span class="spell-meta-lbl">${lbl}</span><span class="spell-meta-val">${v}</span></div>`)
      .join('');
    const hasBody = sp.description || sp.summary;
    return `
      <div class="spell-card${hasBody ? ' expandable' : ''}${ready ? '' : ' unprepared'}">
        <div class="spell-card-header">
          ${dot}
          <div class="spell-name">${sp.name}</div>
          ${sp.concentration ? `<span class="spell-flag" title="Concentration">C</span>` : ''}
          ${sp.ritual ? `<span class="spell-flag" title="Ritual">R</span>` : ''}
          ${sp.rare ? `<span class="spell-flag spell-flag-rare" title="Rare spell">Rare</span>` : ''}
          ${school ? `<span class="spell-school-tag school-${school}">${school}</span>` : ''}
          ${hasBody ? `<span class="spell-chevron">▶</span>` : ''}
        </div>
        ${meta ? `<div class="spell-meta-row">${meta}</div>` : ''}
        ${actionChips(sp.actions)}
        ${hasBody ? `<div class="spell-desc-body card-body">
          ${sp.school || sp.source ? `<p class="spell-tags-line">${[sp.school, sp.source].filter(Boolean).join(' · ')}</p>` : ''}
          ${sp.summary ? `<p><em>${sp.summary}</em></p>` : ''}
          ${sp.description}
          <a class="spell-ext-link" href="https://a5e.tools/spell/${toSlug(sp.name)}" target="_blank" rel="noopener">↗ View on a5e.tools</a>
        </div>` : ''}
      </div>
    `;
  }

  const spellsHtml = Object.keys(byLevel).sort((a, b) => a - b).map(lvl => `
    <div class="spell-level-group">
      <div class="spell-level-header">
        <span class="spell-level-badge">${levelNames[+lvl] || `Level ${lvl}`}</span>
        <span class="spell-level-count">${plural(byLevel[lvl].length, 'spell')}</span>
      </div>
      <div class="spell-cards-list">${byLevel[lvl].map(spellCard).join('')}</div>
    </div>
  `).join('');

  const preparedCount = ch.spells.filter(sp => sp.level > 0 && sp.prepared).length;

  document.getElementById('tab-spells').innerHTML = `
    <div class="spell-casting-info">
      <div class="spell-info-item">
        <div class="spell-info-label">Spellcasting Ability</div>
        <div class="spell-info-val">${ch.spellAbilAbbr}</div>
        <div class="spell-info-sub">${fmt(ch.spellBonus)} modifier</div>
      </div>
      <div class="spell-info-rule"></div>
      <div class="spell-info-item">
        <div class="spell-info-label">Spell Save DC</div>
        <div class="spell-info-val">${ch.spellDC}</div>
      </div>
      <div class="spell-info-rule"></div>
      <div class="spell-info-item">
        <div class="spell-info-label">Spell Attack Bonus</div>
        <div class="spell-info-val">${fmt(ch.spellAtk)}</div>
      </div>
      <div style="flex:1"></div>
      ${ch.usesPreparation ? `
      <div class="spell-filter">
        <div class="spell-legend">🟢 Prepared (${preparedCount}) &nbsp; 🟡 Cantrip &nbsp; ○ Unprepared</div>
        <button class="filter-btn" id="prepared-only-btn" type="button">Show prepared only</button>
      </div>` : ''}
    </div>
    ${slotHtml ? `
    <div class="spell-slots-wrap">
      <div class="section-title" style="margin-bottom:0">Spell Slots</div>
      <div class="slots-grid">${slotHtml}</div>
    </div>` : ''}
    ${pointsHtml}
    <div id="spells-list">${spellsHtml || '<div class="no-items">No spells known.</div>'}</div>
  `;
}

function renderInventoryTab(ch) {
  const coinsHtml = `
    <div class="coins-wrap">
      <div class="section-title" style="margin-bottom:0">Currency</div>
      <div class="coins-row">
        ${ch.coins.map(c => `
          <div class="coin-item">
            <div class="coin-name">${c.name}</div>
            <div class="coin-amount coin-${c.name.toLowerCase()}">${c.amount}</div>
          </div>`).join('')}
      </div>
    </div>
  `;

  const encPct = ch.enc.max > 0 ? Math.min(100, Math.round((ch.enc.load / ch.enc.max) * 100)) : 0;
  const encState = ch.enc.heavy && ch.enc.load > ch.enc.heavy ? 'Heavily encumbered'
    : ch.enc.encumbered && ch.enc.load > ch.enc.encumbered ? 'Encumbered' : '';
  const encColor = encState.startsWith('Heavily') ? '#c44040' : encState ? '#d4a843' : '#4da86e';

  const encHtml = `
    <div class="encumbrance-bar-wrap">
      <div class="encumb-info">
        <span class="encumb-label">Encumbrance${encState ? ` — <span style="color:${encColor}">${encState}</span>` : ''}</span>
        <span class="encumb-val">${ch.enc.load} / ${ch.enc.max} lbs</span>
      </div>
      <div class="encumb-bar"><div class="encumb-fill" style="width:${encPct}%; background:${encColor}"></div></div>
      <div class="encumb-details">
        ${ch.enc.encumbered ? `<span>Encumbered over ${ch.enc.encumbered}</span>` : ''}
        ${ch.enc.heavy ? `<span>Heavily over ${ch.enc.heavy}</span>` : ''}
        ${ch.enc.liftPushDrag ? `<span>Lift/Push/Drag ${ch.enc.liftPushDrag}</span>` : ''}
        <span>Bulky Items: ${ch.enc.bulky}</span>
        <span>Supply: ${ch.enc.supply}</span>
      </div>
    </div>
  `;

  const attuned = ch.inventory.filter(i => i.attune);
  const attuneHtml = attuned.length ? `
    <div class="attune-wrap">
      <span class="encumb-label">Attuned (${attuned.length})</span>
      ${attuned.map(i => `<span class="inv-tag tag-attuned">${i.name}</span>`).join('')}
    </div>` : '';

  function itemTags(item) {
    const tags = [];
    const tag = (cls, label) => tags.push(`<span class="inv-tag ${cls}">${label}</span>`);
    if (!item.identified) tag('tag-stowed', 'Unidentified');
    const r = (item.rarity || '').toLowerCase();
    if (r.includes('uncommon')) tag('tag-uncommon', 'Uncommon');
    else if (r.includes('very rare')) tag('tag-rare', 'Very Rare');
    else if (r.includes('rare')) tag('tag-rare', 'Rare');
    else if (r.includes('legendary')) tag('tag-attuned', 'Legendary');
    else if (r.includes('artifact')) tag('tag-attuned', 'Artifact');
    else if (r.includes('common')) tag('tag-common', 'Common');
    else if (r) tag('tag-common', item.rarity);
    if (/magic/i.test(item.properties)) tag('tag-magic', 'Magic');
    if (item.attune) tag('tag-attuned', 'Attuned');
    else if (r.includes('attunement')) tag('tag-stowed', 'Needs attunement');
    if (item.type === 'Scroll') tag('tag-scroll', 'Scroll');
    if (/^(medicinals|potion)$/i.test(item.type) || /potion/i.test(item.name)) tag('tag-consumable', 'Consumable');
    if (item.carried === 2) tag('tag-equipped', 'Equipped');
    if (item.carried === 0) tag('tag-stowed', 'Not Carried');
    return tags.join('');
  }

  const typeOrder = ['Weapon', 'Armor', 'Wondrous Item', 'Ring', 'Scroll', 'Potion', 'Medicinals', 'Adventuring Gear'];
  const grouped = {};
  ch.inventory.forEach(item => { (grouped[item.type || 'Other'] = grouped[item.type || 'Other'] || []).push(item); });
  const rank = (t) => t === 'Other' ? 999 : (typeOrder.indexOf(t) === -1 ? 99 : typeOrder.indexOf(t));
  const sortedTypes = Object.keys(grouped).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

  const itemsHtml = sortedTypes.map(type => `
    <div class="inv-category">
      <div class="inv-cat-title">${type}</div>
      <div class="inv-items-grid">
        ${grouped[type].sort((a, b) => b.carried - a.carried).map(item => `
          <div class="inv-card${item.desc ? ' expandable' : ''}${item.count === 0 ? ' inv-empty' : ''}">
            <div class="inv-card-header">
              <div class="inv-name">${item.name}</div>
              ${item.count !== 1 ? `<div class="inv-count">×${item.count}</div>` : ''}
              ${item.desc ? `<span class="action-chevron">▶</span>` : ''}
            </div>
            <div class="inv-tags">${itemTags(item)}</div>
            ${item.subtype ? `<div class="inv-weight">${item.subtype}</div>` : ''}
            ${item.damage ? `<div class="inv-weight" style="color:var(--orange)">${item.damage}</div>` : ''}
            ${item.ac > 0 ? `<div class="inv-weight" style="color:var(--blue-bright)">AC ${item.ac}</div>` : ''}
            ${item.cost ? `<div class="inv-weight">💰 ${item.cost}</div>` : ''}
            ${item.weight > 0 ? `<div class="inv-weight">⚖ ${item.weight} lb${item.weight !== 1 ? 's' : ''}</div>` : ''}
            ${item.properties ? `<div class="inv-weight" style="font-style:italic">${item.properties}</div>` : ''}
            ${item.desc ? `<div class="inv-desc card-body">${item.desc}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  document.getElementById('tab-inventory').innerHTML = coinsHtml + encHtml + attuneHtml
    + `<div id="items-list">${itemsHtml || '<div class="no-items">No items.</div>'}</div>`;
}

function renderFeaturesTab(ch) {
  function featureCard(f) {
    const badge = f.level > 0 ? `Lv ${f.level}` : '—';
    const tag = f.specialization || (f.type && !/^(feat|racial|subracial|race)$/i.test(f.type) ? f.type : '');
    return `
      <div class="feature-card${f.desc ? ' expandable' : ''}">
        <div class="feature-header">
          <div class="feature-level-badge">${badge}</div>
          <div class="feature-name">${f.name}</div>
          ${tag ? `<div class="feature-spec">${tag}</div>` : ''}
          ${f.desc ? `<span class="action-chevron">▶</span>` : ''}
        </div>
        ${f.desc ? `<div class="feature-body card-body">${f.desc}</div>` : ''}
      </div>
    `;
  }
  const section = (title, list) => list.length ? `
    <div class="feature-group">
      <div class="feature-group-title">${title}</div>
      <div class="features-list">${list.map(featureCard).join('')}</div>
    </div>` : '';

  // Class features by level; level-0 entries are background/destiny/misc grants
  const classFeatures = ch.features.filter(f => f.level > 0).sort((a, b) => a.level - b.level);
  const otherFeatures = ch.features.filter(f => f.level <= 0);
  const traits = (group) => ch.traits.filter(t => t.group === group);

  document.getElementById('tab-features').innerHTML = [
    section('Class Features', classFeatures),
    section('Background, Destiny & Other Features', otherFeatures),
    section('Heritage Traits', traits('heritage')),
    section('Culture Traits', traits('culture')),
    section('Campaign Traits', traits('campaign')),
    section('Other Traits', traits('other')),
    section('Feats & Class Options', ch.feats),
  ].join('') || '<div class="no-items">No features listed.</div>';
}

function renderCompanionsTab(ch) {
  document.getElementById('tab-companions').innerHTML = ch.cohorts.map(co => {
    const pct = hpPercent(co.hp);
    const color = hpColor(pct);
    const subtitle = [[co.size, co.type].filter(Boolean).join(' '), co.alignment].filter(Boolean).join(', ');
    return `
      <div class="cohort-card">
        <div class="cohort-head">
          <div>
            <div class="cohort-name">${co.name}</div>
            <div class="cohort-sub">${subtitle}</div>
          </div>
          <div class="cohort-hp">
            <div class="stat-label">Hit Points</div>
            <div class="cohort-hp-val" style="color:${color}">${co.hp.current} <span class="stat-of">/ ${co.hp.total}</span></div>
            <div class="hp-bar-wrap"><div class="hp-bar-fill" style="width:${pct}%; background:${color}"></div></div>
            ${co.hp.temporary > 0 ? `<div class="stat-sub">+${co.hp.temporary} temp</div>` : ''}
          </div>
        </div>
        <div class="cohort-stats">
          <div><span class="cohort-lbl">AC</span> ${co.ac}${co.acText ? ` ${co.acText}` : ''}</div>
          ${co.hd ? `<div><span class="cohort-lbl">Hit Dice</span> ${co.hd}</div>` : ''}
          ${co.speed ? `<div><span class="cohort-lbl">Speed</span> ${co.speed}</div>` : ''}
          ${co.cr ? `<div><span class="cohort-lbl">Challenge</span> ${co.cr}${co.xp ? ` (${co.xp.toLocaleString()} XP)` : ''}</div>` : ''}
          ${co.proficiency ? `<div><span class="cohort-lbl">Proficiency</span> ${fmt(co.proficiency)}</div>` : ''}
          ${co.maneuverDC ? `<div><span class="cohort-lbl">Maneuver DC</span> ${co.maneuverDC}</div>` : ''}
        </div>
        <div class="cohort-abilities">
          ${ABILITY_NAMES.map(ab => co.abilities[ab] ? `
            <div class="cohort-ability">
              <div class="ability-name">${ABILITY_ABBR[ab]}</div>
              <div class="cohort-ability-mod">${fmt(co.abilities[ab].bonus)}</div>
              <div class="ability-score">${co.abilities[ab].score}</div>
            </div>` : '').join('')}
        </div>
        ${co.stats.length ? `<div class="cohort-lines">
          ${co.stats.map(s => `<div><span class="cohort-lbl">${s.label}</span> ${s.value}</div>`).join('')}
        </div>` : ''}
        ${co.sections.map(sec => `
          <div class="cohort-section">
            <div class="cohort-section-title">${sec.label}</div>
            ${sec.entries.map(e => `<p><b>${e.name}${e.name && e.desc ? '.' : ''}</b> ${e.desc}</p>`).join('')}
          </div>`).join('')}
        ${co.lore ? `
          <div class="cohort-lore expandable">
            <div class="cohort-lore-toggle"><span class="action-chevron">▶</span> Description &amp; lore</div>
            <div class="feature-body card-body">${co.lore}</div>
          </div>` : ''}
      </div>
    `;
  }).join('');
}

function renderInfoTab(ch) {
  const xpPct = ch.expNeeded > 0 ? Math.min(100, Math.round((ch.exp / ch.expNeeded) * 100)) : 100;
  const summary = [
    ['Race', ch.race], ['Class', classLine(ch)], ['Background', ch.background], ['Destiny', ch.destiny],
    ...ch.details.map(d => [d.label, d.value]),
    ['Proficiency Bonus', fmt(ch.profBonus)], ['Hero Points', ch.hero],
  ];
  const divider = '<div class="gold-divider"></div>';

  document.getElementById('tab-info').innerHTML = `
    <div class="section-card">
      <div class="info-section">
        <div class="info-section-title">Character Summary</div>
        <div class="summary-grid">
          ${summary.map(([label, value]) => `<div><span class="summary-lbl">${label}</span><br>${value === '' ? '—' : value}</div>`).join('')}
        </div>
      </div>

      ${ch.narrative.map(n => `${divider}
      <div class="info-section">
        <div class="info-section-title">${n.label}</div>
        <div class="rich-text">${n.html}</div>
      </div>`).join('')}

      ${ch.notes.length ? `${divider}
      <div class="info-section">
        <div class="info-section-title">Journal &amp; Notes</div>
        ${ch.notes.map(n => `<div class="note-entry">
          ${n.name ? `<div class="note-title">${n.name}</div>` : ''}
          <div class="rich-text">${n.html}</div>
        </div>`).join('')}
      </div>` : ''}

      ${divider}
      <div class="info-section">
        <div class="info-section-title">Languages</div>
        <div class="lang-tags">
          ${ch.languages.map(l => `<div class="lang-tag">${l}</div>`).join('') || '<div class="no-items">None listed.</div>'}
        </div>
      </div>

      ${divider}
      <div class="info-section">
        <div class="info-section-title">Senses & Movement</div>
        <div class="senses-row">
          <div class="sense-item"><div class="sense-label">Passive Perception</div><div class="sense-val">${ch.perception}</div></div>
          <div class="sense-item"><div class="sense-label">Speed</div><div class="sense-val">${ch.speed} ft</div></div>
          ${ch.speedSpecial ? `<div class="sense-item"><div class="sense-label">Special Movement</div><div class="sense-val">${ch.speedSpecial}</div></div>` : ''}
          ${ch.size ? `<div class="sense-item"><div class="sense-label">Size</div><div class="sense-val">${ch.size}</div></div>` : ''}
          ${ch.senses ? `<div class="sense-item"><div class="sense-label">Special Senses</div><div class="sense-val">${ch.senses}</div></div>` : ''}
        </div>
      </div>

      ${divider}
      <div class="info-section">
        <div class="info-section-title">Proficiencies</div>
        <div class="prof-items">
          ${ch.proficiencies.map(p => `<div class="prof-item">${p}</div>`).join('') || '<div class="no-items">None listed.</div>'}
        </div>
      </div>

      ${divider}
      <div class="info-section">
        <div class="info-section-title">Experience Points</div>
        <div class="xp-wrap">
          <div class="xp-info">
            <span class="xp-label">Progress to next level</span>
            <span class="xp-val">${ch.exp.toLocaleString()} / ${ch.expNeeded.toLocaleString()} XP (${xpPct}%)</span>
          </div>
          <div class="xp-bar"><div class="xp-fill" style="width: ${xpPct}%"></div></div>
        </div>
      </div>
    </div>
  `;
}

function renderAll(ch) {
  renderHeader(ch);
  renderStatsBar(ch);
  renderAbilities(ch);
  renderSaves(ch);
  renderSkills(ch);
  renderCombatTab(ch);
  renderSpellsTab(ch);
  renderInventoryTab(ch);
  renderFeaturesTab(ch);
  renderCompanionsTab(ch);
  renderInfoTab(ch);

  // Tabs that only some characters need
  const show = { spells: ch.hasSpellcasting, companions: ch.cohorts.length > 0 };
  document.querySelectorAll('#tab-nav .tab-btn').forEach(btn => {
    const visible = show[btn.dataset.tab] !== false;
    btn.hidden = !visible;
    if (!visible && btn.classList.contains('active')) selectTab('combat');
  });
}

function selectTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `tab-${tabId}`));
}

// Party roster card for the home page
function rosterCardHtml(entry, ch) {
  const pct = hpPercent(ch.hp);
  const color = hpColor(pct);
  return `
    <a class="roster-card" href="?c=${encodeURIComponent(entry.id)}" data-id="${esc(entry.id)}">
      <div class="portrait-frame roster-portrait"><span class="portrait-initial">${ch.name.charAt(0) || '?'}</span></div>
      <div class="roster-info">
        <div class="roster-name">${ch.name}</div>
        <div class="roster-sub">${ch.race} · ${classLine(ch)}</div>
        <div class="roster-stats">
          <span style="color:${color}">HP ${ch.hp.current}/${ch.hp.total}</span>
          <span>AC ${ch.ac.total}</span>
          <span>Level ${ch.level}</span>
        </div>
        <div class="hp-bar-wrap"><div class="hp-bar-fill" style="width:${pct}%; background:${color}"></div></div>
      </div>
    </a>
  `;
}
