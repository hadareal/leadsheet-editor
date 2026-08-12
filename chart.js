/* ============ Data ============ */
const ROOT_LETTERS = ['C','D','E','F','G','A','B'];
// Chord keyboard palette: row 2 (quality symbols) and row 3 (extension
// numbers). `sup:false` on the minor sign matches how this app has always
// rendered a minor chord — every other quality mark is superscript, only
// the plain minor dash sits full-size next to the root (see chordInnerHtml).
const CHORD_KB_SYMBOLS = [
  {ch:'−',   sup:false, label:'min'},
  {ch:'△',   sup:true,  label:'maj'},
  {ch:'°',   sup:true,  label:'dim'},
  {ch:'ø',   sup:true,  label:'m7♭5'},
  {ch:'sus', sup:true,  label:'sus'},
  {ch:'alt', sup:true,  label:'alt'},
  {ch:'add', sup:true,  label:'add'},
  {ch:'no',  sup:true,  label:'omit'},
];
const CHORD_KB_NUMBERS = ['2','3','4','5','6','7','9','11','13'];
const TIME_SIGS = [[4,4],[3,4],[2,4],[6,8],[9,8],[12,8],[5,4],[7,8]];
const SECTION_LETTERS = ['A','B','C'];
const NAMED_SECTIONS = ['Intro','Verse','Pre-Chorus','Chorus','Bridge','Interlude','Solo'];
// Bar line stroke picker sheet grid — independent of border.mark (below),
// so a stroke change never touches whatever navigation mark is set.
const BARLINE_TYPES = [
  {type:'normal',      label:'Clear'},
  {type:'double',      label:'Double bar line'},
  {type:'repeatStart', label:'Repeat start'},
  {type:'repeatEnd',   label:'Repeat end'},
  {type:'repeatBoth',  label:'Repeat end + start'},
  {type:'end',         label:'End'},
];
// Segno/Coda bookmarks and D.C./D.S./Fine/To Coda text directions all set
// border.mark — one shared field, so a bar line carries at most one of these
// ten navigation marks at a time (never e.g. an unrelated Coda icon *and*
// "D.S." on the same line — a single spot in a chart means one thing).
// Segno/Coda render as an icon reading forward into the bar that follows;
// the rest render as italic text reading backward, flush at this exact bar
// line, marking where a phrase ends (see renderLabelSlot).
const NAV_MARK_TYPES = [
  {type:'segno',     label:'Segno'},
  {type:'coda',      label:'Coda'},
  {type:'DC',        label:'D.C.'},
  {type:'DS',        label:'D.S.'},
  {type:'DCalFine',  label:'D.C. al Fine'},
  {type:'DSalFine',  label:'D.S. al Fine'},
  {type:'DCalCoda',  label:'D.C. al Coda'},
  {type:'DSalCoda',  label:'D.S. al Coda'},
  {type:'Fine',      label:'Fine'},
  {type:'ToCoda',    label:'To Coda'},
];
const NAV_MARK_LABEL_BY_TYPE = Object.fromEntries(NAV_MARK_TYPES.map(d=>[d.type, d.label]));
const MAX_CHORDS_PER_BAR = 4;
const FONT_OPTIONS = [
  {id:'simple', label:'Simple', sample:'Db7', family:"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"},
  {id:'garamond', label:'Classic', sample:'Db7', family:"'EB Garamond', 'Lora', Georgia, serif"},
  {id:'petaluma', label:'Copyist', sample:'Db7', family:"'Petaluma Script', 'EB Garamond', cursive"},
  {id:'kalam', label:'Marker', sample:'Db7', family:"'Kalam', cursive"},
  {id:'caveat', label:'Handwritten', sample:'Db7', family:"'Caveat', cursive"},
];
let BARS_PER_ROW = 4;

let idCounter = 1;
const genId = () => 'id' + (idCounter++);

function bar(chords){ return {type:'bar', id:genId(), kind:'chords', chords: chords||[], rhythm:null, volta:null}; }

// Appends a new empty chords bar to the end of the song, correctly handling
// the trailing "end" border and inheriting an unresolved tie from the
// previous bar. Caller is responsible for pushSongUndo() and render().
function appendNewBar(){
  const lastIdx = song.items.length;
  const wasEnd = song.borders[lastIdx].type === 'end';
  if(wasEnd) song.borders[lastIdx].type = 'normal';
  const prevLast = song.items[song.items.length-1];
  const newBar = bar([]);
  if(prevLast && prevLast.kind==='chords' && prevLast.tiedToNextBar) newBar.tiedFromPrevBar = true;
  song.items.push(newBar);
  song.borders.push({type: wasEnd ? 'end' : 'normal', label:null});
  return newBar;
}

// Sixteenth-note units per bar for a given time signature, or null if
// that meter isn't supported by the rhythm feature yet (compound/odd
// meters beam in groups of 3, not 2, so they need their own logic later).
function barUnitsFor(timeSig){
  if(timeSig && timeSig.den===4 && [2,3,4].includes(timeSig.num)) return timeSig.num*4;
  return null;
}

// Default beat layout (0-indexed, 4 beats per bar) for a given chord count.
// 1 chord: |X   |   2 chords: |X X |   3 chords: |XXX |   4 chords: |XXXX|
function defaultBeats(n){
  if(n<=0) return [];
  if(n===1) return [0];
  if(n===2) return [0,2];
  if(n===3) return [0,1,2];
  return [0,1,2,3];
}
function reflowBeats(b){
  const positions = defaultBeats(b.chords.length);
  const sorted = b.chords.slice().sort((x,y)=>x.beat-y.beat);
  sorted.forEach((c,i)=>{ c.beat = positions[i]; });
}
function addChordWithReflow(b, newChordPartial){
  const positions = defaultBeats(b.chords.length + 1);
  const sorted = b.chords.slice().sort((x,y)=>x.beat-y.beat);
  sorted.forEach((c,i)=>{ c.beat = positions[i]; });
  newChordPartial.beat = positions[positions.length-1];
  b.chords.push(newChordPartial);
}

function blankSong(){
  return {
    title:'My Song',
    composer:'',
    key:'',
    feel:'',
    timeSig:{num:4, den:4},
    items:[ bar([]) ],
    borders:[ {type:'normal', label:null}, {type:'end', label:null} ]
  };
}

