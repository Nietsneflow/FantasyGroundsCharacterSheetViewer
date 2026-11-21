# Fantasy Grounds A5E Character XML Structure

Cross-referenced from: `Eamon.xml` (Cleric), `AlNox.xml` (Wizard), `Zea.xml` (Rogue), `Chomsky Burgle.xml` (Warlock), and the level-7 re-exports `Eamon7.xml`, `Al7.xml`, `Chomsky7.xml`  
FG data version: `5.1` / CoreRPG:7

---

## Document Root

```
<root version="5.1" dataversion="20260124" release="9|CoreRPG:7">
  <character>
    ...
  </character>
</root>
```

> **IMPORTANT — querySelector pitfall:** Several child containers near the top of `<character>` (e.g. `<adventurelist>`, `<cohorts>`) contain their own `<name>`, `<hp>`, `<level>`, etc. sub-elements. Always use `:scope > tagname` when querying direct children of `<character>` to avoid accidentally matching nested nodes.

---

## Top-Level Children of `<character>`

Presence across files:  `✓` = all 4 files, `~` = some files, `-` = not observed

| Element | Type | Notes | Present |
|---|---|---|---|
| `abilities` | container | Six ability scores + luck | ✓ |
| `adventurelist` | container | Journal/notes entries; can contain `<name>notes</name>` — **do not use bare `querySelector('name')`** | ~ |
| `age` | string | Character age | ~ |
| `alignment` | string | e.g. "Lawful Evil" | ~ |
| `attunement` | container | Attuned item tracking | ~ |
| `background` | string | Background name | ✓ |
| `backgroundlink` | windowreference | FG internal link | ✓ |
| `classes` | container | One entry per class | ✓ |
| `cohorts` | container | NPC companions/familiars; contains full NPC stat blocks with their own `<hp>`, `<name>`, etc. — **always scope queries away from this** | ✓ |
| `coins` | container | Currency entries | ✓ |
| `death_indicator_token` | token | — | ✓ |
| `death_indicators` | container | — | ✓ |
| `defenses` | container | AC sub-container | ✓ |
| `deity` | string | — | ~ |
| `destiny` | string | Destiny name | ~ |
| `destinylink` | windowreference | FG internal link | ✓ |
| `encumbrance` | container | Load/carry tracking | ✓ |
| `exp` | number | Current XP | ✓ |
| `expneeded` | number | XP needed for next level | ✓ |
| `faction` | string | — | ~ |
| `featlist` | container | Feat entries | ✓ |
| `featurelist` | container | Class feature entries | ✓ |
| `gender` | string | — | ~ |
| `height` | string | — | ~ |
| `hero` | number | Hero point count | ✓ |
| `hp` | container | Hit point tracking | ✓ |
| `initiative` | container | Initiative breakdown | ✓ |
| `inspiration` | number | 0 or 1 | ✓ |
| `inventorylist` | container | All carried items | ✓ |
| `languagelist` | container | Known languages | ✓ |
| `level` | number | Total character level | ✓ |
| `locked` | number | FG UI lock flag | ✓ |
| `name` | string | **Character name** — use `:scope > name` | ✓ |
| `pc_label_hero` | string | FG UI label | ✓ |
| `perception` | number | Passive Perception total | ✓ |
| `perceptionmodifier` | number | Misc modifier to perception | ✓ |
| `polymorphism` | container | Polymorph state | ~ |
| `polymorphism_linked_token` | token | — | ~ |
| `polymorphism_original_token` | token | — | ~ |
| `portrait` | leaf/text | Path to portrait image (e.g. `campaign/images/Name.jpg`) | ✓ |
| `powerdisplaymode` | number | FG UI setting | ~ |
| `powergroup` | container | Spell group definitions | ✓ |
| `powermeta` | container | Spell slot tracking | ✓ |
| `powermode` | number | FG UI setting | ~ |
| `powers` | container | All spells and class actions | ✓ |
| `profbonus` | number | Proficiency bonus | ✓ |
| `proficiencylist` | container | Tool/weapon/armor proficiencies | ✓ |
| `race` | string | Race name | ✓ |
| `racelink` | windowreference | FG internal link | ✓ |
| `senses` | string | e.g. "darkvision 60 ft." | ✓ |
| `size` | string | e.g. "Medium" | ~ |
| `skilllist` | container | All skill entries | ✓ |
| `speed` | container | Speed breakdown | ✓ |
| `subracelink` | windowreference | FG internal link | ✓ |
| `temp` | container | Temporary bonuses | ✓ |
| `token` | token | Token image path | ✓ |
| `token3Dflat` | token | 3D token path | ✓ |
| `traitlist` | container | Racial traits and campaign traits | ✓ |
| `units` | string | Unit system | ✓ |
| `vehicles` | container | — | ✓ |
| `weapon` | container | FG "quick weapon" reference | ~ |
| `weaponlist` | container | Full weapon stat entries | ✓ |

