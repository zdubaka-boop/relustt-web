# Quiz archetypes

Implemented on the final offer, 2026-09-15. These are planning profiles based on quiz answers, not clinical or psychometric categories.

| Archetype | Answers that point toward it | Plan focus |
| --- | --- | --- |
| The Reconnector | Being present, meaningful relationships, partner connection, comparison, or pulling away from dating | Make room for connection and practice being present. |
| The Confidence Rebuilder | Wanting confidence or to feel like yourself, pressure during intimacy, self-doubt, confidence affected elsewhere | Build trust in yourself and a calmer response to pressure. |
| The Pattern Breaker | Repeated setbacks, on-and-off attempts, a habit stronger than willpower, daily use | Add friction and practice a different response before an urge becomes automatic. |
| The Quiet Fighter | Hiding the habit, having no one to turn to, keeping difficult feelings inside | Private support and a response for moments faced alone. |
| The Focus Reclaimer | Lost energy or concentration, productivity goals, building a business or taking care of the body | Protect time and direct reclaimed energy toward the selected goal. |
| The Fresh Starter | First attempt, not knowing where to start, wanting a clear first step | A clear starting point and a simple repeatable routine. |

## Assignment

**Updated 2026-09-15:** New sessions use the shared question scoring described below. The original branch scoring in this section is retained only for older sessions without shared answers.

The performance-priority question distinguishes confidence in intimacy, closeness with a partner, breaking a recurring habit, and reclaiming focus/energy. These contribute five points respectively to Confidence Rebuilder, Reconnector, Pattern Breaker, and Focus Reclaimer. Other answers still influence the result; a priority does not force an archetype. Previous goal labels remain recognized for returning sessions. The removed anxiety-trigger question no longer contributes to scoring or the loading-screen text.

`funnel-archetypes.js` scores explicit answers. Primary goals and strong obstacles receive the greatest weights; frequency and shared history provide context. Only the active branch's questions contribute. Previous quit progress is ignored when the current answer says the user has not tried quitting. Names, prices, and commitment level do not change the archetype. No sensitive answer is inferred from a name or price.

The highest score wins. Ties use the strongest individual answer, then a stable branch-specific order. Up to three matching answer clues explain the result. A direct visit with no relevant answers says **Your starting point**, rather than pretending to have analyzed a completed quiz. Profiles are recomputed when the offer renders, so changed answers change the result.

Each profile has a distinct animated SVG emblem, headline, short description, focus, three roadmap actions, extra-support message, and preview copy. The SVG artwork remains decorative for screen readers. Reduced-motion settings disable floating and twinkling.

## Offer copy and layout revision

- Replaced the small Prepared for you row with the large archetype reveal.
- Roadmap now has only the centered **90-day plan** heading and three brief actions; removed the long timetable paragraphs and duplicate labels.
- Changed the offer eyebrow to **Your ticket to freedom**.
- Removed the benefits grid, repeated billing-note paragraphs, and footer pricing lines. Bottom CTA is **Unlock my plan · [selected price]** and scrolls to the main offer.
- Subscription paragraph uses **the price you chose**, **personal three-month plan**, and **monthly at the crossed-out price shown above**. It contains no numeric digits or bold/underlined emphasis. The actual $29.50 renewal remains labeled in the price table, keeping its reference unambiguous. Paid-week and monthly backend amounts are unchanged.
- Preview builds tension around reported patterns without inventing a diagnosis or a hidden alarming finding.
- Reviews use three existing site stories: Marcus and Daniel from the original funnel, plus an excerpt from Tyler R. on `index.html`. No new names, outcomes, or dates invented. First review tag is **A familiar experience**, rather than an unsupported nearby-location claim. Existing review provenance still needs verification before launch.

## Verification

`node tests/funnel-archetypes.test.cjs` checks all six examples, multiple-answer weighting, inactive-branch isolation, stale quit progress, and empty/unknown-answer fallbacks. Updated `tests/funnel-offer.browser.js` and `tests/funnel-flow.browser.js` pass all 12 offer and 5 flow scenarios. Desktop/mobile visuals checked; 320px has no overflow. Subscription text and links all use weight 400, the same color, and no resting underline.

Local changes only. No live payments or deployment.

## Subsequent removal — 2026-09-15

At the user’s request, removed the entire 90-day roadmap and extra-support block, including its redundant See my plan button. The archetype result now leads directly to the offer. Archetype definitions and assignment remain unchanged; their step/support data is retained for future use. Updated the existing browser regression to check that the removed sections stay absent on both paths.

## Shared questions and scoring — 2026-09-15

User requested removing the duplicate experienced-versus-worried question and adding the six proposed questions. Other existing questions remain.

- After frequency, everyone answers motivation, trigger context, watching longer than intended, and main priority. These come before the branch and explanatory screens.
- After quit progress, previous attempters answer what brings them back. There is an option for not having returned. First attempters skip this question; changing history to No clears both progress and setback data.
- Support preference follows the final branch question, leading into blocker catch-up and features. Preference is distinct from the existing question about whether anyone knows.
- Each added screen has a stable URL and appears in progress tracking. The removed screen's URL and persisted state migrate to relationship impact.

New shared answers plus quit history determine the profile identically on either route. Related branch confidence/goal questions no longer multiply the same evidence. Frequency gets a small contextual weight; motivation, trigger context, control, setbacks, main priority, and preferred support contribute to the result. Ties prefer the explicit main priority, then the strongest answer, then a stable route-independent order. Three meaningful shared answers are required before the UI describes an analyzed archetype. Unknown answers are neutral. A route alone no longer adds confidence points, including in legacy sessions.

All six existing profiles are reachable on both routes. These remain custom planning profiles, not validated psychological types. Quiet Fighter copy now describes comfortable, private support without assuming that choosing privacy means being isolated. Loader text and the result introduction use the shared main priority, with the later performance priority taking precedence for copy when supplied. Trigger context and motivation personalize the loading message and result observation respectively. The feature-card animations remain unchanged.

Answers stay in sessionStorage, with the safe word excluded. No new answers are put in URLs or sent to checkout. This update does not add server-side answer storage or app handoff.

Verification: `tests/funnel-archetypes.test.cjs` covers all six profiles on both routes, branch-independent shared scoring, stale history, unknown answers, and sparse evidence. `tests/funnel-flow.browser.js` covers both complete branches with and without previous attempts plus the concern route. `tests/funnel-shared-questions.browser.js` covers six direct links on both routes at 320/390/1440px, refresh/back/forward, legacy migration, conditional skipping, and a rendered Focus Reclaimer on the performance route. `tests/funnel-analysis.browser.js` checks new shared personalization and legacy fallback through the complete animation.