function defaultDemoSong(){
  // The demo song only ever uses dominant 7, minor 7, and diminished triads —
  // this tiny lookup builds their token form instead of hand-writing the
  // same {ch,sup} pairs at every call site below.
  const DEMO_QUALITY_TOKENS = {
    '7':   [{ch:'7',  sup:true}],
    'm7':  [{ch:'−7', sup:true}],
    'dim': [{ch:'°',  sup:true}],
  };
  const c1 = (r,q)=>({root:r, tokens:DEMO_QUALITY_TOKENS[q], bass:null});
  const c2 = (r1,q1,r2,q2)=>([
    {root:r1, tokens:DEMO_QUALITY_TOKENS[q1], bass:null, beat:0},
    {root:r2, tokens:DEMO_QUALITY_TOKENS[q2], bass:null, beat:2},
  ]);
  // A classic 12-bar blues, played twice: the first chorus plain (wrapped
  // in a repeat), the second a "shout chorus" with rhythm hits on the
  // first three bars and again before the turnaround.
  const HIT = ['n_quarter','r_quarter','r_half']; // hit on beat 1, then rest through the bar
  const items = [
    bar([c1('F','7')]),                 // 1
    bar([c1('Bb','7')]),                // 2
    bar([c1('F','7')]),                 // 3
    bar(c2('C','m7','F','7')),          // 4
    bar([c1('Bb','7')]),                // 5
    bar([c1('B','dim')]),               // 6
    bar(c2('F','7','D','7')),           // 7
    bar(c2('A','m7','D','7')),          // 8
    bar([c1('G','m7')]),                // 9
    bar([c1('C','7')]),                 // 10
    bar(c2('F','7','D','7')),           // 11
    bar(c2('G','m7','C','7')),          // 12 — repeat back to bar 1 ends here
    bar([c1('F','7')]),                 // 13 — shout chorus starts (BREAKS)
    bar([c1('Bb','7')]),                // 14
    bar([c1('F','7')]),                 // 15
    bar(c2('C','m7','F','7')),          // 16
    bar([c1('Bb','7')]),                // 17
    bar([c1('B','dim')]),               // 18
    bar(c2('F','7','E','7')),           // 19
    bar(c2('Eb','7','D','7')),          // 20
    bar([c1('G','m7')]),                // 21
    bar([c1('C','7')]),                 // 22 — one more break before the turnaround
    bar(c2('F','7','D','7')),           // 23
    bar(c2('G','m7','C','7')),          // 24
  ];
  items[12].rhythm = HIT.slice();
  items[13].rhythm = HIT.slice();
  items[14].rhythm = HIT.slice();
  items[21].rhythm = HIT.slice();
  // give single-chord bars an explicit beat 0 (addChordWithReflow isn't used here; set directly)
  items.forEach(it=>{
    if(it.kind==='chords' && it.chords.length===1 && it.chords[0].beat===undefined){
      it.chords[0].beat = 0;
    }
  });
  const borders = items.map(()=>({type:'normal', label:null}));
  borders.push({type:'normal', label:null}); // trailing, will be set to 'end' below
  borders[0].type = 'repeatStart';
  borders[0].label = 'A';
  borders[12].type = 'repeatEnd';
  borders[12].label = 'B';
  borders[borders.length-1].type = 'end';
  return {
    title:'Tutorial Blues',
    composer:'',
    key:'F',
    feel:'Medium Swing, ♩ = 130',
    timeSig:{num:4, den:4},
    items,
    borders,
    textBoxes:[]
  };
}

// song.items is a flat list of bars.
// song.borders[i] = {type, label, mark} is the border BEFORE items[i];
// song.borders[items.length] is the trailing (final) border. `type` is the
// barline stroke (normal/double/repeatStart/repeatEnd/end), independent of
// `mark` since a stroke change should never affect a navigation mark. `mark`
// is one of NAV_MARK_TYPES (Segno, Coda, D.C., D.S., ...) or null — a single
// field because a bar line carries at most one of these at a time.
let song = defaultDemoSong();

