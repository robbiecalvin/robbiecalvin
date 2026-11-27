# AI Unlocked Course 01 implementation and handoff

## What is in the change

- The existing AI Lessons area now shows the ten-course AI Unlocked catalogue. Course 01 has a reader and public first-lesson preview. The original software workshop is still available from the catalogue.
- The existing account opens a My Learning panel with free enrollment, progress, assessment history, the latest capstone decision, certificate, and an empty paid purchase history. Existing account login, registration and reset are reused.
- Course 01 supports ten individually marked complete lessons, 95 lesson-bank questions, the 50-question review examination, the original PDF workbook, a text-based capstone submission and a manual rubric review. Only aggregate marks are returned to learners.
- A passing capstone needs at least 80/100 and an explicit privacy and authorization approval. A student can issue a printable, personalized completion certificate after passing all requirements. Concurrent requests resolve to one certificate. Public verification gives the course, date, issuer, and ID. It does not disclose the student name, email, or account identifier.
- Courses 02–10 and the bundles are catalogue entries only. Premium checkout, fulfillment and future course management are intentionally inactive. There is no purchase path for any unpublished product. Existing sandbox payment behavior is preserved.
- Capstone reviewers use a dedicated protected queue in the existing authenticated account experience. Curriculum publishing, pricing, paid entitlements, refunds, and certificate revocation are release operations or future administration work, not general student APIs.

## Files and persistence

- `ai-lessons/` contains catalogue, course reader, verification, and the preserved software workshop. `assets/scripts/academy.mjs` renders activities and assessments, with `assets/styles/academy.css` for the learning layout.
- `server/server.mjs` and `server/academy-store.mjs` integrate the same Academy API with SQLite for local development. `supabase/functions/rc-payments/index.ts` attaches the API to the hosted account gateway, using `supabase/functions/_shared/academy.mjs` for authorization, grading, progress, review and issuance.
- `supabase/migrations/20261127200000_ai_unlocked_learning.sql` adds a service-only row per account for Course 01, RLS, revision-based writes, a unique certificate lookup and an index for the review queue. The migration adds a private runtime storage bucket and explicitly denies direct object access to ordinary Data API roles. The existing account UUID remains the owner. Deleting an account cascades to its learning record.
- `tools/import-ai-unlocked.py` reads the supplied ZIP directly, validates the manifest and every assessment and packages Markdown, workbook, rubric and answer keys as a private runtime object. The ZIP, instructor materials, answer keys, and the private bundle must stay out of the public Git repository, public site assets and GitHub artifacts.
- `server/academy.test.mjs` runs the actual journey against SQLite with fictional registrations. It uses a synthetic fixture by default and can run the same assertions against the owner's private bundle.

## Local setup

```sh
python3 tools/import-ai-unlocked.py /path/to/AIU-C01-Master.zip
APP_ORIGIN=http://127.0.0.1:8787 MAIL_MODE=file node server/server.mjs
```

Open `/ai-lessons/`. Email verification and recovery messages are written to the optional local mail spool, under `DATA_DIR`. Elect a fictional reviewer with the existing local `ADMIN_EMAILS` setting. Never use a real customer account or workbook submission during acceptance testing.

```sh
ACADEMY_TEST_BUNDLE=.local-data/ai-unlocked/course-01.json \
  node --test server/*.test.mjs supabase/functions/rc-payments/*.test.mjs
python3 tools/test-site-discovery.py
python3 tools/test-plugin-release.py
```

Defaults and names only:

- `ACADEMY_BUNDLE_PATH` selects a private local file. Default `.local-data/ai-unlocked/course-01.json`.
- `ACADEMY_TEST_BUNDLE` enables tests against the imported archive.
- `APP_ORIGIN`, `DATA_DIR`, `MAIL_MODE`, and `ADMIN_EMAILS` continue to be owned by the local account server.
- The hosted account function continues to use `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RC_AUTH_EMAIL_READY`, and existing Stripe sandbox settings. No new payment secret is needed for the free course.

## Staged launch, after owner review

1. Apply the migration to non-production first. Verify direct anonymous and authenticated Data API and Storage requests cannot retrieve course records or the runtime object.
2. Import the owner's ZIP locally. Upload only `course-01.json` into the **private** `ai-unlocked-private` bucket. Use trusted deployment or administrative tooling. Do not use a public bucket or a public URL.
3. Update the existing `rc-payments` Edge Function, including its shared academy module, on staging. Preserve the existing gateway's account session flow and Stripe sandbox configuration. Grant `rc_academy_admin: true` in trusted Supabase **app metadata** only to approved capstone reviewers.
4. Run the student and reviewer journeys with fictional accounts on staging. Confirm actual verification emails, authenticated private download, browser persistence after sign-out, score and certificate behavior, and the legal/retention treatment of learning records. Review rendered curriculum with the owner and pilot it before launch.
5. Merge and roll out the site and function only after review. No live payment or production deployment is authorized by this change.

For future paid courses, use server-owned one-time CAD prices, a publication check covering every included course, authenticated Stripe Checkout, signed webhook fulfillment, and account-bound entitlements with refund revocation. The existing payment handler covers approved service orders and should not be used to sell a future course by treating it as a service. Review product, tax, refund and access rules before implementing a paid product.

## Rollback

Restore the previous static site and Edge Function together. Stop serving the Academy routes while retaining learning rows and private course storage so progress is recoverable. Back up both before considering any destructive rollback. Removing the private runtime file makes previews and course activities unavailable while preserving learner records. Review a storage deletion or schema drop separately.
