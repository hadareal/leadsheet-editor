/* ============ Hand-drawn line icons ============ */
const ICON_PATHS = {
  cursor: '<path d="M5 3l6.5 16 2-6.3 6.3-2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>',
  pencil: '<path d="M4 20l0.8-4L14.5 6.3l3.2 3.2L8 19.2 4 20z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/><path d="M13 7.8l3.2 3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  eraser: '<g transform="rotate(-35 12 12)"><rect x="6" y="8.5" width="12" height="7" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="6" y1="13" x2="18" y2="13" stroke="currentColor" stroke-width="1.6"/></g>',
  undo: '<path d="M7.5 7.5L3.3 11.7l4.2 4.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.3 11.7h10.4a6.3 6.3 0 1 1 0 12.6h-1.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  droplet: '<path d="M12 3.2s6.3 7.4 6.3 11.8a6.3 6.3 0 1 1-12.6 0C5.7 10.6 12 3.2 12 3.2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  rhythm: '<ellipse cx="7" cy="18.2" rx="2.3" ry="1.7" fill="currentColor"/><ellipse cx="15.5" cy="15.6" rx="2.3" ry="1.7" fill="currentColor"/><line x1="9.2" y1="18.2" x2="9.2" y2="5" stroke="currentColor" stroke-width="1.4"/><line x1="17.7" y1="15.6" x2="17.7" y2="5.4" stroke="currentColor" stroke-width="1.4"/><path d="M9.2 5l8.5 0.4" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  page: '<path d="M6.5 3.5h7l4 4v13h-11z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M13.5 3.5v4h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  export: '<path d="M12 3.3v11.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M7.8 7.5L12 3.3l4.2 4.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.3 15v3.7a2 2 0 0 0 2 2h11.4a2 2 0 0 0 2-2V15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  chevron: '<path d="M15.5 4.5l-8 7.5 8 7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  staffPen: '<line x1="3" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="1.1"/><line x1="3" y1="11" x2="15" y2="11" stroke="currentColor" stroke-width="1.1"/><line x1="3" y1="14" x2="15" y2="14" stroke="currentColor" stroke-width="1.1"/><line x1="3" y1="17" x2="15" y2="17" stroke="currentColor" stroke-width="1.1"/><line x1="3" y1="20" x2="15" y2="20" stroke="currentColor" stroke-width="1.1"/><path d="M11 18.5L20.5 6.3a1.4 1.4 0 0 1 2.2 1.7L14 20.5l-3.3.8z" fill="currentColor"/><circle cx="9.5" cy="19.5" r="1" fill="currentColor"/>',
  more: '<circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
};
function svgIcon(name, size){
  size = size || 19;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}">${ICON_PATHS[name]||''}</svg>`;
}