/* ============ Helpers ============ */
// Song data can come from an imported .json file (chart-sharing feature), so
// any of it that gets written into innerHTML needs escaping first — otherwise
// a crafted import could run script instead of just displaying as text.
const HTML_ESCAPES = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, ch=>HTML_ESCAPES[ch]);
}
function rootHtml(r){
  if(r.length===2 && r[1]==='b') return escapeHtml(r[0])+'<span class="acc">♭</span>';
  if(r.length===2 && r[1]==='#') return escapeHtml(r[0])+'<span class="acc">♯</span>';
  if(r.length===2 && r[1]==='n') return escapeHtml(r[0])+'<span class="acc">♮</span>';
  return escapeHtml(r);
}
// The "simile" mark: real notation for "repeat the previous bar" — a
// diagonal slash with a dot above-left and a dot below-right. Hand-drawn
// with plain SVG primitives (not lifted from Bravura, unlike the note
// glyphs below) since it's simple enough to get right without the font.
function repeatBarSvg(w){
  w = w||22;
  const h = w*16/22;
  return `<svg width="${w}" height="${h}" viewBox="0 0 22 16" style="display:block;"><circle cx="6" cy="4.5" r="2" fill="#000000"/><line x1="18" y1="0" x2="4" y2="16" stroke="#000000" stroke-width="1.8"/><circle cx="16" cy="11.5" r="2" fill="#000000"/></svg>`;
}
// Small UI icons for the chord keyboard's action buttons (Clear/Duplicate) —
// same hand-drawn-with-primitives approach as repeatBarSvg above.
function duplicateIconSvg(w){
  w = w||16;
  return `<svg width="${w}" height="${w}" viewBox="0 0 20 20" style="display:block;"><rect x="6" y="2" width="12" height="12" rx="2" fill="none" stroke="#000000" stroke-width="1.5"/><rect x="2" y="6" width="12" height="12" rx="2" fill="#eeeeee" stroke="#000000" stroke-width="1.5"/></svg>`;
}
function arrowRightSvg(w){
  w = w||16;
  return `<svg width="${w}" height="${w}" viewBox="0 0 20 20" style="display:block;"><line x1="2" y1="10" x2="15" y2="10" stroke="#000000" stroke-width="1.8" stroke-linecap="round"/><polyline points="10,4 17,10 10,16" fill="none" stroke="#000000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
// Rhythm keyboard action-row icons — use currentColor (not a hardcoded
// fill) so the armed/active background swap (.tie-armed) also flips the
// icon to the paper color, matching how text buttons invert.
function tieIconSvg(w){
  w = w||20;
  const h = Math.round(w*10/22);
  return `<svg width="${w}" height="${h}" viewBox="0 0 22 10" style="display:block;"><path d="M2 2 Q11 9 20 2 Q11 7 2 2 Z" fill="currentColor"/></svg>`;
}
function dotIconSvg(w){
  w = w||14;
  return `<svg width="${w}" height="${w}" viewBox="0 0 20 20" style="display:block;"><circle cx="10" cy="10" r="3" fill="currentColor"/></svg>`;
}
/* ============ Rhythm: note/rest symbols ============
   Flag and rest outlines are lifted from Bravura (SIL Open Font License,
   steinbergmedia/bravura). Coordinates are the font's own design units
   (1000/em); glyphSvg()/rectSvg() place them by flipping font Y-up into
   SVG Y-down. Fills are hardcoded #000000 (not var(--ink)), which prints
   more reliably than CSS-driven color on some PDF/print engines.
   This is rhythm/"kick" notation, the jazz/big-band convention for marking
   rhythmic hits: duration reads from the stem/flag/beam, not the head
   shape. noteheadSlashFilled (a diagonal slash, custom-drawn — Bravura has
   no vertical-slash notehead in the subset available to us) is used for
   quarter notes and shorter. noteheadDiamondHollow and noteheadDiamondWhole
   ARE genuine Bravura outlines (extracted from the same font's actual
   noteheadDiamondHalf/noteheadDiamondWhole glyphs, not hand-approximated),
   used for half and whole notes respectively. */
const GLYPHS = {
  noteheadSlashFilled: { d:"M-70 -202L84 43L84 188L-70 -57Z" },
  noteheadDiamondHollow: { d:"M359 53C360 54 361 57 361 60C361 63 360 64 359 67L189 237C186 239 183 240 180 240C179 240 176 239 174 237L4 67C1 64 0 63 0 60C0 57 1 54 4 53L174 -117C176 -120 179 -120 180 -120C183 -120 186 -120 189 -117ZM266 86C266 48 176 -11 138 -11C121 -11 108 -3 96 10C89 17 88 28 88 36C88 73 177 133 215 133C238 133 266 110 266 86Z" },
  noteheadDiamondWhole: { d:"M386 37C387 40 389 41 389 44C389 47 386 51 383 53L130 239C128 240 125 240 122 240C120 240 117 240 115 237L3 83C1 80 0 79 0 77C0 76 3 70 4 67L258 -119C261 -119 262 -120 264 -120C268 -120 271 -119 272 -116ZM66 100C65 102 62 105 62 108L109 171C109 172 111 172 112 172C115 172 117 171 118 171L320 23C323 21 324 18 324 14C278 -51 276 -51 275 -51C272 -51 271 -49 268 -48Z" },
  flag8thUp: { d:"M238 -790c-5 -17 -22 -23 -28 -19s-16 13 -16 29c0 4 1 9 3 15c17 45 24 92 24 137c0 59 -9 116 -24 150c-36 85 -131 221 -197 233v239c0 12 8 15 19 15c10 0 18 -6 21 -22c16 -96 58 -182 109 -261c63 -100 115 -218 115 -343c0 -78 -26 -173 -26 -173z" },
  flag16thUp: { d:"M272 -796c-6 -13 -13 -17 -20 -17c-14 0 -22 13 -22 26c0 3 0 5 1 9c5 30 8 60 8 89c0 52 -9 101 -32 149c-69 140 -140 142 -202 144h-5v388c0 7 11 10 17 10s18 -2 20 -13c17 -106 73 -122 127 -180c72 -78 98 -106 108 -174c2 -12 3 -23 3 -36 c0 -61 -22 -121 -25 -127c-1 -3 -1 -5 -1 -7c0 -4 1 -6 1 -9c18 -37 29 -78 29 -120v-22c0 -48 -3 -105 -7 -110zM209 -459c2 -3 4 -4 7 -4c5 0 12 3 13 6c5 8 5 18 7 26c1 7 1 13 1 20c0 32 -9 63 -27 89c-33 49 -87 105 -148 105h-8c-8 0 -14 -6 -14 -10c0 -1 0 -2 1 -3 c21 -82 67 -106 114 -160c21 -24 38 -44 54 -69z" },
  augmentationDot: { d:"M100 0c0 -28 -22 -50 -50 -50s-50 22 -50 50s22 50 50 50s50 -22 50 -50z" },
  restWhole: { d:"M282 -109c0 -14 -12 -26 -26 -26h-230c-15 0 -26 12 -26 26v92c0 15 11 26 26 26h230c14 0 26 -11 26 -26v-92z" },
  restHalf: { d:"M282 24c0 -14 -12 -26 -26 -26h-230c-15 0 -26 12 -26 26v92c0 15 11 26 26 26h230c14 0 26 -11 26 -26v-92z" },
  restQuarter: { d:"M78 -38l-49 60s-10 10 -10 24c0 8 4 19 14 29c45 47 60 90 60 127c0 72 -57 123 -61 134c-3 6 -4 11 -4 16c0 14 10 21 20 21c6 0 13 -3 18 -8c17 -17 165 -193 165 -193s4 -9 4 -19c0 -5 -1 -10 -4 -15c-26 -41 -62 -89 -66 -147v-3l-1 -7v-3c0 -56 31 -93 69 -139 c11 -12 37 -45 37 -57c0 -3 -2 -4 -5 -4c-2 0 -4 0 -8 1l-1 1c-17 6 -50 17 -79 17c-42 0 -63 -32 -63 -73c0 -9 1 -18 4 -26c2 -9 13 -36 26 -36c8 -7 16 -15 16 -24c0 -2 -1 -4 -2 -7c-1 -4 -8 -6 -15 -6c-8 0 -18 3 -26 9c-73 56 -116 105 -116 155c0 49 34 96 86 96 l8 -3h4c4 -1 12 -3 16 -3c5 0 9 1 11 5c1 1 1 3 1 4c0 2 -4 10 -6 14c-13 21 -27 40 -43 60z" },
  rest8th: { d:"M134 107v-10c33 0 83 60 90 66c6 4 9 4 11 4c2 -1 12 -6 12 -16c-1 -5 -6 -21 -10 -39c0 0 -98 -351 -101 -353c-10 -8 -24 -10 -35 -10c-6 0 -29 1 -29 13c18 66 90 265 93 280c1 4 1 8 1 11c0 5 -1 9 -5 9c-1 0 -3 0 -5 -1c-13 -7 -22 -11 -36 -15 c-11 -4 -25 -7 -39 -7c-19 0 -38 6 -54 17c-15 12 -27 30 -27 51c0 37 30 67 67 67s67 -30 67 -67z" },
  rest16th: { d:"M208 111v-10c34 1 84 61 91 67c3 2 6 4 11 4c2 -1 10 -5 10 -11c0 -1 -1 -2 -1 -4c-2 -13 -27 -101 -27 -101s-19 -67 -45 -152l-116 -381c-4 -11 -9 -23 -38 -23c-22 0 -31 10 -31 19l1 1v1l95 283v1l1 1c0 4 -2 6 -4 6c-23 -12 -49 -21 -75 -21c-38 0 -80 27 -80 68 c0 38 30 68 68 68c37 0 68 -30 68 -68c0 -3 0 -6 -1 -10c14 0 41 12 49 31c7 15 58 164 58 180c0 5 -2 7 -5 7c-2 0 -4 -1 -7 -2c-23 -13 -51 -22 -78 -22c-38 0 -80 27 -80 68c0 38 31 68 68 68c38 0 68 -30 68 -68z" },
  // Segno (uniE047) and Coda (uniE048), genuine Bravura outlines extracted
  // from the font itself (opentype.js), not hand-approximated.
  segno: { d:"M135 665C141 665 148 663 151 652L153 645C160 618 175 559 226 559C235 559 244 560 255 564C284 574 295 598 295 626C295 641 292 657 287 673C271 719 204 736 153 736C83 736 4 650 4 551C4 527 9 502 20 477C52 404 197 315 205 312C209 310 211 308 211 304C211 300 209 295 205 288C198 274 54 15 54 15C52 11 51 6 51 2C51 -8 56 -18 65 -23C70 -26 74 -27 79 -27C89 -27 99 -21 104 -12C104 -12 259 268 262 274C262 273 270 279 274 279C289 276 489 217 489 122C489 83 465 57 433 52C431 52 428 51 426 51C407 51 390 65 390 96L390 107C390 145 365 173 337 173C333 173 329 172 325 171C288 162 254 146 254 106C254 102 254 98 255 93C262 50 307 -8 375 -8C388 -8 402 -6 417 -1C497 26 550 91 550 174C550 183 549 193 548 203C533 313 375 402 363 408C351 415 346 419 346 424C346 426 347 428 348 430C353 438 508 717 508 717C511 722 512 726 512 731C512 741 506 751 497 756C493 758 488 759 484 759C474 759 464 754 459 745C459 745 300 458 294 449C291 444 289 441 285 441C282 441 279 442 275 444C266 447 115 505 89 550C83 561 75 582 75 603C75 630 87 658 129 665ZM415 466C415 435 441 409 472 409C504 409 529 435 529 466C529 498 504 523 472 523C441 523 415 498 415 466ZM140 264C140 295 115 321 83 321C52 321 26 295 26 264C26 232 52 207 83 207C115 207 140 232 140 264Z" },
  coda: { d:"M937 400L818 400C808 588 668 739 506 752L506 881C506 894 495 898 482 898C469 898 458 894 458 881L458 752C296 739 157 589 146 400L14 400C0 400 -4 389 -4 376C-4 363 0 352 14 352L146 352C157 165 296 13 458 0L458 -140C458 -154 469 -158 482 -158C495 -158 506 -154 506 -140L506 0C668 13 808 165 818 352L937 352C951 352 955 363 955 376C955 389 951 400 937 400ZM653 400L506 400L506 696C646 684 653 562 653 400ZM458 696L458 400L316 400C316 562 316 684 458 696ZM316 352L458 352L458 48C329 63 317 198 316 352ZM506 48L506 352L653 352C650 199 631 63 506 48Z" },
};

const STEM_UP     = { x:84, y:94 }; // where the stem meets noteheadSlashFilled's upper end, font units
const DIAMOND_STEM = { x:361, y:60 }; // where the stem meets noteheadDiamondHollow's right vertex
const STEM_THICK = 30;
const STEM_LEN   = 550;
const BEAM_THICK = 125;
const BEAM_GAP   = 187.5; // beam-center to beam-center spacing

const VB_W = 640, VB_H = 1140, BASE_X = 200, BASE_Y = 614;

// Each rhythm symbol: units out of 16 (one bar of 4/4), whether it's a
// rest, its note-value family, and whether it's dotted.
const SYMS = {
  n_whole:    { units:16, rest:false, base:'whole',    dotted:false, name:'Semibreve',       value:'4 beats'  },
  n_dhalf:    { units:12, rest:false, base:'half',     dotted:true,  name:'Dotted minim',     value:'3 beats'  },
  n_half:     { units:8,  rest:false, base:'half',     dotted:false, name:'Minim',            value:'2 beats'  },
  n_dquarter: { units:6,  rest:false, base:'quarter',  dotted:true,  name:'Dotted crotchet',  value:'1½ beats' },
  n_quarter:  { units:4,  rest:false, base:'quarter',  dotted:false, name:'Crotchet',         value:'1 beat'   },
  n_dquaver:  { units:3,  rest:false, base:'eighth',   dotted:true,  name:'Dotted quaver',    value:'¾ beat'   },
  n_quaver:   { units:2,  rest:false, base:'eighth',   dotted:false, name:'Quaver',           value:'½ beat'   },
  n_semi:     { units:1,  rest:false, base:'sixteenth',dotted:false, name:'Semiquaver',       value:'¼ beat'   },

  r_whole:    { units:16, rest:true,  base:'whole',    dotted:false, name:'Semibreve rest',       value:'4 beats'  },
  r_dhalf:    { units:12, rest:true,  base:'half',     dotted:true,  name:'Dotted minim rest',    value:'3 beats'  },
  r_half:     { units:8,  rest:true,  base:'half',     dotted:false, name:'Minim rest',           value:'2 beats'  },
  r_dquarter: { units:6,  rest:true,  base:'quarter',  dotted:true,  name:'Dotted crotchet rest', value:'1½ beats' },
  r_quarter:  { units:4,  rest:true,  base:'quarter',  dotted:false, name:'Crotchet rest',        value:'1 beat'   },
  r_dquaver:  { units:3,  rest:true,  base:'eighth',   dotted:true,  name:'Dotted quaver rest',   value:'¾ beat'   },
  r_quaver:   { units:2,  rest:true,  base:'eighth',   dotted:false, name:'Quaver rest',          value:'½ beat'   },
  r_semi:     { units:1,  rest:true,  base:'sixteenth',dotted:false, name:'Semiquaver rest',      value:'¼ beat'   },
};

// One row per duration, pairing the note with its rest — mirrors a
// standard rhythm-syllable reference chart: Name · Value · Note · Rest.
const RHYTHM_ROWS = [
  { note:'n_whole',    rest:'r_whole'    },
  { note:'n_dhalf',    rest:'r_dhalf'    },
  { note:'n_half',     rest:'r_half'     },
  { note:'n_dquarter', rest:'r_dquarter' },
  { note:'n_quarter',  rest:'r_quarter'  },
  { note:'n_dquaver',  rest:'r_dquaver'  },
  { note:'n_quaver',   rest:'r_quaver'   },
  { note:'n_semi',     rest:'r_semi'     },
];
// The rhythm keyboard's compact palette only picks the plain (undotted)
// duration — dotting happens afterward via the Dot toggle button.
const RHYTHM_NOTE_KEYS = RHYTHM_ROWS.map(r=>r.note).filter(k=>!SYMS[k].dotted);
const RHYTHM_REST_KEYS = RHYTHM_ROWS.map(r=>r.rest).filter(k=>!SYMS[k].dotted);
// The dotted<->undotted counterpart of a note/rest key (same base, same
// rest-ness, opposite dotted flag) — null if that duration has no dotted
// form in SYMS (whole and sixteenth families don't get one).
function dotToggleKey(key){
  const sym = SYMS[key];
  return Object.keys(SYMS).find(k => SYMS[k].base===sym.base && SYMS[k].rest===sym.rest && SYMS[k].dotted!==sym.dotted) || null;
}

const REST_GLYPH = { whole:'restWhole', half:'restHalf', quarter:'restQuarter', eighth:'rest8th', sixteenth:'rest16th' };
const REST_ADV   = { whole:283, half:283, quarter:270, eighth:250, sixteenth:320 };
const REST_DOT_Y = { whole:-63, half:70, quarter:0, eighth:-38, sixteenth:-160 };

// tx,ty are LOCAL font-design coordinates (Y-up); baseX/baseY place the
// glyph's own origin inside the final SVG (Y-down).
function glyphSvg(name, tx, ty, baseX, baseY){
  const g = GLYPHS[name];
  return '<g transform="translate('+(baseX+tx)+','+(baseY-ty)+') scale(1,-1)"><path d="'+g.d+'" fill="#000000" fill-rule="evenodd"/></g>';
}
function rectSvg(x0, y0, w, h, baseX, baseY){
  return '<rect x="'+(baseX+x0)+'" y="'+(baseY-y0-h)+'" width="'+w+'" height="'+h+'" fill="#000000"/>';
}

// Segno and Coda, standalone icons (not part of the rhythm-notation grid
// above) — a single Bravura glyph placed in its own tightly-cropped SVG.
// baseX/baseY are chosen so the glyph's own bounding box (measured via
// opentype.js against the actual font, not eyeballed) sits inset by
// `pad` units inside a viewBox of exactly (bbox size + 2*pad).
function singleGlyphSvg(name, bbox, pad, w){
  const vbW = (bbox.x2-bbox.x1) + pad*2, vbH = (bbox.y2-bbox.y1) + pad*2;
  const baseX = -bbox.x1 + pad, baseY = bbox.y2 + pad;
  w = w || 18;
  const h = w * vbH / vbW;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${vbW} ${vbH}" style="display:block;">${glyphSvg(name, 0, 0, baseX, baseY)}</svg>`;
}
const SEGNO_BBOX = {x1:4, y1:-27, x2:550, y2:759};
const CODA_BBOX = {x1:-4, y1:-158, x2:955, y2:898};
function segnoSvg(w){ return singleGlyphSvg('segno', SEGNO_BBOX, 40, w); }
function codaSvg(w){ return singleGlyphSvg('coda', CODA_BBOX, 40, w); }

