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

function bar(chords){ return {type:'bar', id:genId(), kind:'chords', chords: chords||[]}; }

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
    borders
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
  requestAnimationFrame(resizeCanvasPreserving);
  renderInfoPanel();
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
