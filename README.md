# Fantasy Grounds Character Sheet Viewer

Character sheets for our party, straight from Fantasy Grounds exports.

**▶ https://nietsneflow.github.io/FantasyGroundsCharacterSheetViewer/**

Pick your character on the home page and bookmark the link — each sheet has its own address
(for example `…/?c=eamon`), and the address remembers which tab you had open.

## What you can see

- **Combat** — weapons with attack bonus and damage as Fantasy Grounds rolls them, class and
  species actions, death saves
- **Spells** — slots or spell points remaining, every spell with its attack / save DC / damage,
  full description, and a "prepared only" filter
- **Inventory** — currency, encumbrance, attuned items, everything carried with descriptions,
  armor limits (Stealth disadvantage, Strength needed) and the spell a scroll holds
- **Features** — class features, heritage / culture / campaign traits, feats
- **Companions** — full stat blocks for familiars and other companions
- **Info** — biography, journal notes, languages, senses, proficiencies, which rulebook each part
  of the character came from, XP

The sidebar also says when saving throws include a bonus from an item, and the Armor Class box
warns when worn armor gives disadvantage on Stealth.

Sheets are a snapshot from the last export, so hit points and spell slots show where things stood
at that moment.

You can also view any other Fantasy Grounds 5E / A5E character export: open *View a different
character export* on the home page and drop the XML file in. It is read in your browser and never
uploaded.

## Updating the sheets (GM)

1. In Fantasy Grounds, export the character to XML.
2. Put the file in `characters/` and point that character's entry in
   `characters/manifest.json` at it (update the `updated` date too).
3. Remove the old export, commit, and push to `main`. The site updates in a minute or two.

```json
{ "id": "eamon", "file": "Eamon7.xml", "updated": "2026-11-17" }
```

Keep each `id` the same between exports so players' bookmarks keep working.

## Development

Plain HTML, CSS and JavaScript — no build step. See [CLAUDE.md](CLAUDE.md) for the layout and
conventions, and [docs/FG_XML_Structure.md](docs/FG_XML_Structure.md) for the export format.

```
npm install      # once
npm run check    # smoke-test every published character
npm run serve    # preview at http://localhost:8080
```
