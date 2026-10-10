# BentaBuddy CRM starter

Mobile-first static frontend starter for BentaBuddy CRM.

## Files
- `index.html` — interface
- `styles.css` — responsive design
- `app.js` — Supabase Auth and initial dashboard
- `manifest.json` — PWA metadata
- `sw.js` — app-shell cache only; does not cache Supabase data

## Configure Supabase
1. Open `app.js` in GitHub and edit it.
2. Replace `PASTE_YOUR_SUPABASE_PROJECT_URL_HERE` with your Supabase Project URL.
3. Replace `PASTE_YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY_HERE` with the publishable key (or legacy anon key).
4. Never use a `service_role` key or secret key in browser code.
5. Commit the change.

## Publish with GitHub Pages
1. Repository → Settings → Pages.
2. Under Build and deployment, select `Deploy from a branch`.
3. Select branch `main` and folder `/(root)`, then Save.
4. Wait for the Pages URL to appear.

## Supabase Auth URL configuration
In Supabase → Authentication → URL Configuration:
- Add the published GitHub Pages URL to **Redirect URLs**.
- Set **Site URL** to the published app URL if this is your primary auth site.
- Email confirmation may be left enabled; test the email confirmation link on the published site.

## Important limitations
- This is a starter, not a finished CRM.
- Customer/lead/order modules are not implemented yet.
- Subscription display is informational; paid activation must be implemented with trusted server-side payment verification.
- Test registration and account isolation before inviting real users.
- Frontend browser keys are public by design; RLS and server-side validation are essential.
