/* ============ Data ============ */
const ROOTS = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const QUALITIES = [
  {id:'maj',  label:'Major',  suffix:'',     sup:false},
  {id:'m',    label:'Minor',  suffix:'−',    sup:false},
  {id:'7',    label:'7',      suffix:'7',    sup:true},
  {id:'maj7', label:'Maj7',   suffix:'Δ7',   sup:true},
  {id:'m7',   label:'Min7',   suffix:'−7',   sup:true},
  {id:'dim',  label:'Dim',    suffix:'°',    sup:true},
  {id:'sus4', label:'Sus4',   suffix:'sus4', sup:true},
  {id:'add9', label:'Add9',   suffix:'add9', sup:true},
  {id:'m7b5', label:'Min7♭5',suffix:'ø7',   sup:true},
  {id:'aug',  label:'Aug',    suffix:'+',    sup:true},
];
const TIME_SIGS = [[4,4],[3,4],[2,4],[6,8],[9,8],[12,8],[5,4],[7,8]];
const SECTION_LETTERS = ['A','B','C','D','E','F','G','H'];
const NAMED_SECTIONS = ['Verse','Pre-Chorus','Chorus','Interlude','Solo'];
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

function bar(chords){ return {type:'bar', id:genId(), kind:'chords', chords: chords||[], rhythm:null}; }

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
    borders:[ {type:'normal', label:null}, {type:'end', label:null} ],
    textBoxes:[]
  };
}

function defaultDemoSong(){
  const c1 = (r,q)=>({root:r, quality:q});
  const items = [
    bar([c1('C','m7')]),                              // 1
    bar([c1('F','7')]),                                // 2
    bar([c1('Bb','maj7')]),                            // 3
    bar([c1('Eb','maj7')]),                             // 4
    bar([c1('A','m7b5')]),                             // 5
    bar([c1('D','7')]),                                // 6
    bar([c1('G','m')]),                                // 7
    (()=>{ const b=bar([]); b.kind='repeat'; return b; })(), // 8 (%)
    bar([c1('A','m7b5')]),                             // 9
    bar([c1('D','7')]),                                // 10
    bar([c1('G','m')]),                                // 11
    (()=>{ const b=bar([]); b.kind='repeat'; return b; })(), // 12 (%)
    bar([c1('C','m7')]),                               // 13
    bar([c1('F','7')]),                                // 14
    bar([c1('Bb','maj7')]),                            // 15
    bar([c1('Eb','maj7')]),                            // 16
    bar([c1('A','m7b5')]),                             // 17
    bar([c1('D','7')]),                                // 18
    bar([{root:'G',quality:'m7',beat:0},{root:'Gb',quality:'m7',beat:2}]), // 19
    bar([{root:'F',quality:'m7',beat:0},{root:'E',quality:'7',beat:2}]),   // 20
    bar([c1('A','m7b5')]),                             // 21
    bar([c1('D','7')]),                                // 22
    bar([c1('G','m')]),                                // 23
    (()=>{ const b=bar([]); b.kind='repeat'; return b; })(), // 24 (%)
  ];
  // give single-chord bars an explicit beat 0 (addChordWithReflow isn't used here; set directly)
  items.forEach(it=>{
    if(it.kind==='chords' && it.chords.length===1 && it.chords[0].beat===undefined){
      it.chords[0].beat = 0;
    }
  });
  const borders = items.map(()=>({type:'normal', label:null}));
  borders.push({type:'normal', label:null}); // trailing, will be set to 'end' below
  borders[0].label = 'A';
  borders[8].label = 'B';
  borders[16].label = 'C';
  borders[borders.length-1].type = 'end';
  return {
    title:'Autumn Leaves',
    composer:'Joseph Kosma',
    key:'G minor',
    feel:'Medium Swing',
    timeSig:{num:4, den:4},
    items,
    borders,
    textBoxes:[]
  };
}

// song.items is a flat list of bars.
// song.borders[i] = {type, label} is the border BEFORE items[i];
// song.borders[items.length] is the trailing (final) border.
let song = defaultDemoSong();