/* ============ Toolbar (shared between bottom bar + sidebar) ============ */
const TOOLBAR_PRIMARY = [
  {mode:'chords',     label:'Edit',       icon:'cursor'},
  {action:'annotate', label:'Annotate',   icon:'pencil'},
];
const TOOLBAR_OVERFLOW = [
  {action:'font',      label:'Font',       icon:null, text:'Aa'},
  {mode:'rhythm',      label:'Rhythm',     icon:'rhythm'},
  {action:'clearPage', label:'Clear Page', icon:'page', warn:true},
  {action:'export',    label:'Export',     icon:'export'},
];
const PHONE_TOOLBAR_BUTTONS   = [...TOOLBAR_PRIMARY, {action:'more', label:'More', icon:'more'}];
const SIDEBAR_TOOLBAR_BUTTONS = [...TOOLBAR_PRIMARY, ...TOOLBAR_OVERFLOW];
function toolbarButtonHtml(btn){
  const dataAttr = btn.mode ? `data-tb-mode="${btn.mode}"` : `data-tb-action="${btn.action}"`;
  const inner = btn.icon ? svgIcon(btn.icon) : `<span style="font-family:var(--title-font);font-style:italic;font-weight:700;font-size:16px;line-height:1;">${btn.text}</span>`;
  const cls = 'tbtn' + (btn.warn ? ' warn' : '');
  return `<button class="${cls}" ${dataAttr}>${inner}<span>${btn.label}</span></button>`;
}
function renderToolbars(){
  document.getElementById('bottomToolbar').innerHTML  = PHONE_TOOLBAR_BUTTONS.map(toolbarButtonHtml).join('');
  document.getElementById('sidebarToolbar').innerHTML = SIDEBAR_TOOLBAR_BUTTONS.map(toolbarButtonHtml).join('');
  [document.getElementById('bottomToolbar'), document.getElementById('sidebarToolbar')].forEach(container=>{
    container.addEventListener('click', onToolbarClick);
  });
  syncModeButtons();
}
function onToolbarClick(e){
  const btn = e.target.closest('.tbtn');
  if(!btn) return;
  if(btn.dataset.tbMode){ toggleMode(btn.dataset.tbMode); return; }
  const action = btn.dataset.tbAction;
  if(action==='annotate') openAnnotateSheet();
  else if(action==='more') openMoreSheet();
  else if(action==='font') openFontPicker();
  else if(action==='clearPage') confirmClearPage();
  else if(action==='export') openExportSheet();
}
function syncModeButtons(){
  document.querySelectorAll('.tbtn[data-tb-mode]').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.tbMode===mode);
  });
  document.querySelectorAll('.tbtn[data-tb-action="annotate"]').forEach(btn=>{
    btn.classList.toggle('active', mode==='draw' || mode==='erase' || mode==='textbox');
  });
}
function openAnnotateSheet(){
  showSheet(`
    <div class="sheet-header"><span>Annotate</span><button onclick="closeSheet()">✕</button></div>
    <div class="symbol-grid">
      <button onclick="annotateChoose('draw')">Draw${mode==='draw'?' ✓':''}</button>
      <button onclick="annotateChoose('textbox')">Text Box${mode==='textbox'?' ✓':''}</button>
      <button onclick="annotateChoose('erase')">Erase${mode==='erase'?' ✓':''}</button>
      <button onclick="annotateChoose('clearInk')">Clear Ink</button>
    </div>
  `);
}
function annotateChoose(kind){
  if(kind==='clearInk') clearInk();
  else toggleMode(kind);
  closeSheet();
}
function openMoreSheet(){
  showSheet(`
    <div class="sheet-header"><span>More</span><button onclick="closeSheet()">✕</button></div>
    <div class="symbol-grid">
      <button onclick="openFontPicker()">Font</button>
      <button onclick="chooseRhythmMode()">Rhythm${mode==='rhythm'?' ✓':''}</button>
      <button class="warn" onclick="confirmClearPage()">Clear Page</button>
      <button onclick="openExportSheet()">Export</button>
    </div>
  `);
}
function chooseRhythmMode(){
  toggleMode('rhythm');
  closeSheet();
}

/* ============ Undo stack ============ */
let undoStack = [];
function snapshotSongStr(){ return JSON.stringify(song); }
function pushSongUndo(){
  undoStack.push({type:'song', data:snapshotSongStr()});
  if(undoStack.length>60) undoStack.shift();
}
function pushInkUndo(){
  const canvas = document.getElementById('inkCanvas');
  if(canvas.width>0 && canvas.height>0){
    undoStack.push({type:'ink', data:canvas.toDataURL(), w:canvas.width, h:canvas.height});
    if(undoStack.length>60) undoStack.shift();
  }
}
function pushFullUndo(){
  const canvas = document.getElementById('inkCanvas');
  undoStack.push({
    type:'full',
    songData: snapshotSongStr(),
    inkData: canvas.width>0 ? canvas.toDataURL() : null,
    w:canvas.width, h:canvas.height
  });
  if(undoStack.length>60) undoStack.shift();
}
function restoreInkFromDataUrl(dataUrl, w, h){
  const canvas = document.getElementById('inkCanvas');
  const ctx = canvas.getContext('2d');
  if(!dataUrl){
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.restore();
    const dpr=window.devicePixelRatio||1;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    return;
  }
  const img = new Image();
  img.onload = ()=>{
    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0,w,h,0,0,canvas.width,canvas.height);
    ctx.restore();
    const dpr=window.devicePixelRatio||1;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  };
  img.src = dataUrl;
}
function undo(){
  const entry = undoStack.pop();
  if(!entry){ showToast('Nothing to undo'); return; }
  if(entry.type==='song'){
    song = JSON.parse(entry.data);
    updateHeader();
    syncTitleDisplay();
    render();
  } else if(entry.type==='ink'){
    restoreInkFromDataUrl(entry.data, entry.w, entry.h);
  } else if(entry.type==='full'){
    song = JSON.parse(entry.songData);
    updateHeader();
    syncTitleDisplay();
    render();
    requestAnimationFrame(()=>restoreInkFromDataUrl(entry.inkData, entry.w, entry.h));
  }
}

