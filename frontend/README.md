# Frontend — React Dashboard ("Ledger")

A custom React dashboard that calls the FastAPI backend (`../backend`) to display customer
segments and product recommendations. Built with Vite + React + Recharts.

## Setup

```bash
cd frontend
npm install
```

## Run (development)

Make sure the backend is running first (see `../backend/README.md`), then:

```bash
npm run dev
```

Open http://localhost:5173. By default the app calls the API at `http://localhost:8000`;
override this with an environment variable if your backend runs elsewhere:

```bash
VITE_API_URL=http://localhost:8000 npm run dev
```

## Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally to sanity-check it
```

## Pages

1. **Ledger Overview** — segment summary cards, revenue-share pie chart, customers-per-segment
   bar chart, and a full segment table.
2. **Customer Lookup** — search an existing CustomerID for their segment + personalized
   recommendations, or classify a brand-new customer by entering RFM values (calls the live
   K-Means model through `/api/predict-segment`).
3. **Product Explorer** — search products, compare item-based collaborative filtering
   recommendations against association-rule ("frequently bought together") recommendations,
   and view the best-sellers list.
4. **Model Quality** — Precision@5/Recall@5 comparison between the personalized recommender
   and the popularity baseline, so the value of personalization is visible, not just claimed.

## Design notes

The visual identity ("Ledger") intentionally avoids generic AI-dashboard defaults: a warm
parchment background, deep teal + gold accents evoking a shopkeeper's ledger book, Fraunces
for display type paired with Inter for body text and IBM Plex Mono for tabular figures. All
colors and type choices are defined as CSS custom properties at the top of `src/index.css`
if you want to re-theme it.