/* ============ Helpers ============ */
function rootHtml(r){
  if(r.length===2 && r[1]==='b') return r[0]+'<span class="acc">♭</span>';
  return r;
}
function qualityById(id){ return QUALITIES.find(q=>q.id===id) || QUALITIES[0]; }
function wholeRestSvg(w){
  w = w||22;
  return `<svg width="${w}" height="16" viewBox="0 0 22 16" style="display:block;"><line x1="0" y1="4" x2="22" y2="4" stroke="#000000" stroke-width="1.6"/><rect x="3" y="4" width="13" height="6" fill="#000000"/></svg>`;
}
function halfRestSvg(w){
  w = w||22;
  return `<svg width="${w}" height="16" viewBox="0 0 22 16" style="display:block;"><line x1="0" y1="10" x2="22" y2="10" stroke="#000000" stroke-width="1.6"/><rect x="3" y="4" width="13" height="6" fill="#000000"/></svg>`;
}
/* ============ Rhythm: note/rest symbols ============
   Real engraving outlines lifted from Bravura (SIL Open Font License,
   steinbergmedia/bravura) rather than hand-drawn approximations.
   Coordinates are the font's own design units (1000/em); glyphSvg()/
   rectSvg() place them by flipping font Y-up into SVG Y-down. Fills are
   hardcoded #000000 (not var(--ink)) to match wholeRestSvg/halfRestSvg
   above, which print more reliably than CSS-driven color on some
   PDF/print engines. */
