## Community signal on agentic/vibe-coding tools for building mobile apps

Tier 4, directional only. Strongest signal is on Replit (data safety, cost, lock-in) and Expo (native output). Lovable/Bolt mobile-specific Reddit threads were thin in the last 6 months — the data-loss and web-wrapper claims are corroborated more by source docs + security write-ups than by named Reddit war stories. X coverage not attempted (gated).

### Emerging consensus

- **"Polished demo ≠ production-ready"; AI builders nail the UI but leave a fragile backend** — the single most repeated theme.
  - u/Living-Pin5868 (fractional CTO, 50+ apps), r/replit, 2026-02-26, 85 up: "The prototype looks great. The foundation underneath can't support real users... your users don't care how you built it. They care that it works, it's fast, and it doesn't lose their data." https://www.reddit.com/r/replit/comments/1rfk04d/
  - u/ebb_and_flow33 (SWE), r/replit, 2026-01-22, 158 up: "You are driving a Ferrari (AI), but it has no brakes... 90% of them have the same 5 'Time Bombs' that will break your app the second you get real users." https://www.reddit.com/r/replit/comments/1qjiwoa/
  - u/Living-Pin5868, r/replit, 2025-08-01, 179 up: "A beautiful UI won't save a broken backend... Back up your production database regularly. Tools can fail, and data loss hurts the most after you get users." https://www.reddit.com/r/replit/comments/1mf9aoh/

- **AI builders routinely ship insecure defaults — exposed API keys, missing/inverted RLS** — treated as the norm.
  - u/terdia, r/expo, 2026-01-03, 78 up: "If you're vibe coding with Cursor/Lovable/Bolt, the AI will absolutely put secrets in your frontend code. It doesn't know better. You have to catch it." https://www.reddit.com/r/expo/comments/1q2t09g/
  - u/Living-Pin5868, r/replit, 2026-02-09, 83 up: "I've seen apps go live with debug mode on, API keys exposed in the frontend, and database credentials in version control... this is the norm with AI-generated code." https://www.reddit.com/r/replit/comments/1r0gw3m/
  - Independent corroboration: CVE-2025-48757 — missing/inverted Supabase RLS in Lovable-generated projects across 170+ apps. https://getautonoma.com/blog/vibe-coding-failures

- **For real native mobile output, the practitioner path is Expo / React Native — often driven by an AI agent (Replit assistant, Cursor) rather than a web-app builder.**
  - u/indiemarchfilm (non-technical), r/replit, 2025-10-18, 89 up: "All you really need is Replit + Expo" — shipped to App Store for "$15.30 total." https://www.reddit.com/r/replit/comments/1o9l9re/
  - u/Jojojojojojo10, r/expo, 2025-06-20, 125 up: "Just launched my app after 1 month! Built with Expo and Cursor." https://www.reddit.com/r/expo/comments/1lfptdm/
  - r/expo top non-AI threads (Native Tabs, Liquid Glass, Apple Maps bottom sheet) show the "good-looking native UI" bar is met through Expo's native components, not web wrappers.

### Controversies / disagreements

- **Is Replit trustworthy after the pricing changes + DB-deletion incident?** Sharply split.
  - Burned: u/JellyfishRare7357, r/replit, 2025-11-03, 251 up: "the absolute worst AI tool I have ever used... never managed to create a single successful application." https://www.reddit.com/r/replit/comments/1on35ie/ ; u/ButterscotchSevere96, 2025-09-11, 87 up: "within hours, it wrecked everything." https://www.reddit.com/r/replit/comments/1ne7s1e/
  - Shipping/profitable: u/Total_Slide_8766, 2026-01-12, 115 up: "$38k in the last 30 days." https://www.reddit.com/r/replit/comments/1qajsvk/ ; u/ivfresh built StudioPrompt.ai for ~$1,800. https://www.reddit.com/r/replit/comments/1paanzk/

- **Was the Replit DB-deletion a real production failure or overblown demo accident?** (HN item 44646151, 179 pts / 160 comments, 2025-07-22)
  - Systemic risk: u/AnimalMuppet: "The person who decided to give an LLM Agent full and unrestricted access to their production database is the person who deserves all the blame." u/jrockway: "LLMs are stupid and they will bumble all over your organization if you don't have guardrails."
  - Overblown: u/lordswork: "It sounds like nothing of value was actually lost, just a vibe coded app and synthetic database."
  - Synthesis (u/tedivm): "'human in the loop' will be the way things have to work for awhile yet."

