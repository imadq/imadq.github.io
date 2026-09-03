# imadq.github.io

Portfolio site for Imad Qureshi, data scientist. Plain static HTML, no build step.

- `index.html` — the whole page (content and styles live here)
- `site.js` — mobile menu, scroll reveal, and the chart hover layer
- `assets/` — portrait, dashboard screenshots, résumé PDF, favicon
- `.github/workflows/deploy.yml` — publishes the repo root to GitHub Pages on every push to `master`

Edit the text directly in `index.html`. The sample Power BI report in the Dashboards section uses made-up numbers, marked "Sample data" on the page.

Local preview: run any static server in the repo root, for example `python -m http.server 8765`, then open http://localhost:8765/.