const GLYPHS = {
  noteheadBlack: { d:"M97 -125c-54 0 -97 31 -97 83c0 86 88 167 198 167c57 0 97 -32 97 -83c0 -85 -109 -167 -198 -167z" },
  noteheadHalf: { d:"M97 -125c-55 0 -97 30 -97 83c0 52 47 167 196 167c58 0 99 -32 99 -83c0 -33 -33 -167 -198 -167zM75 -87c48 0 189 88 189 131c0 7 -3 13 -6 19c-7 12 -18 21 -37 21c-47 0 -192 -79 -192 -128c0 -7 3 -14 6 -20c7 -12 19 -23 40 -23z" },
  noteheadWhole: { d:"M216 125c93 0 206 -52 206 -123c0 -70 -52 -127 -216 -127c-149 0 -206 60 -206 127c0 68 83 123 216 123zM111 63c-2 -8 -3 -16 -3 -24c0 -32 15 -66 35 -89c21 -28 58 -52 94 -52c10 0 21 1 31 4c33 8 46 36 46 67c0 60 -55 134 -124 134c-31 0 -68 -5 -79 -40z" },
  flag8thUp: { d:"M238 -790c-5 -17 -22 -23 -28 -19s-16 13 -16 29c0 4 1 9 3 15c17 45 24 92 24 137c0 59 -9 116 -24 150c-36 85 -131 221 -197 233v239c0 12 8 15 19 15c10 0 18 -6 21 -22c16 -96 58 -182 109 -261c63 -100 115 -218 115 -343c0 -78 -26 -173 -26 -173z" },
  flag16thUp: { d:"M272 -796c-6 -13 -13 -17 -20 -17c-14 0 -22 13 -22 26c0 3 0 5 1 9c5 30 8 60 8 89c0 52 -9 101 -32 149c-69 140 -140 142 -202 144h-5v388c0 7 11 10 17 10s18 -2 20 -13c17 -106 73 -122 127 -180c72 -78 98 -106 108 -174c2 -12 3 -23 3 -36 c0 -61 -22 -121 -25 -127c-1 -3 -1 -5 -1 -7c0 -4 1 -6 1 -9c18 -37 29 -78 29 -120v-22c0 -48 -3 -105 -7 -110zM209 -459c2 -3 4 -4 7 -4c5 0 12 3 13 6c5 8 5 18 7 26c1 7 1 13 1 20c0 32 -9 63 -27 89c-33 49 -87 105 -148 105h-8c-8 0 -14 -6 -14 -10c0 -1 0 -2 1 -3 c21 -82 67 -106 114 -160c21 -24 38 -44 54 -69z" },
  augmentationDot: { d:"M100 0c0 -28 -22 -50 -50 -50s-50 22 -50 50s22 50 50 50s50 -22 50 -50z" },
  restWhole: { d:"M282 -109c0 -14 -12 -26 -26 -26h-230c-15 0 -26 12 -26 26v92c0 15 11 26 26 26h230c14 0 26 -11 26 -26v-92z" },
  restHalf: { d:"M282 24c0 -14 -12 -26 -26 -26h-230c-15 0 -26 12 -26 26v92c0 15 11 26 26 26h230c14 0 26 -11 26 -26v-92z" },
  restQuarter: { d:"M78 -38l-49 60s-10 10 -10 24c0 8 4 19 14 29c45 47 60 90 60 127c0 72 -57 123 -61 134c-3 6 -4 11 -4 16c0 14 10 21 20 21c6 0 13 -3 18 -8c17 -17 165 -193 165 -193s4 -9 4 -19c0 -5 -1 -10 -4 -15c-26 -41 -62 -89 -66 -147v-3l-1 -7v-3c0 -56 31 -93 69 -139 c11 -12 37 -45 37 -57c0 -3 -2 -4 -5 -4c-2 0 -4 0 -8 1l-1 1c-17 6 -50 17 -79 17c-42 0 -63 -32 -63 -73c0 -9 1 -18 4 -26c2 -9 13 -36 26 -36c8 -7 16 -15 16 -24c0 -2 -1 -4 -2 -7c-1 -4 -8 -6 -15 -6c-8 0 -18 3 -26 9c-73 56 -116 105 -116 155c0 49 34 96 86 96 l8 -3h4c4 -1 12 -3 16 -3c5 0 9 1 11 5c1 1 1 3 1 4c0 2 -4 10 -6 14c-13 21 -27 40 -43 60z" },
  rest8th: { d:"M134 107v-10c33 0 83 60 90 66c6 4 9 4 11 4c2 -1 12 -6 12 -16c-1 -5 -6 -21 -10 -39c0 0 -98 -351 -101 -353c-10 -8 -24 -10 -35 -10c-6 0 -29 1 -29 13c18 66 90 265 93 280c1 4 1 8 1 11c0 5 -1 9 -5 9c-1 0 -3 0 -5 -1c-13 -7 -22 -11 -36 -15 c-11 -4 -25 -7 -39 -7c-19 0 -38 6 -54 17c-15 12 -27 30 -27 51c0 37 30 67 67 67s67 -30 67 -67z" },
  rest16th: { d:"M208 111v-10c34 1 84 61 91 67c3 2 6 4 11 4c2 -1 10 -5 10 -11c0 -1 -1 -2 -1 -4c-2 -13 -27 -101 -27 -101s-19 -67 -45 -152l-116 -381c-4 -11 -9 -23 -38 -23c-22 0 -31 10 -31 19l1 1v1l95 283v1l1 1c0 4 -2 6 -4 6c-23 -12 -49 -21 -75 -21c-38 0 -80 27 -80 68 c0 38 30 68 68 68c37 0 68 -30 68 -68c0 -3 0 -6 -1 -10c14 0 41 12 49 31c7 15 58 164 58 180c0 5 -2 7 -5 7c-2 0 -4 -1 -7 -2c-23 -13 -51 -22 -78 -22c-38 0 -80 27 -80 68c0 38 31 68 68 68c38 0 68 -30 68 -68z" },
};

const STEM_UP    = { x:295, y:42 }; // noteheadBlack/Half stemUpSE anchor, font units
const STEM_THICK = 30;
const STEM_LEN   = 550;
const BEAM_THICK = 125;
const BEAM_GAP   = 187.5; // beam-center to beam-center spacing

const VB_W = 640, VB_H = 1140, BASE_X = 45, BASE_Y = 614;

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

