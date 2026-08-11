/* ============ Sync engine ============ */
let syncInFlight = false;
let syncQueued = false;

function requestSync(){
  if(syncInFlight){ syncQueued = true; return; }
  runSync();
}

async function runSync(){
  const session = await getSession();
  if(!session || !navigator.onLine) return;
  syncInFlight = true;
  try{
    await pushDirtySongs(session.user.id);
    await pushPendingDeletes();
    await pullRemoteChanges(session.user.id);
  } catch(e){
    console.error('sync failed', e);
  } finally {
    syncInFlight = false;
    if(syncQueued){ syncQueued = false; runSync(); }
  }
}

async function pushDirtySongs(userId){
  const all = await dbGetAllSongs();
  const dirty = all.filter(s=>s.dirty);
  for(const rec of dirty){
    const { error } = await sb.from('songs').upsert({
      id: rec.id,
      owner_id: userId,
      title: rec.title,
      data: JSON.parse(rec.data),
      updated_at: new Date(rec.updatedAt).toISOString()
    });
    if(!error){
      rec.dirty = false;
      await dbPutSong(rec);
    }
  }
}

async function pushPendingDeletes(){
  const deletedIds = (await dbGetMeta('deletedIds')) || [];
  if(deletedIds.length===0) return;
  const { error } = await sb.from('songs').delete().in('id', deletedIds);
  if(!error) await dbSetMeta('deletedIds', []);
}

async function pullRemoteChanges(userId){
  const lastSync = (await dbGetMeta('lastSyncedAt')) || 0;
  const { data, error } = await sb.from('songs')
    .select('*')
    .eq('owner_id', userId)
    .gt('updated_at', new Date(lastSync).toISOString());
  if(error || !data) return;

  for(const row of data){
    const remoteUpdatedAt = new Date(row.updated_at).getTime();
    const localRec = await dbGetSong(row.id);

    if(!localRec || !localRec.dirty){
      await dbPutSong({
        id: row.id, title: row.title, data: JSON.stringify(row.data),
        updatedAt: remoteUpdatedAt, dirty: false
      });
      if(row.id === currentSongId){
        song = row.data;
        updateHeader();
        syncTitleDisplay();
        render();
      }
    } else {
      const copyId = crypto.randomUUID();
      await dbPutSong({
        id: copyId, title: row.title + ' (synced copy)', data: JSON.stringify(row.data),
        updatedAt: remoteUpdatedAt, dirty: false
      });
    }
  }
  await dbSetMeta('lastSyncedAt', Date.now());
}
