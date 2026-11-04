# Deployment status — November 3, 2026 (Vancouver)

The public website is served by the `robbiecalvin-site` Cloudflare Worker from the public GitHub repository. The Worker fetches allowlisted static paths over validated HTTPS, strips client credentials from static requests, supplies MIME types/security headers, and proxies `/api/*` to Supabase `rc-payments`. Existing more-specific Brenden and Assistant HQ routes remain intact.

Cloudflare: Full (strict), Always Use HTTPS, TLS 1.2 minimum, TLS 1.3, and HTTPS rewrites. The original GitHub Pages origin did not present a valid custom-domain certificate during verification; the Worker gateway avoids that origin by fetching public repository files over validated HTTPS.

## Accounts and sandbox payments
Supabase project: `fzjcoxmrwquofkqdryqh`. Function: `rc-payments`. Database migration stored in `supabase/migrations`. Tables are RLS-enabled with direct anon/authenticated permissions revoked. API verifies Supabase Auth users and order ownership; only trusted `app_metadata.rc_payments_admin=true` may approve scope. Passwords are managed by Supabase; session cookies are HttpOnly, Secure, SameSite=Lax. The public UI supports login and confirmation callbacks. Signup, resend and password recovery are deliberately gated pending verified email configuration.

Required activation settings, not yet completed:
1. Supabase Auth Site URL `https://robbiecalvin.com`; allow `https://robbiecalvin.com/account/` as email redirect.
2. Configure and verify production-capable transactional email delivery. Set Edge Function secret `RC_AUTH_EMAIL_READY=true` only after real signup, confirmation and recovery succeed.
3. Create the owner's verified account, then assign `rc_payments_admin=true` in its trusted app_metadata through the admin API.
4. Add restricted sandbox Stripe API key as Edge Function secret `RC_STRIPE_TEST_KEY`. Minimum access must cover Checkout Session create/read and associated payment/customer/product creation required by inline price data.
5. Add a sandbox webhook endpoint for `https://robbiecalvin.com/api/stripe/webhook`, API version `2026-09-30.endive`, subscribed to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `charge.refunded`. Store its signing secret as `RC_STRIPE_TEST_WEBHOOK_SECRET`.
6. Run a full sandbox request → owner approval → Checkout → signed webhook → paid order test. Check duplicate events, cross-user access, expired checkout, and refund behavior before launch.

No live Stripe credentials are accepted; database and webhook checks reject live payments. No live signup or payment success has been verified. Existing expired Checkout Sessions currently require a replacement request. Activity tracking and paid download entitlements are not enabled. Free plugin downloads, are independent of accounts.

## Approved free plugin release
The private `robbiecalvin/quickwoo-desktop` workflow commit `befc9285c9bfd5af5f88ecb49a29f907e074a01a` built 20 installable WordPress plugin ZIPs from pinned source `d8514efa7d9049656bb86f7de330af607c80ac9d`. Workflow run `41773103893` passed PHP lint, JavaScript checks, credential-pattern scanning and reversible Pro gate tests. Desktop remains excluded. The user explicitly approved public distribution of all 20 source-containing plugin archives to robbiecalvin/robbiecalvin for download on robbiecalvin.com. The public promotion is $0, with verified ZIP download links and SHA256 values in assets/data/quickwoo-downloads.json. Original standard pricing is preserved.

## Comic and branding
Issue 1 includes its cover and all seven interior pages. Page 4 (Darcie's Monstrous Transformation) was received and integrated on November 3, 2026 (Vancouver). The reader supports desktop spreads, phone pages, arrows, keyboard, swipe, zoom and fullscreen. SVG/PNG orb masters and favicon files are included.

## Legal and privacy
Policies reflect current sandbox-only payment behavior and actual providers. Real consumer checkout still needs actual supplier identity/address and a savable order-specific agreement; no address was invented. Third-party/open-source licences take precedence where applicable. Brenden remains password-protected with no-index headers and excluded from sitemap. Search-engine removal timing cannot be guaranteed.
