# Funnel comparison and changes

Compared on 2026-09-14 against the user-supplied **Relustt app new funnel** outline. The outline defines the required steps and branching; existing extra elements were preserved as requested. Changes are local, uncommitted, and not deployed.

## Differences fixed

| Area | Before | Now |
| --- | --- | --- |
| Welcome | Circular arrow control, 90-day headline, 60-second helper, centered stack | Rectangular **Start my quiz** button, animated lettering retained, responsive app-preview layout, and system-focused copy. Added the outline's approximate two-minute context without reverting the newer design. |
| Fork question | Only asked about getting/staying hard; no privacy opt-out | Covers anxiety, arousal, finishing too fast, and avoiding intimacy. **No** and **Prefer not to say** both lead to Flow A. |
| B4/B6 explanation | Very abbreviated, missing the connection to escalating content and performance anxiety | Expanded the explanation and connection between those steps. Wording remains qualified rather than ruling out physical causes. Existing animations and takeaways remain. |
| B5 question | Asked whether content became intense, without the same-effect qualifier | Includes more intense/extreme content **to get the same effect**. |
| B7/A4 reassurance | Generic feedback led everyone into safe-word setup immediately | **Yes** gets result-specific reassurance and continues to B8/A5. **No** gets the first-attempt explanation, blocker intro, safe-word entry, and confirmation before B8/A5. |
| B9 trend | Slider only; no fear/avoidance response | Slider retained, plus **I'm afraid to try again to see if it's changed**, scored as **worse**. |
| B10 priority | Missing entirely | Added all three priority choices between B9 and B11, stored for the final recap/headline. |
| B11 scope | Shorter confidence question | Now explicitly includes work, friends, and dating. |
| Flow B blocker touchpoint | Skipped the reminder when a safe word existed | Shows the in-memory safe word and the reminder not to save it. If no word exists, setup happens at this stage. Reloading loses the word, so the screen offers recreation. |
| Flow A end sequence | Commitment and features existed, but no post-feature recommitment | Added **You said you're a N/10. Are you really that committed?** after the features. **Honestly, not sure** gets reassurance and continues to name entry. |
| Name and pledge | Generic name prompt; name absent from the vow | Warrior prompt restored and **I, {name}, commit to taking back control starting today** added to the existing vow. |
| Price choice | Tiers were labeled “trial price,” despite a free trial | Clarifies the amount renews every three months after the free trial, and restores the comfortable-price/supporting-others explanation. |
| Performance paywall | Generic confidence headline | B10 determines the headline and appears in the recap. Flow A still uses identity goal and reclaimed-time answers. |

## Extra elements preserved

- The extra **I haven't been intimate with a partner yet** answer and concern follow-up.
- Animated RELUSTT lettering, iOS screenshots and animations, and the existing visual style.
- Four separate feature screens instead of collapsing them into one summary.
- The existing high-commitment confirmation and its “Not yet” interaction. For scores of 7 or higher, this remains an extra step after the slider; it does not replace Flow A's newly added post-feature recommitment.
- The trend slider's finer-grained answers, alongside the missing avoidance choice.
- The longer 90-day vow, drawn signature, press-and-hold interaction, testimonials, four price tiers, and final trial CTA.

## Required path order, with retained extras

**Flow A:** frequency → fork → identity goal → obstacle and explanation → intensity → quitting history and feedback → optional early blocker setup for No → identity impact → support and conditional explanation → trend → reclaimed time → blocker catch-up if needed → commitment → optional existing high-commitment confirmation → four features → recommitment question → optional uncertainty reassurance → name → pledge → price → paywall.

**Flow B:** frequency → fork → experience → relationship impact → porn connection → explanation → intensity → explanation → quitting history and feedback → optional early blocker setup for No → anxiety triggers → trend → priority → confidence impact → blocker reminder/setup → four features → commitment → optional existing high-commitment confirmation → name → pledge → price → paywall.

## Intentional differences and integration limits

- The recent welcome redesign is retained rather than replacing it with the outline's plain welcome sentence. Its privacy helper says answers remain in the browser; it does not make the broader promise “nobody sees this but you.”
- B4/B6 convey the supplied explanation without asserting that a visitor has no physical condition. This is a copy adaptation, not a medical validation of the outline.
- **“Your blocker is ready” remains instead of “Your blocker is live.”** A web quiz cannot enable iOS Screen Time blocking. The safe word is currently memory-only and is not transferred to the iOS app by the checkout request. A real safe-word/app handoff still needs implementation in the web/iOS integration; the reminder is a UI flow, not proof of live blocking.
- The supplied B8 replacement, B11 wording, and $14.99 tier were marked provisional. The supplied choices remain available; this change does not validate their business assumptions.
- The existing checkout function requests a seven-day Stripe trial for funnel tiers. The actual recurring amount and interval depend on the configured Stripe Price IDs. No live payment, OAuth flow, or iOS entitlement handoff was tested.

## Verification

- All **45 direct step URLs** rendered and matched registered screens.
- Browser flow tests passed for **A/Yes, A/No, B/Yes, and B/No** quitting histories, including low and high commitment, early and late safe-word setup, reminder text, uncertainty reassurance, new priority personalization, the named pledge, and selected price display.
- The extra intimacy-concern branch still reaches the performance path.
- The tests confirm that the safe word is excluded from session storage and browser history metadata.
- The signature button requires a signature before it is enabled. The existing two-second hold implementation is retained; the flow test does not simulate drawing/holding or submit checkout.
- A separate native mouse check drew a signature, verified the hold action became enabled, and held the button until the price-selection URL appeared successfully.
- JavaScript syntax and whitespace checks pass. Browser runtime error inspection reported no errors during the tested flows.

