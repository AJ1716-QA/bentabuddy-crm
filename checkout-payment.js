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
(async()=>{
 try{
  const {data,error}=await client.rpc("get_public_store_payment_instructions",{p_store_slug:slug});
  if(error)throw error;
  const p=Array.isArray(data)&&data.length?data[0]:null;
  const rows=[];
  if(p?.gcash_enabled&&p.gcash_number)rows.push('<div class="payment-instruction"><strong>GCash</strong><br>'+esc(p.gcash_number)+(p.gcash_account_name?' · '+esc(p.gcash_account_name):'')+'</div>');
  if(p?.maya_enabled&&p.maya_number)rows.push('<div class="payment-instruction"><strong>Maya</strong><br>'+esc(p.maya_number)+(p.maya_account_name?' · '+esc(p.maya_account_name):'')+'</div>');
  if(p?.bank_enabled&&p.bank_name&&p.bank_account_number)rows.push('<div class="payment-instruction"><strong>'+esc(p.bank_name)+'</strong><br>'+esc(p.bank_account_number)+(p.bank_account_name?' · '+esc(p.bank_account_name):'')+'</div>');
  target.innerHTML='<h3>Payment method</h3><p class="payment-hint">Pay the seller directly. Your order stays unpaid until the seller confirms receipt.</p>'+(rows.length?rows.join(""):'<p>Payment details are not available yet. Contact the seller before paying.</p>');
  target.hidden=false;
 }catch(e){console.warn("Compact checkout payment options could not load.",e);target.innerHTML='<h3>Payment method</h3><p>Contact the seller to arrange payment. Your order stays unpaid until the seller confirms receipt.</p>';target.hidden=false;}
})();
})();