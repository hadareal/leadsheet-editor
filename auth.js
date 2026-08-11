/* ============ Supabase client ============ */
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
function isSignedIn(){ return !!currentUser; }

function getSession(){
  return sb.auth.getSession().then(({data})=>data.session);
}

/* ============ Sign in / up / out ============ */
function signInWithGoogle(){
  return sb.auth.signInWithOAuth({ provider: 'google' });
}
function signUpWithPassword(email, password){
  return sb.auth.signUp({ email, password });
}
function signInWithPassword(email, password){
  return sb.auth.signInWithPassword({ email, password });
}
function signOutUser(){
  return sb.auth.signOut().then(()=>{
    currentUser = null;
    closeSheet();
    showWelcome();
    if(typeof renderToolbars==='function') renderToolbars();
  });
}

/* ============ Routing after sign-in ============ */
async function handleSignedIn(session){
  currentUser = session.user;
  const lastUserId = await dbGetMeta('lastSignedInUserId');
  if(lastUserId && lastUserId !== session.user.id){
    const staleSongs = await dbGetAllSongs();
    for(const rec of staleSongs) await dbDeleteSong(rec.id);
    await dbSetMeta('lastSyncedAt', 0);
  }
  await dbSetMeta('lastSignedInUserId', session.user.id);
  showEditor();
  if(typeof renderToolbars==='function') renderToolbars();
  openMySongsSheet();
  if(typeof requestSync==='function') requestSync();
}

sb.auth.onAuthStateChange((event, session)=>{
  if(session) handleSignedIn(session);
});
