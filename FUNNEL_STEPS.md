# Funnel step links

Every screen has a stable URL. The address bar updates during navigation; refresh and browser Back/Forward keep the selected screen.

Links select screens, not answers. Fresh sessions use defaults for questions not yet answered. Shared screens use `path=performance` for that branch; omit it for the identity branch. The start link resets saved quiz answers.

The removed `anxiety-triggers` step redirects to `performance-trend`, including for saved sessions and old links.
The removed `confidence-impact` step redirects to `support-preference` on the performance branch.

[Start a fresh quiz](http://localhost:8000/funnel.html?start=1)

| Screen | Local preview |
| --- | --- |
| welcome | [welcome](http://localhost:8000/funnel.html?step=welcome) |
| frequency | [frequency](http://localhost:8000/funnel.html?step=frequency) |
| motivation | [motivation](http://localhost:8000/funnel.html?step=motivation) |
| urgeContext | [urge-context](http://localhost:8000/funnel.html?step=urge-context) |
| watchControl | [watch-control](http://localhost:8000/funnel.html?step=watch-control) |
| changePriority | [main-priority](http://localhost:8000/funnel.html?step=main-priority) |
| fork | [intimacy](http://localhost:8000/funnel.html?step=intimacy) |
| forkConcern | [intimacy-concern](http://localhost:8000/funnel.html?step=intimacy-concern) |
| forkConcernInfo (worry without experience: reassurance, then identity path) | [intimacy-worry](http://localhost:8000/funnel.html?step=intimacy-worry) |
| bRelationshipImpact | [relationship-impact](http://localhost:8000/funnel.html?step=relationship-impact) |
| bPornConnection | [porn-connection](http://localhost:8000/funnel.html?step=porn-connection) |
| bCauseInfo | [brain-conditioning](http://localhost:8000/funnel.html?step=brain-conditioning) |
| bIntensity | [performance-content-intensity](http://localhost:8000/funnel.html?step=performance-content-intensity) |
| bGapInfo | [arousal-threshold](http://localhost:8000/funnel.html?step=arousal-threshold) |
| bTriedQuit | [performance-quit-history](http://localhost:8000/funnel.html?step=performance-quit-history) |
| bQuitProgress | [performance-quit-progress](http://localhost:8000/funnel.html?step=performance-quit-progress) |
| quitFeedback | [quit-feedback](http://localhost:8000/funnel.html?step=quit-feedback) |
| bTrend | [performance-trend](http://localhost:8000/funnel.html?step=performance-trend) |
| bPriority | [performance-priority](http://localhost:8000/funnel.html?step=performance-priority) |
| aIdentityGoal | [identity-goal](http://localhost:8000/funnel.html?step=identity-goal) |
| aObstacle | [obstacles](http://localhost:8000/funnel.html?step=obstacles) |
| aObstacleInfo | [build-your-system](http://localhost:8000/funnel.html?step=build-your-system) |
| aIntensity | [content-intensity](http://localhost:8000/funnel.html?step=content-intensity) |
| aTriedQuit | [quit-history](http://localhost:8000/funnel.html?step=quit-history) |
| aQuitProgress | [quit-progress](http://localhost:8000/funnel.html?step=quit-progress) |
| setbackTrigger (both paths, prior attempts only) | [setback-trigger](http://localhost:8000/funnel.html?step=setback-trigger) |
| aIdentityImpact | [identity-impact](http://localhost:8000/funnel.html?step=identity-impact) |
| aSupport | [support](http://localhost:8000/funnel.html?step=support) |
| aSupportInfo | [shared-support](http://localhost:8000/funnel.html?step=shared-support) |
| aTrend | [habit-trend](http://localhost:8000/funnel.html?step=habit-trend) |
| aTimeUse | [reclaim-your-time](http://localhost:8000/funnel.html?step=reclaim-your-time) |
| supportPreference (both paths) | [support-preference](http://localhost:8000/funnel.html?step=support-preference) |
| safeWordIntro | [blocker-introduction](http://localhost:8000/funnel.html?step=blocker-introduction) |
| safeWordEntry | [safe-word](http://localhost:8000/funnel.html?step=safe-word) |
| blockerLive | [blocker-ready](http://localhost:8000/funnel.html?step=blocker-ready) |
| blockerReminder | [blocker-reminder](http://localhost:8000/funnel.html?step=blocker-reminder) |
| featureProgress | [progress](http://localhost:8000/funnel.html?step=progress) |
| featureCommunity | [community](http://localhost:8000/funnel.html?step=community) |
| featureSupport | [ai-support](http://localhost:8000/funnel.html?step=ai-support) |
| featureLessons | [lessons](http://localhost:8000/funnel.html?step=lessons) |
| commitmentPerformance | [performance-commitment](http://localhost:8000/funnel.html?step=performance-commitment) |
| commitmentIdentity | [identity-commitment](http://localhost:8000/funnel.html?step=identity-commitment) |
| recommitment | [confirm-commitment](http://localhost:8000/funnel.html?step=confirm-commitment) |
| aRecommitment | [recommitment-check](http://localhost:8000/funnel.html?step=recommitment-check) |
| aRecommitmentInfo | [start-with-uncertainty](http://localhost:8000/funnel.html?step=start-with-uncertainty) |
| name | [your-name](http://localhost:8000/funnel.html?step=your-name) |
| pledge | [pledge](http://localhost:8000/funnel.html?step=pledge) |
| planAnalysis | [analyzing-answers](http://localhost:8000/funnel.html?step=analyzing-answers) |
| price | [choose-price](http://localhost:8000/funnel.html?step=choose-price) |
| paywall | [your-plan](http://localhost:8000/funnel.html?step=your-plan) |

On Vercel the same query parameters work with `/funnel`. These changes are local and not deployed.

See [Flow comparison](FUNNEL_FLOW_REVIEW.md) for the comparison against the supplied specification and testing instructions.

The personalized analysis plays after the vow is sealed and automatically opens the price screen. Its history entry is replaced when it finishes, so Back does not replay the loading sequence.

## Shared questions added 2026-09-15

Frequency → motivation → trigger situation → control → main priority → existing intimacy fork.
Both paths show the quit feedback right after quit progress, then ask about setbacks, only when someone has tried quitting.
Support preference follows confidence impact (performance) or reclaimed time (identity), before blocker catch-up and the feature sequence.
The redundant performance-experience question is removed. Its old link and saved screen redirect to relationship-impact. Other existing questions remain.