/* ============ Desktop info panel ============ */
function computeSections(){
  const sections=[];
  for(let i=0;i<song.borders.length-1;i++){
    const b = song.borders[i];
    if(b && b.label){
      let end = song.items.length;
      for(let j=i+1;j<song.borders.length;j++){
        if(song.borders[j] && song.borders[j].label){ end=j; break; }
      }
      sections.push({label:b.label, from:i+1, to:end});
    }
  }
  return sections;
}
function renderInfoPanel(){
  const panel = document.getElementById('infoPanel');
  if(!panel) return;
  const sections = computeSections();
  const infoLines = [
    song.title,
    [song.timeSig.num+'/'+song.timeSig.den, song.key].filter(Boolean).join(' · '),
    song.feel || ''
  ].filter(Boolean);
  panel.innerHTML = `
    <div class="info-row">
      <h4>Song Info</h4>
      ${infoLines.map(l=>`<div class="info-line">${l}</div>`).join('')}
    </div>
    ${sections.length ? `<div class="info-row">
      <h4>Sections</h4>
      ${sections.map(s=>`<div class="section-item"><span class="section-badge">${s.label}</span><span class="section-range">bars ${s.from}-${s.to}</span></div>`).join('')}
    </div>` : ''}
  `;
}

/* ============ Mode state ============ */
let mode = 'chords'; // chords | draw | erase

function toggleMode(m){
  mode = (mode===m) ? 'chords' : m;
  syncModeButtons();
  const scroll = document.getElementById('chartScroll');
  scroll.classList.toggle('draw-mode', mode==='draw');
  scroll.classList.toggle('erase-mode', mode==='erase');
  scroll.classList.toggle('textbox-mode', mode==='textbox');
  if(mode==='rhythm') showToast('Tap any bar to add a rhythm above it');
  if(mode==='textbox') showToast('Tap to add text · drag the ⠿ handle to move a note');
}

/* ============ Toast ============ */
let toastTimer=null;
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'), 2200);
}

/* ============ Title edit ============ */
function openTitleEdit(){
  showSheet(`
    <div class="sheet-header"><span>Song info</span><button onclick="closeSheet()">✕</button></div>
    <div class="sheet-subhead" style="margin-top:0;">Title</div>
    <div class="title-edit"><input id="titleInput" placeholder="Song title" value="${song.title.replace(/"/g,'&quot;')}"></div>
    <div class="sheet-subhead">Composer</div>
    <div class="title-edit"><input id="composerInput" placeholder="Optional" value="${(song.composer||'').replace(/"/g,'&quot;')}"></div>
    <div class="sheet-subhead">Feel</div>
    <div class="title-edit"><input id="feelInput" placeholder="e.g. Medium Swing" value="${(song.feel||'').replace(/"/g,'&quot;')}"></div>
    <div class="sheet-actions"><button class="primary" onclick="saveTitle()">Save</button></div>
  `);
}
function saveTitle(){
  const v = document.getElementById('titleInput').value.trim();
  const c = document.getElementById('composerInput').value.trim();
  const f = document.getElementById('feelInput').value.trim();
  if(v){
    pushSongUndo();
    song.title=v;
    song.composer=c;
    song.feel=f;
    syncTitleDisplay();
    renderInfoPanel();
  }
  closeSheet();
}