---

## Abilities

`character > abilities > {abilityname} > ...`

Ability names: `strength`, `dexterity`, `constitution`, `intelligence`, `wisdom`, `charisma`, `luck`

| Child | Type | Notes |
|---|---|---|
| `bonus` | number | Ability modifier |
| `save` | number | Saving throw total |
| `savemodifier` | number | Flat bonus from items or effects, already included in `save` (e.g. +1 on every ability from a cloak of protection). The viewer notes it under the saves list |
| `saveprof` | number | 1 if proficient in save, 0 otherwise |
| `score` | number | Ability score |
| `current` | number | **Luck only** — current luck points spent |

---

## Classes

`character > classes > {id-XXXXX} > ...`

Each entry represents one class. Multiple entries if multiclassed.

| Child | Type | Notes |
|---|---|---|
| `cantrips` | number | Number of cantrips known (if applicable) |
| `casterlevelinvmult` | number | Caster level multiplier for spell slots |
| `casterpactmagic` | number | **1 for Warlock** (pact magic), 0 for all others |
| `hddie` | dice | Hit die, e.g. `1d6`, `1d8`, `1d10` |
| `hdused` | number | Hit dice used (not restored) |
| `level` | number | Levels in this class |
| `name` | string | Class name, e.g. "Wizard A5E", "Rogue", "Warlock - A5E" |
| `shortcut` | windowreference | FG internal link to class reference |
| `specialization` | string | Subclass/archetype name (may be empty) |
| `specializationlink` | windowreference | FG internal link to subclass |

---

## HP

`character > hp > ...`  
**Must use `:scope > hp`** — cohorts also contain `<hp>` leaf nodes.

| Child | Type | Notes |
|---|---|---|
| `deathsavefail` | number | Failed death saves (0–3) |
| `deathsavesuccess` | number | Successful death saves (0–3) |
| `hdmod` | number | Hit die modifier |
| `temporary` | number | Temporary HP |
| `total` | number | Maximum HP |
| `wounds` | number | Damage taken (current HP = total − wounds) |

> `current HP = total − wounds`

---

## Defenses

`character > defenses > ac > ...`

| Child | Type | Notes |
|---|---|---|
| `armor` | number | Armor bonus |
| `dexbonus` | string | "no" if dex bonus is excluded (e.g. heavy armor) |
| `disstealth` | number | Disadvantage on stealth flag |
| `misc` | number | Miscellaneous AC bonus |
| `prof` | number | Proficiency-based AC bonus |
| `shield` | number | Shield bonus |
| `temporary` | number | Temporary AC bonus |
| `total` | number | **Final AC value** |

---

## Initiative

`character > initiative > ...`

| Child | Type | Notes |
|---|---|---|
| `misc` | number | Misc modifier |
| `prof` | number | Proficiency bonus (if applicable) |
| `temporary` | number | Temporary modifier |
| `total` | number | **Final initiative modifier** |