function noteGlyph(sym){
  if(sym.rest){
    let out = '';
    // Whole/half rests are just a solid block that hangs below or sits
    // above a staff line — without a staff drawn, that block reads as a
    // floating rectangle with no way to tell which rest it is. A short
    // reference line under it restores that context.
    if(sym.base==='whole' || sym.base==='half'){
      const w = REST_ADV[sym.base];
      out += rectSvg(-60, -18, w+120, 36, BASE_X, BASE_Y);
    }
    out += glyphSvg(REST_GLYPH[sym.base], 0, 0, BASE_X, BASE_Y);
    if(sym.dotted) out += glyphSvg('augmentationDot', REST_ADV[sym.base]+40, REST_DOT_Y[sym.base], BASE_X, BASE_Y);
    return out;
  }
  if(sym.base==='whole'){
    let out = glyphSvg('noteheadDiamondWhole', 0, 0, BASE_X, BASE_Y);
    if(sym.dotted) out += glyphSvg('augmentationDot', 429, DIAMOND_STEM.y, BASE_X, BASE_Y);
    return out;
  }
  const isHalf = sym.base==='half';
  const headName = isHalf ? 'noteheadDiamondHollow' : 'noteheadSlashFilled';
  const stem = isHalf ? DIAMOND_STEM : STEM_UP;
  let out = glyphSvg(headName, 0, 0, BASE_X, BASE_Y);
  out += rectSvg(stem.x-STEM_THICK, stem.y, STEM_THICK, STEM_LEN, BASE_X, BASE_Y);
  if(sym.base==='eighth')    out += glyphSvg('flag8thUp',  stem.x, stem.y+STEM_LEN, BASE_X, BASE_Y);
  if(sym.base==='sixteenth') out += glyphSvg('flag16thUp', stem.x, stem.y+STEM_LEN, BASE_X, BASE_Y);
  if(sym.dotted) out += glyphSvg('augmentationDot', stem.x+40, isHalf ? stem.y : 0, BASE_X, BASE_Y);
  return out;
}

