/* ============ Local database (IndexedDB) ============ */
const LOCAL_DB_NAME = 'leadsheet-db';
const LOCAL_DB_VERSION = 1;
let localDbPromise = null;

function openLocalDb(){
  if(localDbPromise) return localDbPromise;
  localDbPromise = new Promise((resolve, reject)=>{
    const req = indexedDB.open(LOCAL_DB_NAME, LOCAL_DB_VERSION);
    req.onupgradeneeded = ()=>{
      const db = req.result;
      if(!db.objectStoreNames.contains('songs')) db.createObjectStore('songs', {keyPath:'id'});
      if(!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', {keyPath:'key'});
    };
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  });
  return localDbPromise;
}

function dbGetAllSongs(){
  return openLocalDb().then(db=>new Promise((resolve, reject)=>{
    const req = db.transaction('songs','readonly').objectStore('songs').getAll();
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  }));
}

function dbGetSong(id){
  return openLocalDb().then(db=>new Promise((resolve, reject)=>{
    const req = db.transaction('songs','readonly').objectStore('songs').get(id);
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  }));
}

function dbPutSong(record){
  return openLocalDb().then(db=>new Promise((resolve, reject)=>{
    const tx = db.transaction('songs','readwrite');
    tx.objectStore('songs').put(record);
    tx.oncomplete = ()=>resolve();
    tx.onerror = ()=>reject(tx.error);
  }));
}

function dbDeleteSong(id){
  return openLocalDb().then(db=>new Promise((resolve, reject)=>{
    const tx = db.transaction('songs','readwrite');
    tx.objectStore('songs').delete(id);
    tx.oncomplete = ()=>resolve();
    tx.onerror = ()=>reject(tx.error);
  }));
}

function dbGetMeta(key){
  return openLocalDb().then(db=>new Promise((resolve, reject)=>{
    const req = db.transaction('meta','readonly').objectStore('meta').get(key);
    req.onsuccess = ()=>resolve(req.result ? req.result.value : undefined);
    req.onerror = ()=>reject(req.error);
  }));
}

function dbSetMeta(key, value){
  return openLocalDb().then(db=>new Promise((resolve, reject)=>{
    const tx = db.transaction('meta','readwrite');
    tx.objectStore('meta').put({key, value});
    tx.oncomplete = ()=>resolve();
    tx.onerror = ()=>reject(tx.error);
  }));
}

/* ============ Current song tracking + local-first save ============ */
let currentSongId = null;
let localSaveTimer = null;
let suppressAutosave = false; // true while programmatically loading a song, so opening/pulling it doesn't mark it dirty

function scheduleLocalSave(){
  if(!currentSongId || suppressAutosave) return;
  clearTimeout(localSaveTimer);
  localSaveTimer = setTimeout(persistCurrentSong, 400);
}

function persistCurrentSong(){
  if(!currentSongId) return Promise.resolve();
  const record = {
    id: currentSongId,
    title: song.title,
    data: snapshotSongStr(),
    updatedAt: Date.now(),
    dirty: true
  };
  return dbPutSong(record).then(()=>{
    if(typeof requestSync==='function') requestSync();
  });
}

/* ============ Song library actions ============ */
function loadSongIntoEditor(id){
  return dbGetSong(id).then(record=>{
    if(!record) return;
    suppressAutosave = true;
    song = JSON.parse(record.data);
    currentSongId = record.id;
    undoStack.length = 0; // undo history belongs to whichever song was open when it was recorded --
    redoStack.length = 0; // carrying it across a song switch could apply another song's snapshot here
    updateHeader();
    syncTitleDisplay();
    clearInkRaw();
    render();
    suppressAutosave = false;
    showEditor();
  });
}

function createNewSongAndOpen(){
  const id = crypto.randomUUID();
  song = blankSong();
  currentSongId = id;
  undoStack.length = 0;
  redoStack.length = 0;
  updateHeader();
  syncTitleDisplay();
  clearInkRaw();
  render();
  showEditor();
  return persistCurrentSong();
}

function deleteSongFromLibrary(id){
  return dbDeleteSong(id).then(async ()=>{
    const deletedIds = (await dbGetMeta('deletedIds')) || [];
    deletedIds.push(id);
    await dbSetMeta('deletedIds', deletedIds);
    if(id === currentSongId) currentSongId = null; // stop further edits from resurrecting what was just deleted
    if(typeof requestSync==='function') requestSync();
  });
}
