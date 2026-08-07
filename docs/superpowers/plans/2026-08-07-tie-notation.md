# Tie Notation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user mark two adjacent rhythm hits as tied (within a bar, or across a barline including a line break), and render that as a tapered curve connecting the two noteheads.

**Architecture:** Extend each bar's saved rhythm with a parallel `rhythmTies` boolean array (plus a `tiedFromPrevBar` flag for cross-barline ties), add a one-shot "Tie" toggle to the existing rhythm builder sheet, and add a post-render pass in `chart.js` that measures where each tied notehead actually landed on screen (via `getBoundingClientRect`/`getBBox`) and draws a filled tapered-lens SVG shape between the two anchor points. Measurement-based anchoring is used instead of hand-derived pixel math because the row layout is CSS-grid/percentage-based (responsive) and the note glyphs are Bravier-lifted bezier paths that are error-prone to re-derive by hand (confirmed during design: an initial hand-derived version was visibly wrong twice before switching to `getBBox`).

**Tech Stack:** Vanilla JS, plain `<script>` tags sharing global scope, no build step, no test framework — matches the existing project exactly (see `CLAUDE.md`).

## Global Constraints

- No framework, no bundler, no modules — `chart.js` and `app.js` remain plain scripts sharing global scope. Do not wrap new code in an IIFE or class.
- No test framework. Every task's verification step is a manual action in a real browser (open `index.html`, do X, look at Y), per `CLAUDE.md`'s Testing section.
- Any file inside `APP_SHELL` in `sw.js` that changes requires bumping `CACHE_NAME` (currently `'leadsheet-v15'`), or returning users get a stale cached app. This plan touches `chart.js`, `app.js`, and `style.css` — all three are already in `APP_SHELL`, so only the version string needs bumping (Task 6).
- Old exported/imported song JSON has no `rhythmTies`/`tiedFromPrevBar` fields. Every new code path must treat their absence as "no ties" rather than erroring.
- Commit style: plain descriptive messages, no Conventional Commits prefix, one commit per task per this plan's own step 5.

---

## File Structure

- **`chart.js`** — modified. Adds tie data helpers (`rhythmTiesForBar`, `tiedFromPrevBarFor`), notehead-anchor measurement (`noteheadAnchor`), the tapered-shape drawer (`tieShapeSvg`), the anchor-locating function (`tieAnchorForIndex`), and the render pass (`drawAllTies`). Also refactors `beamGroupSvg` to expose its per-note x-offsets (`beamNoteOffsets`) and tags rendered note groups with `data-seq-idx` so the render pass can find them in the DOM.
- **`app.js`** — modified. Adds the "Tie" toggle to the rhythm builder sheet (`rhythmToggleTie`, `rhythmTieAvailable`, `canTieFromPrevBar`) and threads tie state through `rhythmPick`/`rhythmUndo`/`rhythmClear`/`rhythmSave`/`rhythmRemove`/`renderRhythmSheet`/`rhythmPaletteHtml`/`rhythmSeqBoxHtml`.
- **`style.css`** — modified. `.rhythm-row{position:relative}` so the tie-overlay SVG anchors correctly, a `.tie-armed` button state, and a lightweight `.seq-cell.tied-in` indicator for the in-progress builder preview.
- **`sw.js`** — modified. Cache version bump only.

No new files.

---

### Task 1: Notehead anchor measurement and tie-shape drawing helpers

**Files:**
- Modify: `chart.js:279` (insert new code between the end of `iconSvg` at chart.js:274-279 and `function groupForBeaming` at chart.js:285)

**Interfaces:**
- Consumes: `glyphSvg(name,tx,ty,baseX,baseY)`, `BASE_X`, `BASE_Y`, `VB_W`, `VB_H` (all already defined earlier in `chart.js`).
- Produces: `noteheadAnchor(glyphName)` → `{x, y}` in the glyph's own 0..`VB_W` / 0..`VB_H` coordinate space (bottom-center of that notehead shape, memoized). `NOTEHEAD_GLYPH_FOR_BASE` → object mapping a `SYMS[key].base` string (`'whole'|'half'|'quarter'|'eighth'|'sixteenth'`) to the glyph name used for its notehead. `tieShapeSvg(x1,y1,x2,y2,depth,thick)` → an SVG `<path>` string for a filled, tapered tie shape between two pixel points. `TIE_DEPTH_PER_SIZE`, `TIE_THICK_PER_SIZE` constants (fractions of render size).

- [ ] **Step 1: Add the helpers**

Insert this block into `chart.js` immediately after the closing `}` of `iconSvg` (chart.js:279) and before `function groupForBeaming` (chart.js:285):

```js
// ============ Ties: notehead anchor measurement + tie shape ============
// A tie means "this hit continues the previous one, don't re-strike" — a
// thin, filled, tapered curve connecting the bottom-center of one notehead
// to the bottom-center of the next. Anchors are measured from the actual
// rendered glyph (via getBBox on an isolated probe) rather than hand-derived
// from the raw path data — these are Bravura-lifted bezier curves, and hand
// math on them turned out to be wrong twice during design.
const NOTEHEAD_GLYPH_FOR_BASE = {
  whole: 'noteheadDiamondWhole',
  half: 'noteheadDiamondHollow',
  quarter: 'noteheadSlashFilled',
  eighth: 'noteheadSlashFilled',
  sixteenth: 'noteheadSlashFilled'
};
let _noteheadAnchorCache = {};
function noteheadAnchor(glyphName){
  if(_noteheadAnchorCache[glyphName]) return _noteheadAnchorCache[glyphName];
  const probe = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  probe.setAttribute('width', '0');
  probe.setAttribute('height', '0');
  probe.style.position = 'absolute';
  probe.style.overflow = 'hidden';
  probe.innerHTML = glyphSvg(glyphName, 0, 0, BASE_X, BASE_Y);
  document.body.appendChild(probe);
  const bbox = probe.firstChild.getBBox();
  document.body.removeChild(probe);
  const anchor = { x: bbox.x + bbox.width/2, y: bbox.y + bbox.height };
  _noteheadAnchorCache[glyphName] = anchor;
  return anchor;
}

// Depth/thickness are shallower than they look in isolation on purpose —
// at the real 32px render size the rhythm row only has ~9px of blank
// margin below a notehead before it touches the chord row underneath, so
// this leaves a few px of safety margin rather than using it all up.
const TIE_DEPTH_PER_SIZE = 0.19;
const TIE_THICK_PER_SIZE = 0.065;
function tieShapeSvg(x1, y1, x2, y2, depth, thick){
  const mx = (x1+x2)/2;
  const outerY = (y1+y2)/2 + depth;
  const innerY = outerY - thick;
  return '<path d="M '+x1+' '+y1+' Q '+mx+' '+outerY+' '+x2+' '+y2+' Q '+mx+' '+innerY+' '+x1+' '+y1+' Z" fill="#000000"/>';
}
```

