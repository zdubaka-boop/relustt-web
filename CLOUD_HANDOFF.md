# RELUSTT web funnel — cloud handoff

Updated 2026-09-21. Start with the current status below; the dated September 16 record is historical.

## Current continuation point — 2026-09-21

- Website branch: `funnel-question-rebuild` in https://github.com/zdubaka-boop/relustt-web. Clone this branch and run `npm ci` then `npm test`; do not overlay an old ZIP onto current source.
- iOS quiz-profile branch: `codex/web-quiz-profile-sync` in https://github.com/zdubaka-boop/unbound-price-blocking-backup, based on the newer native-onboarding work on `main`. Use that branch for the combined profile handoff. Build/sign on a Mac; source synchronization is not an app release.
- Live site: https://relustt.site. Deployment `dpl_4HXwHD4D74JLDVoLdaiXfzm5KTP4` is READY. It includes the latest tracking APIs and the corrected homepage tracking script tags.
- Supabase: `bnycfsujwbusxyeqnrhf`; tracking migrations already applied. Both providers enabled. Site URL is `https://relustt.site`; redirects are `https://relustt.site/activate*` and `relustt://auth/callback`. Do not reset/recreate the project.
- Vercel `rostweb`: production Stripe key, funnel monthly Price and webhook secret configured securely. Webhook `we_1UHtNXE0Q5KzSNmvCTLgxa1D` enabled. Never add credentials to Git or Obsidian. Preview/test-mode billing still needs separate configuration; legacy direct monthly/yearly checkout prices are separate from funnel pricing.
- Required flow: quiz → purchase → sign in on website to link the purchase → app download → same provider/account sign-in. Payment alone does not create the provider account. Same-browser purchase proof expires after 48 hours.
- Evidence: 31 web tests and live rollback-only SQL checks passed. An unpaid $5 live Checkout was created and expired with no charge/customer/subscription. Browser telemetry saved successfully; smoke-test analytics use `utm_source=deployment_verification`. No real paid/provider/iPhone round trip has been completed.
- Remaining: paid end-to-end testing, build/distribute matching iOS source, rotate the chat-supplied live key, replace placeholder support details, finalize customer-facing policy content, review Supabase quota warning, and implement retention/erasure operations before general customer traffic.
- Read `ACCESS_VERIFICATION_2026-09-21.md`, `FUNNEL_TRACKING.md`, `SUPABASE_LOGIN_SETUP.md`, `PRODUCTION_LAUNCH_PLAN.md`, and sibling iOS `WEB_QUIZ_PROFILE_HANDOFF.md`. Reference repositories are read-only and have not been pushed to.
- Local documentation vault: `C:/Users/Bablikas/Desktop/geberal`, project `01 Projects/RELUSTT Web`. This vault is not uploaded with the source repositories.

## Historical snapshot — 2026-09-16

The following records what was true on September 16. Its local-only/ZIP instructions, old commit IDs and blockers are superseded by the continuation point above.

## Critical state

- Product: RELUSTT is an iOS app. The web journey is quiz → personalized plan/offer → purchase → account activation → download/use the app.
- Repository: https://github.com/zdubaka-boop/relustt-web
- Windows checkout: `C:/Users/Bablikas/Documents/ChatGPT/my/relustt-web`
- Local HEAD checked today: `8270f2c` (`feat: port production onboarding funnel to web`). The substantial changes described below are **local and uncommitted**, including untracked files. No push or deployment was performed in this conversation. A fresh GitHub clone alone will not include them.
- Use `C:/Users/Bablikas/Documents/ChatGPT/my/RELUSTT-cloud-handoff-complete-2026-09-16.zip` as the current snapshot. It includes the source, selected project notes, and the full project-history note; it excludes `.git` and secret environment files. Extract it into the cloud workspace; if working from a clone, overlay the snapshot without deleting unrelated files. Inspect differences before committing. No credentials are included.
- Multiple conversations edited this checkout. Preserve current source and concurrent edits; do not restore whole files from earlier snapshots or historical notes. Current code supersedes older documentation when there is a conflict.
- Asset query versions checked today: CSS 37, funnel JS 61, archetypes JS 6. Increase relevant versions after changes to avoid stale preview scripts.

