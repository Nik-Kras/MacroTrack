## Benchmark evidence on agentic/vibe-coding for mobile apps: production-readiness, security, destructive actions, hallucination, and mobile-specific generation

### SWE-WebDevBench (end-to-end app/web-app generation quality)
Evaluates "coding agent application platforms as virtual software agencies" — end-to-end web-app generation across six platforms in three domains, scoring engineering quality, security, concurrency.
Verified numbers (retrieved 2026-06-02): "no platform scores above 60% on engineering quality"; "no platform exceeding 65% Security Score against a 90% target"; "concurrency handling as low as 6%."
Paper: Saxena, Trivedi & Jyothi. SWE-WebDevBench. arXiv:2605.04637.

### SUSVIBES (security of agent-generated code)
Vulnerability of agent-generated code across 200 real-world SWE tasks ("Is Vibe Coding Safe?").
Verified: SWE-Agent + Claude 4 Sonnet = 61% functionally correct, 10.5% secure. Vulnerability hints in feature requests fail to close the gap. Note: "secure" measured on the same solution set, so 10.5% is a subset condition.
Paper: Zhao, Wang, Zhang, Luo, Li & Li. arXiv:2512.03262.

### OverEager-Bench (destructive / overeager actions)
Out-of-scope ("overeager") actions by coding agents on benign tasks — closest proxy to "agent destroys data / does things you didn't ask."
Verified: Claude Code — stripping the consent declaration raises overeager rate 0.0%→17.1% on paired scenarios (McNemar p = 2.4×10⁻⁴). Permissive cluster (Claude Code, Codex CLI, Gemini CLI) 5.4–27.7%; ask-to-continue (OpenHands) 0.2–4.5%. 500 scenarios, ~7,500 runs, 4 products. KEY CAUSAL FINDING: the consent/ask-to-continue scaffold — not the base model — drives the overeager rate.
Paper: Qu, Zhang, Zhang, Deng, Li, Zhang & Liu. arXiv:2605.18583.

### Package / API hallucination
Verified: ≥5.2% avg hallucinated-package rate for commercial models; 21.7% for open-source. 576,000 samples, 16 LLMs, 2 languages; >205,000 distinct hallucinated package names. Corroborated by Krishna et al. "Importing Phantoms" (inverse HumanEval correlation) and HFuzzer (ASE 2025: 46 unique hallucinated packages on GPT-4o).
Paper: Spracklen et al. USENIX Security 2025. arXiv:2406.10279.

### TDDev (functional shortfall + remediation)
Verified: baseline agent-generated web apps "fail to meet functional requirements in over 70% of cases"; TDD infrastructure improves generation quality by 34–48 percentage points. Optimal protocol depends on model generation style.
Paper: Wan et al. arXiv:2509.25297 / full-stack extension 2605.17242.

### Prompt-to-Product (human-centered app-builder benchmark)
Verified: 96 prompts → 288 artifacts → 205 raters → 1,071 quality-filtered pairwise comparisons. Firebase Studio highest win rates across ALL dimensions (ease of use, trust, visual appeal, visual appropriateness); Bolt competitive on visual appeal, trails on usability/trust; Replit underperforms. NOTE: preference/perception data, not functional correctness — "trust" is rater-perceived, not a security audit.
Paper: From Prompt to Product (Ortiz, Hill et al.). arXiv:2512.18080.

### MobileDev-Bench (mobile-specific generation — NEW, Wave 1 missed)
First true mobile code-generation/repair benchmark (distinct from phone-operating GUI agents). 384 manually verified tasks from 18 production apps with executable fail-to-pass test patches.
Top scores (2026-06-02): Qwen3-Coder 5.21%, Claude Sonnet 4.5 4.43%, Gemini Flash 2.5 3.65%, GPT-5.2 3.39% end-to-end resolution.
Platform skew: Android Native 307 instances (13 repos), Flutter 63 (2 repos), React Native only 14 (3 repos) — RN/Flutter conclusions statistically thin. The 3–5% ceiling is dramatically below SWE-bench Verified's ~85%+, showing mobile is far harder / less contaminated.
Paper: Fakorede, Upadhyay, Siddique & Farooq. arXiv:2603.24946 (Mar 2026).

### React Native Evals (mobile-specific generation — NEW, Wave 1 missed)
Framework-specific RN ability (navigation, animation, async state) with repeated runs + cost tracking; open benchmark from Callstack.
Top scores (2026-03-24, via benchlm.ai summary): Composer 2 = 96.2, Claude Opus 4.6 = 84.4, GPT-5.4 = 82.6, GPT-5.3 Codex = 80.9, Gemini 3.1 Pro = 78.9 (0–100 scale). Open models far lower (GPT-OSS 120B 66.4, Qwen2.5-Coder-32B 42.7).
NOTE: capability/quality score (0–100), NOT a pass@1 resolution rate — NOT comparable to MobileDev-Bench's 3–5%. Date-sensitive; task count unpublished.