/* ============ Export / Import ============ */
function slugify(name){
  return (name||'lead-sheet').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || 'lead-sheet';
}
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}
function openExportSheet(){
  showSheet(`
    <div class="sheet-header"><span>Export</span><button onclick="closeSheet()">✕</button></div>
    <div class="symbol-grid">
      <button onclick="exportPNG()">Save as Image (PNG)</button>
      <button onclick="exportPDF()">Save as PDF</button>
      <button onclick="exportJSON()">Export Chart Data (.json)</button>
      <button onclick="triggerImportJSON()">Import Chart Data (.json)</button>
    </div>
    <div class="sheet-body-text" style="margin-top:14px;">PNG and PDF save exactly what's on the chart, including your handwriting. The .json file is this chart's raw data — export it to back it up or send it to someone else using this app, then use Import to load it back in.</div>
  `);
}
let html2canvasLoadPromise = null;
function loadHtml2Canvas(){
  if(typeof html2canvas !== 'undefined') return Promise.resolve();
  if(!html2canvasLoadPromise){
    html2canvasLoadPromise = new Promise((resolve, reject)=>{
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.onload = resolve;
      script.onerror = ()=>{ html2canvasLoadPromise = null; reject(); };
      document.head.appendChild(script);
    });
  }
  return html2canvasLoadPromise;
}
function exportPNG(){
  closeSheet();
  showToast('Preparing image…');
  loadHtml2Canvas().then(()=>{
    document.body.classList.add('exporting');
    const card = document.querySelector('.chart-card');
    requestAnimationFrame(()=>{
      html2canvas(card, {backgroundColor:'#ffffff', scale:2}).then(canvas=>{
        canvas.toBlob(blob=>{
          downloadBlob(blob, slugify(song.title)+'.png');
        });
      }).catch(()=>{
        showToast('Image export failed');
      }).finally(()=>{
        document.body.classList.remove('exporting');
      });
    });
  }).catch(()=>{
    showToast('Image export needs an internet connection');
  });
}
function exportPDF(){
  closeSheet();
  window.print();
}
function exportJSON(){
  const data = JSON.stringify(song, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  downloadBlob(blob, slugify(song.title)+'.json');
  closeSheet();
}
function triggerImportJSON(){
  document.getElementById('importFileInput').click();
}
function handleImportFile(e){
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result);
      if(!parsed || !Array.isArray(parsed.items) || !Array.isArray(parsed.borders)){
        showToast('That file does not look like a chart export');
        return;
      }
      pushSongUndo();
      song = parsed;
      if(!song.timeSig) song.timeSig = {num:4, den:4};
      if(!Array.isArray(song.textBoxes)) song.textBoxes = [];
      if(typeof song.key !== 'string') song.key = '';
      if(typeof song.title !== 'string') song.title = 'My Song';
      if(typeof song.composer !== 'string') song.composer = '';
      if(typeof song.feel !== 'string') song.feel = '';
      syncTitleDisplay();
      updateHeader();
      closeSheet();
      render();
      showToast('Chart imported');
    } catch(err){
      showToast('Could not read that file');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

/* ============ Time signature ============ */
function openTimeSigEdit(){
  showSheet(`
    <div class="sheet-header"><span>Time signature</span><button onclick="closeSheet()">✕</button></div>
    <div class="timesig-grid">
      ${TIME_SIGS.map(([n,d])=>`<button onclick="setTimeSig(${n},${d})">${n}/${d}</button>`).join('')}
    </div>
  `);
}
function setTimeSig(n,d){
  pushSongUndo();
  song.timeSig = {num:n, den:d};
  updateHeader();
  closeSheet();
  render();
}

/* ============ Font picker ============ */
let currentFontId = 'simple';
function openFontPicker(){
  showSheet(`
    <div class="sheet-header"><span>Chord font</span><button onclick="closeSheet()">✕</button></div>
    <div class="symbol-grid">
      ${FONT_OPTIONS.map(f=>`
        <button style="display:flex;align-items:center;justify-content:space-between;${f.id===currentFontId?'border-color:var(--ink);background:#eeeeee;':''}" onclick="setChordFont('${f.id}')">
          <span>${f.label}${f.id===currentFontId ? ' ✓' : ''}</span>
          <span style="font-family:${f.family};font-size:20px;">${f.sample}</span>
        </button>
      `).join('')}
    </div>
    <div class="sheet-body-text" style="margin-top:14px;">Copyist and Handwritten need an internet connection the first time they load. Rest/rhythm symbols are drawn shapes and won't change with the font.</div>
  `);
}
function setChordFont(id){
  const f = FONT_OPTIONS.find(x=>x.id===id);
  if(!f) return;
  currentFontId = id;
  document.documentElement.style.setProperty('--chord-font', f.family);
  closeSheet();
}

/* ============ Clear page ============ */
function confirmClearPage(){
  showSheet(`
    <div class="sheet-header"><span>Clear page?</span><button onclick="closeSheet()">✕</button></div>
    <div class="sheet-body-text">This removes all bars, chords, and drawings. You can undo it right after.</div>
    <div class="sheet-actions">
      <button class="neutral" onclick="closeSheet()">Cancel</button>
      <button class="danger" onclick="clearPage()">Clear Page</button>
    </div>
  `);
}
function clearPage(){
  pushFullUndo();
  song = blankSong();
  updateHeader();
  syncTitleDisplay();
  clearInkRaw();
  closeSheet();
  render();
}

/* ============ Chord picker ============ */
let pickerTarget = null;
let pickerRoot = null;
let pickerWholeBarOptions = false;

function handleBarTap(item, beatIdx){
  if(mode==='rhythm'){
    if(item.kind==='chords') openRhythmBuilder(item.id);
    return;
  }
  if(mode!=='chords') return;
  if(item.kind!=='chords' || item.chords.length===0){
    pickerTarget = {barId:item.id, mode:'add'};
    pickerRoot = null;
    pickerWholeBarOptions = true;
    openStep1();
    return;
  }
  pickerWholeBarOptions = false;
  const existing = item.chords.find(c=>c.beat===beatIdx);
  if(existing){
    pickerTarget = {barId:item.id, mode:'edit', beat:beatIdx};
    if(existing.rest){ pickerRoot=null; openStep1(); }
    else { pickerRoot = existing.root; openStep2(); }
  } else {
    pickerTarget = {barId:item.id, mode:'add'};
    pickerRoot = null;
    openStep1();
  }
}

function openStep1(){
  const wholeBarBlock = pickerWholeBarOptions ? `
    <div class="sheet-subhead">Or</div>
    <div class="wholebar-grid">
      <button class="icon-btn" onclick="setBarKind('${pickerTarget.barId}','repeat')">%</button>
      <button class="icon-btn" onclick="setBarKind('${pickerTarget.barId}','rest')">${wholeRestSvg(26)}</button>
    </div>
  ` : '';
  showSheet(`
    <div class="sheet-header"><span>Choose root</span><button onclick="closeSheet()">✕</button></div>
    <div class="root-grid">
      ${ROOTS.map(r=>`<button onclick="pickRoot('${r}')">${rootHtml(r)}</button>`).join('')}
      <button class="icon-btn" onclick="setHalfRest('${pickerTarget.barId}')">${halfRestSvg(20)}</button>
    </div>
    ${wholeBarBlock}
    <div class="sheet-actions">
      <button class="neutral" onclick="clearChordSlot()">Clear</button>
      <button class="neutral" onclick="duplicateBar('${pickerTarget.barId}')">Duplicate Bar</button>
      <button class="danger" onclick="deleteBar('${pickerTarget.barId}')">Delete Bar</button>
    </div>
  `);
}
function pickRoot(r){ pickerRoot=r; openStep2(); }

function openStep2(){
  showSheet(`
    <div class="sheet-header">
      <button onclick="openStep1()">‹</button>
      <span>${rootHtml(pickerRoot)} — quality</span>
      <button onclick="closeSheet()">✕</button>
    </div>
    <div class="quality-grid">
      ${QUALITIES.map(q=>`<button onclick="pickQuality('${q.id}')">${q.label}</button>`).join('')}
    </div>
    <div class="sheet-actions">
      <button class="neutral" onclick="clearChordSlot()">Clear</button>
      <button class="neutral" onclick="duplicateBar('${pickerTarget.barId}')">Duplicate Bar</button>
      <button class="danger" onclick="deleteBar('${pickerTarget.barId}')">Delete Bar</button>
    </div>
  `);
}
function pickQuality(qid){
  pushSongUndo();
  const b = findBarById(pickerTarget.barId);
  if(!b) return closeSheet();
  b.kind = 'chords';
  if(pickerTarget.mode==='edit'){
    const c = b.chords.find(c=>c.beat===pickerTarget.beat);
    if(c){ c.root=pickerRoot; c.quality=qid; delete c.rest; }
  } else {
    addChordWithReflow(b, {root:pickerRoot, quality:qid});
  }
  closeSheet();
  render();
}
function clearChordSlot(){
  if(pickerTarget.mode!=='edit'){ closeSheet(); return; }
  pushSongUndo();
  const b = findBarById(pickerTarget.barId);
  if(b){
    const idx = b.chords.findIndex(c=>c.beat===pickerTarget.beat);
    if(idx>=0){
      b.chords.splice(idx,1);
      reflowBeats(b);
    }
  }
  closeSheet();
  render();
}

/* ============ Rhythm builder ============ */
let rhythmBuilding = null; // { barId, seq: [symKey,...] }

function barLabelHtml(item){
  if(item.kind!=='chords' || item.chords.length===0) return '';
  return item.chords
    .slice().sort((a,b)=>a.beat-b.beat)
    .map(c=> c.rest ? '' : chordInnerHtml(c))
    .filter(Boolean)
    .join(' ');
}

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
function closeRhythmSheet(){
  rhythmBuilding = null;
  closeSheet();
  render();
}
function rhythmUnitsUsed(){
  return rhythmBuilding.seq.reduce((s,k)=>s+SYMS[k].units, 0);
}
function rhythmPaletteHtml(units){
  const used = rhythmUnitsUsed();
  let html = '<span class="pt-head">Name</span><span class="pt-head">Value</span><span class="pt-head">Note</span><span class="pt-head">Rest</span>';
  RHYTHM_ROWS.forEach(row=>{
    const n = SYMS[row.note], r = SYMS[row.rest];
    html += `<span class="pt-name">${n.name}</span>`;
    html += `<span class="pt-value">${n.value}</span>`;
    html += `<button type="button" class="pt-btn" ${used+n.units>units?'disabled':''} onclick="rhythmPick('${row.note}')">${iconSvg(row.note,32)}</button>`;
    html += `<button type="button" class="pt-btn" ${used+r.units>units?'disabled':''} onclick="rhythmPick('${row.rest}')">${iconSvg(row.rest,32)}</button>`;
  });
  return html;
}
function rhythmSeqBoxHtml(units){
  const groups = groupForBeaming(rhythmBuilding.seq);
  let html = '';
  let filled = 0;
  groups.forEach(g=>{
    html += `<div class="seq-cell filled" style="grid-column:span ${g.units}">${g.type==='beam'?beamGroupSvg(g.keys,24):iconSvg(g.key,24)}</div>`;
    filled += g.units;
  });
  for(let u=filled; u<units; u++){
    html += `<div class="seq-cell empty${(u+1)%4===0?' beat-end':''}"></div>`;
  }
  return html;
}
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
function rhythmPick(key){
  const units = barUnitsFor(song.timeSig);
  if(rhythmUnitsUsed() + SYMS[key].units > units) return;
  rhythmBuilding.seq.push(key);
  renderRhythmSheet();
}
function rhythmUndo(){ rhythmBuilding.seq.pop(); renderRhythmSheet(); }
function rhythmClear(){ rhythmBuilding.seq = []; renderRhythmSheet(); }
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

/* ============ Border editing (type + optional section label) ============ */
function openBorderEdit(idx){
  if(mode!=='chords') return;
  showSheet(`
    <div class="sheet-header"><span>Bar line</span><button onclick="closeSheet()">✕</button></div>
    <div class="symbol-grid">
      <button onclick="setBorderType(${idx},'normal')">Clear |</button>
      <button onclick="setBorderType(${idx},'repeatStart')">Repeat Start &nbsp; ||:</button>
      <button onclick="setBorderType(${idx},'repeatEnd')">Repeat End &nbsp; :||</button>
      <button onclick="setBorderType(${idx},'end')">End &nbsp; ||</button>
    </div>
    <div class="sheet-subhead">Section label</div>
    <div class="root-grid" style="grid-template-columns:repeat(5,1fr);">
      ${SECTION_LETTERS.map(l=>`<button onclick="setLabel(${idx},'${l}')">${l}</button>`).join('')}
      <button onclick="setLabel(${idx},null)">None</button>
    </div>
    <div class="symbol-grid" style="margin-top:8px;">
      ${NAMED_SECTIONS.map(n=>`<button onclick="setLabel(${idx},'${n}')">${n}</button>`).join('')}
      <button onclick="openCustomLabelEdit(${idx})">Custom…</button>
    </div>
  `);
}
function openCustomLabelEdit(idx){
  showSheet(`
    <div class="sheet-header"><span>Custom label</span><button onclick="closeSheet()">✕</button></div>
    <div class="title-edit"><input id="customLabelInput" placeholder="e.g. Bridge" maxlength="18"></div>
    <div class="sheet-actions"><button class="primary" onclick="saveCustomLabel(${idx})">Save</button></div>
  `);
}
function saveCustomLabel(idx){
  const v = document.getElementById('customLabelInput').value.trim();
  if(v){ setLabel(idx, v); } else { closeSheet(); }
}
function setBorderType(idx, type){
  pushSongUndo();
  song.borders[idx].type = type;
  closeSheet();
  render();
}
function setLabel(idx, label){
  pushSongUndo();
  song.borders[idx].label = label;
  closeSheet();
  render();
}

/* ============ Sheet plumbing ============ */
function showSheet(html){
  document.getElementById('sheet').innerHTML = html;
  document.getElementById('sheet').classList.add('open');
  document.getElementById('backdrop').classList.add('open');
}
function closeSheet(){
  document.getElementById('sheet').classList.remove('open');
  document.getElementById('backdrop').classList.remove('open');
}

/* ============ Ink canvas ============ */
let drawing=false;
let currentStroke=[];
const PEN_COLOR = '#8a3b2c';

function resizeCanvasPreserving(){
  const canvas = document.getElementById('inkCanvas');
  const inner = document.getElementById('chartInner');
  const newW = inner.scrollWidth;
  const newH = inner.scrollHeight;
  const prevW = parseFloat(canvas.dataset.cssW||0);
  const prevH = parseFloat(canvas.dataset.cssH||0);
  if(newW===prevW && newH===prevH) return;

  const dpr = window.devicePixelRatio || 1;
  let snapshot = null;
  if(canvas.width>0 && canvas.height>0){
    snapshot = document.createElement('canvas');
    snapshot.width = canvas.width;
    snapshot.height = canvas.height;
    snapshot.getContext('2d').drawImage(canvas,0,0);
  }

  canvas.style.width = newW+'px';
  canvas.style.height = newH+'px';
  canvas.width = Math.round(newW*dpr);
  canvas.height = Math.round(newH*dpr);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);

  if(snapshot){
    ctx.drawImage(snapshot, 0,0, snapshot.width, snapshot.height, 0,0, prevW||newW, prevH||newH);
  }

  canvas.dataset.cssW = newW;
  canvas.dataset.cssH = newH;
}

