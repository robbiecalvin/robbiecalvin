# Site UI refresh

## Changes

- A concise homepage introduction with “Explore my work” and “Work with me” actions.
- Three featured projects before the complete collection: QuickWoo Plugins,
  SpeechFlow, and Wild Chemistry. All 19 original/current collection cards remain
  accessible in their categories, including Crystal Eye and Trusted Cash Loans.
- Nine optimized WebP screenshots, plus the existing comic cover, replace generic
  icons where a real project preview is available. Service cards retain quiet,
  static illustrations. Links say what they do: visit a website, explore an app,
  view plugins, read the comic, or discuss a project.
- Consistent spacing, buttons, form controls, card corners, focus indicators, and
  content widths across shared pages. Static skip links also work without the
  page scripts. Current About/Contact/Account navigation receives an active state.
- Plugin pricing presents the selected plan beside its controls, followed by an
  expandable full comparison. ZIP downloads have a separate visual panel and an
  explicit distinction from paid licenses. Prices and checkout availability are
  unchanged.
- Card illustrations no longer loop continuously. The hero globe retains its
  pause control and respects the operating system's reduced-motion preference.
- The local development server now serves ES modules with a JavaScript MIME type
  and serves public site icons, matching the production gateway's capabilities.

## Preview sources

Screenshots are static previews, not embedded websites or invented app interfaces.
The seven internal previews show the existing project/directory pages for Codex
Master, Myra, SpeechFlow, QuickWoo Desktop, KIMIX, QuickWoo Plugins, and Typing
School. Wild Chemistry reuses the original Issue 1 cover.

The external previews were rendered from the public site sources:

- Crystal Eye: `robbiecalvin/crystaleye`, commit
  `9cdb0b0a7776338a5142e814c76fbd0b06af624e`.
- Trusted Cash Loans: `robbiecalvin/TrustedCashLoans`, commit
  `ed01d1e93fa0606538abea70103f979d04316a89`.

All screenshots are stored locally under `assets/images/previews/`; the homepage
does not load third-party images or iframes for these cards. Images have explicit
dimensions, descriptive alternatives, and lazy loading. Together the nine new
WebP files total less than 500 KB. The Crystal Eye and Trusted Cash Loans links
retain the exact URLs supplied by the owner.

## Verification

- 18 representative routes checked at 1440, 820, 390, and 320 pixels: 72 page
  visits with no horizontal page overflow or JavaScript errors.
- Featured/category card counts, supplied external URLs, image loading and sizing,
  keyboard skip links, reduced motion, and pricing/table placement checked.
- All 27 plugin pages checked on desktop and mobile: 54 visits, 768 price
  comparisons, 40 package downloads, and search behavior passed.
- Four release tests and 19 Node tests passed, including module/icon response
  checks. Generated plugin pages reproduce without changes.

To repeat the UI checks, start the documented Node 24 server, then run:

```sh
SITE_REVIEW_URL=http://localhost:8787 node tools/test-site-ui.cjs
SITE_REVIEW_URL=http://localhost:8787 node tools/test-plugin-pages.cjs
python3 tools/test-plugin-release.py
node --test server/server.test.mjs supabase/functions/rc-payments/core.test.mjs supabase/functions/rc-payments/handler.test.mjs
```

Browser checks require Playwright and Chromium. `BROWSER_EXECUTABLE` can specify
another Chromium binary; `REVIEW_ARTIFACTS_DIR` optionally saves screenshots.
These are local browser and application checks, not confirmation that a specific
version has reached the live Cloudflare domain.
