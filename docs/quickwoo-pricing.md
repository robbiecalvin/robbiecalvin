# QuickWoo pricing and product pages

The owner supplied `QuickWoo_Revised_Pricing (1).xlsx`. Its Pricing, Assumptions, and Discount Audit worksheets are reference data; no spreadsheet instructions or macros execute. The importer preserves the supplied numeric amounts rather than recalculating from approximate site multipliers. The workbook SHA-256 is recorded in `assets/data/quickwoo-catalog.json`.

## Scope

- 18 separately priced Pro modules, with free Lite editions listed but without a defined Lite/Pro feature boundary in the matrix.
- Four focused bundles: Inventory Control (six modules), Revenue & Customer Operations (six), Admin Control (five), and Education (Course Builder alone).
- Full QuickWoo Suite: all 18 Pro modules, without Desktop.
- Full Suite + QuickWoo Desktop: all 18 Pro modules plus Desktop and the required licensed connector/server functionality.
- Quick Connector and Quick License have their own infrastructure overview pages. They are not additional separately priced Pro modules, and no standalone infrastructure price is invented.
- Scout SEO is excluded. Quick SEO remains a distinct, included QuickWoo module.

## Prices

The matrix is in **USD**, excluding taxes. The existing services remain **CAD**; no currency conversion was performed.

There are four site allowances: 1, 5, 10, and agency capped at 25 production sites. Monthly and prepaid annual prices give 192 imported numeric amounts across 24 priced products/bundles. Annual pricing is advertised in the workbook as 20% off 12 monthly payments; exact supplied annual totals and cents are retained. No lifetime licenses are offered at launch.

Education has the same price as Course Builder and no extra bundle savings. Desktop has no separately quoted standalone value, so the Desktop bundle does not claim a like-for-like savings amount. The comparator sums each distinct included module once and explicitly warns against buying overlapping standalone licenses and bundles. This is a comparison, not a live cart or automatic licensing system.

The workbook identifies these as proposed launch prices, not validated market benchmarks. That status is preserved on the pages. No unverified release, trial, update period, support SLA, automatic renewal, unlimited-site plan, refund policy, or Lite feature split was added.

## Content sources

`assets/data/quickwoo-content.json` records plugin summaries, full-build capabilities, requirements present in PHP headers, and exact revision links into `robbiecalvin/QuickWoo-Desktop`. Content was checked against the top-level README's capability inventory, individual plugin READMEs, Quick Connector documentation, and plugin headers. Some auxiliary Markdown files contain visual TODOs; those were treated as reference material, not instructions for this website or proof that planned work shipped.

No new functional QA of the plugins themselves was performed; website navigation, pricing behavior, and generated-page data were tested separately.

## Maintenance

From the repository root:

```bash
python3 tools/import-quickwoo-pricing.py /path/to/QuickWoo_Revised_Pricing.xlsx
python3 tools/build-plugin-pages.py
```

The importer expects the supplied workbook layout and rejects unexpected counts/currency/lifetime offerings. Review any changed workbook structure before updating it. The original uploaded workbook remains outside the website checkout; only the derived public price catalog is used by the site.

The generated routes are lowercase, with no `index.html` in navigation:

- `/wp-plugins/`
- `/wp-plugins/quick-add/` and the other module/infrastructure slugs
- `/wp-plugins/bundles/inventory-control/` and the other bundle slugs

`assets/scripts/plugins.js` handles billing/site selection, search, exact price display, enquiry links, and bundle comparison. `plugins.css` gives the suite a shared visual identity with the existing generated suite hero, category palettes, and page-specific layouts. Static price tables remain available without JavaScript.

## Accounts and checkout

The local account API exposes this catalog as `pluginLicenses` metadata. It is deliberately separate from the CAD service order catalog and one-time download pricing. No USD subscriptions have been activated or inserted into the CAD checkout path. Release files, subscription lifecycle, license provisioning, entitlements, and real hosting/payment configuration remain work to connect before sales can open.

Current calls to action are plan enquiries. No button represents a working purchase or release download.