function getCanvasPoint(e){
  const canvas = document.getElementById('inkCanvas');
  const rect = canvas.getBoundingClientRect();
  const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
  return {x:cx, y:cy};
}
// Text boxes are positioned as a percentage of the chart's current size
// (not raw pixels) so they stay roughly in place as the page reflows —
// the same tradeoff the ink canvas already makes on resize.
function getCanvasPercentPoint(e){
  const canvas = document.getElementById('inkCanvas');
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    xPct: ((clientX - rect.left) / rect.width) * 100,
    yPct: ((clientY - rect.top) / rect.height) * 100
  };
}

function blurActiveTextBox(){
  // preventDefault() below (needed to stop touch-scroll) also suppresses
  // the browser's normal blur-on-tap-elsewhere, so an in-progress edit
  // has to be closed out explicitly before starting a new action.
  const active = document.activeElement;
  if(active && active.classList && active.classList.contains('text-box')) active.blur();
}
function startDraw(e){
  if(mode==='chords') return;
  if(mode==='textbox'){
    e.preventDefault();
    blurActiveTextBox();
    placeTextBox(getCanvasPercentPoint(e));
    return;
  }
  pushInkUndo();
  drawing=true;
  currentStroke=[getCanvasPoint(e)];
  e.preventDefault();
}
function moveDraw(e){
  if(!drawing) return;
  const pt = getCanvasPoint(e);
  currentStroke.push(pt);
  const canvas = document.getElementById('inkCanvas');
  const ctx = canvas.getContext('2d');
  ctx.lineJoin='round'; ctx.lineCap='round';
  if(mode==='erase'){
    ctx.globalCompositeOperation='destination-out';
    ctx.shadowBlur=0;
    ctx.lineWidth=20;
  } else {
    ctx.globalCompositeOperation='source-over';
    ctx.lineWidth=2.6;
    ctx.strokeStyle=PEN_COLOR;
    ctx.shadowColor=PEN_COLOR;
    ctx.shadowBlur=0.6;
  }

  const n = currentStroke.length;
  if(n < 3){
    const p0 = currentStroke[0];
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  } else {
    const p0 = currentStroke[n-3];
    const p1 = currentStroke[n-2];
    const p2 = currentStroke[n-1];
    const mid1 = {x:(p0.x+p1.x)/2, y:(p0.y+p1.y)/2};
    const mid2 = {x:(p1.x+p2.x)/2, y:(p1.y+p2.y)/2};
    ctx.beginPath();
    ctx.moveTo(mid1.x, mid1.y);
    ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
    ctx.stroke();
  }
  e.preventDefault();
}
function endDraw(){ drawing=false; currentStroke=[]; }

