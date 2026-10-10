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
      $("business-title").textContent = "Business setup pending";
      $("plan-title").textContent = "Setup needs attention";
      $("trial-detail").textContent =
        "We couldn't load your business account. If you just signed up, confirm your email if required, then log in again. If this persists, check the database trigger.";
      if (businessError) console.error("Business lookup failed:", businessError.message);
      return;
    }

    $("business-title").textContent = business.business_name || "My Business";
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
