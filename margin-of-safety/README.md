# Margin of Safety

Probability-weighted intrinsic value (NAV / EPV / GV) for any company, researched live by Claude.
A static, serverless app for GitHub Pages: name a company → Claude researches it with web search →
you get a full worksheet-style research report plus an interactive expected-value dashboard, with
downloads for the report (`.md`), the dashboard (`.jsx`), the raw data (`.json`), and print-to-PDF.

Live at: **https://cdiak.github.io/margin-of-safety/**

## Deploy

This folder is self-contained (no build step, no dependencies). From the root of your
`cdiak.github.io` repository:

```bash
cp -r margin-of-safety /path/to/cdiak.github.io/
cd /path/to/cdiak.github.io
git add margin-of-safety
git commit -m "Add Margin of Safety worksheet app"
git push
```

GitHub Pages serves it automatically at `/margin-of-safety/`.

## How the API key works (read this)

GitHub Pages is static hosting — there is no server to hide a key on. So this app is
**bring-your-own-key**: each visitor pastes their own Anthropic API key, and the browser sends it
directly to `api.anthropic.com` using Anthropic's CORS support
(`anthropic-dangerous-direct-browser-access: true`). The key never touches your site, your repo,
or any other server.

- **Never commit your own key anywhere in this repo.**
- "Remember on this device" stores the key in the visitor's own `localStorage` — their machine only.
- Each run costs the key owner roughly a few cents to ~$0.50 (web search + a long completion),
  depending on the model.

If you later want visitors to use the app without their own key, put a thin proxy in front
(Cloudflare Worker or Vercel function holding your key, with rate limiting) and change the
`fetch` URL in `app.js`. Don't skip the rate limiting — a public endpoint with your key behind
it will get drained.

## Customize

All knobs are at the top of `app.js`:

- `MODEL` — defaults to `claude-sonnet-4-6`. Any current Claude model string works.
- `MAX_SEARCHES` — web searches allowed per run (cost control).
- `buildPrompt()` — the framework itself. The JSON schema in the prompt is the contract between
  the model and the renderer; if you change one, change the other.

The valuation engine (`scenarioValue`) recomputes everything client-side, so the dashboard stays
live when users drag K, the probabilities, or the per-scenario assumptions:

- NAV: `value`
- EPV: `(fcf or rev × margin) / K ÷ (1+K)^(year − thisYear) + addBack`
- GV:  `D / (K − G) ÷ (1+K)^(year − thisYear) + addBack`

## Files

```
margin-of-safety/
├── index.html   # page shell, form, results containers
├── style.css    # worksheet design system (ledger gray / ink / highlighter)
├── app.js       # API call, JSON schema, valuation engine, renderers, downloads
└── README.md
```

## Disclaimers

Everything the app produces is a model-generated estimate built from public reporting at run
time. Numbers can be wrong, stale, or hallucinated; verify against primary sources. Nothing here
is investment advice.