function clearInkRaw(){
  const canvas = document.getElementById('inkCanvas');
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width, canvas.height);
  ctx.restore();
  const dpr = window.devicePixelRatio||1;
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
function clearInk(){
  pushInkUndo();
  clearInkRaw();
}

/* ============ Text boxes (freeform overlay, like ink) ============
   Edited in place, directly on the page — no sheet. Tapping empty space
   creates a box and focuses it immediately so typing shows up live,
   the same way a text box works in Docs/Slides. Rendering lives in
   chart.js (renderTextBoxes); this section is the create/drag/delete
   behavior behind it. */
function placeTextBox(pt){
  pushSongUndo();
  const tb = { id:genId(), x:pt.xPct, y:pt.yPct, text:'' };
  song.textBoxes.push(tb);
  render();
  requestAnimationFrame(()=>{
    const el = document.querySelector('.text-box[data-id="'+tb.id+'"]');
    if(el) el.focus();
  });
}
function textBoxFocused(id){
  // Only snapshot for undo when re-opening a box that already has saved
  // text — the brand-new-box case is already covered by placeTextBox.
  const tb = song.textBoxes.find(t=>t.id===id);
  if(tb && tb.text) pushSongUndo();
}
function textBoxInput(id, el){
  const tb = song.textBoxes.find(t=>t.id===id);
  if(tb) tb.text = el.innerText;
}
function textBoxBlurred(id, el){
  if(!el.innerText.trim()){
    song.textBoxes = song.textBoxes.filter(t=>t.id!==id);
    render();
  }
}
function deleteTextBoxDirect(id){
  pushSongUndo();
  song.textBoxes = song.textBoxes.filter(t=>t.id!==id);
  render();
}

