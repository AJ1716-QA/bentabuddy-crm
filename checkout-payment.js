/* Compact checkout payment options. Runs separately to keep the storefront cart logic unchanged. */
(()=>{"use strict";
const URL="https://hvoqsyhbrgeiztvyooym.supabase.co";
const KEY="sb_publishable_sC6DNOZq5gehKrCkPkZaYA_AYsUhtyD";
const confirmation=document.getElementById("order-success");
if(confirmation){new MutationObserver(()=>{if(!confirmation.hidden)confirmation.scrollIntoView({behavior:"smooth",block:"start"});}).observe(confirmation,{attributes:true,attributeFilter:["hidden"]});}
const target=document.getElementById("checkout-payment-instructions");
if(!target||!window.supabase?.createClient)return;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const slug=new URLSearchParams(location.search).get("store")?.trim();
if(!slug)return;
const client=window.supabase.createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const copyButton=(value,label)=>'<button type="button" class="store-button secondary" data-copy-payment="'+esc(value)+'" style="min-height:34px;padding:7px 10px;margin-top:6px;font-size:12px">Copy '+label+'</button>';
target.addEventListener("click",async e=>{
 const b=e.target.closest("[data-copy-payment]");if(!b)return;
 const value=b.getAttribute("data-copy-payment")||"";
 try{await navigator.clipboard.writeText(value);b.textContent="Copied";}catch{const field=document.createElement("textarea");field.value=value;field.setAttribute("readonly","");field.style.position="fixed";field.style.opacity="0";document.body.appendChild(field);field.select();let ok=false;try{ok=document.execCommand("copy")}catch{}field.remove();b.textContent=ok?"Copied":"Copy manually";} 
});
(async()=>{
 try{
  const {data,error}=await client.rpc("get_public_store_payment_instructions",{p_store_slug:slug});
  if(error)throw error;
  const p=Array.isArray(data)&&data.length?data[0]:null;
  const options=[];
  if(p?.gcash_enabled&&p.gcash_number)options.push({value:"gcash",label:"GCash",details:'<strong>GCash</strong><br>'+esc(p.gcash_number)+(p.gcash_account_name?' · '+esc(p.gcash_account_name):'')+'<br>'+copyButton(p.gcash_number,"GCash number")});
  if(p?.maya_enabled&&p.maya_number)options.push({value:"maya",label:"Maya",details:'<strong>Maya</strong><br>'+esc(p.maya_number)+(p.maya_account_name?' · '+esc(p.maya_account_name):'')+'<br>'+copyButton(p.maya_number,"Maya number")});
  if(p?.bank_enabled&&p.bank_name&&p.bank_account_number)options.push({value:"bank",label:p.bank_name,details:'<strong>'+esc(p.bank_name)+'</strong><br>'+esc(p.bank_account_number)+(p.bank_account_name?' · '+esc(p.bank_account_name):'')+'<br>'+copyButton(p.bank_account_number,"account number")});
  const total=document.getElementById("cart-total")?.textContent||"";
  target.innerHTML='<h3>Payment method</h3><p class="payment-hint">Order total: <strong id="checkout-payment-total">'+esc(total)+'</strong></p><p class="payment-hint">Choose a payment method to view the seller’s details. You can still submit an unpaid order.</p>'+(options.length?'<label for="checkout-payment-method" style="display:block;font-size:13px;font-weight:700;margin:10px 0 6px">Select payment option</label><select id="checkout-payment-method" style="display:block;width:100%;min-height:44px;padding:10px;border:1px solid #cbd6e4;border-radius:10px;background:#fff;color:#172b45;font:inherit"><option value="">Choose payment method</option>'+options.map(o=>'<option value="'+o.value+'">'+esc(o.label)+'</option>').join("")+'</select><div id="checkout-payment-detail" class="payment-instruction" style="margin-top:8px"></div>':'<p>Payment details are not available yet. Contact the seller before paying.</p>')+'<p class="payment-hint">After paying, return here and tap Place order. The order stays unpaid until the seller confirms receipt.</p>';
  const methodSelect=target.querySelector("#checkout-payment-method");
  const detail=target.querySelector("#checkout-payment-detail");
  if(methodSelect&&detail)methodSelect.addEventListener("change",()=>{const chosen=options.find(o=>o.value===methodSelect.value);detail.innerHTML=chosen?chosen.details:"";});
  target.hidden=false;
  const totalNode=document.getElementById("checkout-payment-total");
  const cartTotal=document.getElementById("cart-total");
  if(totalNode&&cartTotal)new MutationObserver(()=>{totalNode.textContent=cartTotal.textContent;}).observe(cartTotal,{childList:true,characterData:true,subtree:true});
 }catch(e){console.warn("Compact checkout payment options could not load.",e);target.innerHTML='<h3>Payment method</h3><p>Contact the seller to arrange payment. Your order stays unpaid until the seller confirms receipt.</p>';target.hidden=false;}
})();
})();