function iconSvg(key, size){
  size = size || 26;
  const sym = SYMS[key];
  const w = Math.round(size*VB_W/VB_H);
  return '<svg class="rsym" width="'+w+'" height="'+size+'" viewBox="0 0 '+VB_W+' '+VB_H+'">'+noteGlyph(sym)+'</svg>';
}

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
  // getBBox() on an element returns its bounds BEFORE that element's own
  // transform is applied — glyphSvg's <g> carries a translate/scale, so
  // measuring it directly would return raw, untranslated path coordinates
  // (confirmed the hard way: an earlier draft of this exact code, without
  // the wrapping <g> below, anchored ties ~46px too high in a live test).
  // Wrapping the output in a plain, untransformed <g> and measuring THAT
  // instead makes the transform apply as normal content, not as the
  // measured element's own transform.
  const probe = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  probe.setAttribute('width', '0');
  probe.setAttribute('height', '0');
  probe.style.position = 'absolute';
  probe.style.overflow = 'hidden';
  probe.innerHTML = '<g>' + glyphSvg(glyphName, 0, 0, BASE_X, BASE_Y) + '</g>';
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

// Consecutive quavers/semiquavers (plain or dotted) within the same beat
// are grouped so they render as one beamed figure instead of separately
// flagged notes — e.g. two quavers become a beamed pair, and a dotted
// quaver + semiquaver (as in "tim-ka") beam together too.
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

// Places each note/rest (or beam group) on a 16-column grid — one column
// per sixteenth-note unit — so it lands at its actual beat position instead
// of being packed left and centered. This is 4x finer than the bar's own
// 4-column chord grid (one column per beat), so beat k of the chords lines
// up exactly with rhythm columns 4k..4k+3, keeping the two rows in sync.
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

function remainingLabel(units){
  if(units<=0) return 'Bar complete';
  const whole = Math.floor(units/4);
  const frac = units%4;
  const fracStr = frac===1 ? '¼' : frac===2 ? '½' : frac===3 ? '¾' : '';
  let s = (whole>0 ? String(whole) : '') + fracStr;
  if(!s) s = '0';
  return s + (units===4 ? ' beat left' : ' beats left');
}

// Rhythm shown for a bar: the live in-progress sentence if it's the one
// currently open in the builder sheet (rhythmBuilding, defined in app.js),
// otherwise its saved rhythm.
function rhythmForBar(item){
  if(rhythmBuilding && rhythmBuilding.barId===item.id) return rhythmBuilding.seq;
  return item.rhythm || null;
}

function rhythmTiesForBar(item){
  if(rhythmBuilding && rhythmBuilding.barId===item.id) return rhythmBuilding.ties;
  return item.rhythmTies || [];
}
function tiedFromPrevBarFor(item){
  if(rhythmBuilding && rhythmBuilding.barId===item.id) return !!rhythmBuilding.tieFromPrevBar;
  return !!item.tiedFromPrevBar;
}
// Whether this bar's last note ties forward, authored from this bar's own
// side (as opposed to tiedFromPrevBarFor, authored from the receiving bar).
// Never read while this bar's own builder is open — the main chart doesn't
// re-render until the sheet closes — so no rhythmBuilding-aware branch here.
function tiedToNextBarFor(item){ return !!item.tiedToNextBar; }

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

// Remembers the slotMap from the last full render() so a bar-width-only
// change (see applyResponsiveLayout) can redraw ties without rebuilding the
// whole chart — the bars/notes already resize for free via CSS, only the
// tie curves' baked-in pixel coordinates go stale.
let _lastTieSlotMap = null;

// Draws every tie in the current song. `slotMap` maps bar id -> {slotEl,
// rowEl}, built by renderRhythmRowEl during this render() pass. Must run
// after the rhythm rows are attached to the document (needs real layout).
// Safe to call again on the same slotMap (e.g. from redrawTies()) — clears
// each row's previous tie overlay first instead of stacking a new one.
function drawAllTies(slotMap){
  _lastTieSlotMap = slotMap;
  const rowEls = new Set();
  slotMap.forEach(info=>rowEls.add(info.rowEl));
  rowEls.forEach(rowEl=>{
    const old = rowEl.querySelector('.tie-overlay');
    if(old) old.remove();
  });
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

  // Cross-barline ties (same row, a stub pair across a line break, or —
  // when prev wants to tie forward but there's no next note to connect to
  // yet, either because prev is the last bar or the next bar has no valid
  // first note — a single open-ended stub).
  for(let k=0; k<song.items.length; k++){
    const prev = song.items[k];
    if(prev.kind!=='chords') continue;
    const cur = song.items[k+1];
    const curIsChordBar = !!cur && cur.kind==='chords';
    const wantsFromReceiver = curIsChordBar && tiedFromPrevBarFor(cur);
    const wantsFromSender = tiedToNextBarFor(prev);
    if(!wantsFromReceiver && !wantsFromSender) continue;

    const prevRh = rhythmForBar(prev);
    if(!prevRh || !prevRh.length || SYMS[prevRh[prevRh.length-1]].rest) continue;
    const prevInfo = slotMap.get(prev.id);
    if(!prevInfo) continue;
    const aPrev = tieAnchorForIndex(groupForBeaming(prevRh), prevRh.length-1, prevInfo.slotEl, SIZE);
    if(!aPrev) continue;

    const curRh = curIsChordBar ? rhythmForBar(cur) : null;
    const curHasNote = curRh && curRh.length && !SYMS[curRh[0]].rest;
    const curInfo = curHasNote ? slotMap.get(cur.id) : null;
    const aCur = curInfo ? tieAnchorForIndex(groupForBeaming(curRh), 0, curInfo.slotEl, SIZE) : null;

    if(aCur){
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
    } else if(wantsFromSender){
      // Nothing to connect to yet (no next bar, or its first note isn't
      // struck) — a bare receiver-side flag with nothing there is just
      // inert, but the bar that explicitly asked to tie forward gets an
      // open-ended stub so the intent stays visible until something lands.
      const STUB = 20;
      addShape(prevInfo.rowEl, aPrev.x, aPrev.y, aPrev.x+STUB, aPrev.y, depth*0.8, thick*0.8);
    }
  }
}

// Re-measures and redraws tie curves in place, without rebuilding the
// chart's DOM. Used by applyResponsiveLayout when only --bar-w changed:
// the bar/note elements already reflow for free via CSS, so a full render()
// would just be re-creating DOM nodes that didn't need to change in order
// to re-run the one part (tie curves) that does.
function redrawTies(){
  if(_lastTieSlotMap) drawAllTies(_lastTieSlotMap);
}