/* ---- dragging a text box by its handle ---- */
let textBoxDrag = null;
function textBoxHandlePointerDown(e, id, wrapEl){
  e.preventDefault();
  e.stopPropagation();
  blurActiveTextBox();
  const rect = document.getElementById('inkCanvas').getBoundingClientRect();
  textBoxDrag = { id, rect, wrapEl, moved:false, x:null, y:null };
  window.addEventListener('pointermove', onTextBoxDragMove);
  window.addEventListener('pointerup', onTextBoxDragEnd);
}
function onTextBoxDragMove(e){
  if(!textBoxDrag) return;
  if(!textBoxDrag.moved){ pushSongUndo(); textBoxDrag.moved = true; }
  const xPct = ((e.clientX - textBoxDrag.rect.left) / textBoxDrag.rect.width) * 100;
  const yPct = ((e.clientY - textBoxDrag.rect.top) / textBoxDrag.rect.height) * 100;
  textBoxDrag.wrapEl.style.left = xPct + '%';
  textBoxDrag.wrapEl.style.top = yPct + '%';
  textBoxDrag.x = xPct;
  textBoxDrag.y = yPct;
}
function onTextBoxDragEnd(){
  window.removeEventListener('pointermove', onTextBoxDragMove);
  window.removeEventListener('pointerup', onTextBoxDragEnd);
  if(textBoxDrag && textBoxDrag.moved){
    const tb = song.textBoxes.find(t=>t.id===textBoxDrag.id);
    if(tb){ tb.x = textBoxDrag.x; tb.y = textBoxDrag.y; }
  }
  textBoxDrag = null;
}

