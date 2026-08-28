/* ============ Hand-drawn line icons ============ */
const ICON_PATHS = {
  cursor: '<path d="M5 3l6.5 16 2-6.3 6.3-2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>',
  pencil: '<path d="M4 20l0.8-4L14.5 6.3l3.2 3.2L8 19.2 4 20z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/><path d="M13 7.8l3.2 3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  eraser: '<g transform="rotate(-35 12 12)"><rect x="6" y="8.5" width="12" height="7" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.6"/><line x1="6" y1="13" x2="18" y2="13" stroke="currentColor" stroke-width="1.6"/></g>',
  undo: '<path d="M7.5 3.6L3.3 7.8l4.2 4.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.3 7.8h10.4a6.3 6.3 0 1 1 0 12.6h-1.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  redo: '<path d="M16.5 3.6L20.7 7.8l-4.2 4.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.7 7.8h-10.4a6.3 6.3 0 1 0 0 12.6h1.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  droplet: '<path d="M12 3.2s6.3 7.4 6.3 11.8a6.3 6.3 0 1 1-12.6 0C5.7 10.6 12 3.2 12 3.2z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
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
  {action:'clearPage', label:'Clear Page', icon:'page', warn:true},
  {action:'export',    label:'Export',     icon:'export'},
];
function authToolbarButtons(){
  if(typeof isSignedIn!=='function' || !isSignedIn()) return [];
  return [
    {action:'mysongs', label:'My Songs', icon:'page'},
    {action:'signout',  label:'Sign Out', icon:null, text:'⎋'},
  ];
}
function iconOrAaHtml(icon, text, size){
  return icon ? svgIcon(icon, size) : `<span class="sg-aa" style="font-size:${size?size-3:16}px;">${text}</span>`;
}
function toolbarButtonHtml(btn){
  const dataAttr = btn.mode ? `data-tb-mode="${btn.mode}"` : `data-tb-action="${btn.action}"`;
  const inner = iconOrAaHtml(btn.icon, btn.text);
  const cls = 'tbtn' + (btn.warn ? ' warn' : '');
  return `<button class="${cls}" ${dataAttr}>${inner}<span>${btn.label}</span></button>`;
}
function renderToolbars(){
  const phoneButtons = [...TOOLBAR_PRIMARY, {action:'more', label:'More', icon:'more'}];
  const sidebarButtons = [...TOOLBAR_PRIMARY, ...TOOLBAR_OVERFLOW, ...authToolbarButtons()];
  document.getElementById('bottomToolbar').innerHTML  = phoneButtons.map(toolbarButtonHtml).join('');
  document.getElementById('sidebarToolbar').innerHTML = sidebarButtons.map(toolbarButtonHtml).join('');
  [document.getElementById('bottomToolbar'), document.getElementById('sidebarToolbar')].forEach(container=>{
    container.addEventListener('click', onToolbarClick);
  });
  syncModeButtons();
}
function onToolbarClick(e){
  const btn = e.target.closest('.tbtn');
  if(!btn) return;
  hideOnboardTip();
  if(btn.dataset.tbMode){ toggleMode(btn.dataset.tbMode); return; }
  const action = btn.dataset.tbAction;
  if(action==='annotate') openAnnotateSheet();
  else if(action==='more') openMoreSheet();
  else if(action==='font') openFontPicker();
  else if(action==='clearPage') confirmClearPage();
  else if(action==='export') openExportSheet();
  else if(action==='mysongs') openMySongsSheet();
  else if(action==='signout') signOutUser();
}
function syncModeButtons(){
  document.querySelectorAll('.tbtn[data-tb-mode]').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.tbMode===mode);
  });
  document.querySelectorAll('.tbtn[data-tb-action="annotate"]').forEach(btn=>{
    btn.classList.toggle('active', mode==='draw' || mode==='erase');
  });
}
function openAnnotateSheet(){
  showSheet(`
    <div class="sheet-header"><span>Annotate</span><button onclick="closeSheet()">✕</button></div>
    <div class="symbol-grid">
      <button class="icon-row" onclick="annotateChoose('draw')">${svgIcon('pencil',18)}<span>Draw${mode==='draw'?' ✓':''}</span></button>
      <button class="icon-row" onclick="annotateChoose('erase')">${svgIcon('eraser',18)}<span>Erase${mode==='erase'?' ✓':''}</span></button>
      <button class="icon-row" onclick="annotateChoose('clearInk')">${svgIcon('droplet',18)}<span>Clear Ink</span></button>
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
      <button class="icon-row" onclick="openFontPicker()">${iconOrAaHtml(null,'Aa',18)}<span>Font</span></button>
      <button class="icon-row warn" onclick="confirmClearPage()">${svgIcon('page',18)}<span>Clear Page</span></button>
      <button class="icon-row" onclick="openExportSheet()">${svgIcon('export',18)}<span>Export</span></button>
      ${isSignedIn() ? `
        <button class="icon-row" onclick="openMySongsSheet()">${svgIcon('page',18)}<span>My Songs</span></button>
        <button class="icon-row" onclick="signOutUser()">${iconOrAaHtml(null,'⎋',18)}<span>Sign Out</span></button>
      ` : ''}
    </div>
  `);
}

