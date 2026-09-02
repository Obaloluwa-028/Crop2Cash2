(async()=>{
  const ctx=await C2C.requireUser();if(!ctx)return;const {sb,user}=ctx;
  const meta=user.user_metadata||{};document.getElementById("userLine").textContent=meta.full_name||meta.username||user.email||"Farmer";
  const h=new Date().getHours();document.getElementById("greeting").textContent=h<12?"Good morning.":h<18?"Good afternoon.":"Good evening.";
  const [{data:analyses,error:aErr},{count:marketsCount,error:mErr}]=await Promise.all([
    sb.from("harvest_analyses").select("*").order("created_at",{ascending:false}),
    sb.from("market_quotes").select("*",{count:"exact",head:true})
  ]);
  if(aErr){C2C.msg("recentList",aErr.message,"error");return}
  document.getElementById("statAnalyses").textContent=(analyses||[]).length;
  const total=(analyses||[]).reduce((s,x)=>s+Number(x.expected_net_value||0),0);document.getElementById("statValue").textContent=C2C.money(total);
  const scored=(analyses||[]).filter(x=>x.confidence!=null);document.getElementById("statConfidence").textContent=scored.length?`${Math.round(scored.reduce((s,x)=>s+Number(x.confidence),0)/scored.length)}%`:"—";
  document.getElementById("statMarkets").textContent=mErr?"—":(marketsCount||0);
  const recent=document.getElementById("recentList");
  if(!(analyses||[]).length){recent.innerHTML=`<div class="empty-state">No analyses yet. Start with your first harvest.</div>`;return}
  recent.innerHTML=analyses.slice(0,5).map(x=>`<div class="record-row"><div><strong>${C2C.esc(x.crop_name)}</strong><small>${C2C.esc(x.quantity)} ${C2C.esc(x.unit)} · ${C2C.esc(x.harvest_date||"")}</small></div><div class="record-actions"><span class="badge">${C2C.esc(x.recommended_action||"SAVED")}</span><a class="btn ghost" href="result.html?id=${encodeURIComponent(x.id)}">Open</a></div></div>`).join("");
  document.getElementById("logoutBtn").onclick=async()=>{await sb.auth.signOut();location.href="index.html"};
})();