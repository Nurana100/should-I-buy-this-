# Should I Buy This?

A privacy-friendly purchase decision helper created for OpenAI Build Week’s **Apps for Your Life** track. It turns a moment of spending uncertainty into a kind, practical next step: **Buy it**, **Wait a week**, or **Skip it**.

## Run it

Open `index.html` in a browser. No installation or build step is needed.

> The optional GPT feature makes a browser request to the OpenAI API using a key pasted for the current tab. This is suitable only for a personal prototype. A real deployment must send requests through a server-side or serverless endpoint so an API key is never exposed in browser code.

## Product and engineering decisions

### Why separate HTML, CSS, and JavaScript?

The original concept is a single-page app, but its responsibilities have grown: accessible form markup, a polished responsive interface, local data management, validation, and AI requests. Splitting the app into three small files keeps each responsibility clear:

- `index.html` is the accessible page structure and user-facing copy.
- `styles.css` is the visual system and responsive layout.
- `app.js` is the decision logic, browser storage, and optional AI integration.

This makes future changes safer for a beginner: changing a color cannot accidentally break the decision formula, and adding a new history field has one clear place to live.

### Decision model: hybrid, not AI-only

The app has two layers.

1. **Deterministic budget signals** calculate the item’s share of monthly income, an affordability signal, the user’s stated desire, and the recency of comparable purchases. These are consistent, inspectable, and available offline.
2. **GPT-5.6, when enabled**, receives the raw inputs and these signals. It selects the verdict, score, explanation, considerations, and next step in structured JSON. It is therefore part of the decision logic—not just a text writer added after a verdict.

The app still applies one narrow guardrail: an item costing at least a full month of take-home income cannot receive a final “Buy it” verdict. If the live call fails, the deterministic layer gives a usable offline decision and explains that fallback on the page.

This tradeoff is intentional. An AI-only solution feels more personal and can weigh context with nuance, but it can vary from request to request, cost money, fail because of connectivity, and produce advice that is harder to audit. A formula-only solution is predictable and free but can feel rigid. The hybrid model offers a thoughtful answer while retaining dependable constraints.

### Validation and resilience

Before any decision, the app checks that:

- the item is named;
- price and monthly take-home income are valid numbers above zero; and
- values are within a deliberately generous, realistic range.

Errors appear in the page beside the form and focus moves to the field needing attention. A failed AI request does not lose the decision: the app switches to the offline guide.

### Purchase history and privacy

Every decision is saved automatically in `localStorage`, which means it remains on the same browser/device after a refresh but is not sent to a database. Each saved entry includes the purchase inputs, verdict, explanation, decision date, and an editable outcome: bought, did not buy, or still pending. Users can clear their history at any time.

### Polished-product feature: cooling-off tracker

“Wait a week” decisions get an automatic revisit date. The purchase history shows how many days remain or signals when it is ready to reconsider. This transforms the project from a one-time calculator into a small spending habit: it gives impulsive wants time to either prove their value or fade.

For a hackathon, this supports:

- **Design:** a calm, responsive interface with clear states and accessible controls.
- **Technical implementation:** structured AI output, resilient fallback behavior, and browser persistence.
- **Potential impact:** encourages intentional spending without shaming users.
- **Quality of idea:** it closes the loop by tracking what users actually did after the recommendation.

## Suggested next production step

Add a tiny serverless function (for example, a Vercel or Cloudflare endpoint) that holds `OPENAI_API_KEY` as a secret and calls the Responses API. Then replace the direct browser `fetch` in `app.js` with a request to that endpoint. This preserves the exact product behavior while making it safe to deploy publicly.