---

## Speed

`character > speed > ...`

| Child | Type | Notes |
|---|---|---|
| `armor` | number | Penalty from armor |
| `base` | number | Base speed in feet |
| `misc` | number | Misc modifier |
| `special` | string | Extra movement modes, e.g. "Climb Speed 30'" (not in all files) |
| `temporary` | number | Temporary modifier |
| `total` | number | **Final speed in feet** |

---

## Encumbrance

`character > encumbrance > ...`

| Child | Type | Notes |
|---|---|---|
| `bulkyitems` | number | Count of bulky items carried |
| `encumbered` | number | Encumbered threshold (lbs) |
| `encumberedheavy` | number | Heavily encumbered threshold (lbs) |
| `liftpushdrag` | number | Max lift/push/drag (lbs) |
| `load` | number | **Current carried weight** |
| `max` | number | **Maximum carry capacity** |
| `supply` | number | Supply points |

---

## Power Meta (Spell Slots)

`character > powermeta > ...`

### Standard Spell Slots (all casters)

`spellslots1` through `spellslots9` — each is a container:

| Child | Type | Notes |
|---|---|---|
| `max` | number | Maximum slots at this level |
| `used` | number | Slots used (remaining = max − used) |

> If `max = 0`, that slot level is unavailable.

### Pact Magic (Warlock only — `casterpactmagic = 1`)

`pactmagiclevel` [number] — spell level of pact slots  
`pactmagicpoints` — container (max/used)  
`pactmagicslots1` through `pactmagicslots9` — containers:

| Child | Type | Notes |
|---|---|---|
| `max` | number | Slots at this level (only one level is non-zero) |

> Warlocks have `spellslots1–9` all at max=0.
>
> **A5E warlocks spend spell points, not slots.** When `pactmagicpoints > max` is non-zero it is the real resource (`used` is tracked there) and `pactmagiclevel` is the highest spell level castable; the `pactmagicslots{N}` values are leftovers from core 5E and have no `used`. The viewer shows points when present and only falls back to `pactmagicslots{N}` for a core-5E warlock.

---

## Power Groups

`character > powergroup > {id-XXXXX} > ...`

Defines the spell list group a character uses.

| Child | Type | Notes |
|---|---|---|
| `atkmod` | number | Misc modifier to spell attack |
| `atkprof` | number | Use proficiency for spell attack |
| `castertype` | string | e.g. "memorization" (Cleric, Wizard) |
| `name` | string | e.g. "Spells", "Cleric Actions/Effects", "Wizard A5E Actions/Effects" |
| `prepared` | number | Number of spells prepared |
| `savemod` | number | Misc modifier to spell save DC |
| `saveprof` | number | Use proficiency for spell save DC |
| `stat` | string | Spellcasting ability, e.g. "wisdom", "intelligence", "charisma" — **may be absent** (e.g. Warlock file); the viewer falls back to the class name, then to the best mental stat |
| `savestat` | string | Junk in some exports (seen: "ranger") — ignore |
| `uses` | number | Uses tracking for action groups |

**Group maths (how FG derives the numbers):** attack = stat bonus + proficiency (if `atkprof`, default 1) + `atkmod`; save DC = 8 + stat bonus + proficiency (if `saveprof`, default 1) + `savemod`. A group with no `stat` contributes 0.

---

## Powers (Spells & Actions)

`character > powers > {id-XXXXX} > ...`

Used for both spells (`group = "Spells"`) and class actions (e.g. `group = "Cleric Actions/Effects"`).

