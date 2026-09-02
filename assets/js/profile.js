(async()=>{
 const ctx=await C2C.requireUser();if(!ctx)return;const {sb,user}=ctx;const {data,error}=await sb.from("profiles").select("*").eq("id",user.id).single();if(error){C2C.msg("profileMsg",error.message,"error");return}
 document.getElementById("fullName").value=data?.full_name||user.user_metadata?.full_name||"";document.getElementById("username").value=data?.username||user.user_metadata?.username||"";document.getElementById("email").value=user.email||"";
 const cfg=C2C.getConfig();document.getElementById("serviceStatus").textContent=`Supabase: ${C2C.hasSupabase()?"connected":"not configured"} · Gemini: ${C2C.hasGemini()?"configured":"not configured"} · Model: ${cfg.geminiModel||"default"}`;
 document.getElementById("saveProfile").onclick=async()=>{C2C.msg("profileMsg","Saving…");const {error:e}=await sb.from("profiles").upsert({id:user.id,full_name:document.getElementById("fullName").value.trim(),username:document.getElementById("username").value.trim().toLowerCase()});if(e)return C2C.msg("profileMsg",e.message,"error");C2C.msg("profileMsg","Saved.","success")};
 document.getElementById("logoutBtn").onclick=async()=>{await sb.auth.signOut();location.href="index.html"}
})();