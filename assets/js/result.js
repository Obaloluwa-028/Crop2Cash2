(async()=>{
 const ctx=await C2C.requireUser();if(!ctx)return;const {sb}=ctx;const id=new URLSearchParams(location.search).get("id");
 if(!id){location.href="history.html";return}
 const {data,error}=await sb.from("harvest_analyses").select("*").eq("id",id).single();if(error){document.getElementById("resultLoading").textContent=error.message;return}
 document.getElementById("resultLoading").classList.add("hidden");document.getElementById("resultContent").classList.remove("hidden");
 document.getElementById("resultTitle").textContent=`${data.crop_name} · ${data.quantity} ${data.unit}`;
 document.getElementById("resultSub").textContent=`${data.harvest_date||"No date"} · ${data.location||"Location not specified"}`;
 document.getElementById("action").textContent=data.recommended_action||"—";document.getElementById("confidence").textContent=`${Math.round(data.confidence||0)}% confidence`;
 document.getElementById("netValue").textContent=C2C.money(data.expected_net_value);document.getElementById("bestMarket").textContent=data.best_market||"—";
 const vision=data.vision_json||{};document.getElementById("visionSummary").innerHTML=`<p><b>Crop:</b> ${C2C.esc(vision.identified_crop||data.crop_name)}</p><p><b>Quality grade:</b> ${C2C.esc(vision.quality_grade||data.quality_grade||"Unknown")}</p><p><b>Visible condition:</b> ${C2C.esc(vision.visual_condition||data.visual_condition||"Not available")}</p><p><b>Spoilage risk:</b> ${C2C.esc(vision.spoilage_risk||data.spoilage_risk||"Unknown")}</p>`;
 document.getElementById("rationale").textContent=data.rationale||"No rationale returned.";
 document.getElementById("nextAction").textContent=data.next_action||"Validate current buyer price, transport cost and quality before acting.";
 const risks=data.risk_flags||[];document.getElementById("risks").innerHTML=(risks.length?risks:["Market quotes can change","AI visual assessment is limited to visible evidence"]).map(x=>`<span class="chip">${C2C.esc(x)}</span>`).join("");
 const rows=data.market_json||[];document.getElementById("marketTable").innerHTML=`<table class="decision-table"><thead><tr><th>Market</th><th>Quote</th><th>Gross</th><th>Costs</th><th>Net</th></tr></thead><tbody>${rows.map(r=>`<tr class="${String(r.name)===String(data.best_market)?"best":""}"><td>${C2C.esc(r.name)}</td><td>${C2C.money(r.price)}</td><td>${C2C.money(r.gross)}</td><td>${C2C.money((data.transport_cost||0)+(data.other_cost||0))}</td><td>${C2C.money(r.net)}</td></tr>`).join("")}</tbody></table>`;
 document.getElementById("audit").innerHTML=[["Crop",data.crop_name],["Quantity",`${data.quantity} ${data.unit}`],["Quality",data.quality_grade||"Unknown"],["Risk",data.spoilage_risk||"Unknown"],["Transport",C2C.money(data.transport_cost)],["Other costs",C2C.money(data.other_cost)],["Best market",data.best_market||"—"],["AI confidence",`${Math.round(data.confidence||0)}%`]].map(x=>`<div class="audit-item"><small>${C2C.esc(x[0])}</small><b>${C2C.esc(x[1])}</b></div>`).join("");
 document.getElementById("logoutBtn").onclick=async()=>{await sb.auth.signOut();location.href="index.html"};document.getElementById("printBtn").onclick=()=>window.print();
})();