## Files to know

| Path relative to repository | Purpose |
| --- | --- |
| `funnel.html` | Quiz entry point; CSS/script imports and cache versions. |
| `funnel.js` | Screens, branching, answer state, direct routes, animations, feature carousel, price selection, personalized result, checkout request. |
| `funnel.css` | Established dark purple visual design, responsive layouts and animations. |
| `funnel-archetypes.js` | Six profile definitions, shared/legacy scoring, SVG emblems, result preview copy. |
| `FUNNEL_STEPS.md` | Direct screen links and routing notes. |
| `FUNNEL_ARCHETYPES.md` | Profile implementation and latest shared-question changes. |
| `FUNNEL_FLOW_REVIEW.md` | Historical comparison against the user's supplied flow. Some details are superseded, especially prices and removed questions. |
| `api/create-checkout-session.js`, `server/stripe.js` | Server checkout endpoint and Stripe request construction. |
| `.env.example`, `README.md`, `vercel.json` | Configuration template, setup/integration notes, deployment routing. |
| `checkout.html`, `checkout.js`, `activate.html`, `activate.js` | Existing checkout/account activation surfaces. |
| `supabase/` | Backend-related project files; inspect before modifying account/entitlement integration. |
| `animations/`, `phones/`, `trees/`, `vendor/` | Existing visual assets and local Lottie runtime. |
| `tests/` | Node scoring/billing tests and browser regression scripts. |
| `privacy.html`, `pages/src/privacy.md`, `terms.html` | Policy surfaces; privacy also has an editable source. |

## Preview

No frontend build is needed for the static funnel. From the extracted repository:

```sh
python -m http.server 8000
```

Local URLs:
- Resume a screen: `http://localhost:8000/funnel.html?step=intimacy`
- Welcome: `http://localhost:8000/funnel.html?step=welcome`
- Fresh quiz: `http://localhost:8000/funnel.html?start=1` (clears quiz state in that tab).
- Pricing: `http://localhost:8000/funnel.html?step=choose-price&path=performance`
- Result: `http://localhost:8000/funnel.html?step=your-plan&path=performance`

Use the cloud environment's forwarded preview address; this Windows localhost is not reachable there. The static server does not run checkout/login APIs.

Last local server action: relaunched on 2026-09-15, bound to 127.0.0.1:8000. The intimacy screen rendered without browser errors. Process ID at launch was 23048 (not checked again today). Logs are in the parent workspace as `relustt-preview.stdout.log` and `relustt-preview.stderr.log`.

## Completed funnel work and design preferences

- Center question headings, supporting copy, and informational screen content. Info screens have no Back control; CTAs sit near content instead of at the far bottom.
- The welcome redesign was reverted at the user's request. Preserve the current welcome appearance, including the restored circular control; do not reapply an abandoned design from earlier requests. Short copy: “Quit porn for good. Take back control.” and a system beyond willpower.
- Every active screen has a shareable step URL. Navigation updates history without full-page reloads; Back/Forward and refresh are supported.
- Shortened brain-conditioning/arousal-threshold copy. Quit-history Yes/No choices are side by side with emojis. Removed the extra fear option from the performance trend slider. Confidence examples were made smaller helper text.
- Blocker introduction animates site representations turning red/crossed out, then locked. Copy must say almost ready and explain setup in the app; the website itself does not activate iPhone blocking. Avoid premature checkout mentions in that reassurance copy.
- Four app-feature screens use one mounted carousel: progress, community, guided support, lessons. Stable dimensions and sliding transitions. Twenty course tiles represent lessons; chat timing was slowed and previous messages remain mounted.
- Commitment rating has a growing flame; headings centered. Confirmation has highlighted words, no Back control, fewer dashes, and updates its Not yet interaction without rebuilding the screen.
- Name prompt uses smaller text and “Your name.” Signed vow uses a press-and-hold purple viewport fill and a seal.
- Analysis occurs after the vow and before pricing. Seven feature/value cards rotate as a deck with six shuffles, over about 16 seconds. Keep each card's main phrase fixed; move whole cards rather than replacing text. One connected progress timeline, personalized typed messages, reduced-motion behavior, and cleanup when leaving.
- Pricing uses compact, moderate-sized horizontal choices: **$5 / $9 / $13 / $17.67**. Heading: **Choose your trial price.** CTA: **Get My Plan**. Higher-price explanation supports keeping the $5 option affordable. Divider fades at its edges.
- Result reveal initially shows only the personalized typed headline, then reveals the page. Offer has a seven-minute presentation timer and a thin bar shifting green toward red. Timer reaching zero does not actually change the price.
- Result includes a distinct purple archetype card, selected-price offer, short preview followed by six blurred paragraphs, existing testimonials, FAQ, and bottom CTA scrolling to the offer.
- The user removed the extra 90-day roadmap and extra-support block from the result. Do not reintroduce them casually.
- Restore/preserve the approved three-row offer card: Personal 90 Days Plan + selected price; Total today + same price; Guided course included + crossed-out $29.50 beside $0.00. The user rejected an extra monthly-price row. Disclosure remains below. Keep copy-only edits from changing this layout.
- Disclosure copy is a single paragraph with ordinary-weight Relustt, minimal repeated subscription wording, and no awkward forced line break. Preserve material billing terms.

