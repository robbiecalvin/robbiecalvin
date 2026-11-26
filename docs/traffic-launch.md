# Traffic launch notes

November 26, 2026 · Vancouver

## Landing pages and first actions

| Audience | Landing page | First action |
| --- | --- | --- |
| WooCommerce operators with product data in JSON | [Quick Add JSON guide](../wp-plugins/quick-add/bulk-add-woocommerce-products-from-json/index.html) | Download the sample, then visit the product ZIP section |
| Vancouver site owners looking for maintenance help | [WordPress Maintenance](../wp-managment/index.html) | Email an enquiry with a site URL and scope |
| Site owners planning their own updates | [WordPress maintenance checklist](../wp-managment/maintenance-checklist/index.html) | Read the staging and rollback checklist, then enquire if they need help |

These entry pages target specific tasks. Search volumes and current rankings have yet to be measured.

## Release and verification

1. Review the website branch and the Quick Add source fix on `codex/quick-add-json-mode`. The proposed website ZIP is version 1.0.2. The source branch includes the README link and acceptance notes. Merge the source README only after the guide URL works. Version 1.0.1 could preview pasted JSON, but hidden table fields blocked submissions and the form action did not match its registered handler. The candidate also preserves row errors through the results redirect and routes template save and delete to their registered handlers.
2. After release approval, roll out the updated Cloudflare Worker while retaining its existing routes and bindings. It serves the homepage WebM as `video/webm`, permits the versioned Cloudflare Analytics script path and redirects the obsolete homepage URL. Then publish the reviewed website files. Check the production ZIP version and hash against the download manifest and confirm the sample JSON, video and two guide images return their intended MIME types.
3. Fetch the public homepage, `/robots.txt`, `/sitemap.xml`, both guides and the service page. Confirm the current content, expected canonicals and sitemap entries. The public site was still on the older homepage during this session. It returned 200 for pages and discovery files with a browser user agent. An earlier plain HTTP client received 403 responses, so Google crawler access should be checked independently.
4. In Google Search Console, open the verified domain property, submit `https://robbiecalvin.com/sitemap.xml`, and inspect the homepage, Quick Add guide and WordPress Maintenance pages. Use the live inspection to check fetch status and indexing eligibility. Record the baseline before promotion. [Search Console guide](https://developers.google.com/search/docs/monitor-debug/search-console-start)
5. Publish the prepared guide link through the Quick Add README and share the walkthrough after its public URL works. Publish the maintenance checklist alongside the existing service page and use the checklist as the destination for maintenance-focused promotion.

Cloudflare’s configured apex and www routes point to `robbiecalvin-site`. Its existing deployment was serving 100% of traffic at the time of the status check. Keep the specific protected routes outside this rollout. Record the active Worker version before promoting a new one and the Git revision before changing the website branch. If a rollout fails, use the recorded Worker version and revert the website publication commit so the static ZIP and its integrity manifest move together. [Cloudflare versions and deployments](https://developers.cloudflare.com/workers/versions-and-deployments/)

## Verification evidence

- In a disposable WordPress 7.1.5 and WooCommerce 11.2.1 store, Quick Add 1.0.2 created both JSON sample products as drafts with the expected SKU, price and stock. Repeating the batch created zero products and returned two SKU errors. Switching to table mode restored required-field checks and a valid table row created a separate draft.
- A separate repeatable browser check passed a mixed batch with one duplicate SKU and one new product, and saved, loaded and deleted a synthetic JSON template. Run `node tools/test-quick-add-json.cjs` with `QUICK_ADD_TEST_DISPOSABLE=1`, `QUICK_ADD_TEST_URL`, `QUICK_ADD_TEST_USER`, and `QUICK_ADD_TEST_PASSWORD` pointing to a loopback test store. The test creates uniquely named drafts.
- The guide images are captures of that fixture. Photos, client details, checkout credentials and real order data were excluded from the fixture.
- The CI-ready discovery test passed for 59 sitemap pages and 1,879 internal link and asset references. Run `python3 tools/test-site-discovery.py` from the website checkout. All sitemap pages had matching canonicals, titles, descriptions, one H1 and at least one inbound link from another sitemap page.
- The WordPress maintenance checklist linked visitors back to the prefilled enquiry. The service estimator carried a two-site estimate into the downloadable brief.
- Lighthouse mobile lab runs scored 100 in the SEO and accessibility categories on the homepage, Quick Add product and guide, maintenance service and checklist. Browser-based axe checks reported zero WCAG-tagged violations in the same sample. These are local automated checks.
- The optimized homepage used a 14 KB WebP in place of the earlier 101 KB PNG. Its mobile lab LCP went from 2.8 to 2.5 seconds in the first recheck and 1.5 seconds in the final run. The two Quick Add guide figures went from about 112 KB combined to 53 KB as WebP.
- Chromium confirmed the live page served an automatically injected Cloudflare Analytics beacon but blocked execution with its Content Security Policy. The candidate policy permits only the beacon script and its versioned path and retains same-origin connections. The privacy page describes Cloudflare’s analytics role. The Cloudflare connection confirmed automatic Web Analytics injection is enabled. Browser reporting after rollout, Googlebot fetch status, impressions, and download click events still need live verification. The available Search Console browser session showed the welcome page without a configured property. [Cloudflare beacon documentation](https://developers.cloudflare.com/web-analytics/faq/#what-do-i-need-to-add-to-my-content-security-policy-csp)

## Distribution notes

### Quick Add announcement draft

I built a small guide for creating WooCommerce products from JSON with Quick Add. It includes a two-product sample you can paste into WordPress and a walkthrough from preview to draft products.

I tried the sample on a disposable store and checked the prices, SKUs and stock. Importing the same sample again returned two duplicate-SKU errors.

Guide and sample  
https://robbiecalvin.com/wp-plugins/quick-add/bulk-add-woocommerce-products-from-json/?utm_source=linkedin&utm_medium=organic_social&utm_campaign=quick_add_json

Attach the short walkthrough video. Use this destination only once the guide and linked 1.0.2 package are live.

### README link draft

[Bulk-add WooCommerce products from JSON](https://robbiecalvin.com/wp-plugins/quick-add/bulk-add-woocommerce-products-from-json/?utm_source=github&utm_medium=referral&utm_campaign=quick_add_json) includes a downloadable sample and shows how to verify your new draft products.

### Cloudflare edge baseline

November 19 through November 25, 2026, Pacific time. The Cloudflare zone’s adaptive HTTP request data reported successful GET requests for the apex hostname. Counts may include bots and repeat requests. A ZIP request does not establish that a browser finished saving the file.

| Path | HTTP 200 GET requests |
| --- | ---: |
| Homepage | 469 |
| Quick Add product page | 7 |
| WordPress Maintenance | 14 |
| Quick Add ZIP | 1 |

In the same period, requests with a Googlebot user agent and Cloudflare’s verified search-crawler classification produced 75 successful responses, 5 redirects and 4 not-found responses. No 403 occurred in that sample. One 404 was the old `/home/` URL, which now redirects to the canonical homepage in the local gateway and preview server.

The zone does not expose the referrer-host field in this GraphQL dataset. Use browser analytics after the gateway rollout and Search Console for search queries and clicks. [Cloudflare Analytics filter documentation](https://developers.cloudflare.com/analytics/graphql-api/features/filtering/)

### First measurement pass

| Measure | Where to check |
| --- | --- |
| Indexing eligibility and search visibility | Search Console URL Inspection and Search performance filtered to each landing page |
| Quick Add adoption | ZIP requests or download-click events if an approved measurement source is available |
| Service leads | WordPress maintenance enquiries received and whether the scope matches the service |
| Distribution response | LinkedIn post clicks and referral visits from the campaign links where reporting supports them |

Capture a baseline when the pages go live, then compare weekly. Use search queries and conversion evidence to decide which guide to expand next.