| Child | Type | Notes |
|---|---|---|
| `actions` | container | FG action automation sub-entries |
| `cast` | number | Cast flag |
| `castingtime` | string | e.g. "1 action", "1 reaction" |
| `components` | string | e.g. "V, S, M (material)" |
| `description` | formattedtext | Full spell/ability description |
| `duration` | string | e.g. "Concentration, up to 1 minute" |
| `group` | string | **"Spells"** for spells; action group name for class features |
| `level` | number | Spell level (0 = cantrip) |
| `locked` | number | FG lock flag |
| `name` | string | Spell/ability name (may include range suffix, e.g. "Aid (60)") |
| `prepared` | number | 1 if prepared/known, 0 if not |
| `range` | string | e.g. "Medium (60 feet)", "Self" |
| `rare` | number | Rare spell flag |
| `ritual` | number | 1 if ritual spell |
| `school` | string | e.g. "abjuration; divine, enhancement" |
| `shortdescription` | string | One-line summary (some entries) |
| `source` | string | Class source list, e.g. "Cleric, Herald" |
| `specialization` | string | Subclass source (some entries) |
| `specializationchoice` | number | Used on class features, not spells |
| `usesperiod` | string | Recharge period for limited-use actions (some entries) |
| `version` | string | Entry version (some entries) |
| `Rob2E` | container | Third-party extension artifact — ignore |

> **`prepared` / `cast` mean different things by group.** For `Spells` they are the prepared flag and times cast. For action groups (e.g. "Race Actions/Effects") `prepared` is the number of uses and `cast` how many are spent, with `usesperiod` (`enc` = per rest, `once`, otherwise daily).