## Latest quiz and archetype work

The original audit found performance-route bias: only three of six profiles were reachable. Shared questions and scoring were added to address this.

Current shared sequence after frequency:
1. What do you usually turn to porn for? (`motivation`)
2. When is it hardest to resist? (`urge-context`)
3. How often do you watch longer than you intended? (`watch-control`)
4. What would you most like to change? (`main-priority`)
5. Existing intimacy fork into performance or identity questions.

Both paths also ask:
- What usually brings you back after trying to stop? (`setback-trigger`), after quit progress and only for previous attempters. Includes an option for not returning. Changing tried-quit to No clears progress and setback answers.
- What support would you feel comfortable using? (`support-preference`), before blocker catch-up/app features. Preference is distinct from whether anyone knows.

Removed the redundant “Has this actually happened with a partner, or are you more worried it might?” Old `performance-experience` links/saved state migrate to relationship impact.

Concurrent edits, now present in the snapshot: the separate performance-anxiety question and confidence-spillover question were removed; the later performance-priority question offers confidence in intimacy, partner connection, breaking the same habit, and reclaiming focus/energy, then goes to support preference. Preserve these edits. Inspect current routes for old-link aliases.

Profiles remain: Reconnector, Confidence Rebuilder, Pattern Breaker, Quiet Fighter, Focus Reclaimer, Fresh Starter. These are custom planning profiles, not validated psychological diagnoses.

New shared answers plus quit history drive classification equally on either branch. No automatic confidence bonus for choosing the performance route. All six profiles are reachable from both routes. At least three meaningful shared answers are required before presenting an analyzed archetype; uncertain answers are neutral. Old sessions without shared answers use legacy scoring. Price, name, and commitment do not determine the profile. Quiet Fighter wording no longer assumes privacy equals isolation.

Copy precedence matters: when supplied, the later performance priority takes precedence in loader/result introduction text; otherwise use the shared priority, then legacy identity answers. Trigger context and motivation personalize loading/result copy. Scoring and copy have different roles; test mixed and old session data explicitly.

Answers use **sessionStorage** under `relustt_web_funnel_v1`. Safe words are deliberately memory-only, excluded from URLs/storage/checkout. This work did not add server-side quiz-answer storage or app transfer. Direct links with missing answers use fallbacks; use a fresh complete quiz to assess personalization.

## Billing/integration state

Latest agreed structure: selected amount buys a **paid seven-day introductory period**, then **$29.50/month** until canceled. It is not a free trial. Earlier quarterly-renewal notes are obsolete.

Stripe implementation combines the upfront amount with the delayed recurring subscription. Inspect `server/stripe.js` and `tests/stripe-checkout.test.cjs` rather than assuming Stripe's internal trial_period_days means free access. Server validates the configured monthly Price. Live Stripe/Supabase/account activation/iOS entitlement handoff remains unverified here.

