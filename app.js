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
    $("lead-stage").value=["New","Contacted","Qualified","Won","Lost"].includes(l.stage)?l.stage:"New";
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
    const payload={business_id:currentBusinessId,customer_id:null,contact_name:name,phone:$("lead-phone").value.trim()||null,email:$("lead-email").value.trim()||null,source:$("lead-source").value.trim()||"manual",inquiry:$("lead-inquiry").value.trim()||null,stage:$("lead-stage").value||"New",estimated_value:value,next_follow_up_at:followUp,notes:$("lead-notes").value.trim()||null,is_archived:false,updated_at:new Date().toISOString()};
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
