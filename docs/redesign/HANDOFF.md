# RobbieCalvin.com redesign handoff

This file describes the archived handoff snapshot. See [progress.md](progress.md) for the current branch, including the implementation and verification through page 49.

Continue the Digital Matter redesign in an isolated branch. The approved package contains 49 individual page designs and 49 unique cinematic hero concepts. Finish the remaining phases in `RobbieCalvin-Implementation/CODEX-IMPLEMENTATION.md`. Preserve existing content, typography, URLs, functionality and integrations. Only explicit authorization from Robbie permits a merge into main or a production deployment.

## Restore the work

The original repository is [robbiecalvin/robbiecalvin](https://github.com/robbiecalvin/robbiecalvin). The starting commit is `97be8d33472f867b90995fed96ed44470998ea50`. The local branch was `codex/robbiecalvin-redesign`. The redesign changes were uncommitted at handoff, so cloning alone will give you the baseline.

1. Unpack `RobbieCalvin-Redesign-Handoff.zip` outside the website checkout. Keep it separate from files served by the website.
2. Clone the repository into a fresh checkout. Run the following commands there, replacing the sample bundle path with the absolute path to the extracted folder.

   ```sh
   git switch -c codex/robbiecalvin-redesign 97be8d33472f867b90995fed96ed44470998ea50
   cp -R /absolute/path/to/RobbieCalvin-Redesign-Handoff/overlay/. .
   git status --short --branch
   git diff --check
   ```

3. Read `docs/redesign/progress.md` for the full page-to-route map and verification status. Use the sibling `RobbieCalvin-Implementation/` folder in the bundle as the approved source. Its master JSON is authoritative for recorded settings. The checksums in `SHA256SUMS` cover the source, evidence and overlay files.

## Work transferred

| Pages | Status |
| --- | --- |
| 01–08 | Layout and theme integration, one original Canvas scene per page, and static fallback. The dedicated browser suite passed at 1440, 820, 390 and 320 px, with reduced motion, keyboard pause and simulated Canvas failures. Keep the visual acceptance checklist open. |
| 09–10 | Codex Master and Myra have integrated themes and distinct scene code. Their two referenced WebP fallback files still need to be generated, followed by browser checks. |
| 11–49 | Implementation pending, including Phase 3 plugins and Phase 4 services, lab and creative. |

Phase 0 reconciled the repository and all 49 approved designs. Phase 1 established the design tokens and Canvas lifecycle. Phase 2 is in progress. No production changes were made. No release gates have been signed off.

## Pick up here

1. Generate `assets/images/digital-matter-codex-master.webp` and `assets/images/digital-matter-myra.webp`. Use the matching scene factory in `assets/scripts/scenes/portfolio.mjs` and exact settings from pages 9 and 10 in `assets/data/digital-matter.json`. The other portfolio posters were rendered at phase 0.5 at 480 × 480, composited over `#08090d`, and exported as WebP. Run the ten-route test once both files exist.
2. Continue pages 11–21, then phases 3–5. Report any material deviation for approval. The existing procedural Canvas 2D scenes have separate geometry and motion. The approved concept fidelity and adaptive hybrid rendering have yet to pass final visual review.
3. Verify content and route sources before creating missing pages. Badehaus X and MeetDiscreet lacked confirmed source content in the checkout. The existing Red Door page has separate branding. Quick Plugin Pages and Quick Questions lacked catalogue entries and plugin ZIPs. Their approved specifications supply design and animation direction, while pricing, product claims and downloads require verified source information. The catalogue currently lists 18 Pro modules, whereas the approved catalogue hero depicts 17 modules. Preserve factual product copy and catalogue behavior and record the distinction in visual review.
4. After implementing the remaining routes, record per-page keyboard, touch, fallback, contrast, content parity, link and loop-seam evidence. Measure performance against the baseline and verify release readiness before requesting any deployment authorization.

## Run the checks

This is a static site. Run `python3 -m http.server 8787 --bind 127.0.0.1` from the checkout. The browser tests expect Playwright to be resolvable by Node and default to `/usr/bin/chromium`. Point `BROWSER_EXECUTABLE` at a local Chrome or Chromium binary where needed. You can install Playwright in a temporary directory with `npm install --prefix /tmp/robbiecalvin-qa playwright` and set `NODE_PATH=/tmp/robbiecalvin-qa/node_modules`.

```sh
export SITE_REVIEW_URL=http://127.0.0.1:8787
python3 tools/test-plugin-release.py
node tools/test-site-ui.cjs
node tools/test-plugin-pages.cjs
node tools/test-cinematic-heroes.cjs
```

Set `REVIEW_ARTIFACTS_DIR` to capture screenshots. The bundle includes baseline Home captures and the eight-route cinematic run. The original browser UI suite passed 72 visits. The existing plugin suite passed 54 route visits, 768 price checks and 40 ZIP download requests. The final 10-route test requires the two pending posters. Live service behavior and full visual and performance acceptance remain unverified.

## Files that carry the redesign

- `assets/data/digital-matter.json` is the complete byte-for-byte approved JSON.
- `assets/styles/digital-matter-tokens.css` is the supplied CSS token registry. `assets/styles/digital-matter.css` contains the shared theme and responsive stage.
- `assets/scripts/cinematic-hero.mjs` handles adaptive Canvas quality, reduced motion, pause, visibility, fallback and cleanup.
- `assets/scripts/scenes/` contains the original procedural artwork. `tools/test-cinematic-heroes.cjs` exercises the handoff routes.
- `docs/redesign/progress.md` tracks all 49 approved pages and phase evidence.

For rollback, use the recorded baseline in a fresh checkout or revert the redesign commits if the work is committed later. Keep production on its existing deployment until Robbie approves a release.
