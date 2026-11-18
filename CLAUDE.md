# Fantasy Grounds Character Sheet Viewer

A static site that shows a D&D party's character sheets. The GM exports each character from
Fantasy Grounds (ruleset: Level Up Advanced 5E on CoreRPG) as XML, commits the files here, and
GitHub Pages serves the viewer so players can open their own sheet from any browser or phone.

- Live site: https://nietsneflow.github.io/FantasyGroundsCharacterSheetViewer/
- Repo: `Nietsneflow/FantasyGroundsCharacterSheetViewer` — **public**. Pages deploys from `main` at `/`,
  so pushing to `main` publishes within a minute or two. Anyone with the link can read everything
  in `characters/`; there is no login.

## Layout

| Path | What it is |
|---|---|
| `index.html` | Markup only: top bar, home (roster + upload), sheet skeleton |
| `assets/parser.js` | FG XML → plain character object. No page access |
| `assets/render.js` | Character object → HTML for the header, sidebar and each tab |
| `assets/app.js` | Roster loading, `?c=` routing, upload, font switcher, click handling |
| `assets/style.css` | All styles |
| `characters/*.xml` | The published exports |
| `characters/manifest.json` | Which exports are published, and under what id |
| `docs/FG_XML_Structure.md` | Reference for the FG export format — read before touching the parser |
| `tools/check.mjs` | Smoke test (jsdom) |

No build step, no framework, no modules: three classic `<script>` tags sharing globals, in the
order parser → render → app. Keep it that way — the page must also work when opened straight
from disk (upload-only mode), which rules out ES modules.

## Commands

```
npm install          # once; only jsdom, for the smoke test
npm run check        # parse + render every published character, exercise routing and tabs
npm run check -- Zea2.xml "Chomsky Burgle.xml"   # also run extra local exports
npm run check -- --dump eamon                     # print one parsed character object
npm run serve        # http://localhost:8080 (the roster needs http; file:// cannot fetch)
```

Run `npm run check` after any change to `assets/` or `characters/`. Older exports sitting in the
repo root (git-ignored) make good regression fixtures — pass them as extra arguments; Zea is the
only non-caster.

## Publishing or updating a character

1. Put the new export in `characters/` (any filename).
2. Edit `characters/manifest.json`: point the character's entry at the new file and bump `updated`.
   Keep the `id` stable — it is the player's bookmark (`?c=<id>`). New character → new entry,
   id in lowercase-with-dashes.
3. Delete the superseded export from `characters/` (the check fails on unlisted XML there).
4. `npm run check`, then commit and push.

Root-level `*.xml` is git-ignored on purpose: only `characters/` is ever published.

## Conventions that matter

- **Escaping.** `parser.js` HTML-escapes every string (`getText`) and sanitizes rich text
  (`ftToHtml`). `render.js` therefore interpolates character values straight into `innerHTML`.
  Never read XML text in the renderer, and never return an unescaped string from the parser
  (`rawText` is for comparisons and lookups only).
- **Scoped queries.** Always use `q()` / `qa()` (`:scope >` direct children). Cohorts, item spells
  and power actions repeat tag names like `name`, `hp`, `coins`; a descendant query silently
  returns the wrong node.
- **Unidentified items.** `isidentified = 0` means the players have not identified it; show
  `nonid_name` / `nonidentified` and nothing else. The real name is a spoiler.
- **`carried`**: 0 not carried, 1 carried, 2 equipped (FG counts armor toward AC only at 2).
- **Expand/collapse.** Add class `expandable` to a card and `card-body` to its hidden part; one
  delegated listener in `app.js` does the rest. No inline `onclick`.
- **Optional tabs.** Spells and Companions hide themselves when a character has none
  (`renderAll`).
- The numbers shown (attack bonuses, save DCs, damage) are computed the way FG computes them;
  the rules are written up in `docs/FG_XML_Structure.md`. When a sheet disagrees with FG, FG wins —
  fix the parser and record the rule in that doc.

## Known gaps

- Portraits: the export only has a path into the GM's campaign folder, so sheets show an initial.
- Spell links go to a5e.tools by name; homebrew spells 404 there.
- The sheet is a snapshot of the last export (HP, slots used, etc.), not live data.