function noteGlyph(sym){
  if(sym.rest){
    let out = glyphSvg(REST_GLYPH[sym.base], 0, 0, BASE_X, BASE_Y);
    if(sym.dotted) out += glyphSvg('augmentationDot', REST_ADV[sym.base]+40, REST_DOT_Y[sym.base], BASE_X, BASE_Y);
    return out;
  }
  if(sym.base==='whole'){
    let out = glyphSvg('noteheadWhole', 0, 0, BASE_X, BASE_Y);
    if(sym.dotted) out += glyphSvg('augmentationDot', 422+40, 0, BASE_X, BASE_Y);
    return out;
  }
  const headName = sym.base==='half' ? 'noteheadHalf' : 'noteheadBlack';
  let out = glyphSvg(headName, 0, 0, BASE_X, BASE_Y);
  out += rectSvg(STEM_UP.x-STEM_THICK, STEM_UP.y, STEM_THICK, STEM_LEN, BASE_X, BASE_Y);
  if(sym.base==='eighth')    out += glyphSvg('flag8thUp',  STEM_UP.x, STEM_UP.y+STEM_LEN, BASE_X, BASE_Y);
  if(sym.base==='sixteenth') out += glyphSvg('flag16thUp', STEM_UP.x, STEM_UP.y+STEM_LEN, BASE_X, BASE_Y);
  if(sym.dotted) out += glyphSvg('augmentationDot', STEM_UP.x+40, 0, BASE_X, BASE_Y);
  return out;
}

function iconSvg(key, size){
  size = size || 26;
  const sym = SYMS[key];
  const w = Math.round(size*VB_W/VB_H);
  return '<svg class="rsym" width="'+w+'" height="'+size+'" viewBox="0 0 '+VB_W+' '+VB_H+'">'+noteGlyph(sym)+'</svg>';
}

// Consecutive quavers/semiquavers (plain or dotted) within the same beat
// are grouped so they render as one beamed figure instead of separately
// flagged notes — e.g. two quavers become a beamed pair, and a dotted
// quaver + semiquaver (as in "tim-ka") beam together too.
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
        groups.push({ type:'beam', keys:run, units });
        pos += units; i = j;
      } else {
        groups.push({ type:'single', key, units:def.units });
        pos += def.units; i++;
      }
    } else {
      groups.push({ type:'single', key, units:def.units });
      pos += def.units; i++;
    }
  }
  return groups;
}

function beamGroupSvg(keys, size){
  size = size || 26;
  const UNIT_W = 190;
  const MIN_GAP = 340; // floor so adjacent noteheads (each ~295 wide) never overlap
  let cum = 0;
  const stems = [];
  let out = '';
  keys.forEach(k=>{
    const sym = SYMS[k];
    out += glyphSvg('noteheadBlack', cum, 0, BASE_X, BASE_Y);
    const stemX = cum + STEM_UP.x;
    out += rectSvg(stemX-STEM_THICK, STEM_UP.y, STEM_THICK, STEM_LEN, BASE_X, BASE_Y);
    if(sym.dotted) out += glyphSvg('augmentationDot', cum+STEM_UP.x+40, 0, BASE_X, BASE_Y);
    stems.push({ x:stemX, sixteenth: sym.base==='sixteenth' });
    cum += Math.max(sym.units*UNIT_W, MIN_GAP);
  });
  const totalLocalW = cum + 40;
  const topY = STEM_UP.y + STEM_LEN;
  const firstX = stems[0].x, lastX = stems[stems.length-1].x;

  out += rectSvg(firstX-STEM_THICK, topY-BEAM_THICK/2, lastX-firstX+STEM_THICK, BEAM_THICK, BASE_X, BASE_Y);

  const connL = new Array(stems.length).fill(false);
  const connR = new Array(stems.length).fill(false);
  const secY = topY - BEAM_GAP;
  for(let i=0; i<stems.length-1; i++){
    if(stems[i].sixteenth && stems[i+1].sixteenth){
      out += rectSvg(stems[i].x-STEM_THICK, secY-BEAM_THICK/2, stems[i+1].x-stems[i].x+STEM_THICK, BEAM_THICK, BASE_X, BASE_Y);
      connR[i] = true; connL[i+1] = true;
    }
  }
  const STUB = 110;
  stems.forEach((s,i)=>{
    if(!s.sixteenth || connL[i] || connR[i]) return;
    if(i>0) out += rectSvg(s.x-STEM_THICK-STUB, secY-BEAM_THICK/2, STUB+STEM_THICK, BEAM_THICK, BASE_X, BASE_Y);
    else if(i<stems.length-1) out += rectSvg(s.x-STEM_THICK, secY-BEAM_THICK/2, STUB+STEM_THICK, BEAM_THICK, BASE_X, BASE_Y);
  });

  const w = Math.round(size*(totalLocalW/VB_H));
  return '<svg class="rsym" width="'+w+'" height="'+size+'" viewBox="0 0 '+totalLocalW+' '+VB_H+'">'+out+'</svg>';
}