/* ============ Undo / redo stacks ============ */
let undoStack = [];
let redoStack = [];
function snapshotSongStr(){ return JSON.stringify(song); }
function captureEntry(type){
  const canvas = document.getElementById('inkCanvas');
  if(type==='song') return {type:'song', data:snapshotSongStr()};
  if(type==='ink') return {type:'ink', data:canvas.toDataURL(), w:canvas.width, h:canvas.height};
  return {
    type:'full',
    songData: snapshotSongStr(),
    inkData: canvas.width>0 ? canvas.toDataURL() : null,
    w:canvas.width, h:canvas.height
  };
}
function pushSongUndo(){
  undoStack.push(captureEntry('song'));
  if(undoStack.length>60) undoStack.shift();
  redoStack.length = 0;
}
function pushInkUndo(){
  const canvas = document.getElementById('inkCanvas');
  if(canvas.width>0 && canvas.height>0){
    undoStack.push(captureEntry('ink'));
    if(undoStack.length>60) undoStack.shift();
    redoStack.length = 0;
  }
}
function pushFullUndo(){
  undoStack.push(captureEntry('full'));
  if(undoStack.length>60) undoStack.shift();
  redoStack.length = 0;
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
function applyEntry(entry){
  if(entry.type==='song'){
    song = JSON.parse(entry.data);
    normalizeSong(song);
    updateHeader();
    syncTitleDisplay();
    render();
  } else if(entry.type==='ink'){
    restoreInkFromDataUrl(entry.data, entry.w, entry.h);
  } else if(entry.type==='full'){
    song = JSON.parse(entry.songData);
    normalizeSong(song);
    updateHeader();
    syncTitleDisplay();
    render();
    requestAnimationFrame(()=>restoreInkFromDataUrl(entry.inkData, entry.w, entry.h));
  }
}
function undo(){
  const entry = undoStack.pop();
  if(!entry){ showToast('Nothing to undo'); return; }
  redoStack.push(captureEntry(entry.type));
  if(redoStack.length>60) redoStack.shift();
  applyEntry(entry);
}
function redo(){
  const entry = redoStack.pop();
  if(!entry){ showToast('Nothing to redo'); return; }
  undoStack.push(captureEntry(entry.type));
  if(undoStack.length>60) undoStack.shift();
  applyEntry(entry);
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
      ${infoLines.map(l=>`<div class="info-line">${escapeHtml(l)}</div>`).join('')}
    </div>
    ${sections.length ? `<div class="info-row">
      <h4>Sections</h4>
      ${sections.map(s=>`<div class="section-item"><span class="section-badge">${escapeHtml(s.label)}</span><span class="section-range">bars ${s.from}-${s.to}</span></div>`).join('')}
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

/* ============ Onboarding tips (first-run guidance, shown once per device) ============ */
const ONBOARD_FLAGS = { welcome:'lse_onb_welcome', firstBar:'lse_onb_firstbar', addAnother:'lse_onb_addanother', barLine:'lse_onb_barline' };
const ONBOARD_ARROW_SVG = '<svg width="30" height="46" viewBox="0 0 30 46"><path d="M15 2c0 16 -2 26 2 34" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M7 28l8 10 8-10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
let onboardTipTimer = null;

function onboardSeen(key){
  try{ return localStorage.getItem(ONBOARD_FLAGS[key])==='1'; } catch(e){ return true; }
}
function onboardMarkSeen(key){
  try{ localStorage.setItem(ONBOARD_FLAGS[key], '1'); } catch(e){}
}
function isPhoneLayout(){
  return getComputedStyle(document.getElementById('sidebarToolbar')).display === 'none';
}
function positionOnboardTip(){
  const tip = document.getElementById('onboardTip');
  const appRect = document.getElementById('app').getBoundingClientRect();
  const barRect = document.querySelector('.topbar').getBoundingClientRect();
  tip.style.top = (barRect.bottom - appRect.top + 10) + 'px';
}
function showArrowAtToolbarButton(action){
  if(!isPhoneLayout()) return;
  const btn = document.querySelector(`#bottomToolbar [data-tb-action="${action}"]`);
  const arrow = document.getElementById('onboardArrow');
  if(!btn) return;
  const appRect = document.getElementById('app').getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  arrow.style.left = (btnRect.left - appRect.left + btnRect.width/2 - 15) + 'px';
  arrow.style.top = (btnRect.top - appRect.top - 50) + 'px';
  arrow.innerHTML = ONBOARD_ARROW_SVG;
  arrow.classList.add('show');
}
function hideOnboardArrow(){
  document.getElementById('onboardArrow').classList.remove('show');
}
function showOnboardTip(message, opts){
  opts = opts || {};
  const tip = document.getElementById('onboardTip');
  tip.innerHTML = `<span>${message}</span><span class="onboard-close" onclick="hideOnboardTip()">✕</span>`;
  positionOnboardTip();
  tip.classList.add('show');
  clearTimeout(onboardTipTimer);
  onboardTipTimer = setTimeout(hideOnboardTip, opts.duration || 5500);
  if(opts.arrowAction) requestAnimationFrame(()=>showArrowAtToolbarButton(opts.arrowAction));
}
function hideOnboardTip(){
  document.getElementById('onboardTip').classList.remove('show');
  hideOnboardArrow();
  clearTimeout(onboardTipTimer);
}
function pulseBorderLine(idx){
  const el = document.querySelector(`.border-line[data-border-idx="${idx}"]`);
  if(!el) return;
  el.classList.add('pulse');
  setTimeout(()=>el.classList.remove('pulse'), 2800);
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
function openMySongsSheet(){
  dbGetAllSongs().then(songs=>{
    const sorted = songs.slice().sort((a,b)=>b.updatedAt-a.updatedAt);
    const rows = sorted.map(s=>`
      <div class="song-row">
        <button class="song-row-open" onclick="loadSongIntoEditor('${escapeHtml(s.id)}').then(closeSheet)">${escapeHtml(s.title)}</button>
        <button class="song-row-delete" onclick="confirmDeleteSong('${escapeHtml(s.id)}')">Delete</button>
      </div>
    `).join('');
    showSheet(`
      <div class="sheet-header"><span>My Songs</span><button onclick="closeSheet()">✕</button></div>
      <div class="symbol-grid">
        <button onclick="createNewSongAndOpen().then(closeSheet)">+ New Song</button>
      </div>
      <div class="song-list">${rows || '<div class="sheet-body-text">No songs yet — tap New Song to start your first chart.</div>'}</div>
    `);
  });
}
function confirmDeleteSong(id){
  showSheet(`
    <div class="sheet-header"><span>Delete song?</span><button onclick="closeSheet()">✕</button></div>
    <div class="sheet-body-text">This can't be undone.</div>
    <div class="sheet-actions">
      <button class="neutral" onclick="openMySongsSheet()">Cancel</button>
      <button class="danger" onclick="deleteSongFromLibrary('${escapeHtml(id)}').then(openMySongsSheet)">Delete</button>
    </div>
  `);
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
      normalizeSong(song);
      if(!song.timeSig) song.timeSig = {num:4, den:4};
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
  const newUnits = barUnitsFor({num:n, den:d});
  let dropped = 0, rhythmDropped = 0;
  song.items.forEach(it=>{
    if(it.kind!=='chords') return;
    if(it.chords){
      const before = it.chords.length;
      it.chords = it.chords.filter(c=>c.beat < n);
      dropped += before - it.chords.length;
    }
    if(Array.isArray(it.rhythm)){
      const before = it.rhythm.length;
      it.rhythm = it.rhythm.filter(m => SYMS[m.sym] && m.at + SYMS[m.sym].units <= newUnits);
      rhythmDropped += before - it.rhythm.length;
      const rhythmChanged = it.rhythm.length !== before;
      // Update boundary flags if marks were dropped OR if flags are set (they might need clearing)
      if(rhythmChanged || it.tiedFromPrevBar || it.tiedToNextBar){
        if(!it.rhythm.length) it.rhythm = null;
        it.tiedFromPrevBar = !!it.tiedFromPrevBar && !!it.rhythm && it.rhythm[0].at === 0
                             && !!SYMS[it.rhythm[0].sym] && !SYMS[it.rhythm[0].sym].rest;
        const last = it.rhythm && it.rhythm[it.rhythm.length-1];
        it.tiedToNextBar = !!it.tiedToNextBar && !!last && !!SYMS[last.sym]
                           && !SYMS[last.sym].rest
                           && last.at + SYMS[last.sym].units === newUnits;
      }
    }
  });
  updateHeader();
  closeSheet();
  render();
  const bits = [];
  if(dropped>0) bits.push(`${dropped} chord${dropped===1?'':'s'}`);
  if(rhythmDropped>0) bits.push(`${rhythmDropped} rhythm mark${rhythmDropped===1?'':'s'}`);
  if(bits.length) showToast(`${bits.join(' and ')} didn't fit ${n}/${d} and ${bits.length===1 && dropped+rhythmDropped===1 ? 'was' : 'were'} removed`);
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
  if(!onboardSeen('firstBar')){
    onboardMarkSeen('firstBar');
    setTimeout(()=>{
      showOnboardTip('Tap the bar to add your first chord.', {duration:5000});
    }, 400);
  }
}

/* ============ Chord keyboard ============ */
let pickerTarget = null;
// Builder state for the chord currently being typed. Lives entirely
// separate from `song` until Done/Next commits it — Cancel (X) needs no
// song mutation at all, just closeSheet().
let cbRoot = null;       // e.g. 'F' or 'F#' or null
let cbTokens = [];       // [{ch, sup}, ...] everything after the root
let cbBass = null;       // e.g. 'E' or 'Bb' or null
let cbInBass = false;    // true once '/' has been pressed
let cbNC = false;        // true once N.C. has been picked — mutually exclusive with everything else
let cbHistory = [];      // stack of {t:'root'|'rootAcc'|'token'|'slash'|'bassLetter'|'bassAcc'|'nc'} for backspace

function resetBuilderState(){
  cbRoot = null;
  cbTokens = [];
  cbBass = null;
  cbInBass = false;
  cbNC = false;
  cbHistory = [];
}

// Reconstructs a plausible key-press history from an existing chord's saved
// shape, so backspace works immediately when reopening a chord to edit it —
// not just for keys pressed during the current session.
function rebuildHistory(){
  cbHistory = [];
  if(cbNC){
    cbHistory.push({t:'nc'});
    return;
  }
  if(cbRoot){
    cbHistory.push({t:'root'});
    if(cbRoot.length===2) cbHistory.push({t:'rootAcc'});
  }
  cbTokens.forEach(()=>cbHistory.push({t:'token'}));
  if(cbInBass){
    cbHistory.push({t:'slash'});
    if(cbBass){
      cbHistory.push({t:'bassLetter'});
      if(cbBass.length===2) cbHistory.push({t:'bassAcc'});
    }
  }
}

function handleBarTap(item, beatIdx){
  hideOnboardTip();
  if(mode!=='chords') return;
  if(item.kind!=='chords' || item.chords.length===0){
    pickerTarget = {barId:item.id, mode:'add', beat:0};
    resetBuilderState();
    renderChordKeyboard();
    return;
  }
  const existing = item.chords.find(c=>c.beat===beatIdx);
  pickerTarget = {barId:item.id, mode: existing ? 'edit' : 'add', beat:beatIdx};
  resetBuilderState();
  if(existing) loadChordIntoBuilder(existing);
  renderChordKeyboard();
}

// Loads an existing chord's saved shape into the builder so backspace/retype
// work on it. Assumes resetBuilderState() was just called; rebuildHistory()
// reconstructs the key-press stack (see its comment).
function loadChordIntoBuilder(chord){
  if(chord.nc){
    cbNC = true;
  } else {
    cbRoot = chord.root;
    cbTokens = (chord.tokens||[]).map(t=>({...t}));
    cbBass = chord.bass || null;
    cbInBass = !!chord.bass;
  }
  rebuildHistory();
}

// Wired to every preview-grid cell. Commits whatever's typed to the current
// cell, then moves the active spot to `beat` — loading the chord already
// there (edit) or a blank builder (add). Nothing auto-spaces.
function cbSelectCell(beat){
  if(beat===pickerTarget.beat) return;
  // Flush whatever's typed to the current cell. Add mode with nothing typed
  // has nothing to flush — skip it (and the no-op undo entry it'd push).
  if(cbRoot || cbNC || pickerTarget.mode==='edit') cbCommit();
  const b = findBarById(pickerTarget.barId);
  render();
  if(!b) return closeSheet();
  const existing = b.chords.find(c=>c.beat===beat);
  pickerTarget = {barId:b.id, mode: existing ? 'edit' : 'add', beat};
  resetBuilderState();
  if(existing) loadChordIntoBuilder(existing);
  renderChordKeyboard();
}

function barActionsHtml(){
  const found = borderAfterBar(pickerTarget.barId);
  const b = found ? song.items[found.idx] : null;
  const volta = b ? b.volta : null;
  const voltaBtns = [1,2,3].map(n=>
    `<button class="neutral compact${volta===n?' tie-armed':''}" onclick="setBarVolta('${pickerTarget.barId}',${n})">${n}.</button>`
  ).join('');
  const isLastBar = !!found && found.idx===song.items.length-1;
  const hasBreak = !!(found && found.border && found.border.breakAfter);
  const rowBreakBtn = isLastBar ? '' : `<button class="neutral compact${hasBreak?' tie-armed':''}" title="${hasBreak?'Remove row break':'Start new row after this bar'}" onclick="toggleRowBreak('${pickerTarget.barId}')"><span class="btn-icon">↵</span></button>`;
  return `
    <div class="sheet-actions">
      ${voltaBtns}
      <button class="neutral compact" title="Clear Bar" onclick="cbClearBar()"><span class="btn-icon">⌫</span></button>
      <button class="neutral compact" title="Duplicate Bar" onclick="duplicateBar('${pickerTarget.barId}')">${duplicateIconSvg(15)}</button>
      ${rowBreakBtn}
      <button class="danger compact" title="Delete Bar" onclick="deleteBar('${pickerTarget.barId}')">🗑️</button>
    </div>
  `;
}
// Tapping the active ending number again clears it (matches the Tie
// button's toggle behavior). Doesn't close the sheet — unlike the other bar
// actions, marking an ending doesn't stop you from continuing to enter
// chords for the bar.
function setBarVolta(barId, n){
  pushSongUndo();
  const b = findBarById(barId);
  if(!b) return;
  b.volta = (b.volta===n) ? null : n;
  render();
  renderChordKeyboard();
}

// Row-break flag lives on the border right after this bar (song.borders is
// indexed one ahead of song.items — see chart.js's border-indexing comment
// above `let song = defaultDemoSong();`). No-op on the song's last bar,
// since there's nothing after it to push to a new row.
function toggleRowBreak(barId){
  pushSongUndo();
  const found = borderAfterBar(barId);
  if(!found || found.idx===song.items.length-1) return;
  found.border.breakAfter = !found.border.breakAfter;
  render();
  renderChordKeyboard();
}

// Renders every cell of the bar being edited so you see the whole bar taking
// shape. The active cell (pickerTarget.beat) shows the live builder chord, or
// a "–" placeholder when nothing's typed yet; every other cell shows whatever
// chord actually sits there. Tapping a cell moves the active spot
// (cbSelectCell) — nothing auto-spaces. Below the grid, a beat-number row
// labels the cells (beatCellLabels), and /8 meters get bolder group dividers
// (beatGroupStarts). Both are keyed to the meter's cell count, barSlots().
function barPreviewGridHtml(b){
  const n = barSlots(song.timeSig);
  const groups = beatGroupStarts(song.timeSig);
  const activeBeat = pickerTarget.beat;
  // Same rule as the chart's own bars: a busy bar, or any high-numerator
  // meter whose cells are inherently narrow, shrinks its chords to fit.
  const denseCls = (b.chords.length>=4 || n>=5) ? ' dense' : '';
  const activeInner = cbNC ? 'N.C.' : (cbRoot ? chordInnerHtml({root:cbRoot, tokens:cbTokens, bass:cbBass}) : null);
  const activeContent = activeInner!==null ? `<span class="chord${denseCls}">${activeInner}</span>` : '<span class="kb-placeholder">–</span>';
  let slots = '';
  for(let i=0;i<n;i++){
    const cls = 'slot'
      + (i===activeBeat ? ' active' : '')
      + (groups && i>0 && groups.includes(i) ? ' downbeat' : '');
    let content;
    if(i===activeBeat){
      content = activeContent;
    } else {
      const found = b.chords.find(c=>c.beat===i);
      content = found ? `<span class="chord${denseCls}">${found.nc ? 'N.C.' : chordInnerHtml(found)}</span>` : '';
    }
    slots += `<div class="${cls}" onclick="cbSelectCell(${i})">${content}</div>`;
  }
  const nums = beatCellLabels(song.timeSig)
    .map(l=>`<span${l.sub ? ' class="sub"' : ''}>${escapeHtml(l.text)}</span>`).join('');
  const gridStyle = `grid-template-columns:repeat(${n},1fr);width:${n>=5 ? '96%' : '70%'}`;
  return `<div class="kb-preview-cells">`
    + `<div class="kb-preview-grid" style="${gridStyle}">${slots}</div>`
    + `<div class="kb-beatnums" style="${gridStyle}">${nums}</div>`
    + `</div>`;
}

function renderChordKeyboard(){
  const b = findBarById(pickerTarget.barId);
  if(!b) return closeSheet();

  const barLocked = b.kind==='repeat';
  const previewHtml = barLocked ? repeatBarSvg(32) : barPreviewGridHtml(b);
  const locked = cbNC || barLocked;
  const letterLocked = (cbInBass ? !!cbBass : !!cbRoot) || locked;
  const row1 = ROOT_LETTERS.map(l=>`<button ${letterLocked?'disabled':''} onclick="cbPickLetter('${l}')">${l}</button>`).join('')
    + `<button ${locked?'disabled':''} onclick="cbAccidental('flat')">♭</button>`
    + `<button ${locked?'disabled':''} onclick="cbAccidental('sharp')">♯</button>`
    + `<button ${locked?'disabled':''} onclick="cbAccidental('natural')">♮</button>`;
  const openParens = cbTokens.filter(t=>t.ch==='(').length;
  const closeParens = cbTokens.filter(t=>t.ch===')').length;
  const nextParen = openParens>closeParens ? ')' : '(';
  const ncDisabled = cbNC || cbRoot || cbInBass || cbTokens.length>0 || barLocked;
  // "%" (repeat bar) replaces the whole bar, so it's offered only when the bar
  // holds no chords — including when the lone chord being edited has been
  // backspaced to empty, i.e. committing right now would leave the bar blank.
  const clearingLoneChord = pickerTarget.mode==='edit' && !cbRoot && !cbNC
    && b.chords.length===1 && b.chords[0].beat===pickerTarget.beat;
  const canMakeRepeatBar = b.kind==='chords' && (b.chords.length===0 || clearingLoneChord);
  const row2 = CHORD_KB_SYMBOLS.map(s=>
    `<button ${locked?'disabled':''} onclick="cbPickToken('${s.ch}',${s.sup})">${s.ch}${s.label?`<span class="kb-sub">${s.label}</span>`:''}</button>`
  ).join('')
    + `<button ${ncDisabled?'disabled':''} onclick="cbPickNC()">N.C.</button>`
    + `<button ${canMakeRepeatBar?'':'disabled'} onclick="setBarKind('${pickerTarget.barId}','repeat')">${repeatBarSvg(16)}</button>`
    + `<button ${locked?'disabled':''} onclick="cbPickToken('${nextParen}',true)">()</button>`;
  const row3 = CHORD_KB_NUMBERS.map(n=>`<button ${locked?'disabled':''} onclick="cbPickToken('${n}',true)">${n}</button>`).join('')
    + `<button ${(!cbRoot||cbInBass||locked)?'disabled':''} onclick="cbSlash()">/</button>`
    + `<button ${(cbHistory.length===0 && !barLocked)?'disabled':''} onclick="cbBackspace()">⌫</button>`;
  const doneNextDisabled = (pickerTarget.mode!=='edit' && !cbRoot && !cbNC) ? 'disabled' : '';
  // Bar-> always stays enabled, even with nothing typed -- skipping an
  // empty bar to keep moving is fine (cbCommit is a safe no-op with
  // nothing typed), unlike Done which is about finishing THIS bar.
  const rhythmDisabled = barLocked || barUnitsFor(song.timeSig)===null;
  const hasRhythmMark = b.rhythm && b.rhythm.length>0;

  showSheet(`
    <div class="sheet-header">
      <div class="sheet-header-title">
        <div class="tab-toggle">
          <button class="tab-seg active">Chord</button>
          <button class="tab-seg${hasRhythmMark?' has-mark':''}" ${rhythmDisabled?'disabled':''} onclick="switchToRhythmTab()">Rhythm</button>
        </div>
      </div>
      <button onclick="cbCancel()">✕</button>
    </div>
    ${barActionsHtml()}
    <div class="kb-preview">${previewHtml}</div>
    <div class="sheet-body-text" style="text-align:center;">Tap a key to build the chord</div>
    <div class="kb-grid" style="grid-template-columns:repeat(10,1fr);">${row1}</div>
    <div class="kb-grid" style="grid-template-columns:repeat(11,1fr);">${row2}</div>
    <div class="kb-grid" style="grid-template-columns:repeat(11,1fr);">${row3}</div>
    <div class="sheet-actions">
      <button class="neutral compact" onclick="cbNextBar()">Bar${arrowRightSvg(16)}</button>
      <button class="primary compact" ${doneNextDisabled} onclick="cbDone()">Done</button>
    </div>
  `);
}

function switchToRhythmTab(){
  cbCommit();
  openRhythmBuilder(pickerTarget.barId);
}

function cbPickLetter(letter){
  if(cbInBass){
    cbBass = letter;
    cbHistory.push({t:'bassLetter'});
  } else {
    cbRoot = letter;
    cbHistory.push({t:'root'});
  }
  renderChordKeyboard();
}

// ♭/♯/♮ attaches to whatever was just placed: the root (if it has no
// accidental yet), the bass letter (same rule), or — for anything else,
// most commonly a number like ♭5/♯9/♯11 — it's pushed as its own
// superscript token, landing right where it was typed in the sequence.
function cbAccidental(kind){
  const asciiAcc = kind==='flat' ? 'b' : kind==='sharp' ? '#' : 'n';
  const glyphAcc = kind==='flat' ? '♭' : kind==='sharp' ? '♯' : '♮';
  const top = cbHistory[cbHistory.length-1];
  if(top && top.t==='root' && cbRoot.length===1){
    cbRoot += asciiAcc;
    cbHistory.push({t:'rootAcc'});
  } else if(top && top.t==='bassLetter' && cbBass.length===1){
    cbBass += asciiAcc;
    cbHistory.push({t:'bassAcc'});
  } else {
    cbTokens.push({ch:glyphAcc, sup:true});
    cbHistory.push({t:'token'});
  }
  renderChordKeyboard();
}

function cbPickToken(ch, sup){
  cbTokens.push({ch, sup});
  cbHistory.push({t:'token'});
  renderChordKeyboard();
}

function cbSlash(){
  cbInBass = true;
  cbHistory.push({t:'slash'});
  renderChordKeyboard();
}

// N.C. ("no chord") is a standalone value, not a modifier — picking it
// locks out every other key (see renderChordKeyboard's disabled states)
// until it's backed out again.
function cbPickNC(){
  cbNC = true;
  cbHistory.push({t:'nc'});
  renderChordKeyboard();
}

// Undoes key presses in strict reverse order — a single history stack
// across root, tokens, and bass, not a per-field rule.
function cbBackspace(){
  const last = cbHistory.pop();
  if(!last){
    // Nothing in the builder history to undo -- if the bar itself is
    // marked "%", treat backspace as undoing that (same effect as Clear
    // Bar), same as how it undoes any other typed content.
    const b = findBarById(pickerTarget.barId);
    if(b && b.kind==='repeat'){
      pushSongUndo();
      b.kind = 'chords';
      render();
    }
    renderChordKeyboard();
    return;
  }
  if(last.t==='root') cbRoot = null;
  else if(last.t==='rootAcc') cbRoot = cbRoot.slice(0,1);
  else if(last.t==='token') cbTokens.pop();
  else if(last.t==='slash') cbInBass = false;
  else if(last.t==='bassLetter') cbBass = null;
  else if(last.t==='bassAcc') cbBass = cbBass.slice(0,1);
  else if(last.t==='nc') cbNC = false;
  renderChordKeyboard();
}

function cbClearBar(){
  pushSongUndo();
  const b = findBarById(pickerTarget.barId);
  if(b){ b.kind = 'chords'; b.chords = []; }
  render();
  // Stays open on the same (now empty) bar instead of closing, so clearing
  // a bar flows straight into typing its replacement chord. Active cell goes
  // back to the first, wherever it was.
  pickerTarget.beat = 0;
  resetBuilderState();
  renderChordKeyboard();
}

function cbCancel(){
  closeSheet();
}

// Writes the builder state into the target bar at pickerTarget.beat — exactly
// there, nothing else moves. If nothing was typed (neither cbRoot nor cbNC),
// this means "remove the chord at this cell" in edit mode — the same effect
// the old per-slot Clear had — and is a no-op in add mode. Reachable via
// Bar-> (always enabled, even with nothing typed, so you can skip a bar
// you'll fill in later) — Done stays disabled in that state.
function cbCommit(){
  pushSongUndo();
  const b = findBarById(pickerTarget.barId);
  if(!b) return;
  const beat = pickerTarget.beat;
  if(!cbRoot && !cbNC){
    if(pickerTarget.mode==='edit'){
      const idx = b.chords.findIndex(c=>c.beat===beat);
      if(idx>=0) b.chords.splice(idx,1);   // no re-spacing of the rest
    }
    // Nothing to commit or remove -- leave the bar's kind alone instead of
    // clobbering e.g. a freshly-set "%" bar back to 'chords'.
    return;
  }
  b.kind = 'chords';
  const chordData = cbNC
    ? {nc:true, beat}
    : {root:cbRoot, tokens:cbTokens.map(t=>({...t})), bass:cbBass, beat};
  const idx = b.chords.findIndex(c=>c.beat===beat);
  if(idx>=0) b.chords.splice(idx,1,chordData);
  else b.chords.push(chordData);
}

function firstEmptyBeat(b, n){
  for(let i=0;i<n;i++){
    if(!b.chords.find(c=>c.beat===i)) return i;
  }
  return null;
}

function cbDone(){
  const wasAdd = pickerTarget.mode !== 'edit';
  cbCommit();
  closeSheet();
  render();
  if(wasAdd && !onboardSeen('addAnother')){
    onboardMarkSeen('addAnother');
    setTimeout(()=>{
      showOnboardTip('Nice! Tap this bar again for a second chord, or tap <b>+</b> to add a new bar.', {duration:5500});
    }, 400);
  }
}

// Always advances to the NEXT bar, regardless of room left in this one —
// creates a new bar if this is already the last one, and otherwise falls
// back to Done if the next bar isn't a chords bar or it's already full.
function cbNextBar(){
  cbCommit();
  const idx = song.items.findIndex(it=>it.id===pickerTarget.barId);
  let nextBar = song.items[idx+1];
  if(!nextBar) nextBar = appendNewBar();
  render();
  if(!nextBar || nextBar.kind!=='chords'){ closeSheet(); return; }
  const beat = firstEmptyBeat(nextBar, barSlots(song.timeSig));
  if(beat===null){ closeSheet(); return; }
  pickerTarget = {barId: nextBar.id, mode:'add', beat};
  resetBuilderState();
  renderChordKeyboard();
}

/* ============ Rhythm builder ============ */
let rhythmBuilding = null; // { barId, marks:[{sym,at,tie}], cursor, selected, tiedFromPrevBar, tiedToNextBar }

function barLabelHtml(item){
  if(item.kind!=='chords' || item.chords.length===0) return '';
  return item.chords
    .slice().sort((a,b)=>a.beat-b.beat)
    .map(c=> c.nc ? 'N.C.' : chordInnerHtml(c))
    .join(' ');
}

function openRhythmBuilder(barId){
  const b = findBarById(barId);
  if(!b) return;
  const marks = (b.rhythm || []).map(m => ({...m}));
  rhythmBuilding = {
    barId,
    marks,
    // runs before rhythmBuilding is assigned, so pass the array explicitly
    cursor: firstBlankUnitFrom(0, marks),
    selected: null,
    tiedFromPrevBar: !!b.tiedFromPrevBar,
    tiedToNextBar: !!b.tiedToNextBar
  };
  renderRhythmSheet();
}

// First unit index >= `from` (clamped to barUnits) not covered by any mark.
function firstBlankUnitFrom(from, marks = rhythmBuilding.marks){
  const total = barUnitsFor(song.timeSig) || 16;
  for(let u = Math.min(from, total); u < total; u++){
    const covered = marks.some(m => u >= m.at && u < m.at + SYMS[m.sym].units);
    if(!covered) return u;
  }
  return total;
}
// Units free from `unit` up to the next mark's start (or the bar end); 0 if
// `unit` lands inside a mark that already covers it.
function rhythmGapAt(unit){
  const total = barUnitsFor(song.timeSig) || 16;
  let next = total;
  for(const m of rhythmBuilding.marks){
    if(unit >= m.at && unit < m.at + SYMS[m.sym].units) return 0;
    if(m.at >= unit && m.at < next) next = m.at;
  }
  return next - unit;
}
// Units a mark at index i is allowed to grow into (its own start -> next mark / bar end).
function rhythmSlotGap(i){
  const total = barUnitsFor(song.timeSig) || 16;
  const m = rhythmBuilding.marks[i];
  const nextM = rhythmBuilding.marks[i+1];
  return (nextM ? nextM.at : total) - m.at;
}
function rhythmSetCursor(u){
  if(u === rhythmBuilding.cursor && rhythmBuilding.selected == null) return;
  rhythmBuilding.cursor = u;
  rhythmBuilding.selected = null;
  renderRhythmSheet();
}
function rhythmSelectMark(i){
  if(i === rhythmBuilding.selected) return;
  rhythmBuilding.selected = i;
  renderRhythmSheet();
}
function rhythmDelete(){
  const i = rhythmBuilding.selected;
  if(i==null) return;
  const removedAt = rhythmBuilding.marks[i].at;
  if(i>0) delete rhythmBuilding.marks[i-1].tie;
  rhythmBuilding.marks.splice(i, 1);
  rhythmBuilding.selected = null;
  rhythmBuilding.cursor = removedAt;
  // Only clear the cross-bar flag whose boundary mark actually moved: deleting
  // mark 0 disturbs the tie-in, deleting the last mark disturbs the tie-out.
  // (rhythmSave / rhythmSeqBoxHtml re-validate both against the predicates.)
  if(i === 0) rhythmBuilding.tiedFromPrevBar = false;
  if(i === rhythmBuilding.marks.length) rhythmBuilding.tiedToNextBar = false; // i was the last index before splice
  renderRhythmSheet();
}
function closeRhythmSheet(){
  rhythmBuilding = null;
  closeSheet();
  render();
}
function switchToChordTab(){
  const barId = rhythmBuilding.barId;
  const b = findBarById(barId);
  rhythmBuilding = null;
  const fb = firstEmptyBeat(b, barSlots(song.timeSig));
  pickerTarget = {barId, mode:'add', beat: fb===null ? 0 : fb};
  resetBuilderState();
  renderChordKeyboard();
}
function rhythmUnitsUsed(){
  return rhythmBuilding.marks.reduce((s,m)=>s+SYMS[m.sym].units, 0);
}
// A cross-bar tie is only meaningful at a real boundary note: tiedFromPrevBar
// needs marks[0] to be a non-rest starting at at:0; tiedToNextBar needs the
// last mark to be a non-rest whose span reaches the barline. Shrinking,
// deleting, dotting or replacing a boundary mark can break that — these two
// predicates are the single source of truth, reused by rhythmTieState (set-
// time), rhythmSeqBoxHtml (render-time) and rhythmSave (persist-time).
function rhythmFirstAtStart(){
  const m = rhythmBuilding.marks[0];
  return !!m && m.at === 0 && !SYMS[m.sym].rest;
}
function rhythmLastReachesEnd(){
  const marks = rhythmBuilding.marks;
  const m = marks[marks.length-1];
  if(!m || SYMS[m.sym].rest) return false;
  return m.at + SYMS[m.sym].units === (barUnitsFor(song.timeSig) || 16);
}
// The single Tie control, keyed to the selected mark:
//  - a note with an adjacent following note  -> marks[selected].tie
//  - the last mark, a note ending at the barline -> tiedToNextBar
//  - the first mark, a note at at:0, prev bar exists -> tiedFromPrevBar
function rhythmTieState(){
  const b = rhythmBuilding, i = b.selected;
  if(i == null) return null;
  const m = b.marks[i];
  if(SYMS[m.sym].rest) return null;
  const next = b.marks[i+1];
  if(next && m.at + SYMS[m.sym].units === next.at && !SYMS[next.sym].rest) return 'next';
  if(i === b.marks.length-1 && rhythmLastReachesEnd()) return 'toNextBar';
  if(i === 0 && rhythmFirstAtStart()){
    const idx = song.items.findIndex(it => it.id === b.barId);
    if(idx > 0 && song.items[idx-1].kind === 'chords') return 'fromPrevBar';
  }
  return null;
}
function rhythmTieAvailable(){ return rhythmTieState() != null; }
function rhythmTieActive(){
  const s = rhythmTieState(), b = rhythmBuilding;
  if(s === 'next') return !!b.marks[b.selected].tie;
  if(s === 'toNextBar') return !!b.tiedToNextBar;
  if(s === 'fromPrevBar') return !!b.tiedFromPrevBar;
  return false;
}
function rhythmToggleTie(){
  const s = rhythmTieState(), b = rhythmBuilding;
  if(s === 'next'){
    if(b.marks[b.selected].tie) delete b.marks[b.selected].tie;  // absent, not false — matches how tie is stored everywhere else
    else b.marks[b.selected].tie = true;
  }
  else if(s === 'toNextBar') b.tiedToNextBar = !b.tiedToNextBar;
  else if(s === 'fromPrevBar') b.tiedFromPrevBar = !b.tiedFromPrevBar;
  else return;
  renderRhythmSheet();
}
// The mark the Dot button acts on: the selected mark if there is one, else the
// mark that ends exactly at the cursor (the one rhythmPick just placed, since
// it advances the cursor to right after it) — never a distant mark just
// because nothing is selected. -1 when the cursor isn't immediately after a
// mark; rhythmDotAvailable / rhythmToggleDot both treat -1 as "unavailable".
function rhythmActiveMarkIndex(){
  const b = rhythmBuilding;
  if(b.selected != null) return b.selected;
  return b.marks.findIndex(m => m.at + SYMS[m.sym].units === b.cursor);
}
function rhythmDotAvailable(){
  const i = rhythmActiveMarkIndex();
  if(i < 0) return false;
  const m = rhythmBuilding.marks[i];
  const toggled = dotToggleKey(m.sym);
  if(!toggled) return false;
  if(SYMS[m.sym].dotted) return true;
  return SYMS[toggled].units <= rhythmSlotGap(i);
}
function rhythmToggleDot(){
  if(!rhythmDotAvailable()) return;
  const i = rhythmActiveMarkIndex();
  rhythmBuilding.marks[i].sym = dotToggleKey(rhythmBuilding.marks[i].sym);
  delete rhythmBuilding.marks[i].tie;   // duration changed — drop a now-maybe-invalid tie
  // Dotting preserves the mark's `at` and rest-ness, so mark 0 staying at at:0
  // keeps tiedFromPrevBar valid — but the last mark's span changes, so its
  // reach to the barline (tiedToNextBar) may not survive.
  if(i === rhythmBuilding.marks.length-1) rhythmBuilding.tiedToNextBar = false;
  renderRhythmSheet();
}
function rhythmPaletteHtml(){
  const b = rhythmBuilding;
  const gap = b.selected != null ? rhythmSlotGap(b.selected) : rhythmGapAt(b.cursor);
  const selSym = b.selected != null ? b.marks[b.selected].sym : null;
  // "dot is on" tracks whichever mark the Dot button would actually act on
  // (rhythmActiveMarkIndex), so the highlight can't disagree with the button's
  // enabled state — e.g. after the cursor moves off a just-placed dotted mark.
  const dotIdx = rhythmActiveMarkIndex();
  const dotOn = dotIdx >= 0 && SYMS[b.marks[dotIdx].sym].dotted;
  const noteBtns = RHYTHM_NOTE_KEYS.map(k=>{
    const n = SYMS[k];
    const on = selSym && SYMS[k].base===SYMS[selSym].base && !SYMS[k].dotted ? ' tie-armed' : '';
    return `<button type="button" class="pt-btn${on}" title="${n.name}" ${n.units>gap?'disabled':''} onclick="rhythmPick('${k}')">${iconSvg(k,28)}</button>`;
  }).join('');
  const dotBtn = `<button type="button" class="pt-btn${dotOn?' tie-armed':''}" title="Dot" ${rhythmDotAvailable()?'':'disabled'} onclick="rhythmToggleDot()">${dotIconSvg(14)}</button>`;
  const restBtns = RHYTHM_REST_KEYS.map(k=>{
    const r = SYMS[k];
    return `<button type="button" class="pt-btn" title="${r.name}" ${r.units>gap?'disabled':''} onclick="rhythmPick('${k}')">${iconSvg(k,28)}</button>`;
  }).join('');
  return `<div class="palette-row">${noteBtns}${dotBtn}</div><div class="palette-row">${restBtns}</div>`;
}
function rhythmSeqBoxHtml(units){
  const b = rhythmBuilding;
  const groups = groupForBeaming(b.marks);
  const bounds = beatGroupBounds(song.timeSig);
  const lastGroupStart = groups.length ? groups[groups.length-1].start : -1;
  let html = '';
  let u = 0;
  while(u < units){
    const g = groups.find(gr => gr.start === u);
    if(g){
      const lastIdx = g.type==='beam' ? g.seqStart + g.keys.length - 1 : g.seqStart;
      const tiedIn = g.seqStart>0 ? !!b.marks[g.seqStart-1].tie : (rhythmFirstAtStart() && !!b.tiedFromPrevBar);
      const isLastGroup = g.start === lastGroupStart;
      const tiedOut = (isLastGroup && !b.marks[lastIdx].tie)
        ? (rhythmLastReachesEnd() && !!b.tiedToNextBar)
        : !!b.marks[lastIdx].tie;
      const sel = (b.selected!=null && b.selected>=g.seqStart && b.selected<=lastIdx) ? ' selected' : '';
      const cls = 'seq-cell filled' + sel + (tiedIn?' tied-in':'') + (tiedOut?' tied-out':'');
      // Tapping a beam group selects its first mark; tapping it again cycles
      // forward through the group's marks (and wraps) so the 2nd+ notes of a
      // beamed run are reachable for per-mark palette/Dot/Tie/Delete edits.
      const groupIdxs = g.type === 'beam'
        ? Array.from({length: g.keys.length}, (_, k) => g.seqStart + k)
        : [g.seqStart];
      const nextSel = (b.selected != null && groupIdxs.includes(b.selected))
        ? groupIdxs[(groupIdxs.indexOf(b.selected) + 1) % groupIdxs.length]
        : groupIdxs[0];
      html += `<div class="${cls}" style="grid-column:${g.start+1} / span ${g.units}" onclick="rhythmSelectMark(${nextSel})">`
            + (g.type==='beam' ? beamGroupSvg(g.keys,28) : iconSvg(g.key,28)) + `</div>`;
      u += Math.max(1, g.units);   // g.units is 0 for an unknown sym (corrupt data) — never let u stall
    } else {
      const cur = u === b.cursor ? ' cursor' : '';
      const beatEnd = bounds.includes(u+1) ? ' beat-end' : '';
      html += `<div class="seq-cell empty${cur}${beatEnd}" onclick="rhythmSetCursor(${u})"></div>`;
      u += 1;
    }
  }
  return html;
}
function renderRhythmSheet(){
  const b = findBarById(rhythmBuilding.barId);
  if(!b){ closeRhythmSheet(); return; }
  const units = barUnitsFor(song.timeSig) || 16;
  const used = rhythmUnitsUsed();
  const label = barLabelHtml(b);
  const tieAvailable = rhythmTieAvailable();
  const hasMarks = rhythmBuilding.marks.length > 0;
  const canDelete = rhythmBuilding.selected != null;
  showSheet(`
    <div class="sheet-header">
      <div class="sheet-header-title">
        <div class="tab-toggle">
          <button class="tab-seg" onclick="switchToChordTab()">Chord</button>
          <button class="tab-seg active">Rhythm</button>
        </div>
        ${label ? `<span class="sheet-header-sub">${label}</span>` : ''}
      </div>
      <button onclick="closeRhythmSheet()">✕</button>
    </div>
    <div class="seq-box" style="grid-template-columns:repeat(${units},1fr);">${rhythmSeqBoxHtml(units)}</div>
    <div class="seq-caption">${remainingLabel(units-used)}</div>
    ${rhythmPaletteHtml()}
    <div class="sheet-actions">
      <button class="neutral compact${rhythmTieActive()?' tie-armed':''}" title="Tie" ${tieAvailable?'':'disabled'} onclick="rhythmToggleTie()">${tieIconSvg(20)}</button>
      <button class="neutral compact" title="Delete" ${canDelete?'':'disabled'} onclick="rhythmDelete()">${svgIcon('eraser',18)}</button>
      <button class="neutral compact" title="Undo" ${hasMarks?'':'disabled'} onclick="rhythmUndo()">${svgIcon('undo',18)}</button>
      <button class="neutral compact" title="Clear" ${hasMarks?'':'disabled'} onclick="rhythmClear()">✕</button>
      ${b.rhythm ? '<button class="danger compact" title="Remove" onclick="rhythmRemove()">🗑️</button>' : ''}
      <button class="primary compact" title="Done" ${hasMarks?'':'disabled'} onclick="rhythmSave()">Done</button>
    </div>
  `);
  // Navigation taps (rhythmSetCursor / rhythmSelectMark) funnel through here
  // too, and this render() is purely to preview the in-progress sentence on the
  // chart behind the sheet — not a content edit. Suppress autosave so a plain
  // cursor move doesn't mark the song dirty and fork an "(unsynced edit)"
  // duplicate. The real mutation path (rhythmSave -> closeRhythmSheet) runs its
  // own unsuppressed render().
  suppressAutosave = true; render(); suppressAutosave = false;
}
function rhythmPick(key){
  const b = rhythmBuilding;
  const units = SYMS[key].units;
  if(b.selected != null){
    if(units > rhythmSlotGap(b.selected)) return;
    b.marks[b.selected].sym = key;
    delete b.marks[b.selected].tie;   // duration changed — drop a now-maybe-invalid outgoing tie
    // …and if it's now a rest, the previous note can't tie into it either.
    if(SYMS[key].rest && b.selected > 0) delete b.marks[b.selected-1].tie;
    // Replacing mark 0 with another note at at:0 keeps tiedFromPrevBar valid;
    // only a rest breaks it. The last mark's duration/rest-ness may change
    // either way, so always re-check tiedToNextBar (rhythmSave re-validates).
    if(b.selected === 0 && SYMS[key].rest) b.tiedFromPrevBar = false;
    if(b.selected === b.marks.length-1) b.tiedToNextBar = false;
    renderRhythmSheet();
    return;
  }
  if(units > rhythmGapAt(b.cursor)) return;
  const mark = { sym:key, at:b.cursor };
  let ins = b.marks.findIndex(m => m.at > b.cursor);
  if(ins < 0) ins = b.marks.length;
  b.marks.splice(ins, 0, mark);
  b.selected = null;   // like the chord grid: advance the cursor, don't select — tap the mark to edit it
  b.cursor = firstBlankUnitFrom(b.cursor + units);
  renderRhythmSheet();
}
function rhythmUndo(){
  const marks = rhythmBuilding.marks;
  if(!marks.length) return;
  const removedAt = marks[marks.length-1].at;   // marks are kept sorted ascending by rhythmPick
  marks.pop();
  if(marks.length) delete marks[marks.length-1].tie;
  rhythmBuilding.selected = null;
  rhythmBuilding.cursor = removedAt;
  // pop() only ever removes the last mark, so only the tie-out is at risk —
  // unless the bar is now empty, which invalidates the tie-in too.
  rhythmBuilding.tiedToNextBar = false;
  if(!marks.length) rhythmBuilding.tiedFromPrevBar = false;
  renderRhythmSheet();
}
function rhythmClear(){
  rhythmBuilding.marks = [];
  rhythmBuilding.tiedFromPrevBar = false;
  rhythmBuilding.tiedToNextBar = false;
  rhythmBuilding.cursor = 0;
  rhythmBuilding.selected = null;
  renderRhythmSheet();
}
function rhythmSave(){
  pushSongUndo();
  const b = findBarById(rhythmBuilding.barId);
  if(b){
    if(rhythmBuilding.marks.length === 0){
      b.rhythm = null;
      b.tiedFromPrevBar = false;
      b.tiedToNextBar = false;
    } else {
      b.rhythm = rhythmBuilding.marks.map(m => ({...m}));
      // Re-validate the cross-bar flags against the boundary marks — a shrink/
      // delete/dot since the flag was set may have made them meaningless.
      b.tiedFromPrevBar = rhythmBuilding.tiedFromPrevBar && rhythmFirstAtStart();
      b.tiedToNextBar = rhythmBuilding.tiedToNextBar && rhythmLastReachesEnd();
    }
    if('rhythmTies' in b) delete b.rhythmTies;
  }
  closeRhythmSheet();
}
function rhythmRemove(){
  pushSongUndo();
  const b = findBarById(rhythmBuilding.barId);
  if(b){
    b.rhythm = null;
    b.tiedFromPrevBar = false;
    b.tiedToNextBar = false;
    if('rhythmTies' in b) delete b.rhythmTies;
  }
  closeRhythmSheet();
}

/* ============ Border editing (type + optional section label) ============ */
function openBorderEdit(idx){
  if(mode!=='chords') return;
  hideOnboardTip();
  document.querySelectorAll('.border-line.pulse').forEach(el=>el.classList.remove('pulse'));
  showSheet(`
    <div class="sheet-header"><span>Bar line</span><button onclick="closeSheet()">✕</button></div>
    <div class="barline-grid">
      ${BARLINE_TYPES.map(t=>`<button onclick="setBorderType(${idx},'${t.type}')"><div class="border-line">${borderGlyphHtml(t.type)}</div></button>`).join('')}
    </div>
    <div class="sheet-subhead">Section label</div>
    <div class="symbol-grid compact six-col">
      ${SECTION_LETTERS.map(l=>`<button onclick="setLabel(${idx},'${l}')">${l}</button>`).join('')}
      ${NAMED_SECTIONS.map(n=>`<button onclick="setLabel(${idx},'${n}')">${n}</button>`).join('')}
      <button onclick="openCustomLabelEdit(${idx})">Custom…</button>
      <button class="clear-label-btn" onclick="setLabel(${idx},null)">⌫ Clear</button>
    </div>
    <div class="sheet-subhead">Navigation</div>
    <div class="symbol-grid compact six-col">
      ${NAV_MARK_TYPES.map(t=>{
        if(t.type==='segno') return `<button class="icon-only" onclick="setBorderMark(${idx},'segno')">${segnoSvg(18)}</button>`;
        if(t.type==='coda') return `<button class="icon-only" onclick="setBorderMark(${idx},'coda')">${codaSvg(18)}</button>`;
        return `<button onclick="setBorderMark(${idx},'${t.type}')">${t.label}</button>`;
      }).join('')}
      <button class="clear-label-btn" onclick="setBorderMark(${idx},null)">⌫ Clear</button>
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
// Segno/Coda/D.C./D.S./Fine/To Coda (see NAV_MARK_TYPES) are independent of
// the barline stroke (BARLINE_TYPES), but mutually exclusive with each other
// — a bar line carries at most one navigation mark. Tapping the currently-set
// mark again clears it.
function setBorderMark(idx, mark){
  pushSongUndo();
  const b = song.borders[idx];
  b.mark = (b.mark === mark) ? null : mark;
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

function startDraw(e){
  if(mode==='chords') return;
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

/* ============ Welcome screen ============ */
function showWelcome(){
  document.getElementById('app').classList.add('hidden');
  document.getElementById('welcomeScreen').classList.remove('hidden');
}
function showEditor(){
  document.getElementById('welcomeScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  // Signed-in users have no "back" destination other than the editor
  // itself -- My Songs opens as a sheet from here, it isn't a separate
  // screen -- so the icon only makes sense for guests leaving to Welcome.
  document.getElementById('backIcon').style.display = (typeof isSignedIn==='function' && isSignedIn()) ? 'none' : '';
  requestAnimationFrame(()=>{
    applyResponsiveLayout();
    resizeCanvasPreserving();
  });
  if(!onboardSeen('welcome')){
    onboardMarkSeen('welcome');
    setTimeout(()=>{
      if(isPhoneLayout()){
        showOnboardTip('Welcome! Tap <b>More</b>, then <b>Clear Page</b>, to start your own chart.', {arrowAction:'more', duration:6500});
      } else {
        showOnboardTip('Welcome! Tap <b>Clear Page</b> in the toolbar to start your own chart.', {duration:6000});
      }
    }, 600);
  }
}
function continueAsGuest(){ showEditor(); }
function handleBackButton(){
  showWelcome();
}
function attemptSignIn(){
  const msg = document.getElementById('welcomeMsg');
  if(!navigator.onLine){ msg.textContent = "You're offline — sign in once you have a connection."; return; }
  const email = document.getElementById('welcomeEmail').value.trim();
  const password = document.getElementById('welcomePassword').value;
  if(!email || !password){ msg.textContent = 'Enter your email and password.'; return; }
  msg.textContent = 'Signing in…';
  signInWithPassword(email, password).then(({error})=>{
    if(error) msg.textContent = error.message;
  });
}
function attemptSignUp(){
  const msg = document.getElementById('welcomeMsg');
  if(!navigator.onLine){ msg.textContent = "You're offline — sign in once you have a connection."; return; }
  const email = document.getElementById('welcomeEmail').value.trim();
  const password = document.getElementById('welcomePassword').value;
  if(!email || !password){ msg.textContent = 'Enter an email and password to create an account.'; return; }
  msg.textContent = 'Creating account…';
  signUpWithPassword(email, password).then(({error})=>{
    msg.textContent = error ? error.message : 'Check your email to confirm your account, then sign in.';
  });
}
function attemptGoogleSignIn(){
  const msg = document.getElementById('welcomeMsg');
  if(!navigator.onLine){ msg.textContent = "You're offline — sign in once you have a connection."; return; }
  signInWithGoogle();
}

/* ============ Init ============ */
window.addEventListener('resize', ()=>requestAnimationFrame(()=>{
  applyResponsiveLayout();
  resizeCanvasPreserving();
}));
window.addEventListener('beforeprint', applyResponsiveLayout);
window.addEventListener('afterprint', ()=>requestAnimationFrame(applyResponsiveLayout));
window.addEventListener('online', ()=>{ if(typeof requestSync==='function') requestSync(); });
setInterval(()=>{ if(typeof requestSync==='function') requestSync(); }, 60000);

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
  document.getElementById('topRedoIcon').innerHTML = svgIcon('redo');
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
