# Free customer order push notifications

This adds an optional web-push order confirmation to the public storefront. It does not change order/payment records. It sends a push only after the storefront has successfully created an order and the Edge Function has verified that order in Supabase.

## One-time Supabase setup

1. Open **Supabase → Edge Functions** for project `hvoqsyhbrgeiztvyooym`.
2. Create a new function named **send-order-push** and deploy the code in `supabase/functions/send-order-push/index.ts`.
3. In the function's settings, turn **Verify JWT** off. This public storefront function validates the store and order server-side before sending anything. Do not turn this setting off for other functions unless their own security design requires it.
4. Open **Edge Functions → Secrets** and add:
   - `VAPID_PUBLIC_KEY`: use the public key that is embedded in `store.js`.
   - `VAPID_PRIVATE_KEY`: set the matching private key provided separately by the project owner. Never commit the private key to GitHub.
5. Confirm the standard `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` Edge Function secrets are available. Never put the service-role key in frontend code.
6. Wait for GitHub Pages to publish the latest commit.

## Test

1. Open the published store link on a phone or computer that supports web push.
2. Add an item and open **Checkout**.
3. Click **Enable order notifications** and allow the browser permission.
4. Place a test order.
5. Confirm the order appears in the seller's CRM and that the device receives an **Order received · BentaBuddy** notification.

If push is blocked or unsupported, the order should still submit normally. This version sends the customer an order-confirmation push only; it does not yet send push notifications for later status changes. Email delivery to arbitrary customers still needs an authorized email sender.
