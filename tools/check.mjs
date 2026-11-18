// Smoke test: load the real page in jsdom, exercise the party roster, routing
// and every tab for each published character, and fail on anything that looks
// broken.
//
//   npm run check                   published characters (characters/manifest.json)
//   npm run check -- Zea2.xml       plus extra exports, loaded through the upload path
//   npm run check -- --dump eamon   also print the parsed object for one character
//
// Exits non-zero on any problem, so it is safe to gate a commit on.
import { JSDOM } from 'jsdom';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const dumpIdx = args.indexOf('--dump');
const dumpId = dumpIdx >= 0 ? args.splice(dumpIdx, 2)[1] : null;

const problems = [];
const fail = (who, msg) => problems.push(`${who}: ${msg}`);

// ---- manifest ----
const manifest = JSON.parse(await readFile(path.join(root, 'characters/manifest.json'), 'utf8'));
const ids = new Set();
for (const entry of manifest.characters) {
  if (!/^[a-z0-9-]+$/.test(entry.id || '')) fail('manifest', `id "${entry.id}" must be lowercase letters, digits and dashes`);
  if (ids.has(entry.id)) fail('manifest', `duplicate id "${entry.id}"`);
  ids.add(entry.id);
  if (!existsSync(path.join(root, 'characters', entry.file))) fail('manifest', `"${entry.file}" does not exist in characters/`);
}
const listed = new Set(manifest.characters.map(e => e.file));
for (const f of await readdir(path.join(root, 'characters'))) {
  if (f.toLowerCase().endsWith('.xml') && !listed.has(f)) fail('manifest', `characters/${f} is not listed, so it will not appear on the site`);
}

// ---- page ----
const pageUrl = pathToFileURL(path.join(root, 'index.html')).href;
const dom = await JSDOM.fromFile(path.join(root, 'index.html'), {
  runScripts: 'dangerously',
  resources: 'usable',
  url: pageUrl,
  pretendToBeVisual: true,
  beforeParse(window) {
    window.scrollTo = () => {};
    // jsdom has no fetch; serve the site's own files from disk like GitHub Pages would
    window.fetch = async (url) => {
      const file = fileURLToPath(new URL(url, pageUrl));
      if (!file.startsWith(root) || !existsSync(file)) return { ok: false, status: 404 };
      const body = await readFile(file, 'utf8');
      return { ok: true, status: 200, text: async () => body, json: async () => JSON.parse(body) };
    };
  },
});
const { window } = dom;
const doc = window.document;
const scriptErrors = [];
window.addEventListener('error', e => scriptErrors.push(e.message));
if (doc.readyState !== 'complete') await new Promise(resolve => window.addEventListener('load', resolve));

const run = (code) => window.eval(code);
// app.js startup is async (manifest + character fetches); wait for it to finish
for (let i = 0; i < 100 && !doc.getElementById('home-loading')?.hidden; i++) {
  await new Promise(resolve => setTimeout(resolve, 20));
}
scriptErrors.forEach(m => fail('page', `script error: ${m}`));
if (run('typeof parseXml') !== 'function' || run('typeof renderAll') !== 'function') {
  fail('page', 'assets did not load (parseXml / renderAll missing)');
}
if (!doc.getElementById('home-loading')?.hidden) fail('page', 'startup never finished (still "Loading the party…")');

// ---- roster ----
const partySize = run('party.length');
if (partySize !== manifest.characters.length) fail('roster', `${partySize} of ${manifest.characters.length} characters loaded`);
if (doc.querySelectorAll('.roster-card').length !== partySize) fail('roster', 'roster cards do not match the party');
run(`navigate('?c=no-such-character')`);
if (doc.getElementById('home-msg').hidden) fail('routing', 'an unknown ?c= id should show a message on the home page');

// ---- per-character checks ----
function checkSheet(who, ch) {
  const sheet = doc.getElementById('sheet');
  if (sheet.style.display === 'none') { fail(who, 'sheet is not visible'); return; }
  const text = sheet.textContent;
  for (const bad of ['undefined', 'NaN', '[object Object]']) {
    const at = text.indexOf(bad);
    if (at >= 0) fail(who, `sheet contains "${bad}" near: …${text.slice(Math.max(0, at - 60), at + 30).replace(/\s+/g, ' ')}…`);
  }
  if (!ch.name) fail(who, 'no character name');
  if (!ch.level) fail(who, 'no level');
  if (!ch.classes.length) fail(who, 'no classes');
  if (!ch.hp.total) fail(who, 'no hit points');
  if (ch.skills.length < 10) fail(who, `only ${ch.skills.length} skills`);
  if (!doc.querySelector('.char-name')?.textContent.trim()) fail(who, 'header has no name');

  // Every visible tab opens and has content
  for (const btn of doc.querySelectorAll('#tab-nav .tab-btn')) {
    if (btn.hidden) continue;
    btn.click();
    const panel = doc.getElementById(`tab-${btn.dataset.tab}`);
    if (!panel.classList.contains('active')) fail(who, `tab "${btn.dataset.tab}" did not open`);
    if (!panel.children.length) fail(who, `tab "${btn.dataset.tab}" is empty`);
  }
  if (ch.cohorts.length && doc.querySelectorAll('.cohort-card').length !== ch.cohorts.length) fail(who, 'companions not rendered');
  if (ch.spells.length && doc.querySelectorAll('.spell-card').length !== ch.spells.length) fail(who, 'spell cards do not match spells');

  // Cards expand on click
  const card = sheet.querySelector('.expandable');
  if (card) {
    card.firstElementChild.click();
    if (!card.classList.contains('expanded')) fail(who, 'clicking a card did not expand it');
  }

  const cls = ch.classes.map(c => `${c.name} ${c.level}`).join('/');
  console.log(
    `✓ ${who.padEnd(10)} ${ch.name} — ${ch.race}, ${cls} | HP ${ch.hp.current}/${ch.hp.total} AC ${ch.ac.total}` +
    ` | spell DC ${ch.spellDC} atk ${ch.spellAtk >= 0 ? '+' : ''}${ch.spellAtk} (${ch.spellAbilAbbr})` +
    ` | ${ch.spells.length} spells, ${ch.powers.length - ch.spells.length} actions, ${ch.weapons.length} weapons,` +
    ` ${ch.inventory.length} items, ${ch.features.length + ch.traits.length + ch.feats.length} features, ${ch.cohorts.length} companions`
  );
  if (dumpId === who) console.log(JSON.stringify(ch, null, 2));
}

// Published characters: through the router, exactly as a visitor's link would
for (const entry of manifest.characters) {
  try {
    run(`navigate('?c=${entry.id}')`);
    const ch = run(`party.find(p => p.id === '${entry.id}')?.ch`);
    if (!ch) { fail(entry.id, 'did not load — see errors above'); continue; }
    checkSheet(entry.id, ch);
  } catch (e) {
    fail(entry.id, `threw: ${e.stack || e}`);
  }
}

// Extra exports named on the command line: through the upload path
for (const extra of args) {
  const who = path.basename(extra);
  try {
    window.__xml = await readFile(path.resolve(extra), 'utf8');
    checkSheet(who, run('(() => { const ch = parseXml(window.__xml); showSheet(ch, null); return ch; })()'));
  } catch (e) {
    fail(who, `threw: ${e.stack || e}`);
  }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  problems.forEach(p => console.error(`  ✗ ${p}`));
  process.exit(1);
}
console.log(`\nAll ${manifest.characters.length + args.length} character(s) OK.`);
process.exit(0);