Run the browser regression in a **dedicated local test session** (it clears that session's quiz progress):

```powershell
npx --yes agent-browser --session relustt-tests open 'http://localhost:8000/funnel.html?step=welcome'
Get-Content tests/funnel-flow.browser.js -Raw | npx --yes agent-browser --session relustt-tests eval --stdin
npx --yes agent-browser --session relustt-tests close
```

[All step links](FUNNEL_STEPS.md)

## Subsequent user revision — 2026-09-15

The user requested removing the B9 fear/avoidance alternative. The performance trend screen now uses only its five-position slider; scoring follows that value. This supersedes the original B9 comparison above. Continue content is centered.


## Subsequent pricing revision — 2026-09-15

User changed price choices to $5, $9, $13, and $17.67 in one row with no per-option copy, centered the price eyebrow, removed Back and the trial note from this selection screen, and renamed its action Get my analysis. Trial and renewal details remain on the final paywall. Older saved $14.99/$29.99 selections migrate to $13/$17.67. Checkout accepts tier_13/tier_1767 through new STRIPE_PRICE_TIER_13/STRIPE_PRICE_TIER_1767 environment variables. Matching Stripe Price IDs still need configuration; no live prices or payments were created. Legacy API mappings remain for older clients.


## User correction: no free trial — 2026-09-15

The user explicitly clarified that there is no free trial and that the current $5/$9/$13/$17.67 prices must remain. Removed the seven-day Stripe trial parameter and all free-trial/$0-today claims from the final paywall and error-recovery CTA. Selected price is shown as due today; the existing quarterly renewal cadence is retained. This supersedes earlier free-trial notes and the original supplied outline. Matching Stripe Price IDs remain required before live checkout.

The price selection layout now follows the supplied screenshot's proportions in RELUSTT colors: Choose your trial price heading, compact 54px buttons with 15–16px price labels, two unboxed text sections, plain support text, and a narrower Get my analysis action. Reference: C:/Users/Bablikas/Pictures/Screenshots/Screenshot 2026-09-15 002008.png.


## Personalized analysis interlude — 2026-09-15

User requested an animated loading screen before price selection, inspired by Screenshot 2026-09-15 002208.png. Added `analyzing-answers` after the vow seal and before choose-price, with a purple orbital visual and three typed/erased messages. Messages use the selected identity/performance goal and reclaimed activity/anxiety trigger, with neutral fallbacks when unanswered. No safe word is included and no remote AI/diagnostic claims or requests are made. The existing answer-based final plan remains the source of personalization.

Normal sequence: pledge → sealed overlay → analyzing-answers → choose-price → your-plan. The analysis automatically replaces its history entry so browser Back does not trigger an analysis loop. Leaving the screen cancels timers; reduced motion shows whole messages without the typing animation. Direct links to individual screens remain available. There are now 46 step links.

Verified both branches' personalized text, typing/erasing, automatic price routing and branch preservation, history length, cancellation on leaving, and the actual drawn-signature/hold transition into analysis. Mobile and desktop screenshots reviewed. Syntax/diff checks passed; no browser errors. Tests: tests/funnel-analysis.browser.js. CSS v22, JS v27. Local only.


## Loading visual revision — 2026-09-15

User rejected the central orb and short duration. Replaced the orbital visual with an illustrated brain made of illuminated contours, moving light traces, and a scanning line. The three personalized messages now each occupy about 7.2 seconds, for roughly 22 seconds total, with longer reading pauses. Phase labels are Your answers, Your focus, and Your plan. No price or route changes. CSS v24, JS v29.

## Final offer redesign and confirmed billing — 2026-09-15

References: user-provided Oriano screenshots `Screenshot 2026-09-15 002757.png`, `002806.png`, and `002813.png` under `C:/Users/Bablikas/Pictures/Screenshots/`. Applied their long-page structure using RELUSTT purple styling: sticky seven-minute timer; personalized hero; three-stage 90-day roadmap and answer-based challenge; selected-price table; included lesson value $29.50 crossed out / $0.00; secure-payment copy and benefits; subscription disclosure; Reveal my 90-day plan; blurred analysis preview; existing reviews; FAQs; bottom CTA scrolling back to the offer.

The user confirmed the selected $5/$9/$13/$17.67 is charged for the first seven days, then $29.50 monthly. This supersedes the earlier quarterly billing notes, while preserving the requirement that the first week is paid. Server-side Stripe setup now uses a validated monthly Price plus a one-time introductory line item and a seven-day delay of recurring charges. Set STRIPE_PRICE_FUNNEL_MONTHLY before testing real payments. Cancellation returns to the correct quiz pathway.

The user explicitly requested that the countdown stop at zero without changing anything else. Its original timestamp is retained on reload and returning to the offer. Price and checkout remain unchanged at zero; it is a display timer, not an enforced expiry. The 90-day date is a plan target, not a personalized promise of a recovery date.

Quiz answers and names remain in same-tab session storage, including the previously missing intimacy-concern Yes/No answer. Safe words and signatures are memory-only. Only tier and pathway go to checkout. All answer/name interpolation is escaped. A delayed checkout response cannot redirect after leaving the page, and non-JSON errors use the normal error message.

Verification: all four prices, both personalized branches, timer persistence/zero behavior, FAQ toggles, CTA scroll/focus, checkout error recovery, safe-word exclusion, escaped names, and preserved concern answers checked in the browser. Existing five full-flow scenarios and ten mocked backend tests pass. Desktop and phone screenshots inspected; 320px has no horizontal overflow. No live payment or deployment.

Launch details still needed: real contact address, web refund policy decision, full web subscription terms, review provenance, configured Stripe test checkout/descriptor, and account/iOS entitlement verification. The contact remains example@gmail.com as requested. Current refund dialog states that no web guarantee has been specified; it does not invent a policy.