function findBarById(id){ return song.items.find(it=>it.id===id) || null; }
function updateHeader(){
  const sub = song.key ? `${song.timeSig.num}/${song.timeSig.den} · ${song.key}` : `${song.timeSig.num}/${song.timeSig.den}`;
  document.getElementById('subText').textContent = sub;
}
function syncTitleDisplay(){
  document.getElementById('titleText').textContent = song.title;
  document.getElementById('sheetTitleText').textContent = song.title;
  const cEl = document.getElementById('sheetComposerText');
  if(song.composer){
    cEl.textContent = song.composer;
    cEl.style.display='block';
  } else {
    cEl.textContent='';
    cEl.style.display='none';
  }
}

/* ============ Responsive page & bar sizing ============ */
// Reads the actual page (.chart-card) width and picks how many bars fit per
// row (like text reflowing to the width of a page), then sizes the page
// itself like a sheet of A4 paper (fixed proportions, grows taller for long charts).
function applyResponsiveLayout(){
  const card = document.querySelector('.chart-card');
  if(!card) return;
  const cs = getComputedStyle(card);
  const contentW = card.clientWidth - parseFloat(cs.paddingLeft||0) - parseFloat(cs.paddingRight||0);
  if(contentW <= 0) return;

  card.style.minHeight = Math.round(card.clientWidth * Math.SQRT2) + 'px'; // A4 proportions (border-box)

  const TS_W = 11.5, BORDER_W = 13, MIN_BAR = 72, MAX_BAR = 170, MIN_N = 2, MAX_N = 8;
  const barWidthFor = n => (contentW - TS_W - (n+1)*BORDER_W) / n;
  let n = 4;
  if(barWidthFor(n) < MIN_BAR){
    while(n > MIN_N && barWidthFor(n) < MIN_BAR) n--;
  } else if(barWidthFor(n) > MAX_BAR){
    while(n < MAX_N && barWidthFor(n) > MAX_BAR) n++;
  }
  n = Math.max(MIN_N, Math.min(MAX_N, n));
  const bw = Math.round(Math.max(MIN_BAR, barWidthFor(n)));
  const prevBarW = document.documentElement.style.getPropertyValue('--bar-w');
  document.documentElement.style.setProperty('--bar-w', bw+'px');

  if(n !== BARS_PER_ROW){
    BARS_PER_ROW = n;
    suppressAutosave = true; // pure layout reflow (resize/rotation/keyboard) -- not a real edit
    render();
    suppressAutosave = false;
  } else if(prevBarW !== bw+'px'){
    // Bar count didn't change, so bars/notes already reflowed for free via
    // CSS — no need to rebuild the DOM, just re-anchor the tie curves to
    // their notes' new pixel positions.
    redrawTies();
  }
}

/* ============ Rendering ============ */
function chunkRows(items, barsPerRow){
  barsPerRow = barsPerRow || BARS_PER_ROW;
  const rows=[];
  for(let i=0;i<items.length;i+=barsPerRow){
    rows.push(items.slice(i, i+barsPerRow));
  }
  if(rows.length===0) rows.push([]);
  return rows;
}

function chordInnerHtml(chord){
  let html = rootHtml(chord.root);
  (chord.tokens||[]).forEach(t=>{
    const text = escapeHtml(t.ch);
    html += t.sup ? `<span class="suf">${text}</span>` : text;
  });
  if(chord.bass) html += '/' + rootHtml(chord.bass);
  return html;
}

function renderBarEl(item){
  const div = document.createElement('div');
  div.className='bar';
  div.dataset.id=item.id;

  if(item.kind==='repeat'){
    div.innerHTML = `<span class="bar-glyph" style="font-size:0;">${repeatBarSvg(26)}</span>`;
    div.onclick=()=>handleBarTap(item, 0);
    return div;
  }

  if(item.chords.length===0){
    div.innerHTML = '<span class="empty-hint">tap</span>';
    div.onclick=()=>handleBarTap(item, 0);
    return div;
  }

  const denseCls = item.chords.length>=4 ? ' dense' : '';
  for(let beatIdx=0; beatIdx<4; beatIdx++){
    const slot = document.createElement('div');
    slot.className='slot';
    const chord = item.chords.find(c=>c.beat===beatIdx);
    if(chord){
      const c = document.createElement('span');
      c.className='chord'+denseCls;
      c.innerHTML = chord.nc ? 'N.C.' : chordInnerHtml(chord);
      slot.appendChild(c);
      slot.addEventListener('pointerdown', (e)=>slotPointerDown(e, item, beatIdx, div));
    }
    slot.onclick=(e)=>{
      e.stopPropagation();
      if(suppressNextClick){ suppressNextClick=false; return; }
      handleBarTap(item, beatIdx);
    };
    div.appendChild(slot);
  }
  return div;
}

// Shared between the chart's own border-line rendering and the Bar line
// picker sheet, so both draw the exact same glyph for a given type.
function borderGlyphHtml(type){
  if(type==='repeatStart') return `<div class="ln-thick"></div><div class="ln-thin"></div><div class="dots"><span></span><span></span></div>`;
  if(type==='repeatEnd') return `<div class="dots"><span></span><span></span></div><div class="ln-thin"></div><div class="ln-thick"></div>`;
  if(type==='repeatBoth') return `<div class="dots"><span></span><span></span></div><div class="ln-thin"></div><div class="ln-thick"></div><div class="ln-thin"></div><div class="dots"><span></span><span></span></div>`;
  if(type==='end') return `<div class="ln-thin"></div><div class="ln-thick"></div>`;
  if(type==='double') return `<div class="ln-thin"></div><div class="ln-thin"></div>`;
  return `<div class="ln-thin"></div>`;
}

// At a row wrap there's only one border object for the gap, but it's drawn
// twice — as the trailing edge of the row above and the leading edge of the
// row below — so the row visually looks closed on both sides. Directional
// glyphs (repeat/end marks) only belong on the edge matching their meaning;
// showing e.g. "End ||" at the START of the next row would falsely suggest
// the piece stops there, so the other edge falls back to a plain line
// instead of duplicating the full glyph. `edge` is 'full' (not a wrap —
// mid-row, or the song's true first/last border), 'trailing' (this row's
// own closing edge) or 'leading' (this row's own opening edge).
function renderBorderEl(border, idx, edge){
  const div = document.createElement('div');
  div.className='border-line';
  div.dataset.borderIdx = idx;
  div.onclick=()=>openBorderEdit(idx);
  // repeatBoth carries both meanings at once, so a split edge shows only the
  // half that belongs to that row (its end-repeat half trailing, its
  // start-repeat half leading) instead of the other types' plain fallback.
  let glyphType = border.type;
  if(border.type==='repeatBoth'){
    if(edge==='trailing') glyphType='repeatEnd';
    else if(edge==='leading') glyphType='repeatStart';
  } else {
    const downgrade = (edge==='trailing' && border.type==='repeatStart')
      || (edge==='leading' && (border.type==='end' || border.type==='repeatEnd'));
    if(downgrade) glyphType='normal';
  }
  div.innerHTML = borderGlyphHtml(glyphType);
  return div;
}