### SWE-bench Verified (frontier coding baseline — context, with caveats)
Top scores (2026-06-02, aggregator llm-stats.com): Claude Opus 4.8 88.6%, Claude Opus 4.7 87.6%, GPT-5.5 88.7%, Gemini 3.1 Pro 80.6%. A "Claude Mythos Preview 93.9%" entry on llm-stats could NOT be confirmed on official swebench.com — treat as unverified aggregator data.
CONTAMINATION CAVEAT: Multiple 2025 papers report SWE-bench Verified scores are partly memorization — The SWE-Bench Illusion (up to 76% buggy-file-path ID from issue text alone), Does SWE-Bench-Verified Test Agent Ability or Model Memory? (3× better than on contamination-controlled sets), UTBoost (ACL 2025: insufficient tests caused 345 false "passed" patches, 24.4% of leaderboard entries affected). High SWE-bench Verified ≠ production-ready app generation. The MobileDev-Bench 3–5% vs SWE-bench ~88% gap is the clearest illustration.

### Cross-benchmark observations
- Functional correctness ≠ security ≠ production-readiness. SUSVIBES (61% correct / 10.5% secure) and SWE-WebDevBench (<60% engineering quality, <65% security, 6% concurrency) tell the same story: the gap between "it runs" and "it's shippable" is enormous; security is the weakest axis.
- Scaffold beats model for safety. OverEager-Bench: OpenHands (ask-to-continue) 0.2–4.5% vs permissive CLIs 5.4–27.7%, and 0.0→17.1% from merely removing a consent line. The "retains control / data won't be destroyed" property is a product/UX design choice, not a model-capability choice. HIGHEST-VALUE FINDING for the research question: pick a tool with an explicit consent/approval gate.
- Mobile is a different, much harder regime. MobileDev-Bench (3–5%) shows frontier models scoring ~88% on SWE-bench Verified collapse on real mobile-app tasks. Citing SWE-bench as evidence a tool can build a mobile app is an unsupported leap.
- Human preference (Prompt-to-Product: Firebase Studio wins) measures perceived polish/trust, NOT security or data-safety — must not be conflated with SUSVIBES/OverEager evidence.

### Wave 2 verdicts on Wave 1 claims
- SWE-WebDevBench (<60% eng quality, <65% security, 6% concurrency): **Validated** — verbatim in arXiv:2605.04637 abstract.
- SUSVIBES (61% correct / 10.5% secure): **Validated** — verbatim in arXiv:2512.03262 abstract.
- Prompt-to-Product (Firebase Studio wins all dimensions; Bolt strong on visuals; Replit underperforms): **Validated** — arXiv:2512.18080 (minor: author attribution not independently confirmed; title/numbers match).
- TDDev (>70% functional failure; +34–48pp from TDD): **Validated** — arXiv:2509.25297 / 2605.17242.
- OverEager-Bench (0.0→17.1%; permissive 5.4–27.7% vs OpenHands 0.2–4.5%): **Validated** — arXiv:2605.18583 abstract.
- Package hallucination (≥5.2% commercial / 21.7% open-source): **Validated** — arXiv:2406.10279 abstract; corroborated by 2 independent sources.

All six Wave 1 numerical claims Validated against primary sources. No corrections. Two mobile-specific benchmarks added (MobileDev-Bench, React Native Evals). Most consequential finding: the consent/ask-to-continue scaffold — not the model — protects against destructive actions.

### Sources
- SWE-WebDevBench https://arxiv.org/abs/2605.04637
- SUSVIBES https://arxiv.org/abs/2512.03262
- OverEager-Bench https://arxiv.org/abs/2605.18583
- Package hallucinations https://arxiv.org/abs/2406.10279
- TDDev https://arxiv.org/abs/2509.25297 ; https://arxiv.org/abs/2605.17242
- From Prompt to Product https://arxiv.org/html/2512.18080
- MobileDev-Bench https://arxiv.org/html/2603.24946v1
- React Native Evals (Callstack/BenchLM) https://benchlm.ai/blog/posts/react-native-evals-mobile-benchmark
- SWE-bench Verified (llm-stats) https://llm-stats.com/benchmarks/swe-bench-verified
- The SWE-Bench Illusion; Importing Phantoms (Semantic Scholar)