function sequenceHtml(seq, size){
  return groupForBeaming(seq).map(g=>
    g.type==='beam' ? beamGroupSvg(g.keys,size) : iconSvg(g.key,size)
  ).join('');
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
  document.documentElement.style.setProperty('--bar-w', bw+'px');

  if(n !== BARS_PER_ROW){
    BARS_PER_ROW = n;
    render();
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
  const q = qualityById(chord.quality);
  const root = rootHtml(chord.root);
  if(!q.suffix) return root;
  const cls = q.sup ? 'suf' : '';
  return `${root}<span class="${cls}">${q.suffix}</span>`;
}

function renderBarEl(item){
  const div = document.createElement('div');
  div.className='bar';
  div.dataset.id=item.id;

  if(item.kind==='repeat'){
    div.innerHTML = '<span class="bar-glyph">%</span>';
    div.onclick=()=>handleBarTap(item, 0);
    return div;
  }
  if(item.kind==='rest'){
    div.innerHTML = `<span class="bar-glyph" style="font-size:0;">${wholeRestSvg()}</span>`;
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
    if(chord && chord.rest){
      slot.innerHTML = halfRestSvg(14);
      slot.addEventListener('pointerdown', (e)=>slotPointerDown(e, item, beatIdx, div));
    } else if(chord){
      const c = document.createElement('span');
      c.className='chord'+denseCls;
      c.innerHTML = chordInnerHtml(chord);
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

function renderBorderEl(border, idx){
  const div = document.createElement('div');
  div.className='border-line';
  div.onclick=()=>openBorderEdit(idx);
  const type = border.type;
  if(type==='repeatStart'){
    div.innerHTML = `<div class="ln-thick"></div><div class="ln-thin"></div><div class="dots"><span></span><span></span></div>`;
  } else if(type==='repeatEnd'){
    div.innerHTML = `<div class="dots"><span></span><span></span></div><div class="ln-thin"></div><div class="ln-thick"></div>`;
  } else if(type==='end'){
    div.innerHTML = `<div class="ln-thin"></div><div class="ln-thin"></div>`;
  } else {
    div.innerHTML = `<div class="ln-thin"></div>`;
  }
  return div;
}

function renderLabelSlot(idx, allow){
  const div = document.createElement('div');
  div.className='label-slot';
  const b = song.borders[idx];
  if(allow && b && b.label){
    div.innerHTML = `<span class="sec-badge">${b.label}</span>`;
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

// A thin, borderless row sitting directly above a row of bars, showing
// each bar's rhythm sentence lined up over its own bar. Collapses to
// nothing when no bar in the row has one, so it never adds space to
// rows that don't use it.
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
    gap.className = 'label-slot';
    div.appendChild(gap);

    const slot = document.createElement('div');
    slot.className = 'rhythm-slot';
    const rh = rhythmForBar(item);
    if(rh && rh.length){
      slot.innerHTML = sequenceHtml(rh, 22);
    }
    slot.onclick = ()=>handleBarTap(item, 0);
    div.appendChild(slot);
  });

  const trailingGap = document.createElement('div');
  trailingGap.className = 'label-slot';
  div.appendChild(trailingGap);

  return div;
}

function makeAddBarBtn(){
  const addBtn = document.createElement('div');
  addBtn.className='add-bar';
  addBtn.textContent='+';
  addBtn.onclick=()=>{
    pushSongUndo();
    const lastIdx = song.items.length;
    const wasEnd = song.borders[lastIdx].type === 'end';
    if(wasEnd) song.borders[lastIdx].type = 'normal';
    song.items.push(bar([]));
    song.borders.push({type: wasEnd ? 'end' : 'normal', label:null});
    render();
  };
  return addBtn;
}

function render(){
  const inner = document.getElementById('chartInner');
  inner.querySelectorAll('.song-block').forEach(e=>e.remove());
  inner.querySelectorAll('.text-box-wrap').forEach(e=>e.remove());
  const canvas = document.getElementById('inkCanvas');

  const rows = chunkRows(song.items, BARS_PER_ROW);
  const songBlock = document.createElement('div');
  songBlock.className='song-block';

  let lastRowBarRow = null;
  let globalIdx = 0;

  rows.forEach((row, rIdx)=>{
    const lane = document.createElement('div');
    lane.className='write-lane';
    if(rIdx===0 && song.feel){
      lane.innerHTML = `<span class="feel-label">${song.feel}</span>`;
    }
    songBlock.appendChild(lane);

    const rowStart = globalIdx;
    const isLastRow = (rIdx === rows.length-1);
    let needsLabelRow = false;
    for(let k=rowStart;k<rowStart+row.length;k++){
      if(song.borders[k] && song.borders[k].label){ needsLabelRow=true; break; }
    }
    if(!needsLabelRow && isLastRow && song.borders[rowStart+row.length] && song.borders[rowStart+row.length].label){
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
        labelRow.appendChild(renderLabelSlot(li, true));
        li++;
        const barSpacer=document.createElement('div');
        barSpacer.className='bar-spacer';
        labelRow.appendChild(barSpacer);
      });
      labelRow.appendChild(renderLabelSlot(li, isLastRow));
      songBlock.appendChild(labelRow);
    }

    songBlock.appendChild(renderRhythmRowEl(row));

    const barRow = document.createElement('div');
    barRow.className='bar-row';
    barRow.appendChild(renderTimeSigEl(rIdx===0));

    row.forEach(item=>{
      barRow.appendChild(renderBorderEl(song.borders[globalIdx] || {type:'normal',label:null}, globalIdx));
      barRow.appendChild(renderBarEl(item));
      globalIdx++;
    });
    barRow.appendChild(renderBorderEl(song.borders[globalIdx] || {type:'normal',label:null}, globalIdx));

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
  renderTextBoxes(inner);
  requestAnimationFrame(resizeCanvasPreserving);
  renderInfoPanel();
}

// Text boxes are free-floating, like ink — positioned by percentage, not
// tied to a bar. Appended after the canvas so they sit visually on top
// of it and receive their own taps instead of the canvas swallowing them.
function renderTextBoxes(inner){
  (song.textBoxes||[]).forEach(tb=>{
    const wrap = document.createElement('div');
    wrap.className = 'text-box-wrap';
    wrap.style.left = tb.x + '%';
    wrap.style.top = tb.y + '%';

    const toolbar = document.createElement('div');
    toolbar.className = 'tb-toolbar';
    const handle = document.createElement('span');
    handle.className = 'tb-handle';
    handle.textContent = '⠿';
    handle.addEventListener('pointerdown', (e)=>textBoxHandlePointerDown(e, tb.id, wrap));
    const del = document.createElement('span');
    del.className = 'tb-delete';
    del.textContent = '✕';
    del.onclick = (e)=>{ e.stopPropagation(); deleteTextBoxDirect(tb.id); };
    toolbar.appendChild(handle);
    toolbar.appendChild(del);

    const box = document.createElement('div');
    box.className = 'text-box';
    box.contentEditable = 'true';
    box.dataset.id = tb.id;
    box.textContent = tb.text;
    box.addEventListener('focus', ()=>textBoxFocused(tb.id));
    box.addEventListener('input', ()=>textBoxInput(tb.id, box));
    box.addEventListener('blur', ()=>textBoxBlurred(tb.id, box));
    box.addEventListener('click', e=>e.stopPropagation());

    wrap.appendChild(toolbar);
    wrap.appendChild(box);
    inner.appendChild(wrap);
  });
}

/* ============ Bar content (chord / % / rest / half-rest) ============ */
function setBarKind(barId, kind){
  pushSongUndo();
  const b = findBarById(barId);
  if(!b) return closeSheet();
  b.kind=kind; b.chords=[];
  closeSheet();
  render();
}
function setHalfRest(barId){
  pushSongUndo();
  const b = findBarById(barId);
  if(!b) return closeSheet();
  b.kind='chords';
  if(pickerTarget.mode==='edit'){
    const c = b.chords.find(c=>c.beat===pickerTarget.beat);
    if(c){ c.rest=true; delete c.root; delete c.quality; }
  } else {
    addChordWithReflow(b, {rest:true});
  }
  closeSheet();
  render();
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
