# AAB v2 — آب · paint a system with AI, ship software
© 1993–2026 Abhishek Choudhary · AyeAI · model: Claude Opus 4.8

You state intent; the AI paints the system. Grounded by the Verification-Gated (VGC) method:
nothing verifies without a runnable oracle. Offline, installable outside any store.

## The flow
1. **State intent** — plain words, preserved verbatim, forever.
2. **Paint with AI** — two modes:
   - **✦ Paint (one-shot):** intent → whole system (elements + flows + oracles) in a single handoff. Speed.
   - **◇ Step (stepwise):** six steps — elements → flows → naming → gates → oracles — one at a time,
     so you can learn and hand-optimise between each. Every step is a context-rich prompt whose JSON
     the studio validates before it touches the canvas.
3. **Q6 Build & Validate** — the VGC pivot:
   - **JS / browser systems run IN the studio** — paste the build + oracle, press ▶, get pass/fail live.
   - **Everything else** — the studio emits a build+oracle runbook; run it, paste the tail;
     only `ALL ORACLES PASSED` verifies.
4. **Q7 Ship & prove:**
   - **GitHub** — keyless click-to-commit via compose URLs (you press commit; no token).
   - **OpenTimestamps** — SHA-256 in the browser + OTS calendar → a `.ots` proof.
   - **Zenodo** — paste a token, or use misty-doi (`pip install misty-doi`; dry-run is the default).

## AI provider (⚙) — architected for internal calls later
One interface, three backends, switchable by config with zero rewrite:
- **Manual** (default, keyless): prompt out, JSON pasted back.
- **My API key** (opt-in): live round-trip with your own key, stored locally only.
- **Hosted** (future): flip to internal AI once user volume justifies it — `AAB_CONFIG.hostedEndpoint`.

## Deploy (static HTTPS; lands at /aab/)
    cp -r * /path/to/zistgah.github.io/aab/ && cd /path/to/zistgah.github.io
    git add -A && git commit -m "AAB v2 — AI painting + VGC build-validate + ship" && git push

Install: Android Chrome → Install app · iPhone Safari → Add to Home Screen.
