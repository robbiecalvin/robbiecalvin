# Quick License bridge

Install this companion plugin on an HTTPS sandbox WordPress site with Quick License active and a separate license database. Define `RC_QL_BRIDGE_TOKEN` and `RC_QL_BRIDGE_KEY_SEED` in its server configuration as independent random secrets of at least 32 characters. Keep the key seed stable for the lifetime of issued keys. Requests are refused on WordPress sites configured as production.

The server-to-server route is `POST /wp-json/rc-quick-license/v1/entitlement`. Send the bridge token as a bearer credential and JSON with `subscription_id`, `email`, `product_slug`, `site_limit`, and `paid_through` (a future Unix timestamp in seconds). A successful response contains `license_key` and `product_slug`. Keep the token and the response out of logs and public pages. The endpoint uses Quick License's own license table. Replaying a subscription and product returns its existing key, and renewals extend expiration without removing activations.

## Portfolio integration still required

Create authenticated subscription checkout for catalog plans and bind the Stripe subscription to the buyer's stored account. Process signed sandbox paid-invoice events and verify the subscription and purchased Price against that order. Derive the licensed products and activation limits from the server-side catalog. Fulfill each member of a bundle and record its result so interrupted fulfillment can retry.

Expose fulfilled keys only to the purchasing account. Direct buyers there from Checkout and from the purchase email. Handle refund and dispute revocation before enabling sales. End-of-period cancellation can use the existing paid-through date. Verify the whole flow against the sandbox WordPress host and a plugin configured to validate against it.
