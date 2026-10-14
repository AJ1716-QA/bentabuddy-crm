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
  const rows=[];
  if(p?.gcash_enabled&&p.gcash_number)rows.push('<div class="payment-instruction"><strong>GCash</strong><br>'+esc(p.gcash_number)+(p.gcash_account_name?' · '+esc(p.gcash_account_name):'')+'<br>'+copyButton(p.gcash_number,"GCash number")+'</div>');
  if(p?.maya_enabled&&p.maya_number)rows.push('<div class="payment-instruction"><strong>Maya</strong><br>'+esc(p.maya_number)+(p.maya_account_name?' · '+esc(p.maya_account_name):'')+'<br>'+copyButton(p.maya_number,"Maya number")+'</div>');
  if(p?.bank_enabled&&p.bank_name&&p.bank_account_number)rows.push('<div class="payment-instruction"><strong>'+esc(p.bank_name)+'</strong><br>'+esc(p.bank_account_number)+(p.bank_account_name?' · '+esc(p.bank_account_name):'')+'<br>'+copyButton(p.bank_account_number,"account number")+'</div>');
  const total=document.getElementById("cart-total")?.textContent||"";
  target.innerHTML='<h3>Payment method</h3><p class="payment-hint">Order total: <strong id="checkout-payment-total">'+esc(total)+'</strong></p><p class="payment-hint">1. Copy the seller’s payment number below. 2. Pay in your GCash, Maya, or banking app. 3. Return here and tap Place order. The order will remain unpaid until the seller confirms receipt.</p>'+(rows.length?rows.join(""):'<p>Payment details are not available yet. Contact the seller before paying.</p>');
  target.hidden=false;
  const totalNode=document.getElementById("checkout-payment-total");
  const cartTotal=document.getElementById("cart-total");
  if(totalNode&&cartTotal)new MutationObserver(()=>{totalNode.textContent=cartTotal.textContent;}).observe(cartTotal,{childList:true,characterData:true,subtree:true});
 }catch(e){console.warn("Compact checkout payment options could not load.",e);target.innerHTML='<h3>Payment method</h3><p>Contact the seller to arrange payment. Your order stays unpaid until the seller confirms receipt.</p>';target.hidden=false;}
})();
})();