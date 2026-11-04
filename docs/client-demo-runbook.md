# Ownlayer — client demo walkthrough (November 2026)

**Live demo:** https://ownlayer-client-demo.onrender.com/

## Before the call

1. Open the live link in Chrome.
2. Select **Explore interactive demo — no sign-in** on the login screen.
3. Use the built-in fictitious sample datasets. No Firebase login or payment is needed for this path.
4. Remember: this environment stores demo changes in **your browser only**. A client opening the same link sees their own fresh sample state, not your local changes.

## 8-minute demo sequence

| Time | Click path | What to demonstrate |
| --- | --- | --- |
| 0–1 min | Overview | White-background workspace, sample dataset counts, navigation |
| 1–2 min | Datasets → Agri_IoT_Readings.csv | Actual source records, schema, metadata, browse/search |
| 2–3 min | Quality tab | Missing values and duplicates in source records, per-dataset evaluation |
| 3–4 min | Prepare tab → Preview changes → Save as new dataset | Non-destructive trimming and deduplication. Original is preserved |
| 4–5 min | Data sources | Catalog provider/location registry; clearly say auto-sync not yet supported |
| 5–7 min | AI workflows → Retail_Orders.csv → Generate preview | Local statistical baseline; adjust row count and seed, inspect generated records |
| 7–8 min | Synthetic evaluation → Save as new dataset → Download | Measured schema match, novelty, numeric range, missingness; lineage and export |

## Accurate statements for the client

- "This is a working, interactive proof of concept with repeatable sample data and browser-local operations."
- "The upload/preview/quality/preparation/synthesis/export flow is demonstrable without Firebase permissions."
- "The generation method shown is **statistical sampling**, NOT our trained foundation model and NOT a privacy-preserving synthesis guarantee."
- "The shared existing Firebase project is configured in code, but live Firestore/Storage authorization and production deployment are separate pending tasks."
- "Enterprise-grade connectors, backend jobs, model training, real-time sync and responsible-AI audits are roadmap features, not present in this demo."

## Demo contingency

- If local browser storage is full or blocked, use a normal non-incognito Chrome session and reload.
- Do not upload actual customer records to this public demonstration.
- If you exit demo, click Explore interactive demo again. Sample data remains stored in that browser until cleared.
- The app is hosted as a separate static Render site, preserving existing AI Engine hosting.

## Acceptance criteria for this sprint

- TypeScript check, test suite and production Vite build green in GitHub Actions.
- Render static deployment status **live** for the latest demonstrated commit.
- The public URL shows an **Explore interactive demo** action.
- The user can browse synthetic sample datasets, clean an original, generate a statistical baseline, inspect measured evaluation and download a saved sample.

**No fabricated model accuracy, certification, connector syncing or training claims.**