// A border needs the label row shown at all if it has a section label or a
// mark — both render as a badge/icon/text sitting above the bar line.
// Label/Segno/Coda mark the start of what follows (where the marked bar
// begins); a text direction marks the end of the phrase that's finishing,
// so at a row wrap the two halves of one border split across rows — see
// renderLabelSlot's `edge` param, mirroring how renderBorderEl already
// splits the barline stroke glyph the same way.
function borderWantsLabelRow(b, edge){
  if(!b) return false;
  const isIcon = b.mark==='segno' || b.mark==='coda';
  const wantsLeading = !!(b.label || isIcon);
  const wantsTrailing = !!(b.mark && !isIcon);
  if(edge==='leading') return wantsLeading;
  if(edge==='trailing') return wantsTrailing;
  return wantsLeading || wantsTrailing;
}
function renderLabelSlot(idx, allow, edge){
  const div = document.createElement('div');
  div.className='label-slot';
  const b = song.borders[idx];
  if(allow && b){
    const isIcon = b.mark==='segno' || b.mark==='coda';
    let forward = '';
    if(edge!=='trailing'){
      if(b.label) forward += `<span class="sec-badge">${escapeHtml(b.label)}</span>`;
      if(b.mark==='segno') forward += segnoSvg(16);
      if(b.mark==='coda') forward += codaSvg(16);
    }
    let badge = '';
    if(edge!=='leading' && b.mark && !isIcon) badge = `<span class="direction-badge">${NAV_MARK_LABEL_BY_TYPE[b.mark]}</span>`;
    // Segno/Coda never produce both (isIcon marks skip the badge above), so
    // this only fires for a text direction (e.g. D.S.) landing in the same
    // slot as a label for the section starting right after it. The direction
    // always stays flush at the bar line it ends at (unchanged); when a
    // label shares the slot, shift the label to start just right of that
    // same point instead of centering on it, so it doesn't overlap the
    // direction's text.
    const forwardCls = (forward && badge) ? 'label-forward paired' : 'label-forward';
    div.innerHTML = (forward ? `<div class="${forwardCls}">${forward}</div>` : '') + badge;
  }
  return div;
}

function renderTimeSigEl(showDigits){
  const div = document.createElement('div');
  div.className='time-sig';
  if(showDigits){
    div.innerHTML = `<div class="num">${song.timeSig.num}</div><div class="den">${song.timeSig.den}</div>`;
    div.onclick=(e)=>{ e.stopPropagation(); openTimeSigEdit(); };
  }
  return div;
}

// Groups a row's bars into consecutive same-numbered volta runs (1st/2nd/3rd
// ending brackets don't cross a row wrap in this implementation — a run
// always starts fresh at the top of each row, even if the same ending
// number continues from the previous row's bars).
// A run is "open" (no closing tick, matching standard engraving for the
// last ending in a set) when nothing continues the sequence right after it
// — checked against the actual next bar in the whole song (not just this
// row), so a run ending at a row's last bar still looks ahead correctly.
// The check requires a strictly HIGHER number, not just any volta, so an
// unrelated later "1." (a second, separate repeated passage) doesn't
// wrongly suppress this run's closing tick.
function voltaRunsForRow(row, rowStart){
  const runs = [];
  let i = 0;
  while(i < row.length){
    const n = row[i].volta;
    if(!n){ i++; continue; }
    let j = i;
    while(j+1 < row.length && row[j+1].volta === n) j++;
    const nextBar = song.items[rowStart+j+1];
    const isOpen = !(nextBar && nextBar.volta > n);
    runs.push({start:i, end:j, number:n, isOpen});
    i = j+1;
  }
  return runs;
}

// A thin, borderless row sitting above a row of bars (above the rhythm row,
// which itself hugs the bars), drawing a bracket — top line + end ticks +
// number label — over each run of consecutively-numbered volta (1st/2nd/3rd
// ending) bars. Collapses to nothing when the row has no voltas.
//
// The line/ticks are built from row.length+1 "gap" positions (mirroring the
// border-lines: gap[k] sits at the actual bar line before bar k, gap[row.
// length] is the trailing one) plus row.length "slot" positions (one per
// bar, matching .bar's own width). A run's OPENING tick sits at the gap's
// own center — the real bar line position, since .border-line's stroke is
// centered in that same column. Its CLOSING tick, though, is inset a little
// into its own last bar rather than reaching the following bar line — so
// when another ending starts right after (e.g. "1." on bars 1-2 then "2."
// on bar 3), "1."'s line visibly stops short instead of touching "2."'s
// opening tick, reading as two distinct brackets instead of one continuous
// line. The number label lives in the start gap, right next to its tick,
// instead of being offset into the bar — text is left un-clipped (no
// overflow:hidden on the gap itself) so it can spill rightward over the bar
// below it.
function renderVoltaRowEl(row, rowStart){
  const div = document.createElement('div');
  div.className = 'volta-row';
  const hasAny = row.some(item=>item.volta);
  if(hasAny) div.classList.add('has-volta');

  const runs = voltaRunsForRow(row, rowStart);
  const gapInfo = Array.from({length: row.length+1}, ()=>({leftHalf:false, rightHalf:false, tick:false, label:null}));
  runs.forEach(run=>{
    gapInfo[run.start].rightHalf = true;
    gapInfo[run.start].tick = true;
    gapInfo[run.start].label = run.number;
    for(let g=run.start+1; g<=run.end; g++){ gapInfo[g].leftHalf = true; gapInfo[g].rightHalf = true; }
  });
  function gapHtml(info){
    let html = '';
    if(info.leftHalf && info.rightHalf) html += '<div class="volta-line"></div>';
    else if(info.leftHalf) html += '<div class="volta-line volta-line-left"></div>';
    else if(info.rightHalf) html += '<div class="volta-line volta-line-right"></div>';
    if(info.tick) html += '<div class="volta-tick"></div>';
    if(info.label) html += `<span class="volta-label">${info.label}.</span>`;
    return html;
  }

  const tsSpacer = document.createElement('div');
  tsSpacer.className = 'ts-spacer';
  div.appendChild(tsSpacer);

  row.forEach((item, i)=>{
    const gap = document.createElement('div');
    gap.className = 'volta-gap';
    gap.innerHTML = gapHtml(gapInfo[i]);
    div.appendChild(gap);

    const slot = document.createElement('div');
    slot.className = 'volta-slot';
    const run = runs.find(r=>i>=r.start && i<=r.end);
    if(run){
      const isClosingEnd = run.end===i && !run.isOpen;
      slot.innerHTML = isClosingEnd
        ? '<div class="volta-line volta-line-inset-end"></div><div class="volta-tick volta-tick-inset-end"></div>'
        : '<div class="volta-line"></div>';
    }
    div.appendChild(slot);
  });

  const trailingGap = document.createElement('div');
  trailingGap.className = 'volta-gap';
  trailingGap.innerHTML = gapHtml(gapInfo[row.length]);
  div.appendChild(trailingGap);

  return div;
}

// A thin, borderless row sitting directly above a row of bars, showing
// each bar's rhythm sentence lined up over its own bar. Collapses to
// nothing when no bar in the row has one, so it never adds space to
// rows that don't use it.
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

function makeAddBarBtn(){
  const addBtn = document.createElement('div');
  addBtn.className='add-bar';
  addBtn.textContent='+';
  addBtn.onclick=()=>{
    hideOnboardTip();
    pushSongUndo();
    appendNewBar();
    render();
    if(song.items.length===3 && !onboardSeen('barLine')){
      onboardMarkSeen('barLine');
      const pulseIdx = song.items.length - 1;
      setTimeout(()=>{
        showOnboardTip("Have you tried tapping on the bar lines? That's where sections like Verse and Chorus hide.", {duration:6000});
        pulseBorderLine(pulseIdx);
      }, 1500);
    }
  };
  return addBtn;
}

