/* Public storefront cart and secure checkout */
(()=>{"use strict";
const URL="https://hvoqsyhbrgeiztvyooym.supabase.co",KEY="sb_publishable_sC6DNOZq5gehKrCkPkZaYA_AYsUhtyD",$=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=(v,c)=>{try{return new Intl.NumberFormat(undefined,{style:"currency",currency:c||"PHP"}).format(Number(v)||0)}catch{return "₱"+(Number(v)||0).toFixed(2)}};
let client,products=[],currency="PHP",slug="",cart=new Map(),busy=false,paymentInstructions=null,pushSubscription=null;
const VAPID_PUBLIC_KEY="BIzReZ5QahL4LeZNWrQ_PFaG3ecGf0oDeccIbHu05Ts5P7JdU6r8o8b2S7L0txgonJJMypG5uviE4pRhjXMv-i0";
function base64UrlBytes(value){const pad="=".repeat((4-value.length%4)%4);const raw=atob((value+pad).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
async function enableOrderPush(){const status=$("order-push-status"),button=$("enable-order-push");button.disabled=true;try{if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window))throw new Error("This browser does not support push notifications. You can still place your order.");const permission=await Notification.requestPermission();if(permission!=="granted")throw new Error("Notifications were not allowed. You can still place your order.");const registration=await navigator.serviceWorker.register("./sw.js",{scope:"./"});await navigator.serviceWorker.ready;pushSubscription=await registration.pushManager.getSubscription();if(!pushSubscription)pushSubscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:base64UrlBytes(VAPID_PUBLIC_KEY)});status.textContent="Notifications enabled on this device.";button.textContent="Notifications enabled";}catch(err){console.warn("Order push setup:",err);status.textContent=err?.message||"Could not enable notifications on this device.";button.textContent="Try again";}finally{button.disabled=false;}}
async function sendOrderPush(orderNumber){if(!pushSubscription)return false;const response=await fetch(URL+"/functions/v1/send-order-push",{method:"POST",headers:{"Content-Type":"application/json","apikey":KEY},body:JSON.stringify({storeSlug:slug,orderNumber:String(orderNumber),subscription:pushSubscription.toJSON(),pageUrl:location.href})});if(!response.ok){let message="Push notification could not be sent.";try{const data=await response.json();if(data?.error)message=data.error;}catch{}throw new Error(message);}return true;}
function msg(t,err=false){$("store-message").textContent=t;$("store-message").className="store-message"+(err?" error":"");$("store-message").hidden=false}
function applyStoreDesign(d){
 if(!d)return;
 const primary=/^#[0-9a-f]{6}$/i.test(d.primary_color||"")?d.primary_color:"#123b63";
 const background=/^#[0-9a-f]{6}$/i.test(d.background_color||"")?d.background_color:"#f5f7fb";
 const accent=/^#[0-9a-f]{6}$/i.test(d.accent_color||"")?d.accent_color:"#ffffff";
 document.body.style.setProperty("--store-primary",primary);
 document.body.style.setProperty("--store-background",background);
 document.body.style.setProperty("--store-accent",accent);
 const theme=["classic","fresh","bold"].includes(d.theme)?d.theme:"classic";
 $("store-header-row").dataset.theme=theme;
 $("store-subtitle").textContent=d.welcome_message||"Browse our products and place an order.";
 $("store-subtitle").hidden=d.show_welcome===false;
 const description=$("store-description");
 description.textContent=d.description||"";
 description.hidden=!d.description||d.show_description===false;
 const layout=["grid","compact","list"].includes(d.layout)?d.layout:"grid";
 const storeLayout=["hero","catalog","minimal"].includes(d.store_layout)?d.store_layout:"hero";
 document.querySelector(".store-shell").dataset.storeLayout=storeLayout;
 const fontStyle=["sans","serif","rounded"].includes(d.font_style)?d.font_style:"sans";
 const cardStyle=["rounded","square"].includes(d.card_style)?d.card_style:"rounded";
 document.querySelector(".store-shell").dataset.fontStyle=fontStyle;
 document.querySelector(".store-shell").dataset.cardStyle=cardStyle;
 $("store-products").classList.remove("layout-grid","layout-compact","layout-list");
 $("store-products").classList.add("layout-"+layout);
 const logo=$("store-logo-image"),cover=$("store-cover-image");
 if(d.logo_url&&/^https?:\/\//i.test(d.logo_url)&&d.show_logo!==false){logo.src=d.logo_url;logo.hidden=false;}else{logo.removeAttribute("src");logo.hidden=true;}
 if(d.cover_image_url&&/^https?:\/\//i.test(d.cover_image_url)&&d.show_cover!==false){cover.src=d.cover_image_url;cover.hidden=false;}else{cover.removeAttribute("src");cover.hidden=true;}
}
function fulfillment(){const pickup=$("checkout-fulfillment").value==="pickup";$("checkout-address-wrap").hidden=pickup;$("checkout-address").required=!pickup}
function resetPaymentSelection(clearReference=true){const method=$("checkout-payment-method");const detail=$("checkout-payment-detail");if(method)method.value="";if(detail)detail.innerHTML="";if(clearReference&&$("checkout-payment-reference"))$("checkout-payment-reference").value="";}
function renderCart(){
 const entries=[...cart].map(([id,qty])=>({p:products.find(p=>p.product_id===id),qty})).filter(x=>x.p);
 const itemCount=entries.reduce((s,x)=>s+x.qty,0);$("cart-count").textContent=itemCount;$("store-cart-badge").textContent=itemCount;$("store-cart-badge").hidden=itemCount===0;$("cart-empty").hidden=!!entries.length;
 $("cart-lines").innerHTML=entries.map(({p,qty})=>'<div class="cart-line"><div class="cart-line-main"><strong>'+esc(p.product_name)+'</strong><span>'+esc(money(p.selling_price,currency))+' each</span></div><div class="quantity-control"><button type="button" data-minus="'+p.product_id+'" aria-label="Decrease quantity">−</button><span>'+qty+'</span><button type="button" data-plus="'+p.product_id+'" aria-label="Increase quantity">+</button><button type="button" class="remove-item" data-remove="'+p.product_id+'">Remove</button></div><strong>'+esc(money(Number(p.selling_price)*qty,currency))+'</strong></div>').join("");
 $("cart-total").textContent=money(entries.reduce((s,x)=>s+Number(x.p.selling_price)*x.qty,0),currency);$("place-order").disabled=busy||!entries.length;
}
function renderProducts(){$("store-products").innerHTML=products.map(p=>{const img=p.image_url&&/^https?:\/\//i.test(p.image_url)?'<img class="store-product-image" src="'+esc(p.image_url)+'" alt="'+esc(p.product_name)+'" loading="lazy" referrerpolicy="no-referrer">':'<div class="store-product-placeholder" aria-hidden="true">◇</div>';return '<article class="store-product">'+img+'<div class="store-product-content"><h2>'+esc(p.product_name)+'</h2><p class="store-price">'+esc(money(p.selling_price,currency))+'</p>'+(p.description?'<p class="store-description">'+esc(p.description)+'</p>':'')+'<button class="store-button primary add-to-cart" type="button" data-add="'+p.product_id+'">Add to cart</button></div></article>'}).join("");$("store-products").hidden=false}
function renderPaymentInstructions(orderNumber){
 const target=$("order-payment-instructions");
 const p=paymentInstructions;
 if(!p){target.innerHTML='<h3>Payment instructions</h3><p>Please contact the seller directly to arrange payment. Use order number <strong>'+esc(orderNumber)+'</strong> as your reference.</p>';target.hidden=false;return;}
 const parts=[];
 if(p.gcash_enabled&&p.gcash_number)parts.push('<div class="payment-instruction"><h3>GCash</h3><p><strong>Number:</strong> '+esc(p.gcash_number)+'</p>'+(p.gcash_account_name?'<p><strong>Account name:</strong> '+esc(p.gcash_account_name)+'</p>':'')+'</div>');
 if(p.maya_enabled&&p.maya_number)parts.push('<div class="payment-instruction"><h3>Maya</h3><p><strong>Number:</strong> '+esc(p.maya_number)+'</p>'+(p.maya_account_name?'<p><strong>Account name:</strong> '+esc(p.maya_account_name)+'</p>':'')+'</div>');
 if(p.bank_enabled&&p.bank_name&&p.bank_account_number)parts.push('<div class="payment-instruction"><h3>Bank transfer</h3><p><strong>Bank:</strong> '+esc(p.bank_name)+'</p>'+(p.bank_account_name?'<p><strong>Account name:</strong> '+esc(p.bank_account_name)+'</p>':'')+'<p><strong>Account number:</strong> '+esc(p.bank_account_number)+'</p></div>');
 target.innerHTML='<h3>Payment instructions</h3>'+(parts.length?parts.join(""):'<p>The seller has not added payment details yet. Please contact the seller directly before paying.</p>')+(p.payment_notes?'<p>'+esc(p.payment_notes)+'</p>':'')+'<p><strong>Payment reference:</strong> Order '+esc(orderNumber)+'</p><p>After paying, contact the seller with your order number. Do not send money if the account details cannot be confirmed.</p>';
 target.hidden=false;
}
async function submit(e){
 e.preventDefault();if(busy||!cart.size)return;if(!$("checkout-form").reportValidity())return;
 busy=true;$("place-order").textContent="Submitting order…";renderCart();$("checkout-message").hidden=true;
 try{
 const {data,error}=await client.rpc("submit_public_store_order",{p_store_slug:slug,p_customer_name:$("checkout-name").value.trim(),p_phone:$("checkout-phone").value.trim(),p_email:$("checkout-email").value.trim()||null,p_address:$("checkout-fulfillment").value==="pickup"?null:$("checkout-address").value.trim(),p_fulfillment_method:$("checkout-fulfillment").value,p_items:[...cart].map(([product_id,quantity])=>({product_id,quantity})),p_notes:[$("checkout-notes").value.trim(),$("checkout-payment-method")?.value?"Customer-selected payment method (not verified): "+({"gcash":"GCash","maya":"Maya","bank":"Bank transfer"}[$("checkout-payment-method").value]||$("checkout-payment-method").value):"",$("checkout-payment-reference").value.trim()?"Payment reference (customer-provided, not verified): "+$("checkout-payment-reference").value.trim():""].filter(Boolean).join("\n")||null});
 if(error)throw error;const order=Array.isArray(data)?data[0]:data;if(!order||order.order_number==null)throw new Error("No order confirmation was returned. Please contact the seller before trying again.");
 // Show the receipt immediately after the database confirms the order. Push delivery must never block the customer's on-screen confirmation.
 $("checkout-panel").hidden=true;$("cart-panel").hidden=true;$("store-cart-popover").hidden=true;$("store-cart-toggle").setAttribute("aria-expanded","false");$("store-products").hidden=false;$("store-message").hidden=true;$("order-success-number").textContent=order.order_number;$("order-success-total").textContent=money(order.total_amount,currency);$("order-success-notification").textContent=pushSubscription?"Your order is saved. Sending a notification to this device…":"Your order is saved. Keep this order number for your records.";renderPaymentInstructions(order.order_number);$("order-success").hidden=false;cart.clear();resetPaymentSelection(true);$("checkout-notes").value="";renderCart();$("order-success").scrollIntoView({behavior:"smooth",block:"start"});
 if(pushSubscription){sendOrderPush(order.order_number).then(()=>{$("order-success-notification").textContent="A confirmation notification was sent to this device. Your order is still pending and unpaid until the seller confirms payment.";}).catch(pushError=>{console.warn("Order was saved but push notification failed:",pushError);$("order-success-notification").textContent="Your order is saved and confirmed on this page, but the device notification could not be delivered. Please keep your order number.";});}
 }catch(err){console.error("Checkout failed",err);$("checkout-message").textContent=err?.message&&/product|store|quantity|cart|customer|address|phone|delivery|pickup/i.test(err.message)?err.message:"We couldn't submit your order. Please check your details and try again.";$("checkout-message").hidden=false}
 finally{busy=false;$("place-order").textContent="Place order";renderCart()}
}
async function start(){
 slug=new URLSearchParams(location.search).get("store")?.trim()||"";if(!slug){$("store-title").textContent="Store not found";msg("This store link is incomplete. Please ask the seller for their store link.");return}
 if(!window.supabase?.createClient){msg("The store could not load its service. Please refresh and try again.");return}
 client=window.supabase.createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 $("checkout-fulfillment").addEventListener("change",fulfillment);$("checkout-form").addEventListener("submit",submit);$("enable-order-push").addEventListener("click",enableOrderPush);
 $("store-products").addEventListener("click",e=>{const b=e.target.closest("[data-add]");if(!b)return;const id=b.dataset.add;if(products.some(p=>p.product_id===id)){cart.set(id,Math.min(999,(cart.get(id)||0)+1));resetPaymentSelection(true);$("checkout-message").hidden=true;}$("order-success").hidden=true;renderCart()});
 $("cart-lines").addEventListener("click",e=>{e.stopPropagation();const b=e.target.closest("button");if(!b)return;const id=b.dataset.plus||b.dataset.minus||b.dataset.remove;if(!id)return;const n=cart.get(id)||0;if(b.dataset.remove!==undefined||(b.dataset.minus!==undefined&&n<=1))cart.delete(id);else if(b.dataset.plus!==undefined)cart.set(id,Math.min(999,n+1));else cart.set(id,n-1);resetPaymentSelection(true);$("checkout-message").hidden=true;renderCart();$("store-cart-popover").hidden=false;$("cart-panel").hidden=false;$("checkout-panel").hidden=true;$("store-cart-toggle").setAttribute("aria-expanded","true")});
 $("store-cart-popover").addEventListener("click",e=>e.stopPropagation());$("continue-shopping").addEventListener("click",e=>{e.stopPropagation();$("store-cart-popover").hidden=true;$("cart-panel").hidden=true;$("checkout-panel").hidden=true;$("store-cart-toggle").setAttribute("aria-expanded","false");$("store-products").scrollIntoView({behavior:"smooth",block:"start"})});$("store-cart-toggle").addEventListener("click",e=>{e.stopPropagation();const opening=$("store-cart-popover").hidden;$("store-cart-popover").hidden=!opening;$("cart-panel").hidden=!opening;$("store-cart-toggle").setAttribute("aria-expanded",String(opening));if(opening)$("checkout-panel").hidden=true});document.addEventListener("click",e=>{if(!$("store-cart-popover").hidden&&!e.target.closest(".store-cart-wrap")){$("store-cart-popover").hidden=true;$("store-cart-toggle").setAttribute("aria-expanded","false")}});document.addEventListener("keydown",e=>{if(e.key==="Escape"){$("store-cart-popover").hidden=true;$("store-cart-toggle").setAttribute("aria-expanded","false")}});$("open-checkout").addEventListener("click",()=>{if(!cart.size)return;$("cart-panel").hidden=true;$("checkout-panel").hidden=false;});$("checkout-cancel").addEventListener("click",()=>{resetPaymentSelection(true);$("checkout-panel").hidden=true;$("cart-panel").hidden=false;});fulfillment();
 try{const {data,error}=await client.rpc("get_public_store_catalog",{p_store_slug:slug});if(error)throw error;if(!Array.isArray(data)||!data.length){$("store-title").textContent="Store unavailable";msg("This store is not enabled yet or has no published products.");return}const s=data[0];currency=s.currency_code||"PHP";products=data;let design=null;try{const result=await client.rpc("get_public_store_design",{p_store_slug:slug});if(result.error)console.warn("Store design is not available yet:",result.error);else if(Array.isArray(result.data)&&result.data.length)design=result.data[0];}catch(designError){console.warn("Store design could not be loaded:",designError)}applyStoreDesign(design);const displayName=design?.store_name?.trim()||s.store_name||"Online Store";$("store-title").textContent=displayName;document.title=displayName+" · BentaBuddy";const {data:paymentData,error:paymentError}=await client.rpc("get_public_store_payment_instructions",{p_store_slug:slug});if(paymentError)console.warn("Could not load payment instructions:",paymentError);else if(Array.isArray(paymentData)&&paymentData.length)paymentInstructions=paymentData[0];renderProducts();renderCart();$("store-message").hidden=true;$("store-shopping").hidden=false}catch(err){console.error("Store load failed",err);msg("We couldn't load this store right now. Please try again later.")}
}
start();
})();