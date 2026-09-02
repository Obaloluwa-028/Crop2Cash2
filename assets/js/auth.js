const urlMode=new URLSearchParams(location.search).get("mode")||"login";
const tabs=[document.getElementById("loginTab"),document.getElementById("signupTab")], forms=[document.getElementById("loginForm"),document.getElementById("signupForm")];
function mode(m){const s=m==="signup";tabs[0].classList.toggle("active",!s);tabs[1].classList.toggle("active",s);forms[0].classList.toggle("hidden",s);forms[1].classList.toggle("hidden",!s)}
mode(urlMode);tabs[0].onclick=()=>mode("login");tabs[1].onclick=()=>mode("signup");
(async()=>{if(!C2C.hasSupabase()){C2C.msg("loginMsg","Open Setup first: add your Supabase details.");C2C.msg("signupMsg","Open Setup first: add your Supabase details.");return}await C2C.signedInRedirect()})();
document.getElementById("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();C2C.msg("loginMsg","Signing you in…");
 try{const sb=C2C.client();const {error}=await sb.auth.signInWithPassword({email:document.getElementById("loginEmail").value.trim(),password:document.getElementById("loginPassword").value});if(error)throw error;location.href="dashboard.html"}catch(err){C2C.msg("loginMsg",err.message,"error")}
});
document.getElementById("signupForm").addEventListener("submit",async e=>{
 e.preventDefault();C2C.msg("signupMsg","Creating your account…");
 try{
   const sb=C2C.client();const name=document.getElementById("signupName").value.trim();const username=document.getElementById("signupUsername").value.trim().toLowerCase();
   const {data,error}=await sb.auth.signUp({email:document.getElementById("signupEmail").value.trim(),password:document.getElementById("signupPassword").value,options:{data:{full_name:name,username}}});if(error)throw error;
   if(data.session) location.href="dashboard.html"; else C2C.msg("signupMsg","Account created. Check your email if confirmation is enabled, then sign in.","success");
 }catch(err){C2C.msg("signupMsg",err.message,"error")}
});