- [ ] **Step 2: Verify in the browser**

Open `index.html`. Open the browser devtools console and run:

```js
noteheadAnchor('noteheadSlashFilled')
```

Expected: an object like `{x: 207, y: 816}` (exact numbers may vary slightly by browser's bezier rasterization, but `x` should be roughly 180-230 and `y` roughly 780-850 — well inside the 0..640 / 0..1140 viewBox). Run it a second time and confirm you get the identical object back (proves the cache works). Confirm no errors were thrown and the page still looks and behaves exactly as before (this task adds dead code only — nothing calls these functions yet).

- [ ] **Step 3: Commit**

```bash
git add chart.js
git commit -m "Add notehead-anchor measurement and tapered tie-shape helpers for rhythm ties"
```

---

### Task 2: Expose beam-group note offsets and tag rendered note groups with their sequence index

**Files:**
- Modify: `chart.js:285-314` (`groupForBeaming`)
- Modify: `chart.js:316-361` (`beamGroupSvg`)
- Modify: `chart.js:368-386` (`sequenceHtml`)

**Interfaces:**
- Consumes: existing `SYMS`, `BASE_Y`, `STEM_UP`, `STEM_THICK`, `STEM_LEN`, `BEAM_THICK`, `BEAM_GAP`, `glyphSvg`, `rectSvg`.
- Produces: each group returned by `groupForBeaming` now also has `seqStart` (the index into the original flat `seq` array where this group begins). `beamNoteOffsets(keys)` → `{offsets:[...], cum}` — `offsets[i]` is the same cumulative x-position used internally by `beamGroupSvg` for note `i` in that beam group. Every `<span class="rhythm-item">`/`<span class="rhythm-item beam">` emitted by `sequenceHtml` now carries `data-seq-idx="<seqStart>"`.

This is a behavior-preserving refactor plus one additive HTML attribute — the rendered rhythm row should look pixel-identical to before.

- [ ] **Step 1: Add `seqStart` to `groupForBeaming`**

Replace chart.js:285-314:

```js
function groupForBeaming(seq){
  const groups = [];
  let i = 0, pos = 0;
  while(i < seq.length){
    const key = seq[i], def = SYMS[key];
    const beamable = !def.rest && def.units<4;
    if(beamable){
      const beatStart = Math.floor(pos/4);
      let run = [key], units = def.units, p = pos+def.units, j = i+1;
      while(j < seq.length){
        const k2 = seq[j], d2 = SYMS[k2];
        const beamable2 = !d2.rest && d2.units<4;
        if(!beamable2) break;
        if(p + d2.units > (beatStart+1)*4) break; // don't cross a beat boundary
        run.push(k2); units += d2.units; p += d2.units; j++;
      }
      if(run.length>=2){
        groups.push({ type:'beam', keys:run, units, start:pos });
        pos += units; i = j;
      } else {
        groups.push({ type:'single', key, units:def.units, start:pos });
        pos += def.units; i++;
      }
    } else {
      groups.push({ type:'single', key, units:def.units, start:pos });
      pos += def.units; i++;
    }
  }
  return groups;
}
```

with:

```js
function groupForBeaming(seq){
  const groups = [];
  let i = 0, pos = 0;
  while(i < seq.length){
    const seqStart = i;
    const key = seq[i], def = SYMS[key];
    const beamable = !def.rest && def.units<4;
    if(beamable){
      const beatStart = Math.floor(pos/4);
      let run = [key], units = def.units, p = pos+def.units, j = i+1;
      while(j < seq.length){
        const k2 = seq[j], d2 = SYMS[k2];
        const beamable2 = !d2.rest && d2.units<4;
        if(!beamable2) break;
        if(p + d2.units > (beatStart+1)*4) break; // don't cross a beat boundary
        run.push(k2); units += d2.units; p += d2.units; j++;
      }
      if(run.length>=2){
        groups.push({ type:'beam', keys:run, units, start:pos, seqStart });
        pos += units; i = j;
      } else {
        groups.push({ type:'single', key, units:def.units, start:pos, seqStart });
        pos += def.units; i++;
      }
    } else {
      groups.push({ type:'single', key, units:def.units, start:pos, seqStart });
      pos += def.units; i++;
    }
  }
  return groups;
}
```

- [ ] **Step 2: Extract `beamNoteOffsets` and hoist `beamGroupSvg`'s local constants**

Replace chart.js:316-361:

```js
function beamGroupSvg(keys, size){
  size = size || 26;
  const UNIT_W = 190;
  const MIN_GAP = 200; // floor so adjacent noteheads (each ~140 wide) never overlap
  // Beam groups build their own tight viewBox (sized to totalLocalW below)
  // rather than the shared single-icon canvas, so they get their own small
  // left margin — just enough to cover a notehead's own leftward bleed —
  // instead of the (much larger) BASE_X tuned for the diamond noteheads.
  const MARGIN = 90;
  let cum = 0;
  const stems = [];
  let out = '';
  keys.forEach(k=>{
    const sym = SYMS[k];
    out += glyphSvg('noteheadSlashFilled', cum, 0, MARGIN, BASE_Y);
    const stemX = cum + STEM_UP.x;
    out += rectSvg(stemX-STEM_THICK, STEM_UP.y, STEM_THICK, STEM_LEN, MARGIN, BASE_Y);
    if(sym.dotted) out += glyphSvg('augmentationDot', cum+STEM_UP.x+40, 0, MARGIN, BASE_Y);
    stems.push({ x:stemX, sixteenth: sym.base==='sixteenth' });
    cum += Math.max(sym.units*UNIT_W, MIN_GAP);
  });
  const totalLocalW = MARGIN + cum + 40;
  const topY = STEM_UP.y + STEM_LEN;
  const firstX = stems[0].x, lastX = stems[stems.length-1].x;

  out += rectSvg(firstX-STEM_THICK, topY-BEAM_THICK/2, lastX-firstX+STEM_THICK, BEAM_THICK, MARGIN, BASE_Y);

  const connL = new Array(stems.length).fill(false);
  const connR = new Array(stems.length).fill(false);
  const secY = topY - BEAM_GAP;
  for(let i=0; i<stems.length-1; i++){
    if(stems[i].sixteenth && stems[i+1].sixteenth){
      out += rectSvg(stems[i].x-STEM_THICK, secY-BEAM_THICK/2, stems[i+1].x-stems[i].x+STEM_THICK, BEAM_THICK, MARGIN, BASE_Y);
      connR[i] = true; connL[i+1] = true;
    }
  }
  const STUB = 110;
  stems.forEach((s,i)=>{
    if(!s.sixteenth || connL[i] || connR[i]) return;
    if(i>0) out += rectSvg(s.x-STEM_THICK-STUB, secY-BEAM_THICK/2, STUB+STEM_THICK, BEAM_THICK, MARGIN, BASE_Y);
    else if(i<stems.length-1) out += rectSvg(s.x-STEM_THICK, secY-BEAM_THICK/2, STUB+STEM_THICK, BEAM_THICK, MARGIN, BASE_Y);
  });

  const w = Math.round(size*(totalLocalW/VB_H));
  return '<svg class="rsym rsym-beam" width="'+w+'" height="'+size+'" preserveAspectRatio="none" viewBox="0 0 '+totalLocalW+' '+VB_H+'">'+out+'</svg>';
}
```

with:

```js
const BEAM_UNIT_W = 190, BEAM_MIN_GAP = 200; // floor so adjacent noteheads (each ~140 wide) never overlap
// Beam groups build their own tight viewBox (sized to totalLocalW below)
// rather than the shared single-icon canvas, so they get their own small
// left margin — just enough to cover a notehead's own leftward bleed —
// instead of the (much larger) BASE_X tuned for the diamond noteheads.
const BEAM_MARGIN = 90;

// The cumulative x-offset of each note within a beam group, in the group's
// own local viewBox units. Shared between beamGroupSvg (drawing) and the
// tie-anchor lookup (chart.js Task 3), so a tied note's on-screen position
// inside a beamed pair can be computed the same way it was drawn.
function beamNoteOffsets(keys){
  let cum = 0;
  const offsets = [];
  keys.forEach(k=>{
    offsets.push(cum);
    cum += Math.max(SYMS[k].units*BEAM_UNIT_W, BEAM_MIN_GAP);
  });
  return { offsets, cum };
}

function beamGroupSvg(keys, size){
  size = size || 26;
  const { offsets, cum } = beamNoteOffsets(keys);
  const stems = [];
  let out = '';
  keys.forEach((k, idx)=>{
    const sym = SYMS[k];
    const cumX = offsets[idx];
    out += glyphSvg('noteheadSlashFilled', cumX, 0, BEAM_MARGIN, BASE_Y);
    const stemX = cumX + STEM_UP.x;
    out += rectSvg(stemX-STEM_THICK, STEM_UP.y, STEM_THICK, STEM_LEN, BEAM_MARGIN, BASE_Y);
    if(sym.dotted) out += glyphSvg('augmentationDot', cumX+STEM_UP.x+40, 0, BEAM_MARGIN, BASE_Y);
    stems.push({ x:stemX, sixteenth: sym.base==='sixteenth' });
  });
  const totalLocalW = BEAM_MARGIN + cum + 40;
  const topY = STEM_UP.y + STEM_LEN;
  const firstX = stems[0].x, lastX = stems[stems.length-1].x;

  out += rectSvg(firstX-STEM_THICK, topY-BEAM_THICK/2, lastX-firstX+STEM_THICK, BEAM_THICK, BEAM_MARGIN, BASE_Y);

  const connL = new Array(stems.length).fill(false);
  const connR = new Array(stems.length).fill(false);
  const secY = topY - BEAM_GAP;
  for(let i=0; i<stems.length-1; i++){
    if(stems[i].sixteenth && stems[i+1].sixteenth){
      out += rectSvg(stems[i].x-STEM_THICK, secY-BEAM_THICK/2, stems[i+1].x-stems[i].x+STEM_THICK, BEAM_THICK, BEAM_MARGIN, BASE_Y);
      connR[i] = true; connL[i+1] = true;
    }
  }
  const STUB = 110;
  stems.forEach((s,i)=>{
    if(!s.sixteenth || connL[i] || connR[i]) return;
    if(i>0) out += rectSvg(s.x-STEM_THICK-STUB, secY-BEAM_THICK/2, STUB+STEM_THICK, BEAM_THICK, BEAM_MARGIN, BASE_Y);
    else if(i<stems.length-1) out += rectSvg(s.x-STEM_THICK, secY-BEAM_THICK/2, STUB+STEM_THICK, BEAM_THICK, BEAM_MARGIN, BASE_Y);
  });

  const w = Math.round(size*(totalLocalW/VB_H));
  return '<svg class="rsym rsym-beam" width="'+w+'" height="'+size+'" preserveAspectRatio="none" viewBox="0 0 '+totalLocalW+' '+VB_H+'">'+out+'</svg>';
}
```

- [ ] **Step 3: Tag rendered groups with `data-seq-idx`**

Replace chart.js:368-386:

```js
function sequenceHtml(seq, size){
  return groupForBeaming(seq).map(g=>{
    const html = g.type==='beam' ? beamGroupSvg(g.keys,size) : iconSvg(g.key,size);
    const cls = g.type==='beam' ? 'rhythm-item beam' : 'rhythm-item';
    let inner = html;
    if(g.type!=='beam'){
      // A note/rest longer than one beat is a single event that happens at
      // the start of its box, so it's centered on just its first beat —
      // not the middle of the full multi-beat span, which would visually
      // drift it away from the beat it actually belongs to. Beam groups
      // are exempt: they always fit within one beat (see groupForBeaming)
      // and already stretch to fill it edge-to-edge.
      const centerPct = Math.min(50, 200/g.units);
      const w = Math.round(size*VB_W/VB_H);
      inner = '<span style="display:inline-block;margin-left:calc('+centerPct+'% - '+(w/2)+'px)">'+html+'</span>';
    }
    return '<span class="'+cls+'" style="grid-column:'+(g.start+1)+' / span '+g.units+'">'+inner+'</span>';
  }).join('');
}
```

with:

```js
function sequenceHtml(seq, size){
  return groupForBeaming(seq).map(g=>{
    const html = g.type==='beam' ? beamGroupSvg(g.keys,size) : iconSvg(g.key,size);
    const cls = g.type==='beam' ? 'rhythm-item beam' : 'rhythm-item';
    let inner = html;
    if(g.type!=='beam'){
      // A note/rest longer than one beat is a single event that happens at
      // the start of its box, so it's centered on just its first beat —
      // not the middle of the full multi-beat span, which would visually
      // drift it away from the beat it actually belongs to. Beam groups
      // are exempt: they always fit within one beat (see groupForBeaming)
      // and already stretch to fill it edge-to-edge.
      const centerPct = Math.min(50, 200/g.units);
      const w = Math.round(size*VB_W/VB_H);
      inner = '<span style="display:inline-block;margin-left:calc('+centerPct+'% - '+(w/2)+'px)">'+html+'</span>';
    }
    return '<span class="'+cls+'" data-seq-idx="'+g.seqStart+'" style="grid-column:'+(g.start+1)+' / span '+g.units+'">'+inner+'</span>';
  }).join('');
}
```

- [ ] **Step 4: Verify no regression**

Open `index.html`. Switch to Rhythm mode, tap a bar, and build a rhythm that includes a beamed pair (e.g. two quaver/eighth notes in the same beat) alongside some longer notes and a rest — the same kind of figure the app already supported. Tap Done. Confirm the rendered rhythm row looks pixel-identical to how this feature looked before this task (spacing, beaming, centering all unchanged). In devtools, inspect one of the rendered `.rhythm-item` spans and confirm it now has a `data-seq-idx="N"` attribute.

- [ ] **Step 5: Commit**

```bash
git add chart.js
git commit -m "Expose beam-group note offsets and tag rendered rhythm groups with their sequence index"
```

---

### Task 3: Render tie shapes (within-bar, same-row cross-bar, and line-break stub cases)

**Files:**
- Modify: `chart.js:401-404` (insert new functions after `rhythmForBar`)
- Modify: `chart.js:563-593` (`renderRhythmRowEl`)
- Modify: `chart.js:620-698` (`render`)
- Modify: `style.css:192-200` (`.rhythm-row`)

**Interfaces:**
- Consumes: `noteheadAnchor`, `NOTEHEAD_GLYPH_FOR_BASE`, `tieShapeSvg`, `TIE_DEPTH_PER_SIZE`, `TIE_THICK_PER_SIZE` (Task 1), `beamNoteOffsets`, `BEAM_MARGIN`, `groupForBeaming` with `seqStart` (Task 2), `SYMS`, `BASE_X`, `VB_W`, `VB_H`, `song`, `rhythmForBar`.
- Produces: `rhythmTiesForBar(item)` → array (mirrors `rhythmForBar`). `tiedFromPrevBarFor(item)` → boolean. `tieAnchorForIndex(groups, seqIndex, slotEl, size)` → `{x,y}` in viewport pixels, or `null`. `drawAllTies(slotMap)` — draws every tie in the current `song` into the already-rendered DOM. `renderRhythmRowEl(row, slotMap)` — now takes a second `slotMap` argument (a `Map` from bar id to `{slotEl, rowEl}`) and populates it.

This task makes ties render, but nothing in the app can set `rhythmTies`/`tiedFromPrevBar` yet — that's Task 4/5. Verification here uses the browser console to set that data directly, which is a normal way to exercise rendering code in a project with no test framework.

- [ ] **Step 1: Add tie-data accessors and the render pass**

Insert this block into `chart.js` immediately after the closing `}` of `rhythmForBar` (chart.js:401-404):

```js
function rhythmTiesForBar(item){
  if(rhythmBuilding && rhythmBuilding.barId===item.id) return rhythmBuilding.ties;
  return item.rhythmTies || [];
}
function tiedFromPrevBarFor(item){
  if(rhythmBuilding && rhythmBuilding.barId===item.id) return !!rhythmBuilding.tieFromPrevBar;
  return !!item.tiedFromPrevBar;
}

// Finds where the notehead at flat sequence index `seqIndex` actually landed
// on screen, in viewport pixels. `slotEl` is the already-rendered
// `.rhythm-slot` for this bar; `groups` is groupForBeaming(seq) for the same
// bar. Returns null if the note can't be located (e.g. layout not settled).
function tieAnchorForIndex(groups, seqIndex, slotEl, size){
  const group = groups.find(g => seqIndex >= g.seqStart && seqIndex < g.seqStart + (g.type==='beam' ? g.keys.length : 1));
  if(!group) return null;
  const itemEl = slotEl.querySelector('[data-seq-idx="'+group.seqStart+'"]');
  if(!itemEl) return null;
  const svgEl = itemEl.querySelector('svg');
  if(!svgEl) return null;
  const rect = svgEl.getBoundingClientRect();
  if(group.type==='single'){
    const glyphName = NOTEHEAD_GLYPH_FOR_BASE[SYMS[group.key].base];
    const a = noteheadAnchor(glyphName);
    return { x: rect.left + (a.x/VB_W)*rect.width, y: rect.top + (a.y/VB_H)*rect.height };
  }
  const k = seqIndex - group.seqStart;
  const { offsets, cum } = beamNoteOffsets(group.keys);
  const totalLocalW = BEAM_MARGIN + cum + 40;
  const a = noteheadAnchor('noteheadSlashFilled');
  const localX = BEAM_MARGIN + offsets[k] + (a.x - BASE_X);
  const localY = a.y;
  return { x: rect.left + (localX/totalLocalW)*rect.width, y: rect.top + (localY/VB_H)*rect.height };
}

function tieOverlayFor(rowEl, overlays){
  if(overlays.has(rowEl)) return overlays.get(rowEl);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'tie-overlay');
  svg.style.position = 'absolute';
  svg.style.left = '0'; svg.style.top = '0';
  svg.style.width = '100%'; svg.style.height = '100%';
  svg.style.pointerEvents = 'none';
  rowEl.appendChild(svg);
  overlays.set(rowEl, svg);
  return svg;
}

// Draws every tie in the current song. `slotMap` maps bar id -> {slotEl,
// rowEl}, built by renderRhythmRowEl during this render() pass. Must run
// after the rhythm rows are attached to the document (needs real layout).
function drawAllTies(slotMap){
  const overlays = new Map();
  function addShape(rowEl, x1, y1, x2, y2, depth, thick){
    const rowRect = rowEl.getBoundingClientRect();
    const svg = tieOverlayFor(rowEl, overlays);
    svg.insertAdjacentHTML('beforeend', tieShapeSvg(x1-rowRect.left, y1-rowRect.top, x2-rowRect.left, y2-rowRect.top, depth, thick));
  }
  const SIZE = 32;
  const depth = SIZE*TIE_DEPTH_PER_SIZE, thick = SIZE*TIE_THICK_PER_SIZE;

  // Within-bar ties.
  song.items.forEach(item=>{
    if(item.kind!=='chords') return;
    const rh = rhythmForBar(item);
    if(!rh || !rh.length) return;
    const ties = rhythmTiesForBar(item);
    const info = slotMap.get(item.id);
    if(!info) return;
    const groups = groupForBeaming(rh);
    for(let i=1; i<rh.length; i++){
      if(!ties[i] || SYMS[rh[i]].rest || SYMS[rh[i-1]].rest) continue;
      const a1 = tieAnchorForIndex(groups, i-1, info.slotEl, SIZE);
      const a2 = tieAnchorForIndex(groups, i, info.slotEl, SIZE);
      if(a1 && a2) addShape(info.rowEl, a1.x, a1.y, a2.x, a2.y, depth, thick);
    }
  });

  // Cross-barline ties (same row, or a stub pair across a line break).
  for(let k=1; k<song.items.length; k++){
    const prev = song.items[k-1], cur = song.items[k];
    if(prev.kind!=='chords' || cur.kind!=='chords') continue;
    if(!tiedFromPrevBarFor(cur)) continue;
    const prevRh = rhythmForBar(prev);
    if(!prevRh || !prevRh.length || SYMS[prevRh[prevRh.length-1]].rest) continue;
    const curRh = rhythmForBar(cur);
    if(!curRh || !curRh.length || SYMS[curRh[0]].rest) continue;
    const prevInfo = slotMap.get(prev.id), curInfo = slotMap.get(cur.id);
    if(!prevInfo || !curInfo) continue;
    const aPrev = tieAnchorForIndex(groupForBeaming(prevRh), prevRh.length-1, prevInfo.slotEl, SIZE);
    const aCur = tieAnchorForIndex(groupForBeaming(curRh), 0, curInfo.slotEl, SIZE);
    if(!aPrev || !aCur) continue;

    if(prevInfo.rowEl === curInfo.rowEl){
      addShape(prevInfo.rowEl, aPrev.x, aPrev.y, aCur.x, aCur.y, depth, thick);
    } else {
      // Tied pair landed on different printed rows — draw two short stubs
      // instead of one continuous curve (standard engraving practice for
      // a tie broken by a system break).
      const STUB = 20;
      addShape(prevInfo.rowEl, aPrev.x, aPrev.y, aPrev.x+STUB, aPrev.y, depth*0.8, thick*0.8);
      addShape(curInfo.rowEl, aCur.x-STUB, aCur.y, aCur.x, aCur.y, depth*0.8, thick*0.8);
    }
  }
}
```

- [ ] **Step 2: Have `renderRhythmRowEl` populate a slot map**

Replace chart.js:563-593:

```js
function renderRhythmRowEl(row){
  const div = document.createElement('div');
  div.className = 'rhythm-row';
  const hasAny = row.some(item=>{ const rh = rhythmForBar(item); return rh && rh.length; });
  if(hasAny) div.classList.add('has-rhythm');

  const tsSpacer = document.createElement('div');
  tsSpacer.className = 'ts-spacer';
  div.appendChild(tsSpacer);

  row.forEach(item=>{
    const gap = document.createElement('div');
    gap.className = 'rhythm-gap';
    div.appendChild(gap);

    const slot = document.createElement('div');
    slot.className = 'rhythm-slot';
    const rh = rhythmForBar(item);
    if(rh && rh.length){
      slot.innerHTML = sequenceHtml(rh, 32);
    }
    slot.onclick = ()=>handleBarTap(item, 0);
    div.appendChild(slot);
  });

  const trailingGap = document.createElement('div');
  trailingGap.className = 'rhythm-gap';
  div.appendChild(trailingGap);

  return div;
}
```

with:

```js
function renderRhythmRowEl(row, slotMap){
  const div = document.createElement('div');
  div.className = 'rhythm-row';
  const hasAny = row.some(item=>{ const rh = rhythmForBar(item); return rh && rh.length; });
  if(hasAny) div.classList.add('has-rhythm');

  const tsSpacer = document.createElement('div');
  tsSpacer.className = 'ts-spacer';
  div.appendChild(tsSpacer);

  row.forEach(item=>{
    const gap = document.createElement('div');
    gap.className = 'rhythm-gap';
    div.appendChild(gap);

    const slot = document.createElement('div');
    slot.className = 'rhythm-slot';
    const rh = rhythmForBar(item);
    if(rh && rh.length){
      slot.innerHTML = sequenceHtml(rh, 32);
    }
    slot.onclick = ()=>handleBarTap(item, 0);
    div.appendChild(slot);
    if(slotMap) slotMap.set(item.id, { slotEl: slot, rowEl: div });
  });

  const trailingGap = document.createElement('div');
  trailingGap.className = 'rhythm-gap';
  div.appendChild(trailingGap);

  return div;
}
```

- [ ] **Step 3: Wire the slot map and tie pass into `render()`**

In `render()` (chart.js:620-698), make three small edits.

First, replace this line (chart.js:625-627):

```js
  const rows = chunkRows(song.items, BARS_PER_ROW);
  const songBlock = document.createElement('div');
  songBlock.className='song-block';
```

with:

```js
  const rows = chunkRows(song.items, BARS_PER_ROW);
  const songBlock = document.createElement('div');
  songBlock.className='song-block';
  const slotMap = new Map();
```

Second, replace this line (chart.js:667):

```js
    songBlock.appendChild(renderRhythmRowEl(row));
```

with:

```js
    songBlock.appendChild(renderRhythmRowEl(row, slotMap));
```

Third, replace this block (chart.js:694-698):

```js
  inner.appendChild(songBlock);
  inner.appendChild(canvas);
  requestAnimationFrame(resizeCanvasPreserving);
  renderInfoPanel();
}
```

with:

```js
  inner.appendChild(songBlock);
  inner.appendChild(canvas);
  drawAllTies(slotMap);
  requestAnimationFrame(resizeCanvasPreserving);
  renderInfoPanel();
}
```

- [ ] **Step 4: Let the tie overlay position itself against the row**

Replace style.css:192-200:

```css
.rhythm-row{
  display:flex;
  align-items:flex-end;
  height:0;
  overflow-x:visible;
  overflow-y:hidden;
  transition:height .18s ease;
}
.rhythm-row.has-rhythm{ height:42px; }
```

with:

```css
.rhythm-row{
  display:flex;
  align-items:flex-end;
  height:0;
  overflow-x:visible;
  overflow-y:hidden;
  transition:height .18s ease;
  position:relative;
}
.rhythm-row.has-rhythm{ height:42px; }
.tie-overlay{ overflow:visible; }
```

- [ ] **Step 5: Verify within-bar and same-row cross-bar ties**

Open `index.html`, open the devtools console, and run (assumes at least 2 bars exist, which is the default song):

```js
song.items[0].rhythm = ['r_quarter','n_quaver','n_quaver','n_quarter','n_quarter'];
song.items[0].rhythmTies = [false,false,true,true,false];
render();
```

Expected: bar 1 shows a rest, then two eighth notes (the second beamed with the first), then two quarter notes, with a small tapered tie curve connecting the second eighth note to the following quarter note, sitting just below the noteheads.

Then run:

```js
song.items[1].rhythm = ['n_quarter','n_quarter','n_quarter','n_quarter'];
song.items[1].tiedFromPrevBar = true;
render();
```

Expected: a tie curve spanning the gap between bar 1's last note and bar 2's first note.

- [ ] **Step 6: Verify the line-break stub case**

In the same console session, force every bar onto its own row and re-render:

```js
BARS_PER_ROW = 1;
render();
```

Expected: bar 1 and bar 2 are now on separate lines, and the tie from Step 5 now renders as two short stubs — one trailing off the right edge of bar 1's row, one arriving at the left edge of bar 2's row — instead of one continuous curve. Restore normal layout afterward:

```js
BARS_PER_ROW = 4;
render();
```

- [ ] **Step 7: Commit**

```bash
git add chart.js style.css
git commit -m "Render tie curves for within-bar and cross-barline ties, including a line-break stub case"
```

---

### Task 4: Add the Tie toggle to the rhythm builder (within-bar case)

**Files:**
- Modify: `app.js:600-686` (rhythm builder: `openRhythmBuilder`, `rhythmUnitsUsed`/new helpers, `rhythmPaletteHtml`, `rhythmSeqBoxHtml`, `renderRhythmSheet`, `rhythmPick`, `rhythmUndo`, `rhythmClear`, `rhythmSave`, `rhythmRemove`)
- Modify: `style.css:663` (button active state), `style.css:684-689` (seq-cell tie indicator)

**Interfaces:**
- Consumes: `rhythmBuilding` (existing global, app.js:589), `SYMS`, `RHYTHM_ROWS`, `groupForBeaming`, `iconSvg`, `beamGroupSvg`, `barUnitsFor`, `findBarById`, `pushSongUndo`, `showSheet`, `render` (all existing).
- Produces: `rhythmBuilding` gains `ties` (array, parallel to `seq`), `tieArmed` (boolean), `tieFromPrevBar` (boolean). `rhythmTieAvailable()` → boolean (Task 4 version only checks the "mid-sequence" case — extended in Task 5). `rhythmToggleTie()`. Saved bars gain `rhythmTies` and `tiedFromPrevBar` fields (matching Task 3's `rhythmTiesForBar`/`tiedFromPrevBarFor` readers).

- [ ] **Step 1: Extend `openRhythmBuilder` to carry tie state**

Replace app.js:600-610:

```js
function openRhythmBuilder(barId){
  const b = findBarById(barId);
  if(!b) return;
  const units = barUnitsFor(song.timeSig);
  if(units===null){
    showToast(`Rhythm isn't available yet for ${song.timeSig.num}/${song.timeSig.den}`);
    return;
  }
  rhythmBuilding = { barId, seq: (b.rhythm||[]).slice() };
  renderRhythmSheet();
}
```

with:

```js
function openRhythmBuilder(barId){
  const b = findBarById(barId);
  if(!b) return;
  const units = barUnitsFor(song.timeSig);
  if(units===null){
    showToast(`Rhythm isn't available yet for ${song.timeSig.num}/${song.timeSig.den}`);
    return;
  }
  rhythmBuilding = {
    barId,
    seq: (b.rhythm||[]).slice(),
    ties: (b.rhythmTies||[]).slice(),
    tieArmed: false,
    tieFromPrevBar: !!b.tiedFromPrevBar
  };
  renderRhythmSheet();
}
```

- [ ] **Step 2: Add tie-availability and toggle functions**

Insert this block into `app.js` immediately after `rhythmUnitsUsed` (app.js:616-618, right before `rhythmPaletteHtml`):

```js
// Task 5 extends this to also allow arming when seq is empty but the
// previous bar ends on a note (tying across the barline).
function rhythmTieAvailable(){
  if(rhythmBuilding.seq.length===0) return false;
  const lastKey = rhythmBuilding.seq[rhythmBuilding.seq.length-1];
  return !SYMS[lastKey].rest;
}
function rhythmToggleTie(){
  if(!rhythmBuilding.tieArmed && !rhythmTieAvailable()) return;
  rhythmBuilding.tieArmed = !rhythmBuilding.tieArmed;
  renderRhythmSheet();
}
```

- [ ] **Step 3: Disable rest buttons while a tie is armed**

Replace app.js:619-630:

```js
function rhythmPaletteHtml(units){
  const used = rhythmUnitsUsed();
  let html = '<span class="pt-head">Name</span><span class="pt-head">Value</span><span class="pt-head">Note</span><span class="pt-head">Rest</span>';
  RHYTHM_ROWS.forEach(row=>{
    const n = SYMS[row.note], r = SYMS[row.rest];
    html += `<span class="pt-name">${n.name}</span>`;
    html += `<span class="pt-value">${n.value}</span>`;
    html += `<button type="button" class="pt-btn" ${used+n.units>units?'disabled':''} onclick="rhythmPick('${row.note}')">${iconSvg(row.note,38)}</button>`;
    html += `<button type="button" class="pt-btn" ${used+r.units>units?'disabled':''} onclick="rhythmPick('${row.rest}')">${iconSvg(row.rest,38)}</button>`;
  });
  return html;
}
```

with:

```js
function rhythmPaletteHtml(units){
  const used = rhythmUnitsUsed();
  const armed = rhythmBuilding.tieArmed;
  let html = '<span class="pt-head">Name</span><span class="pt-head">Value</span><span class="pt-head">Note</span><span class="pt-head">Rest</span>';
  RHYTHM_ROWS.forEach(row=>{
    const n = SYMS[row.note], r = SYMS[row.rest];
    html += `<span class="pt-name">${n.name}</span>`;
    html += `<span class="pt-value">${n.value}</span>`;
    html += `<button type="button" class="pt-btn" ${used+n.units>units?'disabled':''} onclick="rhythmPick('${row.note}')">${iconSvg(row.note,38)}</button>`;
    html += `<button type="button" class="pt-btn" ${(used+r.units>units || armed)?'disabled':''} onclick="rhythmPick('${row.rest}')">${iconSvg(row.rest,38)}</button>`;
  });
  return html;
}
```

- [ ] **Step 4: Show a tie indicator in the in-progress sequence preview**

Replace app.js:631-643:

```js
function rhythmSeqBoxHtml(units){
  const groups = groupForBeaming(rhythmBuilding.seq);
  let html = '';
  let filled = 0;
  groups.forEach(g=>{
    html += `<div class="seq-cell filled" style="grid-column:span ${g.units}">${g.type==='beam'?beamGroupSvg(g.keys,28):iconSvg(g.key,28)}</div>`;
    filled += g.units;
  });
  for(let u=filled; u<units; u++){
    html += `<div class="seq-cell empty${(u+1)%4===0?' beat-end':''}"></div>`;
  }
  return html;
}
```

with:

```js
function rhythmSeqBoxHtml(units){
  const groups = groupForBeaming(rhythmBuilding.seq);
  const ties = rhythmBuilding.ties;
  let html = '';
  let filled = 0;
  groups.forEach(g=>{
    const tied = g.seqStart>0 ? !!ties[g.seqStart] : !!rhythmBuilding.tieFromPrevBar;
    const cls = 'seq-cell filled' + (tied ? ' tied-in' : '');
    html += `<div class="${cls}" style="grid-column:span ${g.units}">${g.type==='beam'?beamGroupSvg(g.keys,28):iconSvg(g.key,28)}</div>`;
    filled += g.units;
  });
  for(let u=filled; u<units; u++){
    html += `<div class="seq-cell empty${(u+1)%4===0?' beat-end':''}"></div>`;
  }
  return html;
}
```

- [ ] **Step 5: Add the Tie button to the sheet**

Replace app.js:644-666:

```js
function renderRhythmSheet(){
  const b = findBarById(rhythmBuilding.barId);
  if(!b){ closeRhythmSheet(); return; }
  const units = barUnitsFor(song.timeSig);
  const used = rhythmUnitsUsed();
  const label = barLabelHtml(b);
  showSheet(`
    <div class="sheet-header"><span>Bar rhythm${label?' · '+label:''}</span><button onclick="closeRhythmSheet()">✕</button></div>
    <div class="seq-box" style="grid-template-columns:repeat(${units},1fr);">${rhythmSeqBoxHtml(units)}</div>
    <div class="seq-caption">${remainingLabel(units-used)}</div>
    <div class="palette-table">${rhythmPaletteHtml(units)}</div>
    <div class="sheet-actions">
      <button class="neutral" ${rhythmBuilding.seq.length===0?'disabled':''} onclick="rhythmUndo()">Undo</button>
      <button class="neutral" ${rhythmBuilding.seq.length===0?'disabled':''} onclick="rhythmClear()">Clear</button>
    </div>
    <div class="sheet-actions">
      <button class="neutral" onclick="closeRhythmSheet()">Cancel</button>
      ${b.rhythm ? '<button class="danger" onclick="rhythmRemove()">Remove</button>' : ''}
      <button class="primary" ${used!==units?'disabled':''} onclick="rhythmSave()">Done</button>
    </div>
  `);
  render();
}
```

with:

```js
function renderRhythmSheet(){
  const b = findBarById(rhythmBuilding.barId);
  if(!b){ closeRhythmSheet(); return; }
  const units = barUnitsFor(song.timeSig);
  const used = rhythmUnitsUsed();
  const label = barLabelHtml(b);
  const tieAvailable = rhythmTieAvailable();
  showSheet(`
    <div class="sheet-header"><span>Bar rhythm${label?' · '+label:''}</span><button onclick="closeRhythmSheet()">✕</button></div>
    <div class="seq-box" style="grid-template-columns:repeat(${units},1fr);">${rhythmSeqBoxHtml(units)}</div>
    <div class="seq-caption">${remainingLabel(units-used)}</div>
    <div class="palette-table">${rhythmPaletteHtml(units)}</div>
    <div class="sheet-actions">
      <button class="neutral${rhythmBuilding.tieArmed?' tie-armed':''}" ${tieAvailable?'':'disabled'} onclick="rhythmToggleTie()">Tie${rhythmBuilding.tieArmed?' ●':''}</button>
      <button class="neutral" ${rhythmBuilding.seq.length===0?'disabled':''} onclick="rhythmUndo()">Undo</button>
      <button class="neutral" ${rhythmBuilding.seq.length===0?'disabled':''} onclick="rhythmClear()">Clear</button>
    </div>
    <div class="sheet-actions">
      <button class="neutral" onclick="closeRhythmSheet()">Cancel</button>
      ${b.rhythm ? '<button class="danger" onclick="rhythmRemove()">Remove</button>' : ''}
      <button class="primary" ${used!==units?'disabled':''} onclick="rhythmSave()">Done</button>
    </div>
  `);
  render();
}
```

- [ ] **Step 6: Thread tie state through pick/undo/clear/save/remove**

Replace app.js:667-672:

```js
function rhythmPick(key){
  const units = barUnitsFor(song.timeSig);
  if(rhythmUnitsUsed() + SYMS[key].units > units) return;
  rhythmBuilding.seq.push(key);
  renderRhythmSheet();
}
```

with:

```js
function rhythmPick(key){
  const units = barUnitsFor(song.timeSig);
  if(rhythmUnitsUsed() + SYMS[key].units > units) return;
  const armed = rhythmBuilding.tieArmed && !SYMS[key].rest;
  if(rhythmBuilding.seq.length===0){
    rhythmBuilding.tieFromPrevBar = armed;
  } else {
    rhythmBuilding.ties[rhythmBuilding.seq.length] = armed;
  }
  rhythmBuilding.seq.push(key);
  rhythmBuilding.tieArmed = false;
  renderRhythmSheet();
}
```

Replace app.js:673-674:

```js
function rhythmUndo(){ rhythmBuilding.seq.pop(); renderRhythmSheet(); }
function rhythmClear(){ rhythmBuilding.seq = []; renderRhythmSheet(); }
```

with:

```js
function rhythmUndo(){
  rhythmBuilding.seq.pop();
  rhythmBuilding.ties.length = rhythmBuilding.seq.length;
  if(rhythmBuilding.seq.length===0) rhythmBuilding.tieFromPrevBar = false;
  rhythmBuilding.tieArmed = false;
  renderRhythmSheet();
}
function rhythmClear(){
  rhythmBuilding.seq = [];
  rhythmBuilding.ties = [];
  rhythmBuilding.tieFromPrevBar = false;
  rhythmBuilding.tieArmed = false;
  renderRhythmSheet();
}
```

Replace app.js:675-686:

```js
function rhythmSave(){
  pushSongUndo();
  const b = findBarById(rhythmBuilding.barId);
  if(b) b.rhythm = rhythmBuilding.seq.slice();
  closeRhythmSheet();
}
function rhythmRemove(){
  pushSongUndo();
  const b = findBarById(rhythmBuilding.barId);
  if(b) b.rhythm = null;
  closeRhythmSheet();
}
```

with:

```js
function rhythmSave(){
  pushSongUndo();
  const b = findBarById(rhythmBuilding.barId);
  if(b){
    b.rhythm = rhythmBuilding.seq.slice();
    b.rhythmTies = rhythmBuilding.ties.slice();
    b.tiedFromPrevBar = rhythmBuilding.tieFromPrevBar;
  }
  closeRhythmSheet();
}
function rhythmRemove(){
  pushSongUndo();
  const b = findBarById(rhythmBuilding.barId);
  if(b){
    b.rhythm = null;
    b.rhythmTies = null;
    b.tiedFromPrevBar = false;
  }
  closeRhythmSheet();
}
```

- [ ] **Step 7: Style the armed toggle and the seq-box tie indicator**

In `style.css`, replace line 663:

```css
.sheet-actions button:disabled{ opacity:.35; cursor:not-allowed; }
```

with:

```css
.sheet-actions button:disabled{ opacity:.35; cursor:not-allowed; }
.sheet-actions button.neutral.tie-armed{ background:var(--ink); color:var(--paper); }
```

Replace style.css:684-689:

```css
.seq-cell.empty::after{
  content:'';
  width:3px; height:3px;
  border-radius:50%;
  background:#c7c7c7;
}
```

with:

```css
.seq-cell.empty::after{
  content:'';
  width:3px; height:3px;
  border-radius:50%;
  background:#c7c7c7;
}
.seq-cell.tied-in{ position:relative; }
.seq-cell.tied-in::before{
  content:'';
  position:absolute;
  left:-7px; bottom:8px;
  width:14px; height:7px;
  border-bottom:2px solid var(--ink);
  border-radius:0 0 50% 50%;
  pointer-events:none;
}
```

- [ ] **Step 8: Verify end-to-end in the browser**

Open `index.html`. Switch to Rhythm mode and tap a bar. Tap a quarter rest, then tap an eighth note. Tap the "Tie" button (confirm it's enabled and shows a pressed/filled state). Tap a quarter note — confirm the sequence preview shows a small curved mark between the eighth and the quarter note you just placed, and that the Rest column in the palette went disabled while Tie was armed then re-enabled after placing the note. Tap Done. Confirm the bar in the actual chart shows a real tapered tie curve between those two notes, matching the style approved in the design mockup.

Also verify Undo/Clear interaction: reopen the same bar, tap Undo once — confirm the tie indicator on the remaining note disappears if you undo past it. Tap Clear — confirm the sequence and any tie state resets fully.

- [ ] **Step 9: Commit**

```bash
git add app.js style.css
git commit -m "Add a Tie toggle to the rhythm builder for within-bar ties"
```

---

### Task 5: Extend the Tie toggle to cross-barline ties

**Files:**
- Modify: `app.js:616-618` region (add `canTieFromPrevBar`, extend `rhythmTieAvailable`)

**Interfaces:**
- Consumes: `song.items`, `SYMS`, `rhythmBuilding` (all existing/from Task 4).
- Produces: `canTieFromPrevBar(barId)` → boolean.

Rendering for this case was already built in Task 3 (`drawAllTies`'s cross-barline loop), and `rhythmPick` already sets `rhythmBuilding.tieFromPrevBar` correctly when armed with an empty sequence (Task 4, Step 6) — this task only needs to unlock the toggle at the right moment.

- [ ] **Step 1: Add `canTieFromPrevBar` and use it in `rhythmTieAvailable`**

Replace the `rhythmTieAvailable`/`rhythmToggleTie` block added in Task 4 Step 2:

```js
// Task 5 extends this to also allow arming when seq is empty but the
// previous bar ends on a note (tying across the barline).
function rhythmTieAvailable(){
  if(rhythmBuilding.seq.length===0) return false;
  const lastKey = rhythmBuilding.seq[rhythmBuilding.seq.length-1];
  return !SYMS[lastKey].rest;
}
function rhythmToggleTie(){
  if(!rhythmBuilding.tieArmed && !rhythmTieAvailable()) return;
  rhythmBuilding.tieArmed = !rhythmBuilding.tieArmed;
  renderRhythmSheet();
}
```

with:

```js
function canTieFromPrevBar(barId){
  const idx = song.items.findIndex(it=>it.id===barId);
  if(idx<=0) return false;
  const prev = song.items[idx-1];
  if(prev.kind!=='chords') return false;
  const prevRh = prev.rhythm;
  if(!prevRh || !prevRh.length) return false;
  return !SYMS[prevRh[prevRh.length-1]].rest;
}
function rhythmTieAvailable(){
  if(rhythmBuilding.seq.length===0) return canTieFromPrevBar(rhythmBuilding.barId);
  const lastKey = rhythmBuilding.seq[rhythmBuilding.seq.length-1];
  return !SYMS[lastKey].rest;
}
function rhythmToggleTie(){
  if(!rhythmBuilding.tieArmed && !rhythmTieAvailable()) return;
  rhythmBuilding.tieArmed = !rhythmBuilding.tieArmed;
  renderRhythmSheet();
}
```

- [ ] **Step 2: Verify end-to-end in the browser, including a line break**

Open `index.html`. Build a rhythm on bar 1 that ends on a note (e.g. four quarter notes) and tap Done. Open bar 2's rhythm builder — confirm the "Tie" button is now enabled immediately, before you've placed anything. Tap Tie, then tap a quarter note, then Done. Confirm the chart shows a tie curve spanning the gap between bar 1 and bar 2.

Now force a line break so the two tied bars land on different rows: add bars (using the on-page `+` button) until bar 1 and bar 2 no longer share a row, or temporarily narrow the browser window until the row wraps between them. Confirm the tie now renders as two short stubs — one trailing off the end of bar 1's row, one arriving at the start of bar 2's row — rather than one continuous curve, matching the design mockup.

Finally, confirm the guard rails: open bar 1's builder, tap Clear, tap Done (bar 1 now has no rhythm) — confirm the tie into bar 2 disappears from the chart without any error in the console, and that reopening bar 2's builder now shows the Tie button disabled again (bar 1 no longer ends on a note).

- [ ] **Step 3: Commit**

```bash
git add app.js
git commit -m "Allow tying a bar's first note back to the previous bar (cross-barline ties)"
```

---

### Task 6: Bump the service worker cache version

**Files:**
- Modify: `sw.js:1`

**Interfaces:** None — this is a standalone housekeeping change required whenever `APP_SHELL` files change (`chart.js`, `app.js`, `style.css` were all modified by Tasks 1-5, and all three are already listed in `APP_SHELL`).

- [ ] **Step 1: Bump `CACHE_NAME`**

Replace sw.js:1:

```js
const CACHE_NAME = 'leadsheet-v15';
```

with:

```js
const CACHE_NAME = 'leadsheet-v16';
```

- [ ] **Step 2: Verify**

Open `index.html` in a browser with devtools open to the Application/Storage panel. Confirm a cache named `leadsheet-v16` gets created and the old `leadsheet-v15` cache is removed (the existing service worker activation logic already deletes any cache whose name isn't the current `CACHE_NAME` — see sw.js's `activate` handler).

- [ ] **Step 3: Commit**

```bash
git add sw.js
git commit -m "Bump service worker cache version for tie notation changes"
```

---

## Self-Review

**Spec coverage:** Within-bar ties → Task 3 (render) + Task 4 (build). Cross-barline ties, same row → Task 3 + Task 5. Cross-barline ties, line break → Task 3 Step 6 + Task 5 Step 2. Tapered filled shape, anchored to measured notehead bottom-center → Task 1. Tie toggle UX (one-shot, disabled when unavailable, rest buttons blocked while armed) → Task 4. Backward compatibility with old JSON (no `rhythmTies`/`tiedFromPrevBar`) → every reader (`rhythmTiesForBar`, `tiedFromPrevBarFor`, `canTieFromPrevBar`) defaults falsy/empty when the fields are absent, no migration step needed. Dangling-tie robustness (clearing a bar that something ties from) → Task 3's `drawAllTies` re-validates both sides every render and Task 5 Step 2 explicitly verifies this. Service worker cache bump → Task 6.

**Placeholder scan:** No TODOs/TBDs. All code blocks are complete and were derived either from the actual current file contents (read directly from the repo) or from constants worked out and cross-checked during design (notehead anchor fractions, tie depth/thickness).

**Type/name consistency:** `rhythmTies`/`tiedFromPrevBar` (bar fields) ↔ `rhythmTiesForBar`/`tiedFromPrevBarFor` (chart.js readers) ↔ `rhythmBuilding.ties`/`rhythmBuilding.tieFromPrevBar` (app.js builder state) ↔ `rhythmSave`/`rhythmRemove` (writers) all line up. `groupForBeaming`'s new `seqStart` field is used consistently by `sequenceHtml`'s `data-seq-idx` tag, `tieAnchorForIndex`'s lookup, and `rhythmSeqBoxHtml`'s tie-indicator check. `beamNoteOffsets` is defined once (Task 2) and consumed by both `beamGroupSvg` (Task 2) and `tieAnchorForIndex` (Task 3).
