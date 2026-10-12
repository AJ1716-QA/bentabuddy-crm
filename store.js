/* Public storefront: only calls the restricted public catalog RPC. */
(() => {
  "use strict";
  const SUPABASE_URL = "https://hvoqsyhbrgeiztvyooym.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_sC6DNOZq5gehKrCkPkZaYA_AYsUhtyD";
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const money = (value,currency) => {
    const amount=Number(value);
    try{return new Intl.NumberFormat(undefined,{style:"currency",currency:currency||"PHP"}).format(Number.isFinite(amount)?amount:0);}
    catch{return "₱"+(Number.isFinite(amount)?amount:0).toFixed(2);}
  };
  function message(text){$("store-message").textContent=text;$("store-message").hidden=false;}
  async function start(){
    const slug=new URLSearchParams(location.search).get("store")?.trim();
    if(!slug){$("store-title").textContent="Store not found";message("This store link is incomplete. Please ask the seller for their store link.");return;}
    if(!window.supabase||!window.supabase.createClient){message("The store could not load its service. Please refresh and try again.");return;}
    const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    try{
      const {data,error}=await client.rpc("get_public_store_catalog",{p_store_slug:slug});
      if(error)throw error;
      if(!Array.isArray(data)||!data.length){
        $("store-title").textContent="Store unavailable";
        message("This store is not enabled yet or has no published products.");
        return;
      }
      const store=data[0];
      $("store-title").textContent=store.store_name||"Online Store";
      $("store-subtitle").textContent="Browse our available products.";
      document.title=(store.store_name||"Online Store")+" · BentaBuddy";
      $("store-products").innerHTML=data.map(p=>{
        const image=p.image_url?'<img class="store-product-image" src="'+escapeHtml(p.image_url)+'" alt="'+escapeHtml(p.product_name)+'" loading="lazy" referrerpolicy="no-referrer">':'<div class="store-product-placeholder" aria-hidden="true">◇</div>';
        return '<article class="store-product">'+image+'<div class="store-product-content"><h2>'+escapeHtml(p.product_name)+'</h2><p class="store-price">'+escapeHtml(money(p.selling_price,store.currency_code))+'</p>'+(p.description?'<p class="store-description">'+escapeHtml(p.description)+'</p>':'')+'</div></article>';
      }).join("");
      $("store-products").hidden=false;
      $("store-message").hidden=true;
    }catch(err){
      console.error("Public store load failed:",err);
      message("We couldn't load this store right now. Please try again later.");
    }
  }
  start();
})();
