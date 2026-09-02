const formEls = {
  url: document.getElementById("supabaseUrl"), key: document.getElementById("supabaseKey"),
  gemini: document.getElementById("geminiKey"), model: document.getElementById("geminiModel"),
  msg: document.getElementById("setupMsg")
};
const cfg = (()=>{try{return JSON.parse(localStorage.getItem("crop2cash_config_v1")||"{}")}catch{return{}}})();
formEls.url.value=cfg.supabaseUrl||"";formEls.key.value=cfg.supabaseKey||"";formEls.gemini.value=cfg.geminiKey||"";formEls.model.value=cfg.geminiModel||"gemini-3.7-flash";

function writeMsg(t,type=""){formEls.msg.textContent=t;formEls.msg.className=`form-msg ${type}`}
document.getElementById("saveSetup").addEventListener("click",()=>{
  const supabaseUrl=formEls.url.value.trim().replace(/\/$/,""); const supabaseKey=formEls.key.value.trim();
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl)) return writeMsg("Enter a valid Supabase project URL.","error");
  if(!supabaseKey) return writeMsg("Enter your Supabase publishable key.","error");
  C2C?.saveConfig({supabaseUrl,supabaseKey,geminiKey:formEls.gemini.value.trim(),geminiModel:formEls.model.value.trim()||"gemini-3.7-flash"});
  writeMsg("Saved. The app is now configured in this browser.","success");
});
document.getElementById("testSetup").addEventListener("click",async()=>{
  writeMsg("Testing Supabase…");
  const url=formEls.url.value.trim();const key=formEls.key.value.trim();
  try{
    if(!url||!key) throw new Error("Enter the Supabase URL and publishable key first.");
    const sb=window.supabase.createClient(url,key);
    const {error}=await sb.auth.getSession();
    if(error) throw error;
    writeMsg("Supabase connection is working.","success");
  }catch(e){writeMsg(e.message||"Could not test the connection.","error")}
});