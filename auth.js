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
  });
}