- **Is Replit's lock-in real?** Power users say avoid Replit's own services for portability.
  - u/Ok_Pension_2064, r/replit, 2025-06-04, 109 up: "Build apps as monorepos, do not deploy using Replit's deployment or storage... Following Replit's decision on how to deploy will only make it harder for you to deploy externally... avoid Replit's suggestions to use their own services." https://www.reddit.com/r/replit/comments/1l2rh50/ Counterpoint: u/ivfresh credits Replit Deployments + managed Postgres for saving infra cost — convenience-vs-portability tradeoff is contested.

### Weak signals
- **Expo Agent's early reception is muted/skeptical, not hyped** — but no-lock-in checks out. r/expo "Introducing Expo Agent," 2026-03-10, 75 up / 29 comments. Top comment (u/trendli, 20 up): "More slop YAY"; reply: "More leaked production tokens YAY." Expo's official account confirmed in-thread: "yes, you can pull the code from github to work on it locally and the agent will sync." Community mood cautious-to-cynical about slop, but the "normal Expo project, no lock-in, GitHub-syncable" claim is vendor-corroborated and unchallenged. HN coverage negligible (item 47325609, 3 pts). https://www.reddit.com/r/expo/comments/1rq1y7t/
- **Migrating off SQLite (the AI default) is the most common silent data-loss trap on hosted runtimes.** u/ebb_and_flow33: "Most AI tools default to SQLite... When you host on Vercel/Netlify, the server 'resets'... it deletes that notepad file. Poof. All user data is gone."

### Wave 2 verdicts on Wave 1 claims
- Replit DB deletion + dev/prod separation, trusted now? **Contested** — incident well-known; trust split between detractors and profitable shippers; the practical fix is operator discipline (keep data off-platform), not restored trust in the agent.
- Bolt/Lovable/Replit actual data loss reported? **Validated** (general pattern) / **Plausible** (Bolt-specific) — Bolt's own docs confirm the Supabase-swap warning; Reddit data-loss reports cluster on Replit + the SQLite-reset trap; no named Bolt-specific war story in-window.
- Lovable mobile = web-wrapper; App Store 4.2 rejections? **Plausible** — wrapper confirmed by multiple third-party guides + r/expo practitioners; no in-window Reddit thread reporting an actual 4.2 rejection.
- Expo Agent "real native, no lock-in"? **Plausible** (leaning validated on no-lock-in mechanics) — vendor confirmed GitHub sync/local editing in-thread; quality unproven, too new.
- Hidden hosted-runtime coupling / export friction? **Plausible** — Replit power-users report exactly this and advise against Replit deploy/storage; Replit-specific, directionally supportive for the general thesis.
- AI builders = polished but unreliable, not production-ready without human mediation? **Validated** — clearest community consensus in the dataset; multi-source, corroborated by CVE-2025-48757.

### Sources
1. https://www.reddit.com/r/replit/comments/1on35ie/  2. https://www.reddit.com/r/replit/comments/1mf9aoh/  3. https://www.reddit.com/r/replit/comments/1qjiwoa/  4. https://www.reddit.com/r/replit/comments/1qkcfrz/  5. https://www.reddit.com/r/replit/comments/1qajsvk/  6. https://www.reddit.com/r/replit/comments/1l2rh50/  7. https://www.reddit.com/r/replit/comments/1ne7s1e/  8. https://www.reddit.com/r/replit/comments/1rfk04d/  9. https://www.reddit.com/r/replit/comments/1r0gw3m/  10. https://www.reddit.com/r/replit/comments/1mr77gz/  11. https://www.reddit.com/r/replit/comments/1paanzk/  12. https://www.reddit.com/r/replit/comments/1o9l9re/  13. https://www.reddit.com/r/expo/comments/1q2t09g/  14. https://www.reddit.com/r/expo/comments/1rq1y7t/  15. https://www.reddit.com/r/expo/comments/1lfptdm/  16. HN https://news.ycombinator.com/item?id=44646151  17. https://support.bolt.new/integrations/supabase  18. https://capgo.app/blog/transform-lovable-dev-app-to-mobile-with-capacitor/ ; https://newly.app/lovable-for-mobile-apps  19. https://getautonoma.com/blog/vibe-coding-failures
