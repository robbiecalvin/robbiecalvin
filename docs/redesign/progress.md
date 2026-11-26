# Digital Matter redesign progress

Branch: `codex/robbiecalvin-redesign`. Baseline: `97be8d33472f867b90995fed96ed44470998ea50`.

## Phase 0 — Baseline

- Source folder was absent. Extracted the attached ZIP to a temporary directory and read all 56 files, including all 49 page specifications.
- Matched both palettes and all scene descriptions and settings against the master JSON. The Homepage's local reduced-motion value is preserved in JSON and the later global approval takes precedence in the renderer.
- Site is buildless HTML, CSS and JavaScript. Shared pages use DM Sans and Space Grotesk. Homepage has inline CSS and its own canvas, navigation and card rendering.
- Existing integrations include account/auth and contact flows, QuickWoo catalogue, pricing, licensing and ZIP downloads, the comic reader, and the browser-storage task manager. Retain their URLs, DOM contracts and scripts.
- Python plugin release baseline passed (4 tests). The baseline browser UI suite later passed all 72 visits.
- Package supplies no production animation assets. Design source already records early reconstructed metadata. Unspecified palette fields will use the supplied token defaults.
- Quick Plugin Pages and Quick Questions have no existing catalogue product metadata or ZIP. Their pages need to avoid unverified pricing, features and downloads.
- Badehaus X and MeetDiscreet have no confirmed route or source content in this checkout. The existing Red Door page has its own separate brand and copy.
- Homepage category anchors and outbound project links are existing navigation contracts. New standalone pages can coexist with them. Preserve `/wp-managment/` and `/instagram/` where their existing content applies.

## Route inventory and evidence

The route table records local browser evidence. Visual and release acceptance are tracked below.

