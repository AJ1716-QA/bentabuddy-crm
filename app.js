/* BentaBuddy CRM starter. Only use the Supabase publishable/anon key here.
   Never put service_role or secret keys in browser JavaScript. */
(() => {
  "use strict";

  // TODO: Replace these two placeholders with your own project's values.
  const SUPABASE_URL = "https://hvoqsyhbrgeiztvyooym.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_sC6DNOZq5gehKrCkPkZaYA_AYsUhtyD";

  const $ = (id) => document.getElementById(id);
  const notice = $("notice");
  let mode = "login";
  let supabase = null;

  $("year").textContent = String(new Date().getFullYear());

  function showNotice(message, type = "info") {
    notice.textContent = message;
    notice.className = `notice${type === "error" ? " error" : type === "success" ? " success" : ""}`;
    notice.hidden = false;
  }
  function clearNotice() {
    notice.hidden = true;
    notice.textContent = "";
  }
  function configReady() {
    return SUPABASE_URL.startsWith("https://")
      && !SUPABASE_URL.includes("PASTE_YOUR")
      && SUPABASE_PUBLISHABLE_KEY.length > 20
      && !SUPABASE_PUBLISHABLE_KEY.includes("PASTE_YOUR");
  }
  function setMode(nextMode) {
    mode = nextMode;
    clearNotice();
    const signup = mode === "signup";
    $("login-tab").classList.toggle("active", !signup);
    $("signup-tab").classList.toggle("active", signup);
    $("name-label").hidden = !signup;
    $("business-label").hidden = !signup;
    $("full-name").required = signup;
    $("business-name").required = signup;
    $("auth-title").textContent = signup ? "Create your account" : "Welcome back";
    $("auth-subtitle").textContent = signup
      ? "Start your 7-day free trial."
      : "Log in to manage your business.";
    $("submit-button").textContent = signup ? "Create account" : "Log in";
    $("password").autocomplete = signup ? "new-password" : "current-password";
  }
  $("login-tab").addEventListener("click", () => setMode("login"));
  $("signup-tab").addEventListener("click", () => setMode("signup"));

  function showAuth() {
    $("auth-panel").hidden = false;
    $("app-panel").hidden = true;
  }
  function showApp() {
    $("auth-panel").hidden = true;
    $("app-panel").hidden = false;
  }
  function formatDate(value) {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(undefined, {
      dateStyle: "medium", timeStyle: "short"
    });
  }

  let currentBusinessId = null;
  let customerRows = [];
  let customerEditMode = false;
  function showDashboardOnly(){ $("customers-panel").hidden=true; document.querySelector(".section-title").hidden=false; document.querySelector(".feature-grid").hidden=false; }
  function showCustomersPanel(){ $("customers-panel").hidden=false; document.querySelector(".section-title").hidden=true; document.querySelector(".feature-grid").hidden=true; $("customer-search").value=""; $("customer-form").hidden=true; loadCustomers(); $("customers-panel").scrollIntoView({behavior:"smooth",block:"start"}); }
  function customerMessage(message,isError=false){const el=$("customers-message");el.textContent=message;el.classList.toggle("customer-error",isError);}
  function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}
  function resetCustomerForm(){$("customer-form").reset();$("customer-id").value="";customerEditMode=false;$("customer-form-title").textContent="Add customer";$("save-customer").textContent="Save customer";$("customer-form").hidden=true;}
  async function loadCustomers(){
    if(!supabase||!currentBusinessId){customerMessage("Business details are still loading. Please try again.",true);return;}
    customerMessage("Loading customers…");$("customers-list").innerHTML="";
    const {data,error}=await supabase.from("customers").select("id,business_id,full_name,phone,email,messenger_name,address,notes,source,is_archived,created_at,updated_at").eq("business_id",currentBusinessId).eq("is_archived",false).order("full_name",{ascending:true});
    if(error){console.error("Customer load failed:",error);customerMessage("Could not load customers. Please check the customers table policies.",true);return;}
    customerRows=data||[];renderCustomers();
  }
  function renderCustomers(){
    const q=$("customer-search").value.trim().toLowerCase();
    const rows=customerRows.filter(c=>[c.full_name,c.phone,c.email,c.messenger_name,c.address].some(v=>String(v||"").toLowerCase().includes(q)));
    if(!rows.length){$("customers-list").innerHTML='<div class="empty-customers"><strong>'+(q?"No matching customers":"No customers yet")+'</strong><p>'+(q?"Try another search term.":"Select “Add customer” to save your first customer.")+'</p></div>';customerMessage(q?"No matching customers": "0 customers saved");return;}
    $("customers-list").innerHTML=rows.map(c=>'<article class="customer-card"><div class="customer-card-main"><div class="customer-avatar">'+escapeHtml((c.full_name||"?").trim().charAt(0).toUpperCase())+'</div><div class="customer-card-details"><h3>'+escapeHtml(c.full_name)+'</h3><p>'+(c.phone?'<span>☎ '+escapeHtml(c.phone)+'</span>':"")+(c.email?'<span>✉ '+escapeHtml(c.email)+'</span>':"")+(c.messenger_name?'<span>Messenger: '+escapeHtml(c.messenger_name)+'</span>':"")+'</p>'+(c.address?'<p class="customer-address">'+escapeHtml(c.address)+'</p>':"")+(c.notes?'<p class="customer-notes">'+escapeHtml(c.notes)+'</p>':"")+'</div></div><div class="customer-actions"><button class="secondary" type="button" data-edit-customer="'+c.id+'">Edit</button><button class="secondary customer-delete" type="button" data-delete-customer="'+c.id+'">Delete</button></div></article>').join("");
    customerMessage(rows.length+" customer"+(rows.length===1?"":"s")+" shown");
  }
  function editCustomer(id){const c=customerRows.find(r=>r.id===id);if(!c)return;$("customer-id").value=c.id;$("customer-name").value=c.full_name||"";$("customer-phone").value=c.phone||"";$("customer-email").value=c.email||"";$("customer-messenger").value=c.messenger_name||"";$("customer-address").value=c.address||"";$("customer-notes").value=c.notes||"";customerEditMode=true;$("customer-form-title").textContent="Edit customer";$("save-customer").textContent="Save changes";$("customer-form").hidden=false;$("customer-form").scrollIntoView({behavior:"smooth",block:"start"});$("customer-name").focus();}
  $("open-customers").addEventListener("click",showCustomersPanel);
  $("back-dashboard").addEventListener("click",showDashboardOnly);
  $("add-customer").addEventListener("click",()=>{resetCustomerForm();$("customer-form").hidden=false;$("customer-form").scrollIntoView({behavior:"smooth",block:"start"});$("customer-name").focus();});
  $("cancel-customer").addEventListener("click",resetCustomerForm);
  $("customer-search").addEventListener("input",renderCustomers);
  $("customers-list").addEventListener("click",async event=>{
    const edit=event.target.closest("[data-edit-customer]");if(edit){editCustomer(edit.dataset.editCustomer);return;}
    const del=event.target.closest("[data-delete-customer]");if(!del)return;
    const id=del.dataset.deleteCustomer,c=customerRows.find(r=>r.id===id);if(!c||!window.confirm("Permanently delete "+c.full_name+"?"))return;
    del.disabled=true;const {error}=await supabase.from("customers").delete().eq("id",id).eq("business_id",currentBusinessId);
    if(error){console.error(error);customerMessage("Could not delete this customer. Please check database policies.",true);del.disabled=false;return;}
    customerRows=customerRows.filter(r=>r.id!==id);renderCustomers();customerMessage("Customer deleted.");
  });
  $("customer-form").addEventListener("submit",async event=>{
    event.preventDefault();if(!supabase||!currentBusinessId){customerMessage("Business details are not ready. Please refresh and try again.",true);return;}
    const id=$("customer-id").value;
    const payload={business_id:currentBusinessId,full_name:$("customer-name").value.trim(),phone:$("customer-phone").value.trim()||null,email:$("customer-email").value.trim()||null,messenger_name:$("customer-messenger").value.trim()||null,address:$("customer-address").value.trim()||null,notes:$("customer-notes").value.trim()||null,updated_at:new Date().toISOString()};
    if(!payload.full_name){$("customer-name").focus();return;}
    const button=$("save-customer");button.disabled=true;button.textContent="Saving…";
    try{
      let result;
      if(id&&customerEditMode)result=await supabase.from("customers").update(payload).eq("id",id).eq("business_id",currentBusinessId).select("id").single();
      else result=await supabase.from("customers").insert({...payload,source:"manual",is_archived:false}).select("id").single();
      if(result.error)throw result.error;
      resetCustomerForm();await loadCustomers();customerMessage(id?"Customer details updated.":"Customer added successfully.");
    }catch(err){console.error("Customer save failed:",err);customerMessage(err?.message||"Could not save this customer. Please try again.",true);}
    finally{button.disabled=false;button.textContent="Save customer";}
  });


  let productRows = [];
  let productEditMode = false;
  function showDashboardOnly(){
    $("customers-panel").hidden=true;
    $("products-panel").hidden=true;
    document.querySelector(".section-title").hidden=false;
    document.querySelector(".feature-grid").hidden=false;
  }
  function showCustomersPanel(){
    $("products-panel").hidden=true;
    $("customers-panel").hidden=false;
    document.querySelector(".section-title").hidden=true;
    document.querySelector(".feature-grid").hidden=true;
    $("customer-search").value="";
    $("customer-form").hidden=true;
    loadCustomers();
    $("customers-panel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function showProductsPanel(){
    $("customers-panel").hidden=true;
    $("products-panel").hidden=false;
    document.querySelector(".section-title").hidden=true;
    document.querySelector(".feature-grid").hidden=true;
    $("product-search").value="";
    $("product-form").hidden=true;
    loadProducts();
    $("products-panel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function productMessage(message,isError=false){
    const el=$("products-message");el.textContent=message;el.classList.toggle("customer-error",isError);
  }
  function resetProductForm(){
    $("product-form").reset();$("product-id").value="";productEditMode=false;
    $("product-form-title").textContent="Add product";$("save-product").textContent="Save product";$("product-form").hidden=true;
  }
  async function loadProducts(){
    if(!supabase||!currentBusinessId){productMessage("Business details are still loading. Please try again.",true);return;}
    productMessage("Loading products…");$("products-list").innerHTML="";
    const {data,error}=await supabase.from("products")
      .select("id,business_id,product_name,sku,description,selling_price,cost_price,is_active,created_at,updated_at")
      .eq("business_id",currentBusinessId).eq("is_active",true).order("product_name",{ascending:true});
    if(error){console.error("Product load failed:",error);productMessage("Could not load products. Please check the products table policies.",true);return;}
    productRows=data||[];renderProducts();
  }
  function money(value){
    const n=Number(value||0);
    return n.toLocaleString("en-PH",{style:"currency",currency:"PHP",minimumFractionDigits:2,maximumFractionDigits:2});
  }
  function renderProducts(){
    const q=$("product-search").value.trim().toLowerCase();
    const rows=productRows.filter(p=>[p.product_name,p.sku,p.description].some(v=>String(v||"").toLowerCase().includes(q)));
    if(!rows.length){
      $("products-list").innerHTML='<div class="empty-customers"><strong>'+(q?"No matching products":"No products yet")+'</strong><p>'+(q?"Try another search term.":"Select “Add product” to save your first product.")+'</p></div>';
      productMessage(q?"No matching products":"0 products saved");return;
    }
    $("products-list").innerHTML=rows.map(p=>'<article class="customer-card"><div class="customer-card-main"><div class="product-avatar">₱</div><div class="customer-card-details"><h3>'+escapeHtml(p.product_name)+'</h3><p>'+(p.sku?'<span>SKU: '+escapeHtml(p.sku)+'</span>':"")+'<span>Selling: '+money(p.selling_price)+'</span><span>Cost: '+money(p.cost_price)+'</span></p>'+(p.description?'<p class="customer-address">'+escapeHtml(p.description)+'</p>':"")+'</div></div><div class="customer-actions"><button class="secondary" type="button" data-edit-product="'+p.id+'">Edit</button><button class="secondary customer-delete" type="button" data-delete-product="'+p.id+'">Delete</button></div></article>').join("");
    productMessage(rows.length+" product"+(rows.length===1?"":"s")+" shown");
  }
  function editProduct(id){
    const p=productRows.find(r=>r.id===id);if(!p)return;
    $("product-id").value=p.id;$("product-name").value=p.product_name||"";$("product-sku").value=p.sku||"";
    $("product-description").value=p.description||"";$("product-selling-price").value=p.selling_price??"";
    $("product-cost-price").value=p.cost_price??"";
    productEditMode=true;$("product-form-title").textContent="Edit product";$("save-product").textContent="Save changes";
    $("product-form").hidden=false;$("product-form").scrollIntoView({behavior:"smooth",block:"start"});$("product-name").focus();
  }
  $("open-customers").addEventListener("click",showCustomersPanel);
  $("open-products").addEventListener("click",showProductsPanel);
  $("back-dashboard").addEventListener("click",showDashboardOnly);
  $("back-products-dashboard").addEventListener("click",showDashboardOnly);
  $("add-product").addEventListener("click",()=>{resetProductForm();$("product-form").hidden=false;$("product-form").scrollIntoView({behavior:"smooth",block:"start"});$("product-name").focus();});
  $("cancel-product").addEventListener("click",resetProductForm);
  $("product-search").addEventListener("input",renderProducts);
  $("products-list").addEventListener("click",async event=>{
    const edit=event.target.closest("[data-edit-product]");
    if(edit){editProduct(edit.dataset.editProduct);return;}
    const del=event.target.closest("[data-delete-product]");if(!del)return;
    const id=del.dataset.deleteProduct,p=productRows.find(r=>r.id===id);
    if(!p||!window.confirm("Permanently delete "+p.product_name+"?"))return;
    del.disabled=true;
    const {error}=await supabase.from("products").delete().eq("id",id).eq("business_id",currentBusinessId);
    if(error){console.error(error);productMessage("Could not delete this product. Please check database policies.",true);del.disabled=false;return;}
    productRows=productRows.filter(r=>r.id!==id);renderProducts();productMessage("Product deleted.");
  });
  $("product-form").addEventListener("submit",async event=>{
    event.preventDefault();
    if(!supabase||!currentBusinessId){productMessage("Business details are not ready. Please refresh and try again.",true);return;}
    const id=$("product-id").value;
    const name=$("product-name").value.trim();
    const sku=$("product-sku").value.trim();
    const selling=Number($("product-selling-price").value);
    const costRaw=$("product-cost-price").value.trim();
    const cost=costRaw===""?0:Number(costRaw);
    if(!name){$("product-name").focus();return;}
    if(!Number.isFinite(selling)||selling<0||!Number.isFinite(cost)||cost<0){productMessage("Enter valid non-negative prices.",true);return;}
    if(sku&&productRows.some(p=>String(p.sku||"").toLowerCase()===sku.toLowerCase()&&p.id!==id)){
      productMessage("That SKU is already used by another product. Enter a different SKU.",true);$("product-sku").focus();return;
    }
    const payload={business_id:currentBusinessId,product_name:name,sku:sku||null,description:$("product-description").value.trim()||null,selling_price:selling,cost_price:cost,is_active:true,updated_at:new Date().toISOString()};
    const button=$("save-product");button.disabled=true;button.textContent="Saving…";
    try{
      let result;
      if(id&&productEditMode)result=await supabase.from("products").update(payload).eq("id",id).eq("business_id",currentBusinessId).select("id").single();
      else result=await supabase.from("products").insert(payload).select("id").single();
      if(result.error)throw result.error;
      resetProductForm();await loadProducts();productMessage(id?"Product details updated.":"Product added successfully.");
    }catch(err){console.error("Product save failed:",err);productMessage(err?.message||"Could not save this product. Please try again.",true);}
    finally{button.disabled=false;button.textContent="Save product";}
  });


  let leadRows = [];
  let leadEditMode = false;
  function showDashboardOnly(){
    $("customers-panel").hidden=true;$("products-panel").hidden=true;$("leads-panel").hidden=true;
    document.querySelector(".section-title").hidden=false;document.querySelector(".feature-grid").hidden=false;
  }
  function showCustomersPanel(){
    $("products-panel").hidden=true;$("leads-panel").hidden=true;$("customers-panel").hidden=false;
    document.querySelector(".section-title").hidden=true;document.querySelector(".feature-grid").hidden=true;
    $("customer-search").value="";$("customer-form").hidden=true;loadCustomers();
    $("customers-panel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function showProductsPanel(){
    $("customers-panel").hidden=true;$("leads-panel").hidden=true;$("products-panel").hidden=false;
    document.querySelector(".section-title").hidden=true;document.querySelector(".feature-grid").hidden=true;
    $("product-search").value="";$("product-form").hidden=true;loadProducts();
    $("products-panel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function showLeadsPanel(){
    $("customers-panel").hidden=true;$("products-panel").hidden=true;$("leads-panel").hidden=false;
    document.querySelector(".section-title").hidden=true;document.querySelector(".feature-grid").hidden=true;
    $("lead-search").value="";$("lead-form").hidden=true;loadLeads();
    $("leads-panel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function leadMessage(message,isError=false){
    const el=$("leads-message");el.textContent=message;el.classList.toggle("customer-error",isError);
  }
  function resetLeadForm(){
    $("lead-form").reset();$("lead-id").value="";leadEditMode=false;
    $("lead-form-title").textContent="Add lead";$("save-lead").textContent="Save lead";$("lead-form").hidden=true;
  }
  async function loadLeads(){
    if(!supabase||!currentBusinessId){leadMessage("Business details are still loading. Please try again.",true);return;}
    leadMessage("Loading leads…");$("leads-list").innerHTML="";
    const {data,error}=await supabase.from("leads")
      .select("id,business_id,customer_id,contact_name,phone,email,source,inquiry,stage,estimated_value,next_follow_up_at,notes,is_archived,created_at,updated_at")
      .eq("business_id",currentBusinessId).eq("is_archived",false).order("created_at",{ascending:false});
    if(error){console.error("Lead load failed:",error);leadMessage("Could not load leads. Please check the leads table policies.",true);return;}
    leadRows=data||[];renderLeads();
  }
  function localDateTime(value){
    if(!value)return "";
    const d=new Date(value);if(Number.isNaN(d.getTime()))return "";
    const pad=n=>String(n).padStart(2,"0");
    return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(d.getHours())+":"+pad(d.getMinutes());
  }
  function renderLeads(){
    const q=$("lead-search").value.trim().toLowerCase();
    const rows=leadRows.filter(l=>[l.contact_name,l.phone,l.email,l.source,l.inquiry,l.stage,l.notes].some(v=>String(v||"").toLowerCase().includes(q)));
    if(!rows.length){
      $("leads-list").innerHTML='<div class="empty-customers"><strong>'+(q?"No matching leads":"No leads yet")+'</strong><p>'+(q?"Try another search term.":"Select “Add lead” to save your first inquiry.")+'</p></div>';
      leadMessage(q?"No matching leads":"0 leads saved");return;
    }
    $("leads-list").innerHTML=rows.map(l=>'<article class="customer-card"><div class="customer-card-main"><div class="product-avatar">↗</div><div class="customer-card-details"><h3>'+escapeHtml(l.contact_name)+'</h3><p><span class="lead-stage">'+escapeHtml(l.stage||"New")+'</span>'+(l.phone?'<span>☎ '+escapeHtml(l.phone)+'</span>':"")+(l.email?'<span>✉ '+escapeHtml(l.email)+'</span>':"")+(l.source?'<span>Source: '+escapeHtml(l.source)+'</span>':"")+'</p>'+(l.inquiry?'<p class="customer-address"><strong>Inquiry:</strong> '+escapeHtml(l.inquiry)+'</p>':"")+(l.estimated_value!==null&&l.estimated_value!==undefined?'<p class="customer-address"><strong>Estimated value:</strong> '+money(l.estimated_value)+'</p>':"")+(l.next_follow_up_at?'<p class="customer-address"><strong>Follow-up:</strong> '+escapeHtml(formatDate(l.next_follow_up_at))+'</p>':"")+(l.notes?'<p class="customer-notes">'+escapeHtml(l.notes)+'</p>':"")+'</div></div><div class="customer-actions"><button class="secondary" type="button" data-edit-lead="'+l.id+'">Edit</button><button class="secondary customer-delete" type="button" data-delete-lead="'+l.id+'">Delete</button></div></article>').join("");
    leadMessage(rows.length+" lead"+(rows.length===1?"":"s")+" shown");
  }
  function editLead(id){
    const l=leadRows.find(r=>r.id===id);if(!l)return;
    $("lead-id").value=l.id;$("lead-contact-name").value=l.contact_name||"";$("lead-phone").value=l.phone||"";
    $("lead-email").value=l.email||"";$("lead-source").value=l.source||"";$("lead-inquiry").value=l.inquiry||"";
    $("lead-stage").value=["new","contacted","interested","negotiation","converted","lost"].includes(l.stage)?l.stage:"new";
    $("lead-value").value=l.estimated_value??"";$("lead-follow-up").value=localDateTime(l.next_follow_up_at);
    $("lead-notes").value=l.notes||"";leadEditMode=true;$("lead-form-title").textContent="Edit lead";
    $("save-lead").textContent="Save changes";$("lead-form").hidden=false;
    $("lead-form").scrollIntoView({behavior:"smooth",block:"start"});$("lead-contact-name").focus();
  }
  $("open-customers").addEventListener("click",showCustomersPanel);
  $("open-products").addEventListener("click",showProductsPanel);
  $("open-leads").addEventListener("click",showLeadsPanel);
  $("back-dashboard").addEventListener("click",showDashboardOnly);
  $("back-products-dashboard").addEventListener("click",showDashboardOnly);
  $("back-leads-dashboard").addEventListener("click",showDashboardOnly);
  $("add-lead").addEventListener("click",()=>{resetLeadForm();$("lead-form").hidden=false;$("lead-form").scrollIntoView({behavior:"smooth",block:"start"});$("lead-contact-name").focus();});
  $("cancel-lead").addEventListener("click",resetLeadForm);
  $("lead-search").addEventListener("input",renderLeads);
  $("leads-list").addEventListener("click",async event=>{
    const edit=event.target.closest("[data-edit-lead]");if(edit){editLead(edit.dataset.editLead);return;}
    const del=event.target.closest("[data-delete-lead]");if(!del)return;
    const id=del.dataset.deleteLead,l=leadRows.find(r=>r.id===id);
    if(!l||!window.confirm("Permanently delete lead for "+l.contact_name+"?"))return;
    del.disabled=true;
    const {error}=await supabase.from("leads").delete().eq("id",id).eq("business_id",currentBusinessId);
    if(error){console.error(error);leadMessage("Could not delete this lead. Please check database policies.",true);del.disabled=false;return;}
    leadRows=leadRows.filter(r=>r.id!==id);renderLeads();leadMessage("Lead deleted.");
  });
  $("lead-form").addEventListener("submit",async event=>{
    event.preventDefault();
    if(!supabase||!currentBusinessId){leadMessage("Business details are not ready. Please refresh and try again.",true);return;}
    const id=$("lead-id").value,name=$("lead-contact-name").value.trim();
    const valueRaw=$("lead-value").value.trim(),value=valueRaw===""?null:Number(valueRaw);
    if(!name){$("lead-contact-name").focus();return;}
    if(value!==null&&(!Number.isFinite(value)||value<0)){leadMessage("Enter a valid non-negative estimated value.",true);return;}
    const followRaw=$("lead-follow-up").value;
    const followUp=followRaw?new Date(followRaw).toISOString():null;
    const payload={business_id:currentBusinessId,customer_id:null,contact_name:name,phone:$("lead-phone").value.trim()||null,email:$("lead-email").value.trim()||null,source:$("lead-source").value.trim()||"manual",inquiry:$("lead-inquiry").value.trim()||null,stage:$("lead-stage").value||"new",estimated_value:value,next_follow_up_at:followUp,notes:$("lead-notes").value.trim()||null,is_archived:false,updated_at:new Date().toISOString()};
    const button=$("save-lead");button.disabled=true;button.textContent="Saving…";
    try{
      let result;
      if(id&&leadEditMode)result=await supabase.from("leads").update(payload).eq("id",id).eq("business_id",currentBusinessId).select("id").single();
      else result=await supabase.from("leads").insert(payload).select("id").single();
      if(result.error)throw result.error;
      resetLeadForm();await loadLeads();leadMessage(id?"Lead details updated.":"Lead added successfully.");
    }catch(err){console.error("Lead save failed:",err);leadMessage(err?.message||"Could not save this lead. Please try again.",true);}
    finally{button.disabled=false;button.textContent="Save lead";}
  });


  // Follow-ups module: reminders can be linked to a lead or a customer.
  let followUpRows = [];
  let followUpEditMode = false;
  function showDashboardOnly(){
    $("customers-panel").hidden=true;$("products-panel").hidden=true;$("leads-panel").hidden=true;$("follow-ups-panel").hidden=true;$("orders-panel").hidden=true;$("order-payment-panel").hidden=true;$("sales-overview-panel").hidden=true;$("profit-overview-panel").hidden=true;
    document.querySelector(".section-title").hidden=false;document.querySelector(".feature-grid").hidden=false;
  }
  function showCustomersPanel(){
    $("products-panel").hidden=true;$("leads-panel").hidden=true;$("follow-ups-panel").hidden=true;$("orders-panel").hidden=true;$("order-payment-panel").hidden=true;$("sales-overview-panel").hidden=true;$("profit-overview-panel").hidden=true;$("customers-panel").hidden=false;
    document.querySelector(".section-title").hidden=true;document.querySelector(".feature-grid").hidden=true;
    $("customer-search").value="";$("customer-form").hidden=true;loadCustomers();
    $("customers-panel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function showProductsPanel(){
    $("customers-panel").hidden=true;$("leads-panel").hidden=true;$("follow-ups-panel").hidden=true;$("orders-panel").hidden=true;$("order-payment-panel").hidden=true;$("sales-overview-panel").hidden=true;$("profit-overview-panel").hidden=true;$("products-panel").hidden=false;
    document.querySelector(".section-title").hidden=true;document.querySelector(".feature-grid").hidden=true;
    $("product-search").value="";$("product-form").hidden=true;loadProducts();
    $("products-panel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function showLeadsPanel(){
    $("customers-panel").hidden=true;$("products-panel").hidden=true;$("follow-ups-panel").hidden=true;$("orders-panel").hidden=true;$("order-payment-panel").hidden=true;$("sales-overview-panel").hidden=true;$("profit-overview-panel").hidden=true;$("leads-panel").hidden=false;
    document.querySelector(".section-title").hidden=true;document.querySelector(".feature-grid").hidden=true;
    $("lead-search").value="";$("lead-form").hidden=true;loadLeads();
    $("leads-panel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function showFollowUpsPanel(){
    $("customers-panel").hidden=true;$("products-panel").hidden=true;$("leads-panel").hidden=true;$("orders-panel").hidden=true;$("order-payment-panel").hidden=true;$("sales-overview-panel").hidden=true;$("profit-overview-panel").hidden=true;$("follow-ups-panel").hidden=false;
    document.querySelector(".section-title").hidden=true;document.querySelector(".feature-grid").hidden=true;
    $("follow-up-search").value="";$("follow-up-form").hidden=true;loadFollowUps();
    $("follow-ups-panel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function followUpMessage(message,isError=false){
    const el=$("follow-ups-message");el.textContent=message;el.classList.toggle("customer-error",isError);
  }
  function resetFollowUpForm(){
    $("follow-up-form").reset();$("follow-up-id").value="";followUpEditMode=false;
    $("follow-up-form-title").textContent="Add follow-up";$("save-follow-up").textContent="Save follow-up";
    $("follow-up-status").value="pending";$("follow-up-related").value="";$("follow-up-form").hidden=true;
  }
  async function loadFollowUpChoices(selectedValue=""){
    const select=$("follow-up-related");
    const [customersResult,leadsResult]=await Promise.all([
      supabase.from("customers").select("id,full_name").eq("business_id",currentBusinessId).eq("is_archived",false).order("full_name",{ascending:true}),
      supabase.from("leads").select("id,contact_name").eq("business_id",currentBusinessId).eq("is_archived",false).order("contact_name",{ascending:true})
    ]);
    if(customersResult.error) console.warn("Follow-up customer choices failed:",customersResult.error);
    if(leadsResult.error) console.warn("Follow-up lead choices failed:",leadsResult.error);
    const options=['<option value="">No linked record</option>'];
    (customersResult.data||[]).forEach(c=>options.push('<option value="customer:'+escapeHtml(c.id)+'">Customer: '+escapeHtml(c.full_name)+'</option>'));
    (leadsResult.data||[]).forEach(l=>options.push('<option value="lead:'+escapeHtml(l.id)+'">Lead: '+escapeHtml(l.contact_name)+'</option>'));
    select.innerHTML=options.join("");
    select.value=selectedValue;
  }
  async function loadFollowUps(){
    if(!supabase||!currentBusinessId){followUpMessage("Business details are still loading. Please try again.",true);return;}
    followUpMessage("Loading follow-ups…");$("follow-ups-list").innerHTML="";
    const {data,error}=await supabase.from("follow_ups")
      .select("id,business_id,customer_id,lead_id,title,notes,due_at,status,completed_at,created_at,updated_at")
      .eq("business_id",currentBusinessId).order("due_at",{ascending:true});
    if(error){console.error("Follow-ups load failed:",error);followUpMessage("Could not load follow-ups. Please check the follow_ups table policies.",true);return;}
    followUpRows=data||[];
    const [customersResult,leadsResult]=await Promise.all([
      supabase.from("customers").select("id,full_name").eq("business_id",currentBusinessId),
      supabase.from("leads").select("id,contact_name").eq("business_id",currentBusinessId)
    ]);
    const names={};
    (customersResult.data||[]).forEach(c=>names["customer:"+c.id]=c.full_name);
    (leadsResult.data||[]).forEach(l=>names["lead:"+l.id]=l.contact_name);
    followUpRows=followUpRows.map(f=>({...f,relatedName:f.customer_id?names["customer:"+f.customer_id]:f.lead_id?names["lead:"+f.lead_id]:""}));
    renderFollowUps();
  }
  function renderFollowUps(){
    const q=$("follow-up-search").value.trim().toLowerCase();
    const rows=followUpRows.filter(f=>[f.title,f.notes,f.status,f.relatedName].some(v=>String(v||"").toLowerCase().includes(q)));
    if(!rows.length){
      $("follow-ups-list").innerHTML='<div class="empty-customers"><strong>'+(q?"No matching follow-ups":"No follow-ups yet")+'</strong><p>'+(q?"Try another search term.":"Select “Add follow-up” to create a reminder.")+'</p></div>';
      followUpMessage(q?"No matching follow-ups":"0 follow-ups saved");return;
    }
    const statusLabel={pending:"Pending",completed:"Completed",cancelled:"Cancelled"};
    $("follow-ups-list").innerHTML=rows.map(f=>{
      const overdue=f.status==="pending"&&new Date(f.due_at).getTime()<Date.now();
      return '<article class="customer-card"><div class="customer-card-main"><div class="product-avatar">⏰</div><div class="customer-card-details"><h3>'+escapeHtml(f.title)+'</h3><p><span class="lead-stage '+(overdue?'follow-up-overdue':'')+'">'+(overdue?'Overdue · ':'')+escapeHtml(statusLabel[f.status]||f.status)+'</span><span><strong>Due:</strong> '+escapeHtml(formatDate(f.due_at))+'</span></p>'+(f.relatedName?'<p class="customer-address"><strong>Linked to:</strong> '+escapeHtml(f.relatedName)+'</p>':'')+(f.notes?'<p class="customer-notes">'+escapeHtml(f.notes)+'</p>':'')+'</div></div><div class="customer-actions"><button class="secondary" type="button" data-edit-follow-up="'+f.id+'">Edit</button><button class="secondary customer-delete" type="button" data-delete-follow-up="'+f.id+'">Delete</button></div></article>';
    }).join("");
    followUpMessage(rows.length+" follow-up"+(rows.length===1?"":"s")+" shown");
  }
  async function editFollowUp(id){
    const f=followUpRows.find(r=>r.id===id);if(!f)return;
    $("follow-up-id").value=f.id;$("follow-up-title").value=f.title||"";$("follow-up-due-at").value=localDateTime(f.due_at);
    $("follow-up-status").value=["pending","completed","cancelled"].includes(f.status)?f.status:"pending";
    $("follow-up-notes").value=f.notes||"";
    const linkedValue=f.customer_id?"customer:"+f.customer_id:f.lead_id?"lead:"+f.lead_id:"";
    await loadFollowUpChoices(linkedValue);
    followUpEditMode=true;$("follow-up-form-title").textContent="Edit follow-up";$("save-follow-up").textContent="Save changes";
    $("follow-up-form").hidden=false;$("follow-up-form").scrollIntoView({behavior:"smooth",block:"start"});$("follow-up-title").focus();
  }
  $("open-follow-ups").addEventListener("click",showFollowUpsPanel);
  $("back-follow-ups-dashboard").addEventListener("click",showDashboardOnly);
  $("add-follow-up").addEventListener("click",async()=>{
    resetFollowUpForm();await loadFollowUpChoices();$("follow-up-due-at").value=localDateTime(new Date(Date.now()+60*60*1000).toISOString());
    $("follow-up-form").hidden=false;$("follow-up-form").scrollIntoView({behavior:"smooth",block:"start"});$("follow-up-title").focus();
  });
  $("cancel-follow-up").addEventListener("click",resetFollowUpForm);
  $("follow-up-search").addEventListener("input",renderFollowUps);
  $("follow-ups-list").addEventListener("click",async event=>{
    const edit=event.target.closest("[data-edit-follow-up]");if(edit){await editFollowUp(edit.dataset.editFollowUp);return;}
    const del=event.target.closest("[data-delete-follow-up]");if(!del)return;
    const id=del.dataset.deleteFollowUp,f=followUpRows.find(r=>r.id===id);
    if(!f||!window.confirm("Permanently delete follow-up “"+f.title+"”?"))return;
    del.disabled=true;
    const {error}=await supabase.from("follow_ups").delete().eq("id",id).eq("business_id",currentBusinessId);
    if(error){console.error(error);followUpMessage("Could not delete this follow-up. Please check database policies.",true);del.disabled=false;return;}
    followUpRows=followUpRows.filter(r=>r.id!==id);renderFollowUps();followUpMessage("Follow-up deleted.");
  });
  $("follow-up-form").addEventListener("submit",async event=>{
    event.preventDefault();
    if(!supabase||!currentBusinessId){followUpMessage("Business details are not ready. Please refresh and try again.",true);return;}
    const id=$("follow-up-id").value,title=$("follow-up-title").value.trim(),dueRaw=$("follow-up-due-at").value;
    if(!title||!dueRaw){followUpMessage("Enter a title and due date/time.",true);return;}
    const related=$("follow-up-related").value;
    const customerId=related.startsWith("customer:")?related.slice(9):null;
    const leadId=related.startsWith("lead:")?related.slice(5):null;
    const status=$("follow-up-status").value;
    const payload={business_id:currentBusinessId,customer_id:customerId,lead_id:leadId,title,notes:$("follow-up-notes").value.trim()||null,due_at:new Date(dueRaw).toISOString(),status,completed_at:status==="completed"?new Date().toISOString():null,updated_at:new Date().toISOString()};
    const button=$("save-follow-up");button.disabled=true;button.textContent="Saving…";
    try{
      let result;
      if(id&&followUpEditMode)result=await supabase.from("follow_ups").update(payload).eq("id",id).eq("business_id",currentBusinessId).select("id").single();
      else result=await supabase.from("follow_ups").insert(payload).select("id").single();
      if(result.error)throw result.error;
      resetFollowUpForm();await loadFollowUps();followUpMessage(id?"Follow-up updated.":"Follow-up added successfully.");
    }catch(err){console.error("Follow-up save failed:",err);followUpMessage(err?.message||"Could not save this follow-up. Please try again.",true);}
    finally{button.disabled=false;button.textContent="Save follow-up";}
  });


  // Orders and payments: all reads and writes are scoped to the signed-in business.
  let orderRows = [];
  let orderItemDrafts = [];
  let orderCustomerChoices = [];
  let orderProductChoices = [];
  let paymentOrder = null;
  let orderEditMode = false;
  function orderMessage(message,isError=false){const el=$("orders-message");el.textContent=message;el.classList.toggle("customer-error",isError);}
  function paymentMessage(message,isError=false){const el=$("payments-list");if(message)el.insertAdjacentHTML("afterbegin",'<p class="customer-message '+(isError?'customer-error':'')+'">'+escapeHtml(message)+'</p>');}
  function orderPanelHideAll(){
    $("customers-panel").hidden=true;$("products-panel").hidden=true;$("leads-panel").hidden=true;$("follow-ups-panel").hidden=true;
    $("orders-panel").hidden=true;$("order-payment-panel").hidden=true;$("sales-overview-panel").hidden=true;$("profit-overview-panel").hidden=true;
  }
  function showOrdersPanel(){
    orderPanelHideAll();$("orders-panel").hidden=false;
    document.querySelector(".section-title").hidden=true;document.querySelector(".feature-grid").hidden=true;
    $("order-search").value="";$("order-form").hidden=true;loadOrders();
    $("orders-panel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  async function loadOrderChoices(){
    const [customers,products]=await Promise.all([
      supabase.from("customers").select("id,full_name").eq("business_id",currentBusinessId).eq("is_archived",false).order("full_name",{ascending:true}),
      supabase.from("products").select("id,product_name,selling_price,cost_price").eq("business_id",currentBusinessId).eq("is_active",true).order("product_name",{ascending:true})
    ]);
    if(customers.error)throw customers.error;if(products.error)throw products.error;
    orderCustomerChoices=customers.data||[];orderProductChoices=products.data||[];
    $("order-customer").innerHTML='<option value="">Walk-in / no customer</option>'+orderCustomerChoices.map(c=>'<option value="'+escapeHtml(c.id)+'">'+escapeHtml(c.full_name)+'</option>').join("");
  }
  function orderProductOptions(selectedId){
    return '<option value="">Choose a product…</option>'+orderProductChoices.map(p=>'<option value="'+escapeHtml(p.id)+'" '+(p.id===selectedId?'selected':'')+'>'+escapeHtml(p.product_name)+' · '+money(p.selling_price)+'</option>').join("");
  }
  function renderOrderItemEditor(){
    const root=$("order-items-editor");
    if(!orderItemDrafts.length){root.innerHTML='<div class="empty-customers"><strong>No products added</strong><p>Select “Add product” to include an item in this order.</p></div>';calculateOrderTotal();return;}
    root.innerHTML=orderItemDrafts.map((it,i)=>'<div class="order-item-row" data-order-item="'+i+'"><label>Product<select data-item-product="'+i+'">'+orderProductOptions(it.product_id)+'</select></label><label>Quantity<input data-item-quantity="'+i+'" type="number" min="0.001" step="any" value="'+escapeHtml(it.quantity)+'" inputmode="decimal"></label><label>Unit price (₱)<input data-item-price="'+i+'" type="number" min="0" step="0.01" value="'+escapeHtml(it.unit_price)+'" inputmode="decimal"></label><label>Item discount (₱)<input data-item-discount="'+i+'" type="number" min="0" step="0.01" value="'+escapeHtml(it.line_discount||0)+'" inputmode="decimal"></label><div class="order-item-footer"><span>Line total: <strong>'+money(Math.max(0,(Number(it.quantity)||0)*(Number(it.unit_price)||0)-(Number(it.line_discount)||0)))+'</strong></span><button type="button" class="secondary customer-delete" data-remove-order-item="'+i+'">Remove</button></div></div>').join("");
    calculateOrderTotal();
  }
  function calculateOrderTotal(){
    const subtotal=orderItemDrafts.reduce((sum,it)=>sum+Math.max(0,(Number(it.quantity)||0)*(Number(it.unit_price)||0)-(Number(it.line_discount)||0)),0);
    const discount=Math.max(0,Number($("order-discount").value)||0);
    const delivery=Math.max(0,Number($("order-delivery-fee").value)||0);
    $("order-subtotal-display").textContent=money(subtotal);$("order-discount-display").textContent=money(discount);$("order-delivery-display").textContent=money(delivery);
    $("order-total-display").textContent=money(Math.max(0,subtotal-discount+delivery));
    return {subtotal,discount,delivery,total:Math.max(0,subtotal-discount+delivery)};
  }
  function resetOrderForm(){
    $("order-form").reset();$("order-id").value="";orderEditMode=false;$("order-form-title").textContent="Create order";$("save-order").textContent="Save order";
    $("order-date").value=localDateTime();$("order-status").value="pending";$("order-discount").value="0";$("order-delivery-fee").value="0";
    orderItemDrafts=[];renderOrderItemEditor();$("order-form").hidden=true;
  }
  async function loadOrders(){
    if(!supabase||!currentBusinessId){orderMessage("Business details are still loading. Please try again.",true);return;}
    orderMessage("Loading orders…");$("orders-list").innerHTML="";
    const {data,error}=await supabase.from("orders").select("id,business_id,customer_id,order_number,order_date,status,payment_status,fulfillment_method,subtotal,discount_amount,delivery_fee,total_amount,notes,delivered_at,is_archived,created_at,updated_at").eq("business_id",currentBusinessId).eq("is_archived",false).order("order_date",{ascending:false});
    if(error){console.error("Order load failed:",error);orderMessage("Could not load orders. Please check the orders table policies.",true);return;}
    orderRows=data||[];
    const [customers,payments]=await Promise.all([supabase.from("customers").select("id,full_name").eq("business_id",currentBusinessId),supabase.from("order_payments").select("order_id,amount").eq("business_id",currentBusinessId)]);
    const customerNames={};(customers.data||[]).forEach(c=>customerNames[c.id]=c.full_name);
    const paidByOrder={};(payments.data||[]).forEach(p=>paidByOrder[p.order_id]=(paidByOrder[p.order_id]||0)+Number(p.amount||0));
    orderRows=orderRows.map(o=>({...o,customerName:customerNames[o.customer_id]||"Walk-in customer",paidAmount:paidByOrder[o.id]||0,balance:Math.max(0,Number(o.total_amount||0)-(paidByOrder[o.id]||0))}));
    renderOrders();
  }
  function orderStatusLabel(status){return ({pending:"Pending",confirmed:"Confirmed",processing:"Processing",ready_for_pickup:"Ready for pickup",ready_to_ship:"Ready to ship",out_for_delivery:"Out for delivery",shipped:"Shipped",delivered:"Delivered",completed:"Completed",cancelled:"Cancelled",returned:"Returned"})[status]||String(status||"").replace(/_/g," ");}
  function renderOrders(){
    const q=$("order-search").value.trim().toLowerCase();
    const rows=orderRows.filter(o=>String(o.order_number).includes(q)||String(o.customerName||"").toLowerCase().includes(q)||String(o.status||"").includes(q));
    if(!rows.length){$("orders-list").innerHTML='<div class="empty-customers"><strong>'+(q?'No matching orders':'No orders yet')+'</strong><p>'+(q?'Try another search term.':'Select “Create order” to record your first sale.')+'</p></div>';orderMessage(q?'No matching orders':'0 orders saved');return;}
    $("orders-list").innerHTML=rows.map(o=>'<article class="customer-card"><div class="customer-card-main"><div class="product-avatar">#</div><div class="customer-card-details"><h3>Order #'+escapeHtml(o.order_number)+' · '+escapeHtml(o.customerName)+'</h3><p><span class="lead-stage">'+escapeHtml(orderStatusLabel(o.status))+'</span><span>'+escapeHtml(formatDate(o.order_date))+'</span></p><p><span>Total: <strong>'+money(o.total_amount)+'</strong></span><span>Paid: '+money(o.paidAmount)+'</span><span>Balance: <strong>'+money(o.balance)+'</strong></span></p><p><span>Payment: '+escapeHtml(o.balance<=0?'Paid':o.paidAmount>0?'Partially paid':'Unpaid')+'</span></p></div></div><div class="customer-actions"><button class="secondary" type="button" data-edit-order="'+o.id+'">Edit</button><button class="secondary" type="button" data-order-payments="'+o.id+'">Payments</button></div></article>').join("");
    orderMessage(rows.length+" order"+(rows.length===1?"":"s")+" shown");
  }
  async function editOrder(id){
    const o=orderRows.find(r=>r.id===id);if(!o)return;
    try{
      await loadOrderChoices();
      const {data,error}=await supabase.from("order_items").select("id,product_id,product_name,quantity,unit_price,unit_cost,line_discount,line_total").eq("business_id",currentBusinessId).eq("order_id",id);
      if(error)throw error;
      $("order-id").value=o.id;$("order-customer").value=o.customer_id||"";$("order-date").value=localDateTime(o.order_date);$("order-status").value=o.status||"pending";$("order-fulfillment").value=o.fulfillment_method||"delivery";
      $("order-discount").value=Number(o.discount_amount||0);$("order-delivery-fee").value=Number(o.delivery_fee||0);$("order-notes").value=o.notes||"";
      orderItemDrafts=(data||[]).map(it=>({id:it.id,product_id:it.product_id||"",product_name:it.product_name,quantity:Number(it.quantity),unit_price:Number(it.unit_price),unit_cost:Number(it.unit_cost||0),line_discount:Number(it.line_discount||0)}));
      renderOrderItemEditor();orderEditMode=true;$("order-form-title").textContent="Edit order #"+o.order_number;$("save-order").textContent="Save changes";$("order-form").hidden=false;$("order-form").scrollIntoView({behavior:"smooth",block:"start"});
    }catch(err){console.error("Order edit load failed:",err);orderMessage(err.message||"Could not open this order.",true);}
  }
  async function openOrderPayments(id){
    const o=orderRows.find(r=>r.id===id);if(!o)return;paymentOrder=o;
    $("orders-panel").hidden=true;$("order-payment-panel").hidden=false;$("payment-order-id").value=o.id;
    $("payment-order-title").textContent="Payments · Order #"+o.order_number;
    $("payment-order-summary").textContent=o.customerName+" · Total "+money(o.total_amount)+" · Paid "+money(o.paidAmount)+" · Balance "+money(o.balance);
    $("payment-date").value=localDateTime();$("payment-amount").value=o.balance>0?o.balance:"";$("payment-method").value="cash";$("payment-reference").value="";$("payment-notes").value="";
    await loadOrderPayments(id);$("order-payment-panel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  async function loadOrderPayments(orderId){
    const root=$("payments-list");root.innerHTML='<p class="customer-message muted">Loading payments…</p>';
    const {data,error}=await supabase.from("order_payments").select("id,order_id,amount,payment_method,payment_date,reference_number,notes,created_at").eq("business_id",currentBusinessId).eq("order_id",orderId).order("payment_date",{ascending:false});
    if(error){console.error(error);root.innerHTML='<div class="empty-customers"><strong>Could not load payments</strong><p>Check the order_payments table policies.</p></div>';return;}
    if(!data?.length){root.innerHTML='<div class="empty-customers"><strong>No payments recorded</strong><p>Record a payment below, including a deposit or partial payment.</p></div>';return;}
    root.innerHTML=data.map(p=>'<article class="customer-card"><div class="customer-card-main"><div class="product-avatar">₱</div><div class="customer-card-details"><h3>'+money(p.amount)+' · '+escapeHtml(String(p.payment_method).replace(/_/g," "))+'</h3><p><span>'+escapeHtml(formatDate(p.payment_date))+'</span>'+(p.reference_number?'<span>Ref: '+escapeHtml(p.reference_number)+'</span>':'')+'</p>'+(p.notes?'<p class="customer-notes">'+escapeHtml(p.notes)+'</p>':'')+'</div></div></article>').join("");
  }
  $("open-orders").addEventListener("click",showOrdersPanel);
  $("back-orders-dashboard").addEventListener("click",()=>{orderPanelHideAll();showDashboardOnly();});
  $("back-order-list").addEventListener("click",()=>{$("order-payment-panel").hidden=true;$("orders-panel").hidden=false;loadOrders();$("orders-panel").scrollIntoView({behavior:"smooth",block:"start"});});
  $("add-order").addEventListener("click",async()=>{
    try{resetOrderForm();await loadOrderChoices();orderItemDrafts=[{product_id:"",quantity:1,unit_price:0,unit_cost:0,line_discount:0}];renderOrderItemEditor();$("order-form").hidden=false;$("order-form").scrollIntoView({behavior:"smooth",block:"start"});}
    catch(err){console.error(err);orderMessage(err.message||"Could not load customers and products.",true);}
  });
  $("cancel-order").addEventListener("click",resetOrderForm);
  $("add-order-item").addEventListener("click",()=>{orderItemDrafts.push({product_id:"",quantity:1,unit_price:0,unit_cost:0,line_discount:0});renderOrderItemEditor();});
  $("order-items-editor").addEventListener("change",event=>{
    const t=event.target,attr=t.hasAttribute("data-item-product")?"data-item-product":t.hasAttribute("data-item-quantity")?"data-item-quantity":t.hasAttribute("data-item-price")?"data-item-price":t.hasAttribute("data-item-discount")?"data-item-discount":null;
    if(!attr)return;const i=Number(t.getAttribute(attr));if(!orderItemDrafts[i])return;
    if(attr==="data-item-product"){const p=orderProductChoices.find(x=>x.id===t.value);orderItemDrafts[i].product_id=t.value;if(p){orderItemDrafts[i].product_name=p.product_name;orderItemDrafts[i].unit_price=Number(p.selling_price)||0;orderItemDrafts[i].unit_cost=Number(p.cost_price)||0;}renderOrderItemEditor();return;}
    if(attr==="data-item-quantity")orderItemDrafts[i].quantity=t.value;
    if(attr==="data-item-price")orderItemDrafts[i].unit_price=t.value;
    if(attr==="data-item-discount")orderItemDrafts[i].line_discount=t.value;
    const row=t.closest(".order-item-row");if(row)row.querySelector(".order-item-footer strong").textContent=money(Math.max(0,(Number(orderItemDrafts[i].quantity)||0)*(Number(orderItemDrafts[i].unit_price)||0)-(Number(orderItemDrafts[i].line_discount)||0)));
    calculateOrderTotal();
  });
  $("order-items-editor").addEventListener("input",event=>{
    const t=event.target,attrs=["data-item-quantity","data-item-price","data-item-discount"],attr=attrs.find(a=>t.hasAttribute(a));if(!attr)return;
    const i=Number(t.getAttribute(attr));if(!orderItemDrafts[i])return;
    if(attr==="data-item-quantity")orderItemDrafts[i].quantity=t.value;if(attr==="data-item-price")orderItemDrafts[i].unit_price=t.value;if(attr==="data-item-discount")orderItemDrafts[i].line_discount=t.value;
    const row=t.closest(".order-item-row");if(row)row.querySelector(".order-item-footer strong").textContent=money(Math.max(0,(Number(orderItemDrafts[i].quantity)||0)*(Number(orderItemDrafts[i].unit_price)||0)-(Number(orderItemDrafts[i].line_discount)||0)));calculateOrderTotal();
  });
  $("order-items-editor").addEventListener("click",event=>{const b=event.target.closest("[data-remove-order-item]");if(!b)return;orderItemDrafts.splice(Number(b.dataset.removeOrderItem),1);renderOrderItemEditor();});
  ["order-discount","order-delivery-fee"].forEach(id=>$(id).addEventListener("input",calculateOrderTotal));
  $("order-search").addEventListener("input",renderOrders);
  $("orders-list").addEventListener("click",async event=>{const edit=event.target.closest("[data-edit-order]");if(edit){await editOrder(edit.dataset.editOrder);return;}const payments=event.target.closest("[data-order-payments]");if(payments)await openOrderPayments(payments.dataset.orderPayments);});
  $("order-form").addEventListener("submit",async event=>{
    event.preventDefault();if(!supabase||!currentBusinessId){orderMessage("Business details are still loading. Please try again.",true);return;}
    const items=orderItemDrafts.map(it=>({...it,quantity:Number(it.quantity),unit_price:Number(it.unit_price),unit_cost:Number(it.unit_cost)||0,line_discount:Number(it.line_discount)||0}));
    if(!items.length||items.some(it=>!it.product_id||!orderProductChoices.some(p=>p.id===it.product_id)||!(it.quantity>0)||it.unit_price<0||it.line_discount<0||it.line_discount>it.quantity*it.unit_price)){orderMessage("Add at least one valid product. Check quantities, prices, and item discounts.",true);return;}
    const totals=calculateOrderTotal();if(totals.discount>totals.subtotal){orderMessage("The order discount cannot exceed the items subtotal.",true);return;}
    const id=$("order-id").value,button=$("save-order");button.disabled=true;button.textContent="Saving…";
    try{
      let orderId=id;
      if(id&&orderEditMode){
        const {error}=await supabase.from("orders").update({customer_id:$("order-customer").value||null,order_date:new Date($("order-date").value).toISOString(),status:$("order-status").value,fulfillment_method:$("order-fulfillment").value,subtotal:totals.subtotal,discount_amount:totals.discount,delivery_fee:totals.delivery,total_amount:totals.total,notes:$("order-notes").value.trim()||null,delivered_at:$("order-status").value==="delivered"?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",id).eq("business_id",currentBusinessId);
        if(error)throw error;
        const {error:delError}=await supabase.from("order_items").delete().eq("order_id",id).eq("business_id",currentBusinessId);if(delError)throw delError;
      }else{
        // order_number is generated by Supabase/Postgres (identity column); never provide it from the client.
        const {data,error}=await supabase.from("orders").insert({business_id:currentBusinessId,customer_id:$("order-customer").value||null,order_date:new Date($("order-date").value).toISOString(),status:$("order-status").value,fulfillment_method:$("order-fulfillment").value,payment_status:"unpaid",subtotal:totals.subtotal,discount_amount:totals.discount,delivery_fee:totals.delivery,total_amount:totals.total,notes:$("order-notes").value.trim()||null,delivered_at:$("order-status").value==="delivered"?new Date().toISOString():null,is_archived:false,updated_at:new Date().toISOString()}).select("id,order_number").single();
        if(error)throw error;orderId=data.id;
      }
      const rows=items.map(it=>{const p=orderProductChoices.find(x=>x.id===it.product_id);return {business_id:currentBusinessId,order_id:orderId,product_id:it.product_id,product_name:p.product_name,quantity:it.quantity,unit_price:it.unit_price,unit_cost:it.unit_cost,line_discount:it.line_discount,line_total:Math.max(0,it.quantity*it.unit_price-it.line_discount)};});
      const {error:itemError}=await supabase.from("order_items").insert(rows);if(itemError)throw itemError;
      resetOrderForm();await loadOrders();orderMessage(id?"Order updated.":"Order created successfully.");
    }catch(err){console.error("Order save failed:",err);orderMessage(err?.message||"Could not save this order. Please try again.",true);}
    finally{button.disabled=false;button.textContent="Save order";}
  });
  $("cancel-payment").addEventListener("click",()=>{$("payment-form").reset();$("payment-date").value=localDateTime();});
  $("payment-form").addEventListener("submit",async event=>{
    event.preventDefault();const orderId=$("payment-order-id").value,amount=Number($("payment-amount").value),button=$("save-payment");
    if(!orderId||!currentBusinessId||!(amount>0)){paymentMessage("Enter a valid payment amount.",true);return;}
    button.disabled=true;button.textContent="Saving…";
    try{
      const paymentDate=$("payment-date").value?new Date($("payment-date").value).toISOString():new Date().toISOString();
      const {error}=await supabase.from("order_payments").insert({business_id:currentBusinessId,order_id:orderId,amount,payment_method:$("payment-method").value,payment_date:paymentDate,reference_number:$("payment-reference").value.trim()||null,notes:$("payment-notes").value.trim()||null});if(error)throw error;
      const {data:payments,error:paymentsError}=await supabase.from("order_payments").select("amount").eq("business_id",currentBusinessId).eq("order_id",orderId);if(paymentsError)throw paymentsError;
      const totalPaid=(payments||[]).reduce((sum,p)=>sum+Number(p.amount||0),0),target=orderRows.find(o=>o.id===orderId);
      const paymentStatus=totalPaid<=0?"unpaid":totalPaid+0.005>=Number(target?.total_amount||0)?"paid":"partial";
      const paymentUpdate={payment_status:paymentStatus,updated_at:new Date().toISOString()};if(paymentStatus==="paid"&&target&&["pending","confirmed"].includes(target.status))paymentUpdate.status="processing";const {error:updateError}=await supabase.from("orders").update(paymentUpdate).eq("id",orderId).eq("business_id",currentBusinessId);if(updateError)throw updateError;
      $("payment-form").reset();$("payment-date").value=localDateTime();await loadOrders();await openOrderPayments(orderId);
    }catch(err){console.error("Payment save failed:",err);paymentMessage(err?.message||"Could not save this payment. Please try again.",true);}
    finally{button.disabled=false;button.textContent="Save payment";}
  });

  // Sales Overview uses existing business-scoped order and payment records.
  function salesOverviewMessage(message,isError=false){
    const el=$("sales-overview-message");el.textContent=message;el.classList.toggle("customer-error",isError);
  }
  function salesPeriodStart(period){
    const now=new Date();
    if(period==="all")return null;
    if(period==="month")return new Date(now.getFullYear(),now.getMonth(),1);
    const days=Number(period)||30;
    const start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    start.setDate(start.getDate()-(days-1));
    return start;
  }
  async function loadSalesOverview(){
    if(!supabase||!currentBusinessId){salesOverviewMessage("Business details are still loading. Please try again.",true);return;}
    const refresh=$("refresh-sales-overview");refresh.disabled=true;refresh.textContent="Loading…";
    salesOverviewMessage("Loading sales data…");
    try{
      const [ordersResult,paymentsResult]=await Promise.all([
        supabase.from("orders").select("id,order_number,order_date,status,payment_status,total_amount,is_archived").eq("business_id",currentBusinessId).eq("is_archived",false).order("order_date",{ascending:false}),
        supabase.from("order_payments").select("order_id,amount,payment_date").eq("business_id",currentBusinessId)
      ]);
      if(ordersResult.error)throw ordersResult.error;
      if(paymentsResult.error)throw paymentsResult.error;
      const allOrders=ordersResult.data||[],allPayments=paymentsResult.data||[];
      const period=$("sales-period").value,start=salesPeriodStart(period),now=new Date();
      const inRange=value=>{const d=new Date(value);return !Number.isNaN(d.getTime())&&(!start||d>=start)&&d<=now;};
      const ordersInPeriod=allOrders.filter(o=>inRange(o.order_date));
      const eligibleOrders=ordersInPeriod.filter(o=>!['cancelled','returned'].includes(String(o.status||'').toLowerCase())&&String(o.payment_status||'').toLowerCase()!=='refunded');
      const eligibleIds=new Set(eligibleOrders.map(o=>o.id));
      const eligibleAllIds=new Set(allOrders.filter(o=>!["cancelled","returned"].includes(String(o.status||"").toLowerCase())&&String(o.payment_status||"").toLowerCase()!=="refunded").map(o=>o.id));
      const paidByOrder={};
      allPayments.forEach(p=>{paidByOrder[p.order_id]=(paidByOrder[p.order_id]||0)+Number(p.amount||0);});
      const sales=eligibleOrders.reduce((sum,o)=>sum+Math.max(0,Number(o.total_amount||0)),0);
      const collected=allPayments.filter(p=>eligibleAllIds.has(p.order_id)&&inRange(p.payment_date)).reduce((sum,p)=>sum+Number(p.amount||0),0);
      const balance=eligibleOrders.reduce((sum,o)=>sum+Math.max(0,Number(o.total_amount||0)-(paidByOrder[o.id]||0)),0);
      $("sales-metric-value").textContent=money(sales);
      $("sales-metric-orders").textContent=String(eligibleOrders.length);
      $("sales-metric-collected").textContent=money(collected);
      $("sales-metric-balance").textContent=money(balance);
      const statusCounts={};
      ordersInPeriod.forEach(o=>{const status=o.status||"unknown";statusCounts[status]=(statusCounts[status]||0)+1;});
      const statusKeys=Object.keys(statusCounts).sort((a,b)=>statusCounts[b]-statusCounts[a]);
      $("sales-status-breakdown").innerHTML=statusKeys.length?statusKeys.map(status=>'<div class="sales-status-row"><span>'+escapeHtml(orderStatusLabel(status))+'</span><strong>'+statusCounts[status]+'</strong></div>').join(""):'<div class="empty-customers"><strong>No orders in this period</strong><p>Orders will appear here once you record a sale.</p></div>';
      const periodLabel=period==="all"?"all time":period==="month"?"this month":"the last "+period+" days";
      salesOverviewMessage("Showing "+periodLabel+". Sales and balances use order date; payments received use payment date.");
    }catch(err){
      console.error("Sales Overview load failed:",err);
      salesOverviewMessage(err?.message||"Could not load sales data. Please check the orders and order_payments table policies.",true);
    }finally{refresh.disabled=false;refresh.textContent="Refresh";}
  }
  function showSalesOverviewPanel(){
    orderPanelHideAll();
    $("sales-overview-panel").hidden=false;
    document.querySelector(".section-title").hidden=true;document.querySelector(".feature-grid").hidden=true;
    loadSalesOverview();
    $("sales-overview-panel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  $("open-sales-overview").addEventListener("click",showSalesOverviewPanel);
  $("back-sales-dashboard").addEventListener("click",showDashboardOnly);
  $("sales-period").addEventListener("change",loadSalesOverview);

  $("refresh-sales-overview").addEventListener("click",loadSalesOverview);

  function profitOverviewMessage(message,isError=false){
    const el=$("profit-overview-message");el.textContent=message;el.classList.toggle("customer-error",isError);
  }
  async function loadProfitOverview(){
    if(!supabase||!currentBusinessId){profitOverviewMessage("Business details are still loading. Please try again.",true);return;}
    const refresh=$("refresh-profit-overview");refresh.disabled=true;refresh.textContent="Loading…";
    profitOverviewMessage("Loading profit data…");
    try{
      const [ordersResult,itemsResult]=await Promise.all([
        supabase.from("orders").select("id,order_date,status,payment_status,is_archived").eq("business_id",currentBusinessId).eq("is_archived",false),
        supabase.from("order_items").select("order_id,quantity,unit_price,unit_cost,line_discount,line_total").eq("business_id",currentBusinessId)
      ]);
      if(ordersResult.error)throw ordersResult.error;
      if(itemsResult.error)throw itemsResult.error;
      const period=$("profit-period").value,start=salesPeriodStart(period),now=new Date();
      const inRange=value=>{const d=new Date(value);return !Number.isNaN(d.getTime())&&(!start||d>=start)&&d<=now;};
      const eligible=new Set((ordersResult.data||[]).filter(o=>inRange(o.order_date)&&!["cancelled","returned"].includes(String(o.status||"").toLowerCase())&&String(o.payment_status||"").toLowerCase()!=="refunded").map(o=>o.id));
      let sales=0,costs=0;
      (itemsResult.data||[]).filter(item=>eligible.has(item.order_id)).forEach(item=>{
        const quantity=Number(item.quantity)||0;
        const lineTotal=item.line_total==null?Math.max(0,quantity*(Number(item.unit_price)||0)-(Number(item.line_discount)||0)):Math.max(0,Number(item.line_total)||0);
        sales+=lineTotal;
        costs+=Math.max(0,quantity*(Number(item.unit_cost)||0));
      });
      const gross=sales-costs,margin=sales>0?(gross/sales)*100:0;
      $("profit-metric-sales").textContent=money(sales);
      $("profit-metric-costs").textContent=money(costs);
      $("profit-metric-gross").textContent=money(gross);
      $("profit-metric-margin").textContent=margin.toFixed(1)+"%";
      const label=period==="all"?"all time":period==="month"?"this month":"the last "+period+" days";
      profitOverviewMessage("Showing "+label+". Figures are gross product profit estimates before delivery costs and operating expenses.");
    }catch(err){
      console.error("Profit Overview load failed:",err);
      profitOverviewMessage(err?.message||"Could not load profit data. Please check the orders and order_items table policies.",true);
    }finally{refresh.disabled=false;refresh.textContent="Refresh";}
  }
  function showProfitOverviewPanel(){
    orderPanelHideAll();
    $("profit-overview-panel").hidden=false;
    document.querySelector(".section-title").hidden=true;document.querySelector(".feature-grid").hidden=true;
    loadProfitOverview();
    $("profit-overview-panel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  $("open-profit-overview").addEventListener("click",showProfitOverviewPanel);
  $("back-profit-dashboard").addEventListener("click",showDashboardOnly);
  $("profit-period").addEventListener("change",loadProfitOverview);
  $("refresh-profit-overview").addEventListener("click",loadProfitOverview);

  async function loadDashboard(user) {
    showApp();
    $("user-email").textContent = user.email || "";
    $("business-title").textContent = "Loading business…";
    $("plan-title").textContent = "Checking trial…";
    $("trial-detail").textContent = "Loading subscription status.";

    // The Auth trigger creates these records. The browser only reads them.
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id,business_name")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (businessError || !business) {
      currentBusinessId = null;
      $("business-title").textContent = "Business setup pending";
      $("plan-title").textContent = "Setup needs attention";
      $("trial-detail").textContent =
        "We couldn't load your business account. If you just signed up, confirm your email if required, then log in again. If this persists, check the database trigger.";
      if (businessError) console.error("Business lookup failed:", businessError.message);
      return;
    }

    $("business-title").textContent = business.business_name || "My Business";
    currentBusinessId = business.id;
    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .select("plan_code,status,trial_ends_at,current_period_end")
      .eq("business_id", business.id)
      .maybeSingle();

    if (subError || !sub) {
      $("plan-title").textContent = "Subscription unavailable";
      $("trial-detail").textContent = "We couldn't load your plan status. Please try again later.";
      if (subError) console.error("Subscription lookup failed:", subError.message);
      return;
    }

    const now = Date.now();
    const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : 0;
    const periodEnd = sub.current_period_end ? new Date(sub.current_period_end).getTime() : 0;
    const trialActive = sub.status === "trial" && trialEnd > now;
    const paidActive = sub.status === "active" &&
      (sub.plan_code === "lifetime" || periodEnd > now);
    const accessActive = trialActive || paidActive;

    if (trialActive) {
      const days = Math.max(1, Math.ceil((trialEnd - now) / 86400000));
      $("plan-title").textContent = "7-day free trial";
      $("trial-detail").textContent = `${days} day${days === 1 ? "" : "s"} remaining · Ends ${formatDate(sub.trial_ends_at)}`;
    } else if (paidActive) {
      $("plan-title").textContent = sub.plan_code === "lifetime" ? "Lifetime access" : "Subscription active";
      $("trial-detail").textContent = sub.plan_code === "lifetime"
        ? "Your lifetime plan is active."
        : `Current period ends ${formatDate(sub.current_period_end)}`;
    } else {
      $("plan-title").textContent = "Trial or plan inactive";
      $("trial-detail").textContent = "Your business data is protected. Activate an eligible plan to resume CRM access.";
    }
    $("expired-message").hidden = accessActive;
  }

  async function start() {
    if (!window.supabase || !window.supabase.createClient) {
      showNotice("Supabase's client library did not load. Check your internet connection and refresh.", "error");
      return;
    }
    if (!configReady()) {
      showNotice("Setup required: open app.js in GitHub and replace the two Supabase configuration placeholders. Use only the Project URL and publishable/anon key.", "error");
      return;
    }
    try {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (session?.user) await loadDashboard(session.user);
      else showAuth();

      supabase.auth.onAuthStateChange((event, sessionNow) => {
        if (event === "SIGNED_OUT" || !sessionNow?.user) {
          showAuth();
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          // Avoid heavy queries inside the auth callback.
          setTimeout(() => loadDashboard(sessionNow.user), 0);
        }
      });
    } catch (err) {
      console.error(err);
      showNotice("Couldn't initialize Supabase. Check the Project URL and publishable/anon key.", "error");
    }
  }

  $("auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    clearNotice();
    if (!supabase) {
      showNotice("Supabase is not configured yet. Replace the placeholders in app.js and refresh.", "error");
      return;
    }
    const button = $("submit-button");
    button.disabled = true;
    button.textContent = mode === "signup" ? "Creating account…" : "Logging in…";
    const email = $("email").value.trim();
    const password = $("password").value;
    try {
      if (mode === "signup") {
        const fullName = $("full-name").value.trim();
        const businessName = $("business-name").value.trim();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, business_name: businessName },
            emailRedirectTo: window.location.origin + window.location.pathname
          }
        });
        if (error) throw error;
        if (data.session && data.user) {
          showNotice("Account created. Your business and 7-day trial are being set up.", "success");
          await loadDashboard(data.user);
        } else {
          showNotice("Registration submitted. Check your email to confirm your account, then return here and log in. Your business and trial are created after Supabase accepts the signup.", "success");
          setMode("login");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await loadDashboard(data.user);
        showNotice("You're logged in.", "success");
      }
    } catch (err) {
      console.error("Authentication error:", err);
      showNotice(err?.message || "Something went wrong. Please try again.", "error");
    } finally {
      button.disabled = false;
      button.textContent = mode === "signup" ? "Create account" : "Log in";
    }
  });

  $("logout-button").addEventListener("click", async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) showNotice(error.message, "error");
    else {
      showAuth();
      showNotice("You've been logged out.", "success");
    }
  });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
    });
  }
  setMode("login");
  start();
})();
