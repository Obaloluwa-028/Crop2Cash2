window.C2C = (() => {
  const STORAGE = "crop2cash_config_v1";
  function getConfig() {
    try { return JSON.parse(localStorage.getItem(STORAGE) || "{}"); } catch { return {}; }
  }
  function saveConfig(cfg) { localStorage.setItem(STORAGE, JSON.stringify(cfg)); }
  function hasSupabase() { const c=getConfig(); return !!(c.supabaseUrl && c.supabaseKey); }
  function hasGemini() { const c=getConfig(); return !!c.geminiKey; }
  function client() {
    const c=getConfig();
    if (!c.supabaseUrl || !c.supabaseKey) throw new Error("Supabase is not configured. Open Setup first.");
    if (!window.supabase?.createClient) throw new Error("Supabase library did not load.");
    return window.supabase.createClient(c.supabaseUrl, c.supabaseKey, { auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }});
  }
  async function requireUser() {
    if (!hasSupabase()) { window.location.href="setup.html"; return null; }
    const sb=client();
    const {data:{session}}=await sb.auth.getSession();
    if (!session) { window.location.href="auth.html"; return null; }
    return {sb,user:session.user};
  }
  async function signedInRedirect() {
    if (!hasSupabase()) return;
    try {
      const sb=client(); const {data:{session}}=await sb.auth.getSession();
      if (session && location.pathname.endsWith("/auth.html")) location.href="dashboard.html";
    } catch {}
  }
  function money(n) { return `₦${Math.round(Number(n)||0).toLocaleString("en-NG")}`; }
  function esc(v) { return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }
  function msg(id,text,type="") { const el=document.getElementById(id); if(!el)return; el.textContent=text; el.className=`form-msg ${type}`; }
  function openMobileNav(){document.querySelector(".sidebar")?.classList.toggle("open")}
  document.addEventListener("DOMContentLoaded",()=>document.getElementById("openNav")?.addEventListener("click",openMobileNav));
  return {getConfig,saveConfig,hasSupabase,hasGemini,client,requireUser,signedInRedirect,money,esc,msg};
})();