# Local accounts and orders

This is a separate Node.js 24 backend. GitHub Pages serves static files and cannot run it. The public account configuration is disabled by default; publishing the website does not enable accounts, email, or payments.

## Run locally

From the repository root, using Node.js 24:

```bash
APP_ORIGIN=http://localhost:8787 MAIL_MODE=file node server/server.mjs
```

Open `http://localhost:8787/account/` on your own computer. The Node server also serves the website, so local account requests and cookies use the same origin. No npm dependencies are required.

In local file-mail mode, verification and password reset messages are written under `.local-data/mail/`. Open the newest message locally to follow its link. These development messages contain access tokens: do not commit or share them. File-mail mode is refused for production origins. The SQLite database and mail are in the ignored `.local-data/` directory, which the static server does not expose.

```bash
node --test server/server.test.mjs
```

The integration suite uses isolated temporary databases and a simulated payment provider. It does not send real email or take real payments.

## Implemented

- Email/password registration, verification, resend, login/logout, one-use reset links, and display-name edits.
- Scrypt password hashes; hashed, expiring server-side sessions in HTTP-only cookies; Secure cookies outside localhost.
- Same-origin checks for mutations, exact-origin CORS, body-size limits, basic authentication rate limits, and parameterized database queries.
- Service scope requests using the owner-approved prices from `catalog.mjs`. A customer-supplied total is ignored.
- Owner approval before one-time service checkout. Set `ADMIN_EMAILS` to the verified owner email; the owner sees pending requests in the account dashboard.
- Hosted Stripe one-time Checkout integration, signed webhook verification, amount/currency/session checks, idempotent event processing, and full-refund entitlement revocation.
- Private digital download entitlements and file delivery, ready for the confirmed product catalog and release files.
- Separate app-launch history and actual file-download history. Signed-out public app visits remain available and are not silently assigned to an account.

## Connect hosting later

Use persistent storage and a Node.js host. Configure values securely on that host, not in browser scripts or this repository:

| Variable | Purpose |
| --- | --- |
| `APP_ORIGIN` | Exact public frontend origin, for example `https://robbiecalvin.com` |
| `DATA_DIR` | Private persistent directory for SQLite, sessions, and development data |
| `HOST`, `PORT` | Server bind address and platform port |
| `ADMIN_EMAILS` | Comma-separated verified owner email addresses |
| `EMAIL_API_KEY`, `EMAIL_FROM` | Resend delivery key and verified sender address |
| `STRIPE_SECRET_KEY` | Stripe server credential |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `/api/stripe/webhook` |
| `DOWNLOAD_DIR` | Private release files, outside public website assets |

Use a backend on the same site as the frontend, such as `api.robbiecalvin.com`, so the HTTP-only SameSite cookies can be used reliably. After deployment, set `assets/scripts/account-config.js` to `enabled: true` and set `apiBaseUrl` to the HTTPS API origin. These are public routing values, never credentials. The local Node server overrides that one configuration route to enable same-origin development without editing the static site's disabled default.

Place production behind HTTPS with proxy-level authentication rate limits, and back up the persistent database. The application deliberately ignores untrusted forwarding headers. A multiple-worker deployment would also need a shared rate limiter and a suitable shared database architecture; the local SQLite implementation is for one server process.

## Still pending

- Actual backend hosting, email delivery configuration, and Stripe setup. No live signups or payments have been verified.
- The pricing matrix is now imported as public `pluginLicenses` metadata: 18 Pro modules, six bundles, four site allowances, and USD monthly/annual prices. Actual release files and recurring license/entitlement lifecycle are still pending. `digitalProducts` remains intentionally empty, so these USD subscriptions cannot accidentally be charged through the CAD one-time service checkout. Scout SEO is excluded.
- Monthly WordPress care billing: scope requests can be saved, but recurring checkout is blocked until subscription renewal, cancellation, and billing-failure handling are implemented.
- Tax configuration and production payment testing. The current server uses the catalog's CAD amount for the one-time Checkout item; no tax integration has been enabled.
- Payment session expiry/retry lifecycle, operational monitoring, and a deployed-host security review before enabling real checkout. Existing checkout sessions use an order-scoped idempotency key.

A return from Stripe is not proof of payment. Only a validated paid webhook marks an order paid or grants download access. Service availability is confirmed through owner scope approval. Partial refunds do not automatically revoke entitlements; full refunds do.