| ID | Page | Route or existing source | Evidence |
| --- | --- | --- | --- |
| 01 | Homepage | `/` | Theme, unique scene and poster implemented; browser checks passed |
| 02 | Applications | `/#applications`; standalone `/applications/` | Theme, unique scene and poster implemented; browser checks passed |
| 03 | Websites | `/#sites`; standalone `/websites/` | Theme, unique scene and poster implemented; browser checks passed |
| 04 | Services | `/#services`; standalone `/services/` | Theme, unique scene and poster implemented; browser checks passed |
| 05 | Lab | `/lab/` | Theme, unique scene and poster implemented; browser checks passed |
| 06 | Creative | `/#creative`; standalone `/creative/` | Theme, unique scene and poster implemented; browser checks passed |
| 07 | About | `/about/` | Theme, unique scene and poster implemented; browser checks passed |
| 08 | Contact | `/contact/` | Theme, unique scene and poster implemented; browser checks passed |
| 09 | Codex Master | `/codex-master/` | Theme, unique scene and poster implemented; browser checks passed |
| 10 | Myra | `/myra/` | Theme, unique scene and poster implemented; browser checks passed |
| 11 | Badehaus X | `/badehaus-x/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 12 | SpeechFlow | `/speechflow/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 13 | QuickWoo Desktop | `/quickwoo/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 14 | KIMIX | `/kimix/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 15 | WordPress Plugins Catalogue | `/wp-plugins/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 16 | Launchboard | `/launchboard/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 17 | MeetDiscreet | `/meetdiscreet/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 18 | Typing School | `/typing-school/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 19 | FobFather | `/fobfather/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 20 | Crystal Eye | `/crystal-eye/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 21 | Trusted Cash Loans | `/trusted-cash-loans/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 22 | Quick Accountant | `/wp-plugins/quick-accountant/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 23 | Quick Add | `/wp-plugins/quick-add/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 24 | Quick Audit | `/wp-plugins/quick-audit/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 25 | Quick Code | `/wp-plugins/quick-code/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 26 | Quick Core | `/wp-plugins/quick-core/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 27 | Quick Course Builder | `/wp-plugins/quick-course-builder/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 28 | Quick Edit | `/wp-plugins/quick-edit/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 29 | Quick Forms | `/wp-plugins/quick-forms/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 30 | Quick License | `/wp-plugins/quick-license/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 31 | Quick Plugin Pages | `/wp-plugins/quick-plugin-pages/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 32 | Quick Questions | `/wp-plugins/quick-questions/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 33 | Quick Quotes | `/wp-plugins/quick-quotes/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 34 | Quick Schedule | `/wp-plugins/quick-schedule/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 35 | Quick SEO | `/wp-plugins/quick-seo/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 36 | Quick Site | `/wp-plugins/quick-site/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 37 | Quick Traffic | `/wp-plugins/quick-traffic/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 38 | Quick Variations | `/wp-plugins/quick-variations/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 39 | Personal Assistant | `/personal-assistant/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 40 | RTB Advocacy | `/rtb-advocacy/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 41 | Web Design | `/web-design/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 42 | WordPress Management | `/wp-managment/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 43 | Graphic Design | `/graphic-design/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 44 | Resume Building | `/resume-building/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 45 | Custom Software | `/custom-software/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 46 | Intelligent Productivity Suite | `/productivity-suite/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 47 | SEO Auditor | `/seo-auditor/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 48 | Wild Chemistry | `/wild-chemistry/` | Theme, original scene and poster implemented; browser and touch checks passed |
| 49 | Art & Process | `/instagram/` | Theme, original scene and poster implemented; browser and touch checks passed |

## Phase 1 — Shared system

- Integrated the archive’s token CSS and kept the complete approved JSON byte-for-byte. Homepage consumes the shared theme and the original Canvas 2D solar scene. The original SVG poster and scene are local source assets with no external licensing dependencies.
- Renderer starts frames only while visible, adapts drawing resolution and frame rate, stops for reduced motion, and releases canvas pixels and observers on page exit. The static poster covers first paint and context failure.
- Homepage retains its existing card links, nav anchors and typography. The camera’s angular excursion maps to speed while the loop duration stays fixed.
- Baseline browser UI suite passed all 72 visits. Baseline screenshots are in `/tmp/rc-redesign-baseline-shots/`.
- First redesigned UI run exposed 820 px canvas-stage overflow. Explicit stage width and removal of its fixed aspect ratio address it. The redesigned browser UI suite passed all 72 visits after the fix.

## Phase 2 — Main pages and products

- Pages 01–08 have individual procedural scenes and local static fallbacks. The cinematic browser suite passed all eight routes at 1440, 820, 390 and 320 px, including reduced motion, keyboard pause, simulated context loss and unavailable Canvas. Screenshots are in `/tmp/rc-redesign-cinematic-shots/`. Full concept fidelity, contrast, loop seams and comparative performance still require review.
- Pages 09 and 10 now have 480 × 480 WebP posters rendered from their individual scenes at phase 0.5. The cinematic browser suite passed all ten routes at 1440, 820, 390 and 320 px, including reduced motion, keyboard pause, simulated context loss and unavailable Canvas.
- The existing plugin browser suite passed 54 visits, 768 price checks and 40 download requests. This is regression evidence for the current catalogue, with the approved plugin redesign still pending.
## Pages 11–49

- Attached each concept to its existing portfolio route or created a portfolio detail route where necessary. All 39 new WebP posters are 480 × 480 and rendered from the matching original procedural scene at phase 0.5. They total 505,334 bytes across the site, with one 5,480–29,188 byte poster per route. No third-party artwork was used.
- Existing project and service copy, URLs, forms, pricing, ZIP links, comic reader and task manager were retained. Badehaus X and MeetDiscreet use the sibling project descriptions. Quick Core, Quick Plugin Pages and Quick Questions have related-project links and source-based descriptions. The commercial catalogue still lists its 18 Pro modules. The approved catalogue hero still depicts 17 modules. Launchboard, Crystal Eye, Trusted Cash Loans and SEO Auditor reuse portfolio references. Custom Software routes enquiries to the existing contact page.
- The hero scenes use projected Canvas 2D geometry, the approved palettes and the shared renderer. They interpret each concept's main subject and motion. The full scripted cinematic sequences, photorealistic materials and adaptive 3D/video treatment are still open. Badehaus X, for example, opens a door over a staircase and an X, with no continuous travelling shot through them.

## Verification

- The cinematic browser suite passed all 49 routes at 320, 390, 820 and 1440 CSS pixels, with reduced motion, keyboard pause and resume, context loss and recovery, and an unavailable Canvas context.
- Touch pause and resume and simulated page hide/show passed on all 39 added routes. A test task and its completion persisted through reloads. The Wild Chemistry reader advanced to another page or spread.
- For each added scene, Chromium drew identical images at phase 0 and phase 1 and a different image at phase 0.5. This checks endpoints on the same renderer and does not establish full visual loop acceptance.
- Site UI regression passed 72 visits. Plugin regression passed 54 visits, 768 price checks, 40 ZIP requests and catalogue search. The Python plugin release suite passed all four tests. Rebuilding the QuickWoo pages in a temporary copy preserved their hero bindings and related project links.
- Representative desktop, tablet and mobile screenshots are in `/tmp/rc-pages-11-49-review/`. An exploratory local reduced-motion run with external requests blocked recorded DOMContentLoaded increasing from 31 to 83 ms on SpeechFlow, 20 to 88 ms on Quick Add, 18 to 46 ms on the task demo and 52 to 61 ms on Wild Chemistry. These single runs do not establish production timings. The shared local theme, runtime and configuration total about 191 KB uncompressed before the poster.
- Full visual fidelity, full-page contrast, real-device performance, external destination availability and live services remain unverified. No release sign-off, merge or deployment was performed. The redesign remains local and uncommitted on `codex/robbiecalvin-redesign`. For a clean baseline preview, use a separate checkout at `97be8d3`.

## Editorial revision

The homepage, Launchboard and SEO Auditor now use an editorial layout. The homepage uses a real SpeechFlow workspace capture and an optional silent demo. The older 49-route Canvas result describes the earlier snapshot. The current cinematic suite targets the 46 routes that use Canvas. See [landing-page sources](../landing-page-sources.md) for the copy research.