/* ============ Welcome screen ============ */
function showWelcome(){
  document.getElementById('app').classList.add('hidden');
  document.getElementById('welcomeScreen').classList.remove('hidden');
}
function showEditor(){
  document.getElementById('welcomeScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  requestAnimationFrame(()=>{
    applyResponsiveLayout();
    resizeCanvasPreserving();
  });
}
function continueAsGuest(){ showEditor(); }
function attemptSignIn(){
  const msg = document.getElementById('welcomeMsg');
  msg.textContent = 'Accounts are coming soon — continue as guest for now.';
}

/* ============ Init ============ */
window.addEventListener('resize', ()=>requestAnimationFrame(()=>{
  applyResponsiveLayout();
  resizeCanvasPreserving();
}));
window.addEventListener('beforeprint', applyResponsiveLayout);
window.addEventListener('afterprint', ()=>requestAnimationFrame(applyResponsiveLayout));

document.addEventListener('DOMContentLoaded', ()=>{
  const canvas = document.getElementById('inkCanvas');
  canvas.addEventListener('pointerdown', startDraw);
  canvas.addEventListener('pointermove', moveDraw);
  window.addEventListener('pointerup', endDraw);
  canvas.addEventListener('touchstart', startDraw, {passive:false});
  canvas.addEventListener('touchmove', moveDraw, {passive:false});
  window.addEventListener('touchend', endDraw);

  document.getElementById('welcomeGlyph').innerHTML = svgIcon('staffPen', 38);
  document.getElementById('backIcon').innerHTML = svgIcon('chevron', 15) + '<span>Back</span>';
  document.getElementById('topUndoIcon').innerHTML = svgIcon('undo');
  renderToolbars();

  syncTitleDisplay();
  updateHeader();
  render();
  applyResponsiveLayout();
});

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}
