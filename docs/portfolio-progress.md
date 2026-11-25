# Engineering portfolio progress

Updated November 25, 2026.

## Phase 3 case studies and fixtures

Acceptance requires a published engineering explanation, reproducible inputs and expected results, and evidence tied to a tested revision. Each repository's `CASE_STUDY.md` records the tested revision. The commits below published the fixture documentation.

| Repository | Documentation commit | Verification command | Recorded result |
| --- | --- | --- | --- |
| codexmaster | `4d1fbad3873a` | `python -m unittest discover -s tests -v` | 3 config and documentation checks passed ([Actions](https://github.com/robbiecalvin/codexmaster/actions/runs/45642841023)) |
| productivitysuite | `9f1cf597652b` | `python -m unittest discover -s tests -v` | 4 contract tests passed (private workflow) |
| speechflow | `42482c756bb4` | `node --test tests/voice.test.cjs; npm run test:native; npm run build:web` | 17 tests and the web build passed ([Actions](https://github.com/robbiecalvin/speechflow/actions/runs/45641425924)) |
| myra | `869c1335f173` | `npm run lint; npm run build; npm test (backend)` | Backend lint, build and 1 ranking test passed ([Actions](https://github.com/robbiecalvin/myra/actions/runs/45641441984)) |
| crystaleye | `ae40e7fd303b` | `node --test tests/numerology-calculator.test.mjs` | 5 calculator tests passed ([Actions](https://github.com/robbiecalvin/crystaleye/actions/runs/45641450245)) |
| seo-auditor | `2c64bd10f7b4` | `pip-audit -r requirements.txt; python -m unittest discover -s tests -v` | 5 tests passed and dependency audit reported no known vulnerabilities ([Actions](https://github.com/robbiecalvin/seo-auditor/actions/runs/45644423442)) |

SEO Auditor's report fix is `32924d352ccc`. The previously failing HTML report fixture now passes with a crawled 404. The other five projects retain their linked historical run results.

The public Productivity Suite summary and architecture are in [productivity-suite-case-study.md](productivity-suite-case-study.md). The source repository and the workflow remain private.

## Portfolio homepage

- **Published to source.** `index.html` commit `f4fe8a9fb8df` adds a static six-project section. Static checks found six articles and 17 distinct labelled links. All 17 destinations returned HTTP 200.
- **Deployment verification pending.** GitHub raw serves the updated source. The live homepage returned older markup during the checks. The documented deployment uses a Cloudflare Worker that reads from repository `main`. Compare the active worker route and upstream response before changing deployment configuration.
- **Recruiter audit pending.** Verify live navigation and mobile/tablet layout after rollout. Myra has an existing desktop image. Capture real sessions for other runnable applications and document the runtime prerequisites. Verify scope and roadmap statements per project.

## Other phases

| Phase | Status | Acceptance and next executable action |
| --- | --- | --- |
| 1 | Open | Review the open dependency issues and regenerate patched lockfiles with the native package managers. Verify suites before merge. Repository metadata checks for two old repository names were inconclusive. Credential revocation is owner work. |
| 2 | In progress | QuickAdd's six-file formatting patch applied cleanly and passed `git diff --check`. Commit `47eb5b884079` is on a review branch. Inspect Actions lint, coding standards, PHP matrix and package results before merge. Red Door PR #46 was reviewed as documentation-only and its two workflow runs reported success. The wider plugin matrix and integration checks remain open. |
| 4 | Pending | Inventory plugin dependencies, compatibility evidence, release packages and installation checks before publishing the ecosystem index. |
| 5 | Pending | Specify synthetic evaluation cases and score fixtures, then record reproducible runs with model and configuration metadata. |
