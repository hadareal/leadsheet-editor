# Tie notation for the rhythm row

Date: 2026-08-07

## Problem

The rhythm/"kick" notation feature (added in `b7ad2d2`, reworked in `53194ac`) lets a user build a bar's rhythm from a palette of note/rest durations (`SYMS` in `chart.js`). It has no way to express a hit that's struck once but held across a beat or barline (e.g. "&2 tied into 3", or a hit on beat 4 pushed into the downbeat of the next bar) — both extremely common in the kind of shout-chorus/kick figures this feature exists for. This adds tie notation: a curved mark connecting two adjacent note hits, meaning "don't re-strike, sustain."

## Scope

- Ties within a bar, between any two adjacent note hits (not rests).
- Ties across a barline, including the case where the two bars end up on different printed rows after line-wrapping.
- Out of scope: ties spanning more than two notes in one mark (each tie connects exactly one pair; a note held across three hits is two consecutive ties), enforcing "correct" notation (e.g. forbidding a dotted-quarter where a tie would be idiomatic) — the builder stays permissive, ties are an additional tool, not a constraint.

## Data model

`bar.rhythm` currently stores an array of `SYMS` keys (strings), e.g. `['r_quarter','n_quaver','n_quaver','n_quarter']`. Extend each saved rhythm to also carry which entries are tied *from the previous entry*:

- Add `bar.rhythmTies`: an array of booleans, same length as `bar.rhythm`. `rhythmTies[i] === true` means the note at index `i` is tied from index `i-1` (or, if `i === 0`, from the previous bar's last note — see below). Rests are never tied; a rest's slot in `rhythmTies` is always `false` and the UI never sets it.
- Add `bar.tiedFromPrevBar`: boolean, only meaningful when `rhythmTies[0]` doesn't apply because the bar's own first entry has no "previous entry" within itself. This flag says "this bar's first note continues from the previous bar's last note."

Both fields default to absent/`false`. Old exported/imported JSON songs have neither field, load unchanged, and simply show no ties — full backward compatibility, no migration needed.

Rendering always re-validates a tie before drawing it (e.g. `tiedFromPrevBar` is only honored if the previous bar exists, has a saved rhythm, and that rhythm's last entry is a note). If the user later clears the bar that was tied *from*, the tie just stops rendering — no dangling-reference errors, no cleanup pass required.

## Builder UX (`app.js`, rhythm builder sheet)

Add a "Tie" toggle button next to Undo/Clear in `renderRhythmSheet()`'s sequence area (`rhythmBuilding` gains a `tieArmed: false` field).

- Tapping the toggle arms it (visually pressed/active state). It's a one-shot: placing the next note consumes it and resets it to off; toggling it off manually is also possible before placing anything.
- With the toggle armed, tapping a **note** button in the palette pushes that note into `rhythmBuilding.seq` as usual and additionally records the tie: if `seq` was non-empty before the tap, set `rhythmTies` at the new index to `true`; if `seq` was empty, set `rhythmBuilding.tieFromPrevBar = true` instead (only reachable when the toggle is actually available — see below).
- The toggle is disabled/hidden whenever there's no valid "previous note" to tie to:
  - Mid-sequence: disabled if the last entry in `seq` is a rest (or `seq` is empty and this bar can't tie to a previous one either).
  - At the start of a bar (`seq` empty): only enabled if the previous bar in `song.items` exists, has a saved `rhythm`, and that rhythm's last entry is a note (checked the same way `tiedFromPrevBar` gets validated at render time).
- Rest buttons in the palette are disabled while the toggle is armed (rests can't be tied to or from), so there's no ambiguous state to explain.
- `rhythmUndo()` pops both the last `seq` entry and the corresponding `rhythmTies` entry (or clears `tieFromPrevBar` if undoing the first note). `rhythmClear()` resets ties along with the sequence. `rhythmSave()` persists `rhythmTies`/`tiedFromPrevBar` onto the bar alongside `rhythm`. `rhythmRemove()` clears all three fields.

## Rendering (`chart.js`)

All tie curves use the same shape: a filled, tapered lens (thin at both tips, thicker at the belly), not a uniform-width stroke — built from two quadratic Bézier curves sharing endpoints, offset by the belly thickness (see mockup for the exact construction: `M x1,y1 Q mx,(y_mid+depth) x2,y2 Q mx,(y_mid+depth-thickness) x1,y1 Z`). Anchor points are the bottom-center of each notehead's actual rendered geometry (measured, not hand-derived — see below), so it works uniformly across note types and inside beam groups.

**Within a bar:** `sequenceHtml()` gains a second pass, after placing note/beam glyphs, that draws one tie shape per `rhythmTies[i] === true`, from the previous note's anchor to note `i`'s anchor. Because every atom's grid column and beaming is already known at this point, anchors can be computed analytically (each glyph's notehead-bottom offset as a fraction of its own box, derived once via the same `getBBox()`-style measurement used in the design mockups, then reused as a constant — no runtime DOM measurement needed in the shipped app). Fits inside the existing 42px `.rhythm-row` height without changing it (confirmed in the mockup: the glyph viewBox already reserves blank margin below the notehead).

**Cross-bar, same row:** `renderRhythmRowEl()` already renders bars left-to-right with a `.rhythm-gap` between each pair of `.rhythm-slot`s. After building the row, for each adjacent pair where the second bar's `tiedFromPrevBar` is true (and validates per the rules above), draw one tie shape spanning from the first bar's last-note anchor to the second bar's first-note anchor, positioned in/over the gap.

**Cross-bar, line break:** when the tied-from bar is the last bar in its row (no next-row neighbor rendered adjacently), draw a short one-sided stub instead of a full tie: same tapered-lens construction, but the far end stops a fixed short distance short of the row's trailing edge instead of reaching a second anchor. The receiving bar, when it's first in its row and tied from the previous row's last bar, draws the mirror-image stub arriving from the row's leading edge into its first note. This is standard engraving practice for a tie broken by a system break.

## Testing

No test framework in this project (per `CLAUDE.md`) — verified by opening `index.html` and building rhythms with ties in the browser: a within-bar tie, a same-row cross-bar tie, and a bar arrangement that forces a tied pair onto different rows (temporarily narrowing the window or adding enough bars).
