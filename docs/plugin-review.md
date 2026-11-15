# WordPress plugin review — November 14, 2026

The temporary $0 promotion has been removed from the working tree. All 192
standard USD prices for the 18 Pro modules and six bundles match the preserved
`quickwoo-pricing-standard.json` catalog. Existing Lite pricing remains separate.
ZIP download links remain available. A download does not activate a Pro license.
This report records local validation; a Git push does not itself confirm that the
live website has deployed successfully.

## What changed

- Restored monthly/annual pricing, site allowances, bundle comparisons, and plan
  enquiries on all 27 plugin-directory pages. Removed promotional banners,
  promotional account/Desktop wording, and $0 structured-data offers. Preserved
  canonical URLs, social metadata, existing legal links, and download links.
- Removed the promotional license bypasses and promotion notices from the 18
  promotional ZIPs. Rebuilt 19 packages with patch versions, including Quick
  License; Quick Connector is unchanged. Preserved original license notices and
  recorded source hashes alongside current hashes and byte sizes.
- Added the missing shared license function; connected Images, Importer, Points,
  Ship, and Mail to it. Mail no longer defaults to unlocked Pro access. Fixed
  lowercase license-key normalization and mapped current website bundle IDs to
  their actual member plugins, preserving legacy bundle aliases.
- Fixed Quick Variations' attribute-key casing, which produced blank variation
  attributes and duplicate combinations on repeated generation.
- Fixed Quick Ship's new-zone initialization and WooCommerce location object
  format. New domestic zones now retain their destination and shipping methods.
- Registered Quotes and Schedule assets before shortcode rendering needs them,
  fixing missing configuration and nonfunctional forms under block themes.
- Made Schedule reject malformed, impossible, and past dates and interpret valid
  booking dates in the site's timezone.
- Made Quick Site bypass unknown/personalized query parameters, avoiding shared
  cache collisions between page IDs or prefilled forms. Quick Traffic now records
  visits before cached responses are served. With Quick Traffic active, the early
  drop-in defers to WordPress so tracking still runs. Plugin activation changes
  refresh this configuration; disabling Quick Site disables its drop-in cache.
- Fixed truncated license-screen names and enabled public WordPress ZIP downloads
  in the local Node server, while retaining private-file restrictions.
- Updated the transfer-parts assembly workflow so it cannot republish the old
  promotional Quick SEO build. Added CI for release integrity, generated output,
  and the existing Node test suites.

Plugin source is supplied here as ZIPs. Reproducible source edits are recorded in
`tools/plugin-release-fixes.json` and applied by `tools/end-plugin-promotion.py`.
They should also be incorporated into the authoritative plugin source before a
future independent plugin release. The source commit in the download manifest
identifies the original input, not an upstream commit containing these fixes.

## Validation performed

Runtime: WordPress **7.1.4**, WooCommerce **11.3.0**, PHP **8.3.36**, MariaDB
**11.4**, and Node **24.22.1** in a disposable local installation. Outbound email
and external API calls were blocked in the test fixture. No real payments or
customer messages were sent.

- All 20 ZIPs: CRC, safe directory layout, main plugin header, SHA-256, and size
  checks passed. All 289 PHP files and 62 JavaScript files passed syntax checks.
- All 20 plugins activated and deactivated individually with WooCommerce, then
  activated together.
- 102 plugin admin/settings pages and six Course Builder list/editor screens
  loaded without fatal errors or uncaught JavaScript errors. The 102-page sweep
  also reported no missing assets.
- 54 website visits covered all 27 directory pages at desktop and mobile widths;
  768 displayed-price comparisons, 40 ZIP downloads, search, and horizontal layout
  checks passed.
- 23 runtime smoke tests passed. All 18 Pro gates rejected missing/expired licenses
  and accepted valid licenses with correct bundle scope.
- Real browser submissions for Forms, Quotes, and Schedule passed. Missing nonces
  were rejected, as were malformed, impossible, and past appointment dates.
- Quick Images also passed a real browser upload, watermark/logo composition,
  and Media Library save with no page errors.
- Quick Code injection, Quick Site cache hits, and Quick Traffic repeat-view
  recording passed together. Early drop-in caching and query/page isolation were
  also checked with `WP_CACHE=true` and Quick Traffic deactivated.
- Four release regression tests and all 18 Node tests passed. Re-running page and
  package generation left outputs unchanged. Reassembling the original transfer
  parts reproduced the standard Quick SEO ZIP exactly.

