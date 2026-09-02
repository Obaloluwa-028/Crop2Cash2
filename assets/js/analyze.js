let currentImage=null;
const imageInput=document.getElementById("imageInput"),preview=document.getElementById("preview"),previewImg=document.getElementById("previewImg"),dropTitle=document.getElementById("dropTitle");
imageInput.addEventListener("change",()=>{const f=imageInput.files?.[0];if(!f)return;currentImage=f;previewImg.src=URL.createObjectURL(f);preview.classList.remove("hidden");dropTitle.textContent=f.name});
document.getElementById("clearImage").onclick=()=>{currentImage=null;imageInput.value="";preview.classList.add("hidden");dropTitle.textContent="Drop photo here or click to browse"};
function fileBase64(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(",")[1]);r.onerror=rej;r.readAsDataURL(file)})}
function safeJson(text){const cleaned=String(text).replace(/```json|```/g,"").trim();const start=cleaned.indexOf("{");const end=cleaned.lastIndexOf("}");if(start>=0&&end>start)return JSON.parse(cleaned.slice(start,end+1));return JSON.parse(cleaned)}
async function runGemini({apiKey,model,prompt,imageData,mimeType}){
 const endpoint=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
 const body={contents:[{parts:[{text:prompt},{inline_data:{mime_type:mimeType,data:imageData}}]}],generationConfig:{temperature:0.15,responseMimeType:"application/json"}};
 const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},body:JSON.stringify(body)});
 const j=await r.json();if(!r.ok)throw new Error(j?.error?.message||"Gemini request failed.");
 const text=j?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"";return safeJson(text);
}
(async()=>{
 const ctx=await C2C.requireUser();if(!ctx)return;const {sb,user}=ctx;
 document.getElementById("harvestDate").value=new Date().toISOString().slice(0,10);
 const {data:quotes,error}=await sb.from("market_quotes").select("*").order("quote_date",{ascending:false}).limit(100);
 const picker=document.getElementById("marketPicker");if(error){picker.innerHTML=`<div class="empty-state">${C2C.esc(error.message)}</div>`}
 else if(!quotes?.length){picker.innerHTML=`<div class="empty-state">No market quotes yet. Add one on the Market Board before running an analysis.</div>`}
 else {picker.innerHTML=quotes.map(q=>`<label class="market-option"><input type="checkbox" value="${q.id}" data-price="${q.price}" data-name="${C2C.esc(q.market_name)}"><span><strong>${C2C.esc(q.market_name)} · ${C2C.money(q.price)}</strong><span>${C2C.esc(q.crop_name)} · ${C2C.esc(q.unit)} · ${C2C.esc(q.quote_date||"")}</span></span></label>`).join("")}
 document.getElementById("logoutBtn").onclick=async()=>{await sb.auth.signOut();location.href="index.html"};
 document.getElementById("analysisForm").addEventListener("submit",async e=>{
  e.preventDefault();const btn=document.getElementById("runBtn");btn.disabled=true;btn.textContent="Analyzing…";C2C.msg("analysisMsg","Preparing your evidence…");
  try{
   const cfg=C2C.getConfig();if(!cfg.geminiKey)throw new Error("Gemini is not configured. Open Setup and add your Gemini API key.");
   if(!currentImage)throw new Error("Add a clear produce photo first.");
   const selected=[...document.querySelectorAll("#marketPicker input:checked")];if(!selected.length)throw new Error("Select at least one market quote.");
   const crop=document.getElementById("crop").value.trim(),quantity=Number(document.getElementById("quantity").value),unit=document.getElementById("unit").value;
   const harvestDate=document.getElementById("harvestDate").value,location=document.getElementById("location").value.trim(),notes=document.getElementById("notes").value.trim();
   const imageData=await fileBase64(currentImage);
   const markets=selected.map(i=>({id:i.value,name:i.dataset.name,price:Number(i.dataset.price)}));
   C2C.msg("analysisMsg","AI is examining the produce image and quality signals…");
   const vision=await runGemini({apiKey:cfg.geminiKey,model:cfg.geminiModel||"gemini-3.7-flash",imageData,mimeType:currentImage.type||"image/jpeg",prompt:`You are the visual-quality module of Crop2Cash, a harvest-to-market decision support system for African farmers. Analyze ONLY visible evidence in this produce image. Do not claim certainty about internal defects or exact variety. Return JSON only with these fields:
{"identified_crop":"string","quality_grade":"A|B|C|Unknown","visual_condition":"string","spoilage_risk":"Low|Medium|High|Unknown","visible_issues":["string"],"handling_advice":["string"],"confidence":0-100}
User-entered context: crop=${JSON.stringify(crop)}, location=${JSON.stringify(location)}, notes=${JSON.stringify(notes)}. Be conservative if uncertain.`});
   C2C.msg("analysisMsg","Combining quality, market and cost signals…");
   const transport=Number(document.getElementById("transportCost").value||0),other=Number(document.getElementById("otherCost").value||0);
   const pricePerUnit=markets.map(m=>({id:m.id,name:m.name,price:m.price,gross:m.price*quantity,net:m.price*quantity-transport-other}));
   const best=[...pricePerUnit].sort((a,b)=>b.net-a.net)[0];
   const perish=vision.spoilage_risk;
   let waitPenalty=0;if(perish==="High")waitPenalty=0.92;else if(perish==="Medium")waitPenalty=0.97;else waitPenalty=1;
   const decisionPrompt=`You are the decision engine for Crop2Cash. Return JSON only. Never invent market prices. Use the supplied quotes and calculated net values exactly. If evidence is insufficient, say so.
Schema:
{"recommended_action":"SELL NOW|WAIT|CHOOSE MARKET|HOLD","confidence":0-100,"expected_net_value":number,"best_market":"string","rationale":"string","risk_flags":["string"],"next_action":"string","wait_scenario":"string"}
Harvest: crop=${crop}, quantity=${quantity}, unit=${unit}, harvest_date=${harvestDate}, location=${location}, notes=${notes}
Vision evidence: ${JSON.stringify(vision)}
Market options: ${JSON.stringify(pricePerUnit)}
Transport cost=${transport}; other selling costs=${other}
Highest current net market=${JSON.stringify(best)}
Use spoilage risk as a timing signal. A 'WAIT' recommendation must be justified only as a conditional scenario; do not fabricate a future price.`;
   const decision=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cfg.geminiModel||"gemini-3.7-flash")}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":cfg.geminiKey},body:JSON.stringify({contents:[{parts:[{text:decisionPrompt}]}],generationConfig:{temperature:0.1,responseMimeType:"application/json"}})}).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j?.error?.message||"Decision request failed.");return safeJson(j.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("")||"")});
   const record={user_id:user.id,crop_name:crop,quantity,unit,harvest_date:harvestDate,location,notes,quality_grade:vision.quality_grade,visual_condition:vision.visual_condition,spoilage_risk:vision.spoilage_risk,vision_json:vision,market_json:pricePerUnit,transport_cost:transport,other_cost:other,recommended_action:decision.recommended_action,confidence:Number(decision.confidence)||0,expected_net_value:Number(decision.expected_net_value)||best.net,best_market:decision.best_market||best.name,rationale:decision.rationale,next_action:decision.next_action,risk_flags:decision.risk_flags||[],wait_scenario:decision.wait_scenario||""};
   const {data:saved,error:saveErr}=await sb.from("harvest_analyses").insert(record).select("id").single();if(saveErr)throw saveErr;
   location.href=`result.html?id=${encodeURIComponent(saved.id)}`;
  }catch(err){C2C.msg("analysisMsg",err.message||"Analysis failed.","error");btn.disabled=false;btn.textContent="Analyze with AI →"}
 });
})();