Outstanding production details include actual environment credentials/Price IDs, real support email (currently example@gmail.com), final policies/links, testimonial provenance, and actual app setup/entitlement transfer. Do not claim these are complete. No live purchase was made.

## Verification

Fresh check on 2026-09-16: `node tests/funnel-archetypes.test.cjs` passed on the current snapshot. Browser checks below passed during the previous implementation/relaunch; they were not all rerun for this handoff.

```sh
node --check funnel.js
node --check funnel-archetypes.js
node tests/funnel-archetypes.test.cjs
node tests/stripe-checkout.test.cjs
```

Browser scripts are async IIFEs intended for a dedicated localhost test page (read each file's header):
- `tests/funnel-flow.browser.js`: five complete/conditional route scenarios.
- `tests/funnel-shared-questions.browser.js`: seven groups, including six new routes on both paths at 320/390/1440px, refresh/back/forward, legacy migrations, stale clearing, and a performance-path Focus Reclaimer result.
- `tests/funnel-analysis.browser.js`: three groups covering legacy/shared personalized messages, automatic routing after about 16 seconds, and timer cleanup.
- `tests/funnel-offer.browser.js`: offer behavior, selected amounts, and mocked checkout.
- `tests/funnel-reveal.browser.js`: typed headline and staged reveal.

They use test iframes and restore session storage. Never run them in a user's real quiz session. The 40+ second analysis script can exceed the browser CLI response timeout: launch it asynchronously into a window result variable, then read completion. Exact-width iframe checks need border:0, width/min-width and flex-shrink:0 to avoid false 320px overflow.

Previous Windows CLI location: `C:/Users/Bablikas/AppData/Local/npm-cache/_npx/6de2aa2fded2970c/node_modules/agent-browser/bin/agent-browser.js`. That path will not exist in cloud; use available browser tooling there. Mobile screenshots are in the parent Windows workspace, not needed to run the site.

## Knowledge and original context

Obsidian vault: `C:/Users/Bablikas/Desktop/geberal`
Project notes: `01 Projects/RELUSTT Web/`
Useful notes: `RELUSTT Web.md`, `Decisions and progress.md`, `Funnel flow review.md`, `Offer page and paid trial.md`, `Quiz questions and archetype audit.md`.
Workflow: `Home.md` and `99 Meta/Codex knowledge workflow.md`.

The user wants durable decisions saved automatically, but the local Windows vault is not automatically accessible in cloud. The archive includes selected project notes under `handoff-notes/`; save further cloud notes locally for later merging instead of claiming to update an unavailable vault. Do not copy credentials or infer personal health facts from this project's subject.

Original supplied flow: `C:/Users/Bablikas/.codex/attachments/dd169225-1718-40b4-bb4a-e6e0f5fbd23e/pasted-text.txt`; also captured in the vault source note `04 Reference/Sources/Documents/RELUSTT funnel specification - 2026-09-14.md`. Reference offer screenshots were supplied from `C:/Users/Bablikas/Pictures/Screenshots/` dated 2026-09-15 (002008, 002208, 002757, 002806, 002813). Current implementation is the authority where later requests changed these references.

Related but separate projects: actual iOS repository is https://github.com/zdubaka-boop/unbound-price-blocking-backup at sibling `unbound-price-blocking-backup/`; an Android preview exists in sibling `relustt-android/`, with tools in `android-toolchain/`. These are not the web repository and are not included in this web handoff. No Android production-parity claim is made.

## Continue from here

1. Use the attached snapshot, not just the remote main branch. Read this file and inspect the current code/diff.
2. Start the static preview and verify the quiz, preserving existing designs and approved extras.
3. The latest requested implementation is complete. Await the user's next edit; likely next feedback is whether the revised quiz's profile feels appropriate.
4. Do not silently apply the audit's other proposed deletions, redesign the result, deploy, push, or process a live payment. Additional question consolidation and archetype fit validation remain discussion topics.
5. Keep changes narrow and review the affected flow on mobile. Separate presentation tests from actual billing/app integration verification.