## Per-plugin coverage

“Passed” below means the stated checks passed, not that every feature or platform
combination has been exhaustively certified. Admin-screen inspection and package
checks apply to each plugin with an admin interface; Connector was checked through
its REST interface.

| Plugin | Release | Functional coverage that passed |
| --- | --- | --- |
| Quick Accountant | 1.0.1 | Database reports calculate income, expenses, and profit from sample transactions |
| Quick Add | 1.0.1 | Creates a WooCommerce product and rejects duplicate SKUs |
| Quick Audit | 1.0.1 | Parses a page title and detects missing metadata |
| Quick Code | 1.0.1 | Device targeting and actual frontend snippet injection |
| Quick Connector | 0.1.0, unchanged | Public health, authenticated module catalog, anonymous management denial |
| Quick Course Builder | 1.0.1 | Course/test/certificate screens, grading, saved completion and reversal |
| Quick Edit | 1.0.1 | Bulk stock update persists to WooCommerce |
| Quick Forms | 1.0.1 | Saves/renders a required email field and accepts a real browser submission |
| Quick Images | 1.1.1 | GD composition plus real browser upload, branding, and Media Library save |
| Quick Importer | 1.0.1 | Applies product prices and rejects duplicate SKUs |
| Quick License | 1.0.1 | Activation, lowercase input, expiry rejection, all six current bundle scopes |
| Quick Mail | 1.0.1 | Saves a published template and substitutes variables; licensed access enforced |
| Quick Points | 1.0.1 | Credits/debits persist; overdrafts are rejected |
| Quick Quotes | 1.0.1 | Quote form renders and real AJAX submission succeeds |
| Quick Schedule | 1.0.1 | Booking submission succeeds; invalid/past dates fail |
| Quick SEO | 3.0.1 | Authorized metadata saving and editable controls retain saved values |
| Quick Ship | 1.1.1 | Domestic zone, country location, flat/free shipping, and pickup persist |
| Quick Site | 1.0.1 | Cache files/hits, TTL bounds, query isolation, and traffic-compatible caching |
| Quick Traffic | 1.0.1 | Device classification, visitor hashes, and repeat views with caching active |
| Quick Variations | 1.0.1 | Creates two attribute combinations and skips duplicates on a repeat run |

## Re-running the saved checks

From the repository root:

```sh
python3 tools/test-plugin-release.py
node --test server/server.test.mjs supabase/functions/rc-payments/core.test.mjs supabase/functions/rc-payments/handler.test.mjs
SITE_REVIEW_URL=http://localhost:8787 node tools/test-plugin-pages.cjs
```

The browser script requires Playwright and Chromium, both available in the reviewed
environment. `BROWSER_EXECUTABLE` can override the Chromium path.

For the runtime suite, install the current ZIPs and WooCommerce in a **disposable**
WordPress database and activate all plugins. Set `WP_ENVIRONMENT_TYPE` to `local`.
The suite deliberately resets its license tables and creates sample content:

```sh
QUICKWOO_REVIEW_DISPOSABLE=1 wp eval-file /path/to/checkout/tools/plugin-runtime-smoke.php
```

The suite creates a frontend fixture page; its ID is stored in the
`quickwoo_review_forms_page` option. With outbound mail/API delivery blocked in
that disposable site, run the browser submission checks:

```sh
QUICKWOO_REVIEW_DISPOSABLE=1 WORDPRESS_REVIEW_FORM_URL=http://your-local-test-site/quickwoo-review-forms/ node tools/test-plugin-forms.cjs
```

Do not run these data-writing suites on a customer or production database.
When updating an existing Quick Site installation, reactivate it to install the
updated cache drop-in and refresh its configuration.

## Remaining release limits

This is an initial functional review on one current runtime, not a complete
compatibility matrix or an exhaustive audit of every feature. Minimum supported
WordPress/PHP versions, other themes/hosts, multisite, and every plugin combination
remain unverified. Audit network crawling, imports of large datasets, additional
image formats, and certificate delivery need further scenario coverage.

Live email/provider delivery, Stripe checkout, automatic subscription/license
delivery, and a real Desktop-to-Connector session were not verified. The website
continues to show plan enquiries because live subscription checkout is not yet
connected. Public ZIP files remain public. No website deployment or remote CI run
is claimed by these local checks.
