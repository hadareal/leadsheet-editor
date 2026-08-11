/* ============ Supabase client ============ */
// The Supabase CDN script is cross-origin and never cached by the service
// worker (same gotcha as html2canvas/fonts), so it can genuinely fail to
// load. Without this guard, `supabase` being undefined would throw here,
// leaving every later `const`/`let` in this file uninitialized -- which
// broke the ENTIRE app, including guest mode, since renderToolbars() (called
// unconditionally at startup) calls isSignedIn() regardless of sign-in state.
let sb = null;
try{
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}catch(e){
  console.error('Supabase client failed to initialize (offline or the CDN is unreachable?)', e);
}
const AUTH_UNAVAILABLE = { error: { message: "Sign-in isn't available right now (offline or connection issue)." } };

let currentUser = null;
function isSignedIn(){ return !!currentUser; }

function getSession(){
  if(!sb) return Promise.resolve(null);
  return sb.auth.getSession().then(({data})=>data.session);
}

/* ============ Sign in / up / out ============ */
function signInWithGoogle(){
  if(!sb) return Promise.resolve(AUTH_UNAVAILABLE);
  return sb.auth.signInWithOAuth({ provider: 'google' });
}
function signUpWithPassword(email, password){
  if(!sb) return Promise.resolve(AUTH_UNAVAILABLE);
  return sb.auth.signUp({ email, password });
}
function signInWithPassword(email, password){
  if(!sb) return Promise.resolve(AUTH_UNAVAILABLE);
  return sb.auth.signInWithPassword({ email, password });
}
async function signOutUser(){
  if(navigator.onLine && typeof runSync==='function'){
    await runSync().catch(()=>{});
  }
  const dirtySongs = (await dbGetAllSongs()).filter(s=>s.dirty);
  if(dirtySongs.length && !confirm(`${dirtySongs.length} song(s) haven't finished syncing yet. Sign out anyway? Those changes will be lost from this device.`)){
    return;
  }
  if(!sb){ currentUser = null; closeSheet(); showWelcome(); return; }
  return sb.auth.signOut().then(()=>{
    currentUser = null;
    // Reset the editor itself, not just the account -- otherwise "Continue
    // as Guest" right after would still be showing/editing this account's
    // last-open song (a privacy leak on a shared device).
    currentSongId = null;
    song = blankSong();
    undoStack.length = 0;
    redoStack.length = 0;
    clearInkRaw();
    setSaveStatus('');
    updateHeader();
    syncTitleDisplay();
    render();
    closeSheet();
    showWelcome();
    if(typeof renderToolbars==='function') renderToolbars();
  });
}

/* ============ Routing after sign-in ============ */
async function handleSignedIn(session){
  const lastUserId = await dbGetMeta('lastSignedInUserId');
  if(lastUserId && lastUserId !== session.user.id){
    const staleSongs = await dbGetAllSongs();
    const staleDirty = staleSongs.filter(s=>s.dirty);
    if(staleDirty.length && !confirm(`This device has ${staleDirty.length} song(s) from a previous account that haven't finished syncing yet. Switching accounts will permanently delete them from this device. Continue?`)){
      await sb.auth.signOut(); // back out of the new sign-in; leave the previous account's data untouched
      showWelcome();
      return;
    }
    for(const rec of staleSongs) await dbDeleteSong(rec.id);
    await dbSetMeta('lastSyncedAt', 0);
    await dbSetMeta('deletedIds', []); // per-account tombstones -- don't let a stale delete queue leak across accounts
    currentSongId = null;
    song = blankSong();
    undoStack.length = 0;
    redoStack.length = 0;
    clearInkRaw();
    setSaveStatus('');
  }
  currentUser = session.user;
  await dbSetMeta('lastSignedInUserId', session.user.id);
  updateHeader();
  syncTitleDisplay();
  render();
  showEditor();
  if(typeof renderToolbars==='function') renderToolbars();
  openMySongsSheet();
  if(typeof requestSync==='function') requestSync();
}

if(sb){
  sb.auth.onAuthStateChange((event, session)=>{
    if(!session) return;
    if(event==='SIGNED_IN' || event==='INITIAL_SESSION'){
      handleSignedIn(session);
    } else {
      currentUser = session.user; // e.g. TOKEN_REFRESHED -- stay current without disrupting whatever the user's doing
    }
  });
}