function render(){
  const inner = document.getElementById('chartInner');
  inner.querySelectorAll('.song-block').forEach(e=>e.remove());
  const canvas = document.getElementById('inkCanvas');

  const rows = chunkRows(song.items, BARS_PER_ROW);
  const songBlock = document.createElement('div');
  songBlock.className='song-block';
  const slotMap = new Map();

  let lastRowBarRow = null;
  let globalIdx = 0;

  rows.forEach((row, rIdx)=>{
    const lane = document.createElement('div');
    lane.className='write-lane';
    if(rIdx===0 && song.feel){
      lane.innerHTML = `<span class="feel-label">${escapeHtml(song.feel)}</span>`;
    }
    songBlock.appendChild(lane);

    const rowStart = globalIdx;
    const isLastRow = (rIdx === rows.length-1);
    const endEdge = isLastRow ? 'full' : 'trailing';
    let needsLabelRow = false;
    for(let k=rowStart;k<rowStart+row.length;k++){
      const kEdge = (k===rowStart && rIdx>0) ? 'leading' : 'full';
      if(borderWantsLabelRow(song.borders[k], kEdge)){ needsLabelRow=true; break; }
    }
    if(!needsLabelRow && borderWantsLabelRow(song.borders[rowStart+row.length], endEdge)){
      needsLabelRow = true;
    }
    if(needsLabelRow){
      const labelRow = document.createElement('div');
      labelRow.className='label-row';
      const tsSpacer=document.createElement('div');
      tsSpacer.className='ts-spacer';
      labelRow.appendChild(tsSpacer);
      let li = rowStart;
      row.forEach(()=>{
        const kEdge = (li===rowStart && rIdx>0) ? 'leading' : 'full';
        labelRow.appendChild(renderLabelSlot(li, true, kEdge));
        li++;
        const barSpacer=document.createElement('div');
        barSpacer.className='bar-spacer';
        labelRow.appendChild(barSpacer);
      });
      labelRow.appendChild(renderLabelSlot(li, true, endEdge));
      songBlock.appendChild(labelRow);
    }

    songBlock.appendChild(renderVoltaRowEl(row, rowStart));
    songBlock.appendChild(renderRhythmRowEl(row, slotMap));

    const barRow = document.createElement('div');
    barRow.className='bar-row';
    barRow.appendChild(renderTimeSigEl(rIdx===0));

    row.forEach((item, kIdx)=>{
      const edge = (kIdx===0 && rIdx>0) ? 'leading' : 'full';
      barRow.appendChild(renderBorderEl(song.borders[globalIdx] || {type:'normal',label:null}, globalIdx, edge));
      barRow.appendChild(renderBarEl(item));
      globalIdx++;
    });
    barRow.appendChild(renderBorderEl(song.borders[globalIdx] || {type:'normal',label:null}, globalIdx, isLastRow ? 'full' : 'trailing'));

    songBlock.appendChild(barRow);
    lastRowBarRow = barRow;
  });

  const lastRow = rows[rows.length-1];
  if(lastRow.length < BARS_PER_ROW){
    lastRowBarRow.appendChild(makeAddBarBtn());
  } else {
    const extraRow = document.createElement('div');
    extraRow.className='bar-row';
    extraRow.appendChild(makeAddBarBtn());
    songBlock.appendChild(extraRow);
  }

  inner.appendChild(songBlock);
  inner.appendChild(canvas);
  drawAllTies(slotMap);
  requestAnimationFrame(resizeCanvasPreserving);
  renderInfoPanel();
  scheduleLocalSave();
}

/* ============ Bar content (chord / %) ============ */
function setBarKind(barId, kind){
  pushSongUndo();
  const b = findBarById(barId);
  if(!b) return closeSheet();
  b.kind=kind; b.chords=[];
  render();
  // Stays open on the same (now chordless) bar instead of closing, so
  // marking a run of bars as "%" doesn't require reopening the keyboard
  // from the chart for every single one.
  resetBuilderState();
  renderChordKeyboard();
}
function duplicateBar(barId){
  pushSongUndo();
  const idx = song.items.findIndex(it=>it.id===barId);
  if(idx<0) return;
  const original = song.items[idx];
  const copy = bar(original.chords.map(c=>({...c})));
  copy.kind = original.kind;
  song.items.splice(idx+1, 0, copy);
  song.borders.splice(idx+1, 0, {type:'normal', label:null});
  closeSheet();
  render();
}
function deleteBar(barId){
  pushSongUndo();
  const idx = song.items.findIndex(it=>it.id===barId);
  if(idx<0) return;
  if(song.items.length===1){
    song.items[0] = bar([]);
    closeSheet();
    render();
    return;
  }
  const removed = song.borders[idx+1];
  const kept = song.borders[idx];
  if(kept.type==='normal' && removed.type!=='normal') kept.type = removed.type;
  if(!kept.label && removed.label) kept.label = removed.label;
  song.items.splice(idx,1);
  song.borders.splice(idx+1,1);
  closeSheet();
  render();
}

/* ============ Chord drag & drop (reposition within a bar) ============ */
let chordDrag = null;
let suppressNextClick = false;

function beatFromClientX(clientX, rect){
  let rel = (clientX - rect.left) / rect.width;
  rel = Math.max(0, Math.min(0.999, rel));
  return Math.floor(rel*4);
}
function clearBeatHighlight(){
  document.querySelectorAll('.slot.drop-target').forEach(el=>el.classList.remove('drop-target'));
  document.querySelectorAll('.slot.drag-source').forEach(el=>el.classList.remove('drag-source'));
}
function highlightBeatTarget(targetBeat){
  clearBeatHighlight();
  const slots = chordDrag.barEl.querySelectorAll('.slot');
  if(slots[targetBeat]) slots[targetBeat].classList.add('drop-target');
  if(slots[chordDrag.fromBeat]) slots[chordDrag.fromBeat].classList.add('drag-source');
}

function slotPointerDown(e, item, beatIdx, barEl){
  if(mode!=='chords') return;
  const rect = barEl.getBoundingClientRect();
  chordDrag = {
    barId:item.id,
    fromBeat:beatIdx,
    targetBeat:beatIdx,
    startX:e.clientX,
    startY:e.clientY,
    dragging:false,
    rect,
    barEl
  };
  window.addEventListener('pointermove', onChordDragMove);
  window.addEventListener('pointerup', onChordDragEnd);
}

function onChordDragMove(e){
  if(!chordDrag) return;
  const dx = e.clientX - chordDrag.startX;
  const dy = e.clientY - chordDrag.startY;

  if(!chordDrag.dragging){
    if(Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)){
      // predominantly vertical — this is a page scroll, not a chord drag. Bail out.
      window.removeEventListener('pointermove', onChordDragMove);
      window.removeEventListener('pointerup', onChordDragEnd);
      chordDrag = null;
      return;
    }
    if(Math.abs(dx) < 6) return;
    chordDrag.dragging = true;
    pushSongUndo();
    document.getElementById('chartScroll').classList.add('dragging-chord');
    highlightBeatTarget(chordDrag.targetBeat);
  }

  e.preventDefault();
  const beat = beatFromClientX(e.clientX, chordDrag.rect);
  if(beat !== chordDrag.targetBeat){
    chordDrag.targetBeat = beat;
    highlightBeatTarget(beat);
  }
}

function onChordDragEnd(){
  window.removeEventListener('pointermove', onChordDragMove);
  window.removeEventListener('pointerup', onChordDragEnd);
  document.getElementById('chartScroll').classList.remove('dragging-chord');
  clearBeatHighlight();
  if(!chordDrag){ return; }

  if(chordDrag.dragging){
    const b = findBarById(chordDrag.barId);
    const from = chordDrag.fromBeat;
    const to = chordDrag.targetBeat;
    if(b && from !== to){
      const moving = b.chords.find(c=>c.beat===from);
      const occupying = b.chords.find(c=>c.beat===to);
      if(moving){
        moving.beat = to;
        if(occupying){ occupying.beat = from; }
      }
    }
    render();
    suppressNextClick = true;
    setTimeout(()=>{ suppressNextClick=false; }, 60);
  }
  chordDrag = null;
}
