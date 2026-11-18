/* app.js — page wiring: party roster, routing, file upload, top bar.
 *
 * Published characters live in characters/ and are listed in
 * characters/manifest.json. Each one is addressable as ?c=<id>, so players can
 * bookmark their own sheet. Opening index.html straight from disk (file://)
 * cannot fetch the manifest; the page then falls back to upload-only.
 */
'use strict';

const MANIFEST_URL = 'characters/manifest.json';
const party = [];   // [{ id, file, updated, ch }]

const $ = (id) => document.getElementById(id);

function parseXml(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  const err = doc.querySelector('parsererror');
  if (err) throw new Error('This file is not valid XML.');
  const ch = parseCharacter(doc);
  if (!ch) throw new Error('No character data found — is this a Fantasy Grounds character export?');
  return ch;
}

// ===== PARTY ROSTER =====
async function loadParty() {
  let manifest;
  try {
    const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest = await res.json();
  } catch (e) {
    return;   // no manifest (or file://) — upload-only mode
  }
  const loaded = await Promise.all((manifest.characters || []).map(async entry => {
    try {
      const res = await fetch(`characters/${encodeURIComponent(entry.file)}`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { ...entry, ch: parseXml(await res.text()) };
    } catch (e) {
      console.error(`Could not load character "${entry.id}" (${entry.file}):`, e);
      return null;
    }
  }));
  party.push(...loaded.filter(Boolean));
}

function renderRoster() {
  const hasParty = party.length > 0;
  $('roster-section').hidden = !hasParty;
  $('upload-details').open = !hasParty;
  $('roster').innerHTML = party.map(p => rosterCardHtml(p, p.ch)).join('');
  $('party-nav').innerHTML = party.map(p =>
    `<a class="party-chip" href="?c=${encodeURIComponent(p.id)}" data-id="${esc(p.id)}">${p.ch.name}</a>`).join('');
}

// ===== VIEWS =====
function showMessage(text) {
  $('home-msg').textContent = text || '';
  $('home-msg').hidden = !text;
}

function showHome(message) {
  $('sheet').style.display = 'none';
  $('home').style.display = 'flex';
  $('home-btn').hidden = true;
  document.title = 'Character Sheet Viewer';
  document.querySelectorAll('.party-chip').forEach(a => a.classList.remove('active'));
  showMessage(message);
}

function showSheet(ch, id, updated) {
  renderAll(ch);
  $('sheet-updated').textContent = updated ? `Sheet exported ${updated}` : '';
  $('home').style.display = 'none';
  const sheet = $('sheet');
  sheet.style.display = 'block';
  sheet.classList.remove('fade-in');
  void sheet.offsetWidth;   // restart the fade-in animation
  sheet.classList.add('fade-in');
  $('home-btn').hidden = false;
  document.title = `${unesc(ch.name)} — Character Sheet`;
  document.querySelectorAll('.party-chip').forEach(a => a.classList.toggle('active', a.dataset.id === id));
  window.scrollTo(0, 0);
}

// ===== ROUTING (?c=<id>&tab=<tab>) =====
function route(search = location.search) {
  const params = new URLSearchParams(search);
  const id = params.get('c');
  const entry = id ? party.find(p => p.id === id) : null;
  if (!entry) {
    showHome(id ? `No published character named "${id}".` : '');
    return;
  }
  showSheet(entry.ch, entry.id, entry.updated);
  // Without ?tab= the current tab is kept, so flipping between party members
  // stays on (say) Spells.
  const tab = params.get('tab') || '';
  const tabBtn = /^[a-z]+$/.test(tab) ? document.querySelector(`#tab-nav .tab-btn[data-tab="${tab}"]`) : null;
  if (tabBtn && !tabBtn.hidden) selectTab(tab);
}

// Keep the open tab in the address so a bookmark or shared link lands on it
function rememberTab(tabId) {
  const params = new URLSearchParams(location.search);
  if (!params.get('c')) return;
  if (tabId === 'combat') params.delete('tab'); else params.set('tab', tabId);
  try { history.replaceState(null, '', `?${params}`); } catch (e) { /* file:// */ }
}

// Routes on the requested address itself, so the view still changes where the
// browser refuses to rewrite the URL (pages opened from disk).
function navigate(search) {
  try { history.pushState(null, '', search || location.pathname); } catch (e) { /* file:// */ }
  route(search || '');
}

window.addEventListener('popstate', () => route());

document.addEventListener('click', e => {
  // Party links navigate in-page; modified clicks still open a new tab
  const link = e.target.closest('.roster-card, .party-chip');
  if (link && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
    e.preventDefault();
    navigate(link.getAttribute('href'));
    return;
  }
  if (e.target.closest('#home-btn')) { navigate(''); return; }

  const tabBtn = e.target.closest('#tab-nav .tab-btn');
  if (tabBtn) { selectTab(tabBtn.dataset.tab); rememberTab(tabBtn.dataset.tab); return; }

  const fontBtn = e.target.closest('.font-btn');
  if (fontBtn) { setFont(fontBtn.dataset.font); return; }

  if (e.target.closest('#prepared-only-btn')) {
    const on = $('tab-spells').classList.toggle('prepared-only');
    e.target.closest('#prepared-only-btn').textContent = on ? 'Show all spells' : 'Show prepared only';
    return;
  }

  // Expand / collapse cards. Clicks inside an open body (selecting text,
  // following a link) leave it open.
  if (e.target.closest('.card-body, a, button')) return;
  const card = e.target.closest('.expandable');
  if (card) card.classList.toggle('expanded');
});

// ===== FILE UPLOAD =====
function loadFile(file) {
  if (!file) return;
  if (!(file.name.toLowerCase().endsWith('.xml') || file.type.includes('xml'))) {
    showMessage('Please choose a Fantasy Grounds .xml export.');
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const ch = parseXml(ev.target.result);
      // An uploaded sheet has no address of its own; drop any ?c= from the URL
      try { history.pushState(null, '', location.pathname); } catch (e) { /* file:// */ }
      showSheet(ch, null);
    } catch (err) {
      console.error(err);
      showMessage(`Could not load "${file.name}": ${err.message}`);
    }
  };
  reader.readAsText(file);
}

const fileInput = $('file-input');
fileInput.addEventListener('change', e => { loadFile(e.target.files[0]); fileInput.value = ''; });
$('open-btn').addEventListener('click', () => fileInput.click());

const dropZone = $('drop-zone');
dropZone.addEventListener('click', () => fileInput.click());
['dragenter', 'dragover'].forEach(type => dropZone.addEventListener(type, e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
}));
dropZone.addEventListener('dragleave', e => {
  if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  loadFile(e.dataTransfer.files[0]);
});

// ===== FONT SWITCHER =====
const FONT_CLASSES = ['font-arial', 'font-calibri'];
function setFont(fontClass) {
  document.body.classList.remove(...FONT_CLASSES);
  if (FONT_CLASSES.includes(fontClass)) document.body.classList.add(fontClass);
  document.querySelectorAll('.font-btn').forEach(b => b.classList.toggle('active', b.dataset.font === (fontClass || '')));
  try { localStorage.setItem('font', fontClass || ''); } catch (e) { /* storage unavailable */ }
}
try { setFont(localStorage.getItem('font') || ''); } catch (e) { /* storage unavailable */ }

// ===== STARTUP =====
loadParty().then(() => {
  renderRoster();
  $('home-loading').hidden = true;
  $('home-content').hidden = false;
  route();
});
