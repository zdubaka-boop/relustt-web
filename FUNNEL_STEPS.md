# Funnel step links

Every screen has a stable URL. The address bar updates during navigation; refresh and browser Back/Forward keep the selected screen.

Links select screens, not answers. Fresh sessions use defaults for questions not yet answered. Shared screens use `path=performance` for that branch; omit it for the identity branch. The start link resets saved quiz answers.

[Start a fresh quiz](http://localhost:8000/funnel.html?start=1)

## Flow after the 2026-09-16 question cut

One shared spine for everyone, never more than four questions without an info or value screen:

1. frequency → motivation → urge-context
2. obstacles → **build-your-system** (personalized willpower screen) → personalizing (auto-advancing bridge)
3. watch-control → main-priority → intimacy
   - **Yes** → performance branch: relationship-impact → **brain-conditioning** → performance-content-intensity → **arousal-threshold**
   - **Haven't been intimate** → intimacy-concern → Yes: **intimacy-worry** (reassurance, regular path) · No: regular path
   - **No** → regular path
4. Quit block. The obstacle answer doubles as quit history: *Honestly, I haven't tried* and *I don't know where to start* count as no previous attempt.
   - Tried before: quit-progress → **quit-feedback** → setback-trigger
   - First attempt: **quit-feedback** → blocker-introduction → safe-word → blocker-ready
5. support-preference → **shared-support** (everyone; wording follows the chosen support)
6. Blocker catch-up if no safe word yet (performance shows blocker-reminder when it is set) → commitment → confirm-commitment (7+ only) → progress → community → ai-support → lessons → your-name → pledge → analyzing-answers → choose-price → your-plan

| Screen | Local preview |
| --- | --- |
| welcome | [welcome](http://localhost:8000/funnel.html?step=welcome) |
| frequency | [frequency](http://localhost:8000/funnel.html?step=frequency) |
| motivation | [motivation](http://localhost:8000/funnel.html?step=motivation) |
| urgeContext | [urge-context](http://localhost:8000/funnel.html?step=urge-context) |
| obstacle (shared; sets quit history) | [obstacles](http://localhost:8000/funnel.html?step=obstacles) |
| obstacleInfo | [build-your-system](http://localhost:8000/funnel.html?step=build-your-system) |
| obstacleBridge (auto-advances) | [personalizing](http://localhost:8000/funnel.html?step=personalizing) |
| watchControl | [watch-control](http://localhost:8000/funnel.html?step=watch-control) |
| changePriority | [main-priority](http://localhost:8000/funnel.html?step=main-priority) |
| fork | [intimacy](http://localhost:8000/funnel.html?step=intimacy) |
| forkConcern | [intimacy-concern](http://localhost:8000/funnel.html?step=intimacy-concern) |
| forkConcernInfo (worry without experience: reassurance, then regular path) | [intimacy-worry](http://localhost:8000/funnel.html?step=intimacy-worry) |
| bRelationshipImpact | [relationship-impact](http://localhost:8000/funnel.html?step=relationship-impact) |
| bCauseInfo | [brain-conditioning](http://localhost:8000/funnel.html?step=brain-conditioning) |
| bIntensity | [performance-content-intensity](http://localhost:8000/funnel.html?step=performance-content-intensity) |
| bGapInfo | [arousal-threshold](http://localhost:8000/funnel.html?step=arousal-threshold) |
| quitProgress (both paths, prior attempts only) | [quit-progress](http://localhost:8000/funnel.html?step=quit-progress) |
| quitFeedback | [quit-feedback](http://localhost:8000/funnel.html?step=quit-feedback) |
| setbackTrigger (both paths, prior attempts only) | [setback-trigger](http://localhost:8000/funnel.html?step=setback-trigger) |
| supportPreference (both paths) | [support-preference](http://localhost:8000/funnel.html?step=support-preference) |
| supportInfo (both paths) | [shared-support](http://localhost:8000/funnel.html?step=shared-support) |
| safeWordIntro | [blocker-introduction](http://localhost:8000/funnel.html?step=blocker-introduction) |
| safeWordEntry | [safe-word](http://localhost:8000/funnel.html?step=safe-word) |
| blockerLive | [blocker-ready](http://localhost:8000/funnel.html?step=blocker-ready) |
| blockerReminder | [blocker-reminder](http://localhost:8000/funnel.html?step=blocker-reminder) |
| commitmentPerformance | [performance-commitment](http://localhost:8000/funnel.html?step=performance-commitment) |
| commitmentIdentity | [identity-commitment](http://localhost:8000/funnel.html?step=identity-commitment) |
| recommitment | [confirm-commitment](http://localhost:8000/funnel.html?step=confirm-commitment) |
| featureProgress | [progress](http://localhost:8000/funnel.html?step=progress) |
| featureCommunity | [community](http://localhost:8000/funnel.html?step=community) |
| featureSupport | [ai-support](http://localhost:8000/funnel.html?step=ai-support) |
| featureLessons | [lessons](http://localhost:8000/funnel.html?step=lessons) |
| name | [your-name](http://localhost:8000/funnel.html?step=your-name) |
| pledge | [pledge](http://localhost:8000/funnel.html?step=pledge) |
| planAnalysis | [analyzing-answers](http://localhost:8000/funnel.html?step=analyzing-answers) |
| price | [choose-price](http://localhost:8000/funnel.html?step=choose-price) |
| paywall | [your-plan](http://localhost:8000/funnel.html?step=your-plan) |

## Removed screens and where their links go

Cut on 2026-09-16 because they scored nothing for the archetype and duplicated a shared question: identity-goal, porn-connection, content-intensity, quit-history, performance-quit-history, performance-quit-progress, identity-impact, support, habit-trend, reclaim-your-time, performance-trend, performance-priority, recommitment-check, start-with-uncertainty. Older removals: anxiety-triggers, confidence-impact, performance-experience.

Old links and saved sessions resolve to the nearest live step (`legacySlugs` / `legacyScreens` in `funnel.js`): goal-type links land on obstacles or support-preference, quit-history links on quit-progress, and the recommitment links on your-name.

On Vercel the same query parameters work with `/funnel`. These changes are local and not deployed. Rollback point: git tag `funnel-before-rebuild` on branch `funnel-question-rebuild`.

The personalized analysis plays after the vow is sealed and automatically opens the price screen. Its history entry is replaced when it finishes, so Back does not replay the loading sequence.

See [Flow comparison](FUNNEL_FLOW_REVIEW.md) for the historical comparison against the supplied specification; that document predates the question cut.
