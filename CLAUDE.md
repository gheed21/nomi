Nomi — House Rules for Claude Code

These are standing rules, not one-off instructions. Follow them every session without being asked again.

Before writing any fix code

- Investigate and report findings before proposing a fix, especially for bugs. Show file/line references and actual evidence (logged values, git diff, console output) — not a guess at what's probably happening.

- If a bug could have more than one plausible cause, check git history/diff first to confirm what was actually implemented vs. just planned in a prior session. A previous session may have presented a plan and stopped without writing code — don't assume "discussed" means "done."

- When the diagnosis is genuinely uncertain, say so and show me the decision point rather than picking one path silently.

Verifying your own work

- "Zero TypeScript errors" or "all symbols present" is not the same as "it works." Confirm behavior at runtime — actually load the page/feature and check.

- Use Playwright to test and screenshot things yourself rather than asking me to manually open DevTools, paste console commands, or click through steps. If you can drive the browser, drive it — don't hand me a multi-step manual reproduction when you have the tools to do it directly.

- When reporting results, distinguish clearly between "I verified this against real app data" and "I verified this against test/seed data I created for the test." These are different claims.

- If a fix touches shared logic, check whether ALL the places that use that logic were updated — not just the one example I happened to test with. (Recurring failure mode: fixing one code path while a duplicate/parallel path silently keeps the old behavior.)

Scope and duplication

- Before adding new logic (lookup tables, normalization functions, extraction rules), check whether something equivalent already exists elsewhere in the codebase. Reuse and share it rather than writing a second copy that can drift out of sync.

- If you're about to patch the same class of bug for the 3rd+ time (e.g. the same heuristic breaking on a new input shape), stop and flag whether a structural fix is overdue, instead of continuing to patch symptoms one at a time. Tell me the tradeoff; don't decide unilaterally to rewrite OR to keep patching.

- Flag new ongoing costs explicitly before adding them — e.g. API quota usage that scales with a feature, new external dependencies, anything that isn't a one-time cost. Don't silently assume infinite headroom.

Reports and commit messages

- When asked for a written report, plan, or commit message, output it as clean, complete text — don't let it get garbled, truncated, or merged with code formatting. If you can't render something cleanly, say so rather than producing corrupted output.

- Commit messages should describe what is true now, not a chronological log of every patch attempt that led there.

- Before committing, run git status and confirm exactly which files are staged. If there are unrelated changes from a previous/different session mixed in, do not bundle them into the same commit — flag them separately and wait for explicit confirmation before touching them.

- For any commit involving files I haven't reviewed in the current session, show a git diff --stat (minimum) summary first. Don't commit a batch of changes blind just because they're sitting staged.

Context and session health

- If you're approaching context limits, say so proactively and suggest wrapping up or committing current work before continuing — don't let me find out from a stuck terminal.

- Don't ask me to do something manually (browser steps, DevTools, copy-pasting commands) if you have a tool that can do it directly and show me the result.

General

- "Show me your plan before writing code" means an actual plan — proposed approach, what will and won't be touched — not a restatement of the request back to me.

- If a request conflicts with something already explicitly decided earlier in the project (a design rule, a scope boundary), flag the conflict rather than silently overriding it.
