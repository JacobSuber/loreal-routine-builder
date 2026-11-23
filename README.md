# L’ORÉAL — Routine Atelier (Project 9)

A complete **student project** demonstrating an L’Oréal product-aware routine builder. It builds on the [Project 9 classroom starter](https://github.com/GCA-Classroom/09-prj-loreal-routine-builder) and contains 35 curated brand-product records, with image URLs from the starter's public image repository. Not an official L’Oréal website.

## What works immediately without payment

- Product grid with images, descriptions, accessible select/unselect interaction
- Product-category filter and instant product-name/keyword search **(10-point LevelUp)**
- Selected-products panel, individual removal, clear all and saved choices through localStorage
- Responsive design with L’Oréal-inspired red (`#ff003b`) and gold (`#e3a535`)
- Right-to-left layout toggle **(5-point LevelUp)**
- Routine builder and beauty-topic follow-up chat **in clearly marked LOCAL DEMO MODE**. The demo uses rule-based logic, not real AI. This is useful to preview/test the interface, but does **not** satisfy the assignment's OpenAI integration requirement until a Worker is deployed and configured.
- Stored chat history for follow-up context and reloads

## View the site

1. Unzip this folder, then open `index.html` in Chrome; the bundled fallback catalog makes local preview work without a server.
2. To edit, open the files in GitHub Codespaces or VS Code. Use Live Server for full HTTP testing.

## Deploy on GitHub Pages

1. Create a new public GitHub repository or upload these four main site files to your Project 9 Codespace repository: `index.html`, `style.css`, `script.js`, `products.json`, plus **`products-data.js` and `config.js`**. These six files must be at the repository root. The `worker` folder and `wrangler.toml` may live there too; neither gets exposed as an API key.
2. Commit/push all changes.
3. In the repository, open **Settings → Pages → Build and deployment → Deploy from a branch**. Select the main branch and `/(root)`, then save.
4. Your link will look like `https://YOUR_USERNAME.github.io/YOUR_REPOSITORY/` — submit this public website URL, **not** a repository link or Codespaces link. Check in an incognito browser before submitting.

## To enable real AI (required by rubric)

The site sends JSON for **only the currently selected products** and the full recent conversation to a Cloudflare Worker. You must set up the Cloudflare account and Worker yourself. You never need to expose a secret in GitHub.

### Option A — Cloudflare Workers AI (possible no-cost usage, but NOT the exact OpenAI API requirement)

Cloudflare offers a Workers AI free allocation subject to its current account/model limits. Its responses use a Cloudflare-hosted model, not OpenAI. You can deploy the Worker using the `wrangler.toml` included here:

1. Sign in to Cloudflare and authorize Wrangler from the project directory (`npx wrangler login`).
2. Run `npx wrangler deploy` (the `[ai]` binding named `AI` is already configured in `wrangler.toml`).
3. Copy the deployment URL, typically `https://loreal-routine-concierge.YOUR-SUBDOMAIN.workers.dev`.
4. Put that URL in `config.js` as `workerUrl: "https://...workers.dev"`, commit and push again.

### Option B — OpenAI API (matches assignment requirement; separate API billing or credits may be needed)

1. Create an OpenAI API key in your own API project. Do **not** share it or paste it into the GitHub Pages code.
2. From the project directory after signing in to Cloudflare, run `npx wrangler secret put OPENAI_API_KEY`. Paste your key only in the secure terminal prompt. This is stored as a Cloudflare secret.
3. Deploy with `npx wrangler deploy` and copy the Worker URL.
4. Enter the URL in `config.js`, commit and push.
5. Check that the website shows **LIVE AI CONNECTED**, generate a routine, ask a follow-up, and test in an incognito window. Note that the label indicates the URL is configured; it does not verify the remote endpoint until you generate a routine.

**Security:** For a published site, edit `wrangler.toml` to change `ALLOWED_ORIGIN = "*"` to the exact GitHub Pages origin (example `https://YOUR_USERNAME.github.io`) and redeploy. Public Workers may still be abused; this origin check is not authentication and does not prevent non-browser clients. Monitor your usage and configure platform protections before wider publication. **Do not hard-code keys into `config.js` or `script.js`.**

**Optional LevelUp: web search (10 points)**. The chat interface has a checkbox to request current web results through OpenAI Responses `web_search_preview`. It requires a working OpenAI API key in the Worker and must be tested before you claim the bonus. Cloudflare Workers AI path does not provide web search; leave the checkbox off in that mode.

## Important grading notes

The interface, selection flow, styling, search, RTL, localStorage, and demo routines are implemented, but **live OpenAI-based generation cannot be tested without your deployed Worker and working API account**. The optional Cloudflare AI backend may help when you cannot pay for OpenAI, but ask your instructor whether it meets the OpenAI-specific requirement.

## Final submission

Fill in the assignment's provided Google Doc questions using your **actual** website URL, the LevelUps you verified, your own prompt-design decisions, an actual bug you encountered and resolved, and your LinkedIn-style reflection. Export that document as a PDF and submit it on HQ.

## Files

- `index.html`: semantic page layout
- `style.css`: responsive design
- `script.js`: product and chat logic
- `products.json`: 35 product records
- `products-data.js`: bundled duplicate of catalog for local file preview
- `config.js`: public Worker endpoint only; **no secrets**
- `worker/worker.js`: server-side AI API logic and prompt
- `wrangler.toml`: Worker configuration
- `make_catalog.py`: source-list helper for the local catalog