> A power with no `group` at all (seen: Eldritch Whip, a poisoned dagger's save) is an item or feature ability: the viewer lists it under Combat → Special Actions unless it has a `school`, in which case it is a spell.

### Power — Actions

`powers > {id} > actions > {id-XXXXX} > ...` — FG's roll automation. Sort by `order`. `type` selects the shape:

| `type` | Children | Meaning |
|---|---|---|
| `cast` | `atktype` ("melee"/"ranged"), `atkbase`, `atkstat`, `atkprof`, `atkmod` | Spell attack, **only if `atktype` is present**. `atkbase`: absent/"group" → group attack + `atkmod`; "ability" → `atkstat` bonus + proficiency (if `atkprof`, default 1) + `atkmod`; "fixed" → `atkmod` |
| `cast` | `savetype` (ability), `savedcbase`, `savedcstat`, `savedcprof`, `savedcmod`, `onmissdamage` ("half"), `savemagic` | Saving throw, **only if `savetype` is present**. `savedcbase` resolves like `atkbase`, starting from 8 for "ability" |
| `damage` | `damagelist > {id}`: `dice`, `bonus`, `stat` ("base" = the group's stat, or an ability name), `statmult`, `type` | Damage. Clauses sharing a `type` are rolled together |
| `heal` | `heallist > {id}` (same fields, no `type`), `healtype` ("temp" = temporary HP), `healtargeting` ("self") | Healing |
| `effect` | `label`, `durmod`, `durunit` ("minute"/"hour"/"day"; absent = rounds), `targeting` ("self"), `apply` | An FG effect string, e.g. `Bless; (C); ATK: 1d4; SAVE: 1d4` |

A single `cast` action can carry leftover `atkmod`/`savedcmod` fields with neither `atktype` nor `savetype` — it then describes nothing.

> **Deduplication required:** The same spell occasionally appears multiple times in `<powers>`. Use a `Set` keyed on `name|level` to deduplicate.

> **Name cleanup for external links:** Spell names often have range/tag suffixes in parentheses, e.g. `"Sleep (60)"`, `"Aid (60)"`, `"Find Familiar (RIT) ($)"`. Strip `\s*\(.*?\)` before generating slugs for a5e.tools URLs.

---

## Skill List

`character > skilllist > {id-XXXXX} > ...`

| Child | Type | Notes |
|---|---|---|
| `misc` | number | Misc modifier |
| `name` | string | Skill name, e.g. "Perception", "Arcana" |
| `prof` | number | Proficiency/expertise level (0, 1, 2) |
| `shortcut` | number | FG reference |
| `stat` | string | Governing ability, e.g. "wisdom", "intelligence" |
| `total` | number | **Final skill bonus** |

---

## Weapon List

`character > weaponlist > {id-XXXXX} > ...`

| Child | Type | Notes |
|---|---|---|
| `ammo` | number | Current ammo (some entries) |
| `attackbonus` | number | Misc attack bonus |
| `attackstat` | string | e.g. "strength", "dexterity" — **usually absent**; when missing, resolve as FG does: ranged (`type=1`) → dexterity, finesse property → best of STR/DEX, else strength |
| `carried` | number | 0=not carried, 1=carried, 2=equipped (mirrors the inventory item) |
| `damagelist` | container | See below |
| `handling` | number | One/two-handed flag |
| `isidentified` | number | Identification flag |
| `maxammo` | number | Max ammo (ranged) |
| `name` | string | Weapon name |
| `masteryknown` | number | Weapon mastery flag (some entries) |
| `prof` | number | 1 if proficient |
| `properties` | string | e.g. "Breaker, heavy, two-handed" |
| `shortcut` | windowreference | Link to inventory entry |
| `type` | number | 0 = melee, 1 = ranged, 2 = thrown |

> `prof` absent means **not proficient** (no proficiency bonus on the attack). Dice are written `d6`, `2d6`, or as a list `d6,d6`.

`character > weapon > critrange > melee|ranged` holds the crit threshold (20 unless a feature lowers it).

### Weapon — Damage List

`weaponlist > {id} > damagelist > {id-XXXXX} > ...`

| Child | Type | Notes |
|---|---|---|
| `bonus` | number | Static damage bonus |
| `dice` | dice | Damage dice, e.g. `d6`, `d8` |
| `stat` | string | "base" or ability name (adds ability mod) |
| `statmult` | number | Multiplier for stat bonus |
| `type` | string | Damage type, e.g. "bludgeoning", "slashing" |

---

## Inventory List

`character > inventorylist > {id-XXXXX} > ...`

| Child | Type | Notes |
|---|---|---|
| `ac` | number | Armor Class bonus (armor items) |
| `attune` | number | 1 if currently attuned |
| `aura` | string | Magic aura description |
| `bonus` | number | Magical bonus (e.g. +1 armor) |
| `carried` | number | **0=not carried, 1=carried, 2=equipped** — FG only counts armor toward AC at 2 (verified: every worn armor and attuned item in the exports is 2) |
| `checkpenalty` | number | Armor check penalty |
| `cl` | number | Caster level |
| `cost` | string | Item cost, e.g. "50 - 100 gp" |
| `count` | number | Quantity |
| `critical` | string | Critical hit range |
| `damage` | string | Damage string (weapon-type items) |
| `damagetype` | string | Damage type |
| `description` | formattedtext | Item description |
| `dexbonus` | string | Dex bonus cap for armor |
| `isidentified` | number | 0 = unidentified; **absent means identified**. When 0, show only `nonid_name` / `nonidentified` — the real name and description are spoilers |
| `locked` | number | FG lock flag |
| `maxstatbonus` | number | Max DEX bonus for armor |
| `name` | string | Item name |
| `nonid_name` | string | Name shown when unidentified |
| `nonidentified` | string | Unidentified description text |
| `picture` | token | Item image path |
| `prerequisites` | string | Attunement/use prerequisites |
| `properties` | string | Item properties, e.g. "Magic", "Heavy" |
| `range` | number | Range (ranged weapons) |
| `rarity` | string | e.g. "Common", "Uncommon", "Rare" |
| `speed20` | number | Speed at 20 Strength (armor) |
| `speed30` | number | Speed at 30 Strength (armor) |
| `spellfailure` | number | Arcane spell failure % |
| `spells` | container | **Mostly not spells.** Each entry is `link` (windowreference) + `name`. For forged or reskinned items the entries are the templates FG built the item from (e.g. "Ring of Protection" + "Ring" under a renamed brooch) with an empty `link > class` — showing those would spoil what a reskinned item really is. Only entries whose `link > class` is `reference_spell` are spells the item holds (scrolls); the viewer shows just those |
| `stealth` | string | "Disadvantage" on armor that hinders Stealth, otherwise `-` or absent. The sheet-level `defenses > ac > disstealth` is often left at 0 even when the worn armor says Disadvantage, so the viewer trusts the equipped armor |
| `strength` | string | Strength requirement (armor), a number or `-` |
| `subtype` | string | Item sub-category |
| `type` | string | Item category: "Weapon", "Armor", "Wondrous Item", "Ring", "Scroll", "Medicinals", "Adventuring Gear", "Unusual Item", etc. |
| `version` | string | Item version string |
| `weight` | number | Weight in lbs |

---

## Feature List

`character > featurelist > {id-XXXXX} > ...`

Class features granted at each level.

| Child | Type | Notes |
|---|---|---|
| `level` | number | Level at which feature was gained |
| `locked` | number | FG lock flag |
| `name` | string | Feature name |
| `specialization` | string | Subclass name (some entries) |
| `specializationchoice` | number | 1 if from subclass |

> `level` is absent or 0 for background / destiny / inspiration features.
| `text` | formattedtext | Full feature description |

---

## Trait List

`character > traitlist > {id-XXXXX} > ...`

Racial traits and campaign traits.

| Child | Type | Notes |
|---|---|---|
| `locked` | number | FG lock flag |
| `name` | string | Trait name |
| `type` | string | "racial" / "subracial" for heritage traits; **absent** for culture traits (e.g. Tyrannized and its sub-traits) and for the GM's `Campaign Trait: …` entries, which have a `name` only |
| `traits` | container | On a culture's parent entry: the culture's sub-traits (`name` + `text`), duplicated as their own top-level entries |
| `text` | formattedtext | Full trait description |

---

## Feat List

`character > featlist > {id-XXXXX} > ...`

| Child | Type | Notes |
|---|---|---|
| `locked` | number | FG lock flag |
| `name` | string | Feat name |
| `type` | string | Feat category, e.g. "Sign of Faith", "Elective Studies", "Eldritch Invocations", "feat" |
| `text` | formattedtext | Full feat description |

---

## Language List

`character > languagelist > {id-XXXXX} > ...`

| Child | Type | Notes |
|---|---|---|
| `name` | string | Language name, e.g. "Common", "Celestial" |

---

## Proficiency List

`character > proficiencylist > {id-XXXXX} > ...`

| Child | Type | Notes |
|---|---|---|
| `name` | string | Proficiency description, e.g. "Weapon: Daggers, darts..." |

> Some entries have no children (empty `{id-XXXXX}` node) — filter with `.filter(Boolean)`.

---

## Coins

`character > coins > {id-XXXXX} > ...`

Ordered: PP, GP, EP, SP, CP

| Child | Type | Notes |
|---|---|---|
| `amount` | number | Amount held |
| `name` | string | Currency name, e.g. "GP" |

---

## Adventure List

`character > adventurelist > {id-XXXXX} > ...`

Session notes / journal entries.

| Child | Type | Notes |
|---|---|---|
| `name` | string | Entry title — **WARNING:** AlNox has `<name>notes</name>` here, which is why bare `querySelector('name')` was returning "notes" instead of the character name |
| `text` | formattedtext | Entry body text |

---

## Cohorts

`character > cohorts > {id-XXXXX} > ...`

NPC companions and familiars. Each cohort is a **full NPC stat block**, NOT part of the character's own stats. Contains its own:
- `<name>` [string]
- `<hp>` [number] — *leaf node* (single value, no children — different from the character's `<hp>` container)
- `<hptotal>`, `<hptemp>`, `<wounds>` [numbers]
- `<ac>` [number] — *leaf node* (unlike the character's `defenses > ac` container)
- `<abilities>` [container] — entries have only `bonus`/`score` children
- `<size>` [string]
- `<speed>` [string] — *leaf string*, not a container
- `<cr>`, `<type>`, `<alignment>`, `<senses>`, `<languages>` [strings]
- `<locked>`, `<proficiency>`, `<xp>`, `<deathsavefail>`, `<deathsavesuccess>` [numbers]
- `<actions>`, `<bonusactions>`, `<reactions>`, `<traits>`, `<legendaryactions>`, `<lairactions>` [containers] — note it is `<traits>`, NOT `<traitlist>`; cohorts have no `featurelist`/`inventorylist`
- `<coins>` [container] — **shadows the character's `coins`**; an unscoped `coins > *` query picks up the cohort's (usually zeroed) currency entries first
- `<encumbrance>` [container] — observed empty, but shadows the character's `encumbrance`
- `<spells>`, `<spellslots>`, `<innatespells>` [containers]

> **Critical:** Because cohorts appear early in the XML (before the character's own `<hp>` and `<name>`), any unscoped `querySelector()` on the character element will match cohort nodes first. Always use `:scope > elementname` for direct children of `<character>`.

---

## `formattedtext` Nodes

Used in `description`, `text` fields. Contains mixed XML+HTML:

- `<p>` — paragraph
- `<b>`, `<i>`, `<u>` — inline formatting
- `<h>` — header (FG custom tag, render as bold heading)
- `<link class="..." recordname="...">text</link>` — FG cross-reference links (render as plain text or ignore)
- `&#13;` — carriage return (treat as line break)

---

## `windowreference` Nodes

FG internal cross-reference. Contains two children:
- `<class>` — reference type, e.g. "reference_class"
- `<recordname>` — module path, e.g. "reference.classdata.id-00010@Level Up Advanced 5e Adventurer's Guide"

> These are UI navigation links within FG, but the part of `<recordname>` after `@` is the name of
> the module the record came from. The viewer shows it on the Info tab ("Rulebook Sources") for
> `racelink`, `subracelink`, `backgroundlink`, `destinylink` and each class `shortcut`. An empty
> link next to a filled-in name (e.g. a `<background>` with no `backgroundlink`) means the name was
> typed by hand, so its features and proficiencies were never applied. A module that is not a
> published book is shown as "Homebrew module" rather than by name — GM modules tend to carry a
> person's name and the site is public.

---

## Key Parsing Notes for `assets/parser.js`

| Field | Correct Selector | Pitfall |
|---|---|---|
| Character name | `c.querySelector(':scope > name')` | `adventurelist` entries also have `<name>` |
| Character race | `c.querySelector(':scope > race')` | Cohort `<type>` also named similarly |
| Character level | `c.querySelector(':scope > level')` | Features also have `<level>` |
| HP container | `c.querySelector(':scope > hp')` | Cohort `<hp>` is a leaf number node |
| Spell save stat | Read from `powergroup` entry's `<stat>` child | May be absent (Warlock) — viewer falls back to the class name, then the best mental stat |
| Spell slots used | `powermeta > spellslots{N} > used` | Remaining = max − used |
| Pact magic (Warlock) | `powermeta > pactmagicpoints` (A5E spell points), else `pactmagicslots{N} > max` | A5E slots have no `used` child — usage lives in the points |
| Item equipped? | `inventorylist > {id} > carried == 2` | 1 is merely carried |
| AC breakdown | `defenses > ac`: total = 10 + `armor` + `shield` + dex + `misc` + `temporary` | Dex is not stored; it is the remainder (0 when `dexbonus` = "no") |
| Spellcasting ability | `powergroup > {id} > stat` | Per-group; Wizard uses INT, Warlock uses CHA |
