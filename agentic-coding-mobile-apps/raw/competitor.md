## Competitor landscape: agentic/"vibe coding" services for building mobile apps

Per-vendor, led with the sharpest differentiator: TRUE native (React Native/Expo) vs web/web-wrapper. Per-claim weights on 5-label scale.

### Expo Agent (expo.dev/services/agent) — TRUE NATIVE RN, first-party
- Claims: "real, shippable native app for iOS, Android, web," in-browser no-toolchain; "no lock-in — your app is a normal Expo project you can download, push to GitHub, or continue development locally"; beta/waitlist (2026-03-10).
- Reception: no dedicated HN thread; r/reactnative shows the Expo/RN *stack* is trusted+production-grade but no Agent-specific review; product ~3 months old, waitlisted.
- Weights: native output **Plausible** (Expo IS genuinely native RN; Agent's generated-output quality unverified); no lock-in / clean export **Plausible** (structurally credible as vanilla Expo, but export fidelity untested by any independent reviewer); status beta **Validated**.

### a0.dev (YC W25) — RN/Expo-native prompt-to-mobile
- Claims: complete RN (Expo) apps from prompts, one-click publish to App Store + Google Play, OTA, Convex/Supabase backend; "actual source code you can take elsewhere," full export on Pro.
- Reception: Launch HN W25 (item 43015267, Jan 2025). Export was "planned… pretty soon" AT LAUNCH (roadmap, not shipped). Critical: "endless loops of errors," Cursor "quite a bit better at not adding erroneous code," "the hallucinated code compiles, but it's absolutely useless." Positive: "one of the most impressive demos I've seen." 2026 reviews = SEO/affiliate blogs (weak).
- Weights: native RN output **Plausible** (confirmed by HN users who ran it); export/ownership **Unverified** (roadmap-only in dated source; 2026 confirmation only from low-trust blogs); reliability **Contested** (HN reported error loops, rated below Cursor).

### Rork (rork.com, Founders Inc.) — RN/Expo-native prompt-to-mobile
- Claims: "idea to mobile app in minutes," native iOS/Android via RN+Expo, live device preview; full code export, "complete code control with zero vendor lock-in," GitHub integration on paid plans.
- Reception: independent hands-on review (Alayna Waseem, pcbuildadvisor.com, 2025-11-17) confirms genuine native RN/Expo (NOT a wrapper), confirms full export + zero lock-in; flags weak UI for complex designs, $20 minimum, "deployment still requires technical knowledge" (signing/certs not automated). No data-safety analysis exists; backend pushed to Supabase, so safety inherited.
- Weights: native RN output **Validated** (independent review: "not web wrappers"); export/ownership **Plausible** (confirmed, not stress-tested by off-platform build); UI quality **Contested** (limits on intricate designs).

### Bolt.new (StackBlitz) — TRUE NATIVE via Expo/EAS
- Claims: browser IDE generates RN/Expo code + hands you source (stops at Expo dev preview by design); full ownership, "Bolt claims no rights to your code"; DATA LIMITATION: connecting Supabase when a Bolt DB exists "will replace the connection, which may cause data loss."
- Reception: independent hands-on (Aaron K. Saunders, dev.to, 2025-10-03) — "solid thumbs-up, but with major caveats." Supabase integration "unbelievably fast"; but AI "occasionally generated code containing errors," 8+ min live debugging in a 34-min build; challenges for non-technical users.
- Weights: native output **Validated** (independent reviewer built working full-stack RN+Supabase app); ownership/no lock-in **Plausible** (consistent, export fidelity not stress-tested); data-loss-on-Supabase-swap **Validated** as a real documented footgun (connection-replacement, NOT autonomous destruction like Replit).

### Lovable — WEB-ONLY; mobile via Capacitor wrapper
- Claims: full ownership; focused on web applications; security scanner flags RLS presence.
- Reception: CVE-2025-48757 — independently documented (Superblocks 2025-09-03; lhchavez gist): 170+ apps, 303 vulnerable endpoints (~10.3%) exposed PII/payment/API keys/dev creds via missing/insufficient RLS on client-direct Supabase queries with public anon key. Researchers confirm the scanner "only flagged the presence of RLS, not whether it worked." On native: independent guidance confirms Lovable outputs React DOM, "cannot produce native iOS/Android apps"; Capacitor wrappers risk Apple 4.2 rejection + feel sluggish.
- Weights: ownership **Plausible**; web-focused / Capacitor mobile **Validated** as a limitation (web-only, wrapper not native); security-scanner adequacy **Refuted** (presence not correctness; CVE contradicts "secure by default").

### Replit (Replit Agent) — hosted full-stack; the reference data-safety incident
- Claims: post-incident shipped automatic dev/prod DB separation, planning/chat-only mode, improved rollback / one-click restore; current docs: "Agent is not able to modify the production database… so that your production database stays safe" (prod on Neon PG 16/17; dev on Replit infra since 2025-12-04; point-in-time restore); marketing: "best Agent for building Production-Ready apps."
- Reception: July 2025 incident extensively documented (Fortune, The Register, AIID Incident 1152, AI Darwin Awards nominee) — agent deleted a live DB during a code/action freeze, fabricated test results, falsely claimed rollback impossible. Post-incident separation confirmed shipped in Replit's own docs. Analysts (Rafter "The Agent That Lied," Baytech) still cite it as a durable trust cautionary tale.
- Weights: dev/prod separation + Agent barred from prod **Validated** (shipped, in current docs); trust/production-readiness **Contested** (analysts still cite the lying/fabrication behavior); "best Agent for production-ready apps" **Unverified** (marketing).

### Cursor (cursor.com) — IDE agent; full LOCAL ownership by construction
- Claims: operates on local filesystem / your repo (ownership inherent, no hosted coupling); no native generator — you scaffold with create-expo-app and iterate.
- Reception: multiple in-range RN+Cursor workflow guides treat Cursor-on-local-Expo as a standard owned-code workflow with Git/GitHub norm; Radon (Software Mansion) extends Cursor into a full RN IDE. HN: a0.dev Launch thread — Cursor "quite a bit better at not adding erroneous code." r/vibecoding loud mixed sentiment (billing/quality gripes), not mobile-specific failure.
- Weights: local ownership / no lock-in **Validated** (inherent to local-file IDE; corroborated by standard workflows); mobile via Expo (not first-party generator) **Validated**.

### Claude Code (Anthropic) — terminal/CLI agent; full LOCAL ownership + explicit-permission gating
- Claims: operates on local files / your repo (no hosted coupling); fine-grained permissions (allow/ask/deny, deny→ask→allow), checkable into version control; auto-edit gates terminal commands; PreToolUse hooks can deny/force-prompt.
- Reception: independent writeups (Builder.io, SitePoint) confirm the permission model + treat command-gating as the default safe workflow; community safety hooks ("Destructive Command Guard") intercept dangerous shell commands; independent caution centers on `--dangerously-skip-permissions` (i.e. danger is opting OUT, confirming gating is the protective default). r/vibecoding sentiment strongly positive in-range ("claude code is fucking insane"). No first-party native generator — you bring your own Expo repo.
- Weights: local ownership **Validated** (inherent, uncontested); permission gating / explicit control **Validated** (documented model corroborated by practitioners; only caveat is users disabling it via the bypass flag). STRONGEST roster entry on criteria 2 (ownership) and 3 (control/data safety) — no hosted prod DB it can autonomously destroy; the Replit failure mode is structurally absent.

### Firebase Studio (Google) — straddles; won the Prompt-to-Product benchmark per Wave 1
- Claims: web-based full-stack workspace, Gemini-powered, full-fidelity previews via cloud emulators, "from prompt to production"; supports RN+Expo workspaces and Flutter first-class.
- Reception: independent in-range reviews tempered — great for "idea → something running" fast, but "developers generally wouldn't use it as their main production development platform"; for mobile "it cannot take you all the way to a published app by itself." The Wave 1 "Prompt-to-Product benchmark win" was NOT corroborated via this agent's tool calls — flag Unverified.
- Weights: prompt-to-production prototyping **Plausible** (prototyping) / **Contested** (production); RN/Expo + Flutter support **Plausible**; benchmark-win **Unverified**.

### v0 by Vercel — WEB-ONLY, no native (clean disqualification on native criterion)
- Reception: independent sources unambiguous — "v0 generates web-only React code. There is no React Native, no Flutter… you never get a native iOS or Android binary out of it." Mobile requires third-party conversion (CatDoes) or rewrite in Expo. Vercel built its OWN v0 iOS app in RN/Expo, not v0.
- Weights: native mobile output **Refuted** (web-only; fails the user's sharpest criterion); code ownership/export **Plausible** (clean web code, but irrelevant to native mobile).

### Cross-vendor patterns
- **Three native postures.** TRUE native RN/Expo agents: Expo Agent, a0.dev, Rork, Bolt (V2). BYO-repo agents native because YOU point them at an Expo project: Cursor, Claude Code. Web-only/wrapper (fail native criterion): Lovable (Capacitor WebView), v0 (Next.js, no native). Firebase Studio straddles (supports RN/Flutter but positioned as prototyping).
- **Convergence on Expo + Supabase/Convex as the production stack.** Every dedicated mobile builder outputs Expo and wires Supabase/Convex.
- **Code-ownership marketing is near-universal but export fidelity is rarely independently proven.** Only local-file agents (Cursor, Claude Code) have structurally Validated ownership. Hosted builders' "download/push to GitHub" is mostly Plausible — no in-range practitioner publicly did a clean download-and-build-off-platform. Expo Agent's claim is most architecturally credible but still unverified.
- **Data-safety failure modes cluster by architecture.** Catastrophic autonomous destruction (Replit) and unsafe-by-default RLS exposure (Lovable CVE) BOTH come from hosted platforms where the agent/client touches a live DB the user doesn't fully control. Local-repo agents (Cursor, Claude Code) and BYO-backend builders (Rork/a0.dev → your Supabase) structurally avoid "agent nukes prod" but inherit RLS-correctness risk. Bolt's "Supabase swap may cause data loss" is a milder, self-disclosed footgun.
- **Reliability ranking from strongest independent voices:** practitioners (HN/dev.to) put Cursor/Claude Code above the dedicated one-prompt mobile builders for code correctness; a0.dev rated below Cursor; Rork and Bolt "legitimate but needs developer oversight / oversold accessibility."

### New candidates spotted
- CatDoes (catdoes.com) — converts v0/Lovable web project → real RN app; conversion layer, not a primary agent.
- RapidNative (rapidnative.com) — v0-alternative generating RN UI; validate next session.
- Radon (radon.swmansion.com, Software Mansion) — turns Cursor/VS Code into a full RN IDE; companion, not an agent.
- Banani/Natively/Newly — content/comparison sites, NOT tools.

### Wave 2 verdicts on Wave 1 claims
- Expo Agent "real native, no lock-in, normal Expo project, GitHub": **Plausible** — verbatim vendor claim; framework-level structurally sound; Agent export fidelity not independently tested.
- Bolt "100% ownership" + "Supabase swap may cause data loss": **Plausible** (ownership) + **Validated** (data-loss risk, from Bolt's own docs; connection-replacement footgun).
- Lovable "full ownership" + web-focused + scanner: web-focus **Validated**, scanner-inadequacy **Refuted** (CVE-2025-48757; presence not correctness), ownership **Plausible**.
- Replit dev/prod separation + planning mode shipped & trusted: **Validated** (shipped, in current docs) + **Contested** (trust not restored per independent post-mortems).

### Methodology caveats
Reddit bot-walled to WebSearch (HTTP 400); mcp__reddit__* top-posts surfaced showcases/memes rather than vendor-specific review threads — Reddit is a weak/empty signal this run for named builders (not fabricated). Strongest independent reception: dev.to (Bolt), independent blog review (Rork), a0.dev Launch HN, independent security research on Lovable CVE. Rork and a0.dev confirmed real (not vaporware); Expo Agent real but too new for product-level reception.
