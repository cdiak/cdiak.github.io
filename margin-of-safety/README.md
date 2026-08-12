# Margin of Safety

Probability-weighted intrinsic value (NAV / EPV / GV) for any company, researched live by Claude:
name a company → Claude researches it with web search → you get a full worksheet-style research
report plus an interactive expected-value dashboard.

**The app now lives as a Claude artifact:**
https://claude.ai/public/artifacts/90e72a67-f4cf-4574-a26e-9e033a86543d

This folder is just the redirect that keeps the old URL working. `cdiak.github.io/margin-of-safety/`
sends visitors to the artifact via `<meta http-equiv="refresh">`, a `location.replace()`, and a
visible link as the final fallback.

## Why it moved

The original app was bring-your-own-key: it ran on GitHub Pages, so there was no server to hide a
key on, and every visitor had to paste their own Anthropic API key to use it. Practically nobody
was going to do that.

As an artifact, it runs on the *visitor's* own Claude account — they are already signed in, there is
no key to paste, and usage bills to them rather than to a proxy you pay for. Anthropic closed the
OAuth path that would have allowed the same thing on an external site (consumer OAuth tokens are
restricted to Claude Code and claude.ai as of February 2026), so hosting it on claude.ai is the
supported way to get keyless, per-visitor billing.

## Updating the app

Edit it in the Claude conversation that owns the artifact, then republish. The artifact URL stays
the same, so this redirect keeps working — nothing here needs to change unless you publish a
*new* artifact, in which case update the three occurrences of the URL in `index.html` plus the one
above.

The prior BYOK implementation (`app.js`, `style.css`, and the original `index.html`) was removed in
favor of the artifact; recover it from git history if you ever need it.

## Disclaimers

Everything the app produces is a model-generated estimate built from public reporting at run time.
Numbers can be wrong, stale, or hallucinated; verify against primary sources. Nothing here is
investment